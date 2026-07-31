import { revalidateTag } from 'next/cache'; // Used only in POST/PUT/DELETE
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getDataFilter } from '@/lib/auth';
import { withIdempotency } from '@/lib/idempotency';
import { createAuditLog } from '@/lib/audit';
import { calculateSlaDeadlines } from '@/lib/sla';
import { sendPushNotification } from '@/lib/onesignal';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// GET /api/tickets — List tickets with filters
export async function GET(req: Request) {
  const user = await requirePermission('tickets:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedToId = searchParams.get('assignedToId');
    const dispenserId = searchParams.get('dispenserId');
    const slaStatus = searchParams.get('slaStatus'); // ON_TIME | NEAR_BREACH | BREACHED
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = getDataFilter(user, {
      locationPlantIdField: 'location',
      plantIdField: undefined // Ticket has no direct plantId
    });

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToId) where.assignedToId = assignedToId;
    if (dispenserId) where.dispenserId = dispenserId;

    // SLA filtering
    if (slaStatus === 'BREACHED') {
      where.slaResolutionBreached = true;
    } else if (slaStatus === 'NEAR_BREACH') {
      where.slaResolutionBreached = false;
      where.slaResolutionDeadline = { lte: new Date(Date.now() + 2 * 60 * 60 * 1000) }; // within 2h
      where.status = { not: 'CLOSED' };
    }

    if (user.role === 'CLIENT_REQUESTER') {
      // Requesters see their plants + their own reported tickets
      where.OR = [
        ...(where.OR || [where]),
        { reportedById: user.id }
      ];
    }

    // Technician sees assigned tickets OR unassigned tickets for their authorized plants
    if (user.role === 'TECHNICIAN') {
      const plantFilter = user.plantIds.length > 0 
        ? { location: { plantId: { in: user.plantIds } } }
        : {};
        
      where.OR = [
        { assignedToId: user.id },
        { assignedToId: null, ...plantFilter }
      ];
    }

    let [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          dispenser: { select: { id: true, marca: true, modelo: true, status: true } },
          location: {
            include: {
              plant: { select: { nombre: true, client: { select: { nombre: true } } } },
            },
          },
          reportedBy: { select: { nombre: true, role: true } },
          assignedTo: { select: { id: true, nombre: true } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    // For technician role: filter tickets by technician equipmentType specialization
    if (user.role === 'TECHNICIAN') {
      const techEquipmentTypes = (user as any).equipmentTypes || ['DISPENSER'];

      try {
        const dispEqData: any[] = await prisma.$queryRawUnsafe(`SELECT id, "equipmentType" FROM "Dispenser"`);
        const dispEqMap = new Map(dispEqData.map((d: any) => [d.id, d.equipmentType]));

        tickets = tickets.filter((t: any) => {
          if (t.assignedToId === user.id) return true;
          if (!t.dispenserId) return true;
          const eqType = dispEqMap.get(t.dispenserId) || 'DISPENSER';
          return techEquipmentTypes.includes(eqType);
        });

        // Attach equipmentType to dispenser object for frontend rendering
        tickets.forEach((t: any) => {
          if (t.dispenser) {
            t.dispenser.equipmentType = dispEqMap.get(t.dispenser.id) || 'DISPENSER';
          }
        });
      } catch {
        // Fallback
      }
    }

    return NextResponse.json({ tickets, total, page, limit });
  } catch (error) {
    console.error('[API] GET /api/tickets error:', error);
    return NextResponse.json({ error: 'Error al obtener tickets' }, { status: 500 });
  }
}

// POST /api/tickets — Create a new ticket
export async function POST(req: Request) {
  const user = await requirePermission('tickets:write');
  if (user instanceof NextResponse) return user;

  return withIdempotency(req, async () => {
    try {
      const body = await req.json();
      const { dispenserId, locationId, reason, description, priority, wantsPushNotifications, wantsEmailNotifications } = body;

      if (!reason?.trim()) {
        await revalidateTag('tickets', 'default');
        return NextResponse.json({ error: 'El motivo es requerido' }, { status: 400 });
      }

      // Resolve location & equipment type from dispenser if provided
      let resolvedLocationId = locationId;
      let ticketEquipmentType = 'DISPENSER';

      if (dispenserId) {
        const dispenser = await prisma.dispenser.findUnique({
          where: { id: dispenserId },
          select: { locationId: true, equipmentType: true },
        });
        if (dispenser?.equipmentType) {
          ticketEquipmentType = dispenser.equipmentType;
        }
        if (!resolvedLocationId) resolvedLocationId = dispenser?.locationId;
      }

      // Get SLA config and target plant ID
      let slaConfig = null;
      let targetPlantId: string | null = null;
      if (resolvedLocationId) {
        const location = await prisma.location.findUnique({
          where: { id: resolvedLocationId },
          include: { plant: { include: { client: { include: { slaConfig: true } } } } },
        });
        slaConfig = location?.plant?.client?.slaConfig;
        targetPlantId = location?.plantId || null;
      }

      // Find technicians assigned to target plant WHO ALSO COVER THIS EQUIPMENT TYPE
      let plantTechs: { id: string; email: string; nombre: string }[] = [];
      if (targetPlantId) {
        const accesses = await prisma.userPlantAccess.findMany({
          where: {
            plantId: targetPlantId,
            user: { role: 'TECHNICIAN', active: true }
          },
          select: { user: { select: { id: true, email: true, nombre: true } } }
        });
        plantTechs = accesses
          .map((a: any) => a.user)
          .filter((u: any) => {
            const types = (u as any).equipmentTypes || ['DISPENSER'];
            return types.includes(ticketEquipmentType);
          });
      }

      // If exactly 1 technician is assigned to this plant, auto-assign ticket
      const autoAssignedTechId = plantTechs.length === 1 ? plantTechs[0].id : null;

      const ticketPriority = priority || 'MEDIUM';
      const now = new Date();
      const deadlines = calculateSlaDeadlines(now, ticketPriority, slaConfig);

      const ticket = await prisma.ticket.create({
        data: {
          dispenserId: dispenserId || null,
          locationId: resolvedLocationId || null,
          reportedById: user.id,
          assignedToId: autoAssignedTechId,
          status: autoAssignedTechId ? 'IN_PROGRESS' : 'OPEN',
          reason: reason.trim(),
          description: description?.trim() || null,
          priority: ticketPriority,
          slaResponseDeadline: deadlines.responseDeadline,
          slaResolutionDeadline: deadlines.resolutionDeadline,
          wantsPushNotifications: !!wantsPushNotifications,
          wantsEmailNotifications: !!wantsEmailNotifications,
        },
        include: {
          dispenser: { select: { id: true, marca: true, modelo: true } },
          location: {
            include: { plant: { select: { nombre: true } } },
          },
        },
      });

      // Create initial status history
      await prisma.ticketStatusHistory.create({
        data: {
          ticketId: ticket.id,
          fromStatus: 'OPEN',
          toStatus: autoAssignedTechId ? 'IN_PROGRESS' : 'OPEN',
          changedBy: user.nombre,
          notes: autoAssignedTechId ? `Ticket creado y asignado automáticamente a ${plantTechs[0].nombre}` : 'Ticket creado',
        },
      });

      // Combine notification target users (supervisors/admins + plant technicians)
      const supervisorsAndAdmins = await prisma.user.findMany({
        where: { role: { in: ['SUPERVISOR', 'ADMIN'] }, active: true },
        select: { id: true, email: true },
      });

      const notifyUserIds = Array.from(new Set([
        ...supervisorsAndAdmins.map(u => u.id),
        ...plantTechs.map(u => u.id)
      ]));

      if (notifyUserIds.length > 0) {
        await sendPushNotification({
          userIds: notifyUserIds,
          title: `Nuevo Ticket [${ticketPriority}]`,
          message: `${reason.substring(0, 100)}${reason.length > 100 ? '...' : ''}`,
          data: { ticketId: ticket.id, type: 'NEW_TICKET' },
        });

        await prisma.notification.createMany({
          data: notifyUserIds.map(uId => ({
            userId: uId,
            title: `Nuevo Ticket [${ticketPriority}]`,
            message: reason.substring(0, 200),
            type: 'NEW_TICKET',
            relatedId: ticket.id,
          })),
        });
      }

      // Send Email
      sendEmail({
        to: Array.from(new Set([...supervisorsAndAdmins.map(u => u.email), ...plantTechs.map(u => u.email)])).filter(Boolean),
        templateType: 'TICKET_CREATED',
        variables: {
          id_ticket: ticket.id,
          motivo: reason,
          reportador_completo: user.nombre,
          primer_nombre_reportador: user.nombre.split(' ')[0],
          prioridad: ticketPriority,
          planta: (ticket as any).location?.plant?.nombre || 'N/A',
          ubicacion: (ticket as any).location?.nombre || 'N/A',
        }
      }).catch(console.error);

      await createAuditLog({
        userId: user.id,
        userName: user.nombre,
        action: 'CREATE',
        entity: 'TICKET',
        entityId: ticket.id,
        newValue: { priority: ticketPriority, reason },
      });

      await revalidateTag('tickets', 'default');
    return NextResponse.json(ticket, { status: 201 });
    } catch (error) {
      console.error('[API] POST /api/tickets error:', error);
      await revalidateTag('tickets', 'default');
    return NextResponse.json({ error: 'Error al crear ticket' }, { status: 500 });
    }
  });
}
