import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getDataFilter } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { sendPushNotification } from '@/lib/onesignal';
import { sendEmail } from '@/lib/email';
import { TicketStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/tickets/[id]
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const user = await requirePermission('tickets:read');
  if (user instanceof NextResponse) return user;

  try {
    // Build where clause — CLIENT_REQUESTER can see tickets from their plants OR reported by them
    const baseFilter = getDataFilter(user, { locationPlantIdField: 'location' });
    const where = user.role === 'CLIENT_REQUESTER'
      ? { id: id, OR: [{ reportedById: user.id }, baseFilter] }
      : { id: id, ...baseFilter };

    const ticket = await prisma.ticket.findFirst({
      where,
      include: {
        dispenser: {
          select: { 
            id: true, marca: true, modelo: true, status: true, locationId: true,
            location: {
              include: {
                plant: { include: { client: { select: { id: true, nombre: true } } } },
                sector: { select: { nombre: true } },
              }
            }
          },
        },
        location: {
          include: {
            plant: { include: { client: { select: { id: true, nombre: true } } } },
            sector: { select: { nombre: true } },
          },
        },
        reportedBy: { select: { id: true, nombre: true, role: true } },
        assignedTo: { select: { id: true, nombre: true } },
        comments: {
          include: { user: { select: { nombre: true, apellido: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('[API] GET /api/tickets/[id] error:', error);
    return NextResponse.json({ error: 'Error al obtener ticket' }, { status: 500 });
  }
}

// PUT /api/tickets/[id] — Update ticket status
export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const user = await requirePermission('tickets:write');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { status, assignedToId, priority, notes } = body;

    const ticket = await prisma.ticket.findUnique({ 
      where: { id: id },
      include: { 
        reportedBy: { select: { id: true, onesignalPlayerId: true, nombre: true } },
        location: { include: { plant: true } },
        dispenser: { select: { id: true, status: true } },
      }
    });
    if (!ticket) {
      await revalidateTag('tickets', 'default');
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }

    // Security: Prevent Horizontal Privilege Escalation (IDOR)
    // Technicians can update tickets assigned to them OR claim unassigned tickets for their authorized plants
    if (user.role === 'TECHNICIAN') {
      const isClaiming = assignedToId === user.id && ticket.assignedToId === null;
      const isMyTicket = ticket.assignedToId === user.id;

      if (!isMyTicket && !isClaiming) {
        return NextResponse.json({ error: 'Acceso denegado: el ticket ya está asignado a otro técnico o no tienes permisos' }, { status: 403 });
      }

      if (isClaiming) {
        if (user.plantIds.length > 0 && ticket.location?.plantId && !user.plantIds.includes(ticket.location.plantId)) {
          return NextResponse.json({ error: 'No tienes acceso a la planta de este ticket' }, { status: 403 });
        }

        const userEquipTypes = (user as any).equipmentTypes || ['DISPENSER'];
        const dispEquipType = (ticket as any).dispenser?.equipmentType;
        if (dispEquipType && !userEquipTypes.includes(dispEquipType)) {
          return NextResponse.json({ error: 'No tienes permisos para esta especialidad de equipo' }, { status: 403 });
        }
      }
    }

    const updateData: any = {};

    // Status change
    if (status && status !== ticket.status) {
      if (!Object.values(TicketStatus).includes(status)) {
        await revalidateTag('tickets', 'default');
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
      }

      // Permission check for closing
      if (status === 'CLOSED') {
        const closeUser = await requirePermission('tickets:close');
        if (closeUser instanceof NextResponse) return closeUser;
      }

      updateData.status = status;

      // Track SLA response
      if (status === 'IN_PROGRESS' && !ticket.respondedAt) {
        updateData.respondedAt = new Date();
        if (ticket.slaResponseDeadline && new Date() > ticket.slaResponseDeadline) {
          updateData.slaResponseBreached = true;
        }
      }

      // Track SLA resolution
      if (status === 'RESOLVED' || status === 'CLOSED') {
        if (!ticket.resolvedAt) {
          updateData.resolvedAt = new Date();
          if (ticket.slaResolutionDeadline && new Date() > ticket.slaResolutionDeadline) {
            updateData.slaResolutionBreached = true;
          }
        }
      }

      // Create status history
      await prisma.ticketStatusHistory.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status,
          toStatus: status,
          changedBy: user.nombre,
          notes: notes?.trim() || (assignedToId === user.id && ticket.assignedToId === null ? `Ticket tomado por ${user.nombre}` : null),
        },
      });

      // Send Email on Resolve
      if (status === 'RESOLVED') {
        const reporterEmail = 'reportador@empresa.com'; // Overridden in sendEmail anyway
        sendEmail({
          to: reporterEmail,
          templateType: 'TICKET_RESOLVED',
          variables: {
            id_ticket: ticket.id,
            motivo: ticket.reason,
            resolucion: notes?.trim() || 'Ticket resuelto y equipo operativo.',
            tecnico_completo: user.nombre,
            primer_nombre_tecnico: user.nombre.split(' ')[0],
            reportador_completo: ticket.reportedBy?.nombre || 'Usuario',
            primer_nombre_reportador: ticket.reportedBy?.nombre?.split(' ')[0] || 'Usuario',
            planta: ticket.location?.plant?.nombre || 'N/A',
            ubicacion: ticket.location?.nombre || 'N/A',
            fecha_resolucion: new Date().toLocaleDateString('es-AR'),
          }
        }).catch(console.error);
      }
    }

    // Assign technician
    if (assignedToId !== undefined) {
      // Technicians can self-assign (claim) open tickets, supervisors/admins can assign any
      if (user.role !== 'TECHNICIAN') {
        const assignUser = await requirePermission('tickets:assign');
        if (assignUser instanceof NextResponse) return assignUser;
      }

      updateData.assignedToId = assignedToId;
      if (!status && ticket.status === 'OPEN') {
        updateData.status = 'IN_PROGRESS';
      }

      // Notify assigned technician
      if (assignedToId) {
        const tech = await prisma.user.findUnique({
          where: { id: assignedToId },
          select: { id: true, nombre: true, email: true },
        });

        if (tech?.id && tech.id !== user.id) {
          await sendPushNotification({
            userIds: [tech.id],
            title: 'Ticket Asignado',
            message: `Se te asignó el ticket: ${ticket.reason.substring(0, 80)}`,
            data: { ticketId: id, type: 'TICKET_ASSIGNED' },
          });

          // In-app notification
          await prisma.notification.create({
            data: {
              userId: assignedToId,
              title: 'Ticket Asignado',
              message: ticket.reason.substring(0, 200),
              type: 'TICKET_ASSIGNED',
              relatedId: id,
            },
          });
        }

        // Send Email for Assignment
        const techEmail = 'tecnico@empresa.com'; // overridden
        sendEmail({
          to: techEmail,
          templateType: 'TICKET_ASSIGNED',
          variables: {
            id_ticket: ticket.id,
            motivo: ticket.reason,
            tecnico_completo: tech?.nombre || 'Técnico',
            primer_nombre_tecnico: tech?.nombre?.split(' ')[0] || 'Técnico',
            prioridad: ticket.priority,
            planta: ticket.location?.plant?.nombre || 'N/A',
            ubicacion: ticket.location?.nombre || 'N/A',
            dias_vencimiento_sla: 'N/A', // Could calculate if needed
            fecha_vencimiento_sla: ticket.slaResolutionDeadline ? new Date(ticket.slaResolutionDeadline).toLocaleDateString('es-AR') : 'N/A',
          }
        }).catch(console.error);
      }
    }

    if (priority) updateData.priority = priority;

    const updated = await prisma.ticket.update({
      where: { id: id },
      data: updateData,
    });

    await createAuditLog({
      userId: user.id,
      userName: user.nombre,
      action: 'UPDATE',
      entity: 'TICKET',
      entityId: id,
      oldValue: { status: ticket.status, assignedToId: ticket.assignedToId },
      newValue: updateData,
    });

    // Notify reporter and supervisor if closed without resolution
    if (status === 'CLOSED' && ticket.status !== 'RESOLVED') {
      const supervisors = await prisma.user.findMany({
        where: { role: 'SUPERVISOR' },
        select: { onesignalPlayerId: true, id: true },
      });

      const notifyUsers = new Set<string>();
      if (ticket.reportedBy?.id) notifyUsers.add(ticket.reportedBy.id);
      supervisors.forEach(s => notifyUsers.add(s.id));

      const onesignalIds: string[] = [];
      if (ticket.reportedBy?.onesignalPlayerId) onesignalIds.push(ticket.reportedBy.onesignalPlayerId);
      supervisors.forEach(s => { if (s.onesignalPlayerId) onesignalIds.push(s.onesignalPlayerId); });

      const notificationTitle = 'Ticket cerrado sin resolver';
      const notificationMessage = `El ticket "${ticket.reason.substring(0, 80)}" fue cerrado por ${user.nombre} sin estar resuelto.`;

      if (onesignalIds.length > 0) {
        await sendPushNotification({
          playerIds: onesignalIds,
          title: notificationTitle,
          message: notificationMessage,
          data: { ticketId: id, type: 'TICKET_CLOSED_UNRESOLVED' },
        }).catch(err => console.error('Failed to send push notification:', err));
      }

      await Promise.all(
        Array.from(notifyUsers).map(userId =>
          prisma.notification.create({
            data: {
              userId,
              title: notificationTitle,
              message: notificationMessage,
              type: 'TICKET_CLOSED_UNRESOLVED',
              relatedId: id,
            },
          })
        )
      );
    }

    await revalidateTag('tickets', 'default');
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PUT /api/tickets/[id] error:', error);
    await revalidateTag('tickets', 'default');
    return NextResponse.json({ error: 'Error al actualizar ticket' }, { status: 500 });
  }
}
