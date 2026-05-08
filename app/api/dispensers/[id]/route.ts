import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

// GET /api/dispensers/[id]
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await requirePermission('dispensers:read');
  if (user instanceof NextResponse) return user;

  try {
    const dispenser = await prisma.dispenser.findUnique({
      where: { id: params.id },
      include: {
        location: {
          include: {
            plant: { include: { client: true } },
            sector: true,
          },
        },
        locationHistory: {
          include: {
            location: { include: { plant: { select: { nombre: true } } } },
            assignedBy: { select: { nombre: true } },
          },
          orderBy: { assignedAt: 'desc' },
          take: 20,
        },
        repairHistory: {
          include: { technician: { select: { nombre: true } } },
          orderBy: { startDate: 'desc' },
          take: 20,
        },
        consumableHistory: {
          orderBy: { installedAt: 'desc' },
          take: 20,
        },
        sparePartHistory: {
          orderBy: { replacedAt: 'desc' },
          take: 20,
        },
        maintenanceSchedules: {
          include: { checklist: true },
          orderBy: { scheduledMonth: 'desc' },
          take: 12,
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            reason: true,
            priority: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: { tickets: true, repairHistory: true },
        },
      },
    });

    if (!dispenser) {
      return NextResponse.json({ error: 'Dispenser no encontrado' }, { status: 404 });
    }

    // Calculate lifecycle expiration
    let lifecycleExpiration: Date | null = null;
    let lifecycleRemainingDays: number | null = null;

    if (dispenser.lifecycleStartDate) {
      const totalDays = dispenser.lifecycleMonths * 30;
      const effectiveDays = totalDays + dispenser.lifecycleAccumulatedPauseDays;
      lifecycleExpiration = new Date(dispenser.lifecycleStartDate);
      lifecycleExpiration.setDate(lifecycleExpiration.getDate() + effectiveDays);

      // If currently paused, don't count time since pause
      if (dispenser.lifecyclePausedAt) {
        const pausedDays = Math.floor(
          (Date.now() - dispenser.lifecyclePausedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        lifecycleExpiration.setDate(lifecycleExpiration.getDate() + pausedDays);
      }

      lifecycleRemainingDays = Math.max(
        0,
        Math.floor((lifecycleExpiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      );
    }

    return NextResponse.json({
      ...dispenser,
      lifecycleExpiration,
      lifecycleRemainingDays,
    });
  } catch (error) {
    console.error('[API] GET /api/dispensers/[id] error:', error);
    return NextResponse.json({ error: 'Error al obtener dispenser' }, { status: 500 });
  }
}

// PUT /api/dispensers/[id]
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await requirePermission('dispensers:write');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { marca, modelo, lifecycleMonths, numeroSerie, notas, active } = body;

    const existing = await prisma.dispenser.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Dispenser no encontrado' }, { status: 404 });
    }

    const updated = await prisma.dispenser.update({
      where: { id: params.id },
      data: {
        ...(marca !== undefined && { marca: marca.trim() }),
        ...(modelo !== undefined && { modelo: modelo.trim() }),
        ...(lifecycleMonths !== undefined && { lifecycleMonths }),
        ...(numeroSerie !== undefined && { numeroSerie: numeroSerie?.trim() || null }),
        ...(notas !== undefined && { notas: notas?.trim() || null }),
        ...(active !== undefined && { active }),
      },
    });

    await createAuditLog({
      userId: user.id,
      userName: user.nombre,
      action: 'UPDATE',
      entity: 'DISPENSER',
      entityId: params.id,
      oldValue: existing,
      newValue: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PUT /api/dispensers/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar dispenser' }, { status: 500 });
  }
}
