import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await requirePermission('maintenance:write');
  if (user instanceof NextResponse) return user;

  try {
    const { scheduleIds } = await req.json();

    if (!Array.isArray(scheduleIds) || scheduleIds.length === 0) {
      return NextResponse.json({ error: 'Se requieren IDs de mantenimientos completados' }, { status: 400 });
    }

    // Verify all schedules are COMPLETED
    const schedules = await prisma.maintenanceSchedule.findMany({
      where: { id: { in: scheduleIds } }
    });

    if (schedules.some(s => s.status !== 'COMPLETED')) {
      return NextResponse.json({ error: 'Todos los mantenimientos seleccionados deben estar completados' }, { status: 400 });
    }

    // Create the approval intent (empty signature)
    const approval = await prisma.maintenanceApproval.create({
      data: {
        technicianId: user.id,
        schedules: {
          connect: scheduleIds.map(id => ({ id }))
        }
      }
    });

    return NextResponse.json({ id: approval.id });
  } catch (error) {
    console.error('[API] POST /api/maintenance/approvals error:', error);
    return NextResponse.json({ error: 'Error al crear la aprobación' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const user = await requirePermission('maintenance:read');
  if (user instanceof NextResponse) return user;

  try {
    const approvals = await prisma.maintenanceApproval.findMany({
      where: {
        signatureData: { not: null }
      },
      include: {
        technician: {
          select: { nombre: true, email: true }
        },
        schedules: {
          include: {
            dispenser: {
              include: {
                location: {
                  include: { plant: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(approvals);
  } catch (error) {
    console.error('[API] GET /api/maintenance/approvals error:', error);
    return NextResponse.json({ error: 'Error al obtener aprobaciones' }, { status: 500 });
  }
}
