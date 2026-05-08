import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await requirePermission('reports:read');
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const startMonth = url.searchParams.get('startMonth');
  const endMonth = url.searchParams.get('endMonth');
  const clientId = url.searchParams.get('clientId');
  const plantId = url.searchParams.get('plantId');
  const sectorId = url.searchParams.get('sectorId');

  try {
    const whereClause: any = {};

    if (startMonth || endMonth) {
      whereClause.scheduledMonth = {};
      if (startMonth) whereClause.scheduledMonth.gte = startMonth;
      if (endMonth) whereClause.scheduledMonth.lte = endMonth;
    }

    if (clientId || plantId || sectorId) {
      whereClause.dispenser = { location: {} };
      if (clientId) whereClause.dispenser.location.plant = { clientId };
      if (plantId) whereClause.dispenser.location.plantId = plantId;
      if (sectorId) whereClause.dispenser.location.sectorId = sectorId;
    }

    const schedules = await prisma.maintenanceSchedule.findMany({
      where: whereClause,
      include: {
        dispenser: {
          select: {
            id: true,
            status: true,
            location: {
              include: {
                plant: { include: { client: true } },
                sector: true
              }
            }
          }
        }
      },
      orderBy: { scheduledMonth: 'asc' }
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('[API] GET /api/maintenance/reports error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
