import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { withIdempotency } from '@/lib/idempotency';
import { createAuditLog } from '@/lib/audit';
import { calculateSlaDeadlines } from '@/lib/sla';
import { sendPushNotification } from '@/lib/onesignal';

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

    const where: any = {};

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

    // Client users scope
    if (user.role === 'CLIENT_RESPONSIBLE' && user.clientId) {
      where.location = { plant: { clientId: user.clientId } };
    } else if (user.role === 'CLIENT_REQUESTER' && user.clientId) {
      // Get accessible plant IDs
      const plantAccess = await prisma.userPlantAccess.findMany({
        where: { userId: user.id },
        select: { plantId: true },
      });
      where.location = { plantId: { in: plantAccess.map(p => p.plantId) } };
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
      const { dispenserId, locationId, reason, description, priority } = body;

      if (!reason?.trim()) {
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

      // Notify technicians
      const technicians = await prisma.user.findMany({
        where: { role: 'TECHNICIAN', active: true, onesignalPlayerId: { not: null } },
        select: { onesignalPlayerId: true },
      });

      const playerIds = technicians
        .map(t => t.onesignalPlayerId)
        .filter((id): id is string => !!id);

      if (playerIds.length > 0) {
        await sendPushNotification({
          playerIds,
          title: `Nuevo Ticket: ${ticketPriority}`,
          message: `${reason.substring(0, 100)}${reason.length > 100 ? '...' : ''}`,
          data: { ticketId: ticket.id, type: 'NEW_TICKET' },
        });
      }

      // Create in-app notifications for supervisors and admins
      const supervisorsAndAdmins = await prisma.user.findMany({
        where: { role: { in: ['SUPERVISOR', 'ADMIN'] }, active: true },
        select: { id: true },
      });

      await prisma.notification.createMany({
        data: supervisorsAndAdmins.map(u => ({
          userId: u.id,
          title: `Nuevo Ticket [${ticketPriority}]`,
          message: reason.substring(0, 200),
          type: 'NEW_TICKET',
          relatedId: ticket.id,
        })),
      });

      await createAuditLog({
        userId: user.id,
        userName: user.nombre,
        action: 'CREATE',
        entity: 'TICKET',
        entityId: ticket.id,
        newValue: { priority: ticketPriority, reason },
      });

      return NextResponse.json(ticket, { status: 201 });
    } catch (error) {
      console.error('[API] POST /api/tickets error:', error);
      return NextResponse.json({ error: 'Error al crear ticket' }, { status: 500 });
    }
  });
}
