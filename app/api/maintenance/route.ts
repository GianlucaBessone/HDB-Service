import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getDataFilter } from '@/lib/auth';

export const revalidate = 300; // 5 min

// GET /api/maintenance
export async function GET(req: Request) {
  const user = await requirePermission('maintenance:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM
    const plantId = searchParams.get('plantId');
    const status = searchParams.get('status');

    const where: any = {
      ...getDataFilter(user, {
        locationPlantIdField: 'dispenser.location',
      })
    };
    if (month) where.scheduledMonth = month;
    if (status) where.status = status;
    if (plantId) where.dispenser = { ...where.dispenser, location: { plantId } };

    const schedules = await prisma.maintenanceSchedule.findMany({
      where,
      include: {
        dispenser: { select: { id: true, marca: true, modelo: true, location: { include: { plant: { select: { nombre: true } } } } } },
        checklist: true,
      },
      orderBy: [{ scheduledMonth: 'desc' }, { dispenserId: 'asc' }],
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('[API] GET /api/maintenance error:', error);
    return NextResponse.json({ error: 'Error al obtener mantenimientos' }, { status: 500 });
  }
}
