import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export const revalidate = 300; // 5 min

export async function POST(req: Request) {
  const user = await requirePermission('maintenance:write');
  if (user instanceof NextResponse) return user;

  try {
    const { scheduleIds } = await req.json();

    if (!Array.isArray(scheduleIds) || scheduleIds.length === 0) {
      await revalidateTag('maintenance', 'default');
    return NextResponse.json({ error: 'Se requieren IDs de mantenimientos completados' }, { status: 400 });
    }

    // Verify all schedules are COMPLETED
    const schedules = await prisma.maintenanceSchedule.findMany({
      where: { id: { in: scheduleIds } }
    });

    if (schedules.some(s => s.status !== 'COMPLETED')) {
      await revalidateTag('maintenance', 'default');
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

    await revalidateTag('maintenance', 'default');
    return NextResponse.json({ id: approval.id });
  } catch (error) {
    console.error('[API] POST /api/maintenance/approvals error:', error);
    await revalidateTag('maintenance', 'default');
    return NextResponse.json({ error: 'Error al crear la aprobación' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const user = await requirePermission('maintenance:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const where: any = {
      signatureData: { not: null }
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerIdentity: { contains: search, mode: 'insensitive' } },
        { schedules: { some: { dispenserId: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    if (plantId) {
      where.schedules = {
        some: {
          dispenser: {
            location: { plantId }
          }
        }
      };
    }

    const approvals = await prisma.maintenanceApproval.findMany({
      where,
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

    await revalidateTag('maintenance', 'default');
    return NextResponse.json(approvals);
  } catch (error) {
    console.error('[API] GET /api/maintenance/approvals error:', error);
    await revalidateTag('maintenance', 'default');
    return NextResponse.json({ error: 'Error al obtener aprobaciones' }, { status: 500 });
  }
}
