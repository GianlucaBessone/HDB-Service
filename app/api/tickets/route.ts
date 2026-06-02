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

    // Technician sees only their assigned tickets
    if (user.role === 'TECHNICIAN') {
      where.assignedToId = user.id;
    }

    const [tickets, total] = await Promise.all([
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
          assignedTo: { select: { nombre: true } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);

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

      // Resolve location from dispenser if not provided
      let resolvedLocationId = locationId;
      if (dispenserId && !locationId) {
        const dispenser = await prisma.dispenser.findUnique({
          where: { id: dispenserId },
          select: { locationId: true },
        });
        resolvedLocationId = dispenser?.locationId;
      }

      // Get SLA config for the client
      let slaConfig = null;
      if (resolvedLocationId) {
        const location = await prisma.location.findUnique({
          where: { id: resolvedLocationId },
          include: { plant: { include: { client: { include: { slaConfig: true } } } } },
        });
        slaConfig = location?.plant?.client?.slaConfig;
      }

      const ticketPriority = priority || 'MEDIUM';
      const now = new Date();
      const deadlines = calculateSlaDeadlines(now, ticketPriority, slaConfig);

      const ticket = await prisma.ticket.create({
        data: {
          dispenserId: dispenserId || null,
          locationId: resolvedLocationId || null,
          reportedById: user.id,
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
          toStatus: 'OPEN',
          changedBy: user.nombre,
          notes: 'Ticket creado',
        },
      });

      // Create in-app and push notifications for supervisors and admins (instead of spamming all technicians)
      const supervisorsAndAdmins = await prisma.user.findMany({
        where: { role: { in: ['SUPERVISOR', 'ADMIN'] }, active: true },
        select: { id: true, onesignalPlayerId: true },
      });

      const playerIds = supervisorsAndAdmins
        .map(u => u.onesignalPlayerId)
        .filter((id): id is string => !!id);

      if (playerIds.length > 0) {
        await sendPushNotification({
          playerIds,
          title: `Nuevo Ticket: ${ticketPriority}`,
          message: `${reason.substring(0, 100)}${reason.length > 100 ? '...' : ''}`,
          data: { ticketId: ticket.id, type: 'NEW_TICKET' },
        });
      }

      await prisma.notification.createMany({
        data: supervisorsAndAdmins.map(u => ({
          userId: u.id,
          title: `Nuevo Ticket [${ticketPriority}]`,
          message: reason.substring(0, 200),
          type: 'NEW_TICKET',
          relatedId: ticket.id,
        })),
      });

      // Send Email
      const adminEmails = supervisorsAndAdmins.map(u => 'admin@empresa.com'); // Placeholder, since it's overridden
      sendEmail({
        to: adminEmails.length > 0 ? adminEmails : 'fallback@empresa.com',
        templateType: 'TICKET_CREATED',
        variables: {
          id_ticket: ticket.id,
          motivo: reason,
          reportador_completo: user.nombre,
          primer_nombre_reportador: user.nombre.split(' ')[0],
          prioridad: ticketPriority,
          planta: ticket.location?.plant?.nombre || 'N/A',
          ubicacion: ticket.location?.nombre || 'N/A',
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
