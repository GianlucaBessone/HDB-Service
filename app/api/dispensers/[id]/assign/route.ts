import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

/**
 * POST /api/dispensers/[id]/assign — Assign dispenser to a location.
 *
 * Business rules:
 * - Only 1 dispenser per location at a time
 * - Location must exist and be active
 * - Dispenser must not already be assigned to another location (unless force=true)
 * - Sets lifecycle start date if first assignment
 * - Resumes lifecycle if coming from BACKUP
 */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const user = await requirePermission('dispensers:assign');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { locationId, force } = body;

    if (!locationId) {
      await revalidateTag('dispensers', 'default');
    return NextResponse.json({ error: 'locationId es requerido' }, { status: 400 });
    }

    const [dispenser, location] = await Promise.all([
      prisma.dispenser.findUnique({ where: { id: params.id } }),
      prisma.location.findUnique({
        where: { id: locationId },
        include: { dispensers: { where: { status: 'IN_SERVICE' } } },
      }),
    ]);

    if (!dispenser) {
      await revalidateTag('dispensers', 'default');
    return NextResponse.json({ error: 'Dispenser no encontrado' }, { status: 404 });
    }
    if (!location) {
      await revalidateTag('dispensers', 'default');
    return NextResponse.json({ error: 'Ubicación no encontrada' }, { status: 404 });
    }

    // Check: only 1 active dispenser per location
    if (location.dispensers.length > 0 && location.dispensers[0].id !== params.id) {
      await revalidateTag('dispensers', 'default');
    return NextResponse.json(
        { error: `La ubicación ya tiene un dispenser activo: ${location.dispensers[0].id}` },
        { status: 409 }
      );
    }

    // If dispenser is currently assigned somewhere else, close that assignment
    if (dispenser.locationId && dispenser.locationId !== locationId) {
      if (!force) {
        await revalidateTag('dispensers', 'default');
    return NextResponse.json(
          { error: 'El dispenser ya está asignado a otra ubicación. Use force=true para reasignar.' },
          { status: 409 }
        );
      }
      // Close previous location history
      await prisma.dispenserLocationHistory.updateMany({
        where: { dispenserId: params.id, removedAt: null },
        data: { removedAt: new Date() },
      });
    }

    // Handle lifecycle pause/resume
    let lifecycleUpdate: any = {};

    if (dispenser.status === 'BACKUP' && dispenser.lifecyclePausedAt) {
      // Resume lifecycle: accumulate paused days
      const pausedDays = Math.floor(
        (Date.now() - dispenser.lifecyclePausedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      lifecycleUpdate = {
        lifecycleAccumulatedPauseDays: dispenser.lifecycleAccumulatedPauseDays + pausedDays,
        lifecyclePausedAt: null,
      };
    }

    if (!dispenser.lifecycleStartDate) {
      lifecycleUpdate.lifecycleStartDate = new Date();
    }

    // Perform assignment
    const updated = await prisma.$transaction(async (tx) => {
      // Update dispenser
      const d = await tx.dispenser.update({
        where: { id: id },
        data: {
          locationId,
          status: 'IN_SERVICE',
          blockedReason: null,
          blockedAt: null,
          ...lifecycleUpdate,
        },
      });

      // Create location history entry
      await tx.dispenserLocationHistory.create({
        data: {
          dispenserId: params.id,
          locationId,
          assignedById: user.id,
        },
      });

      return d;
    });

    await createAuditLog({
      userId: user.id,
      userName: user.nombre,
      action: 'ASSIGN',
      entity: 'DISPENSER',
      entityId: params.id,
      newValue: { locationId, status: 'IN_SERVICE' },
    });

    await revalidateTag('dispensers', 'default');
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] POST /api/dispensers/[id]/assign error:', error);
    await revalidateTag('dispensers', 'default');
    return NextResponse.json({ error: 'Error al asignar dispenser' }, { status: 500 });
  }
}
