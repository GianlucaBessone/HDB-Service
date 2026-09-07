import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getDataFilter } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/maintenance
export async function GET(req: Request) {
  const user = await requirePermission('maintenance:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM
    const plantId = searchParams.get('plantId');
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const equipmentType = searchParams.get('equipmentType');

    const where: any = {
      ...getDataFilter(user, {
        locationPlantIdField: 'dispenser.location',
      })
    };
    if (month) where.scheduledMonth = month;
    if (status) where.status = status;
    if (plantId) where.dispenser = { ...where.dispenser, location: { plantId } };
    if (clientId) {
      where.dispenser = {
        ...where.dispenser,
        OR: [
          { clientId },
          { plant: { clientId } },
          { location: { plant: { clientId } } },
        ]
      };
    }
    if (equipmentType) where.dispenser = { ...where.dispenser, equipmentType: equipmentType as any };

    const schedules = await prisma.maintenanceSchedule.findMany({
      where,
      include: {
        dispenser: { 
          select: { 
            id: true, 
            marca: true, 
            modelo: true, 
            equipmentType: true,
            criticality: true,
            technicalSpecs: true,
            client: { select: { id: true, nombre: true } },
            plant: { select: { id: true, nombre: true, client: { select: { id: true, nombre: true } } } },
            location: { 
              include: { 
                plant: { select: { id: true, nombre: true, client: { select: { id: true, nombre: true } } } },
                sector: { select: { nombre: true } }
              } 
            } 
          } 
        },
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
