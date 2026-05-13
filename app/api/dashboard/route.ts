import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { calculateSlaCompliance } from '@/lib/sla';

// GET /api/dashboard
export async function GET(req: Request) {
  const user = await requirePermission('dashboard:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');

    const whereTickets: any = {};
    const whereDispensers: any = { active: true };
    const whereStock: any = {};

    if (plantId) {
      whereTickets.location = { plantId };
      whereDispensers.location = { plantId };
      whereStock.plantId = plantId;
    }

    // Role scoping
    if (user.role === 'CLIENT_RESPONSIBLE' && user.clientId) {
      whereTickets.location = { plant: { clientId: user.clientId } };
      whereDispensers.location = { plant: { clientId: user.clientId } };
      whereStock.plant = { clientId: user.clientId };
    } else if (user.role === 'CLIENT_REQUESTER' && user.clientId) {
      const access = await prisma.userPlantAccess.findMany({ where: { userId: user.id }, select: { plantId: true } });
      const pIds = access.map(a => a.plantId);
      whereTickets.location = { plantId: { in: pIds } };
      whereDispensers.location = { plantId: { in: pIds } };
      whereStock.plantId = { in: pIds };
    } else if (user.role === 'TECHNICIAN') {
      whereTickets.assignedToId = user.id;
    }

    // Parallel fetch for stats
    const [
      tickets,
      totalDispensers,
      inServiceDispensers,
      repairDispensers,
      blockedDispensers,
      lowStockCount,
      maintenanceStats
    ] = await Promise.all([
      prisma.ticket.findMany({
        where: whereTickets,
        select: { status: true, slaResolutionBreached: true, resolvedAt: true, slaResolutionDeadline: true },
      }),
      prisma.dispenser.count({ where: whereDispensers }),
      prisma.dispenser.count({ where: { ...whereDispensers, status: 'IN_SERVICE' } }),
      prisma.dispenser.count({ where: { ...whereDispensers, status: 'UNDER_REPAIR' } }),
      prisma.dispenser.count({ where: { ...whereDispensers, status: 'BLOCKED' } }),
      prisma.stockEntry.count({
        where: {
          ...whereStock,
          AND: [{ minLevel: { gt: 0 } }, { cantidad: { lt: prisma.stockEntry.fields.minLevel } as any }] 
          // prisma doesn't support comparing fields directly in standard count yet, doing approx or raw if needed
          // A simple workaround for this specific count is fetched in memory if needed or a raw query.
          // For simplicity here, we'll fetch entries and filter.
        }
      }),
      prisma.maintenanceSchedule.groupBy({
        by: ['status'],
        where: { dispenser: whereDispensers },
        _count: true,
      })
    ]);

    // Workaround for low stock count since direct field comparison isn't supported in standard where
    const allStock = await prisma.stockEntry.findMany({ where: whereStock, select: { cantidad: true, minLevel: true } });
    const realLowStockCount = allStock.filter(s => s.minLevel > 0 && s.cantidad < s.minLevel).length;

    const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
    const slaCompliance = calculateSlaCompliance(tickets);

    const maintPending = maintenanceStats.find(s => s.status === 'PENDING')?._count || 0;
    const maintOverdue = maintenanceStats.find(s => s.status === 'OVERDUE')?._count || 0;

    return NextResponse.json({
      user: { nombre: user.nombre },
      tickets: { open: openTickets, total: tickets.length, slaCompliance },
      dispensers: { total: totalDispensers, inService: inServiceDispensers, repair: repairDispensers, blocked: blockedDispensers },
      stock: { lowAlerts: realLowStockCount },
      maintenance: { pending: maintPending, overdue: maintOverdue }
    });

  } catch (error) {
    console.error('[API] GET /api/dashboard error:', error);
    return NextResponse.json({ error: 'Error al obtener datos del dashboard' }, { status: 500 });
  }
}
