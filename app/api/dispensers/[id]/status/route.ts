import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { DispenserStatus } from '@prisma/client';

/**
 * PUT /api/dispensers/[id]/status — Change dispenser status.
 *
 * Status transitions:
 *   IN_SERVICE → UNDER_REPAIR | BACKUP | BLOCKED | OUT_OF_SERVICE
 *   UNDER_REPAIR → IN_SERVICE | BACKUP | OUT_OF_SERVICE
 *   BACKUP → IN_SERVICE (lifecycle resumes)
 *   BLOCKED → IN_SERVICE (requires OC release from CLIENT_RESPONSIBLE or ADMIN)
 *   OUT_OF_SERVICE → BACKUP | IN_SERVICE
 *
 * Special:
 *   → BACKUP: lifecycle PAUSES (record lifecyclePausedAt)
 *   → IN_SERVICE from BACKUP: lifecycle RESUMES
 *   → BLOCKED: requires blockedReason
 */
export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requirePermission('dispensers:status');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { status, reason } = body;

    if (!status || !Object.values(DispenserStatus).includes(status)) {
      return NextResponse.json(
        { error: `Estado inválido. Valores: ${Object.values(DispenserStatus).join(', ')}` },
        { status: 400 }
      );
    }

    const dispenser = await prisma.dispenser.findUnique({ where: { id: params.id } });
    if (!dispenser) {
      return NextResponse.json({ error: 'Dispenser no encontrado' }, { status: 404 });
    }

    // Special permission check: releasing BLOCKED requires dispensers:release_block
    if (dispenser.status === 'BLOCKED' && status === 'IN_SERVICE') {
      const releaseUser = await requirePermission('dispensers:release_block');
      if (releaseUser instanceof NextResponse) return releaseUser;
    }

    const updateData: any = { status };

    // Handle BLOCKED
    if (status === 'BLOCKED') {
      if (!reason?.trim()) {
        return NextResponse.json({ error: 'Motivo de bloqueo requerido' }, { status: 400 });
      }
      updateData.blockedReason = reason.trim();
      updateData.blockedAt = new Date();
    }

    // Handle BACKUP → pause lifecycle
    if (status === 'BACKUP' && dispenser.status !== 'BACKUP') {
      updateData.lifecyclePausedAt = new Date();
      // Remove from location
      if (dispenser.locationId) {
        updateData.locationId = null;
        await prisma.dispenserLocationHistory.updateMany({
          where: { dispenserId: params.id, removedAt: null },
          data: { removedAt: new Date() },
        });
      }
    }

    // Handle resuming from BACKUP
    if (dispenser.status === 'BACKUP' && status !== 'BACKUP' && dispenser.lifecyclePausedAt) {
      const pausedDays = Math.floor(
        (Date.now() - dispenser.lifecyclePausedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      updateData.lifecycleAccumulatedPauseDays = dispenser.lifecycleAccumulatedPauseDays + pausedDays;
      updateData.lifecyclePausedAt = null;
    }

    // Handle release from BLOCKED
    if (dispenser.status === 'BLOCKED' && status !== 'BLOCKED') {
      updateData.blockedReason = null;
      updateData.blockedAt = null;
    }

    // Handle UNDER_REPAIR — remove from location
    if (status === 'UNDER_REPAIR' && dispenser.locationId) {
      updateData.locationId = null;
      await prisma.dispenserLocationHistory.updateMany({
        where: { dispenserId: params.id, removedAt: null },
        data: { removedAt: new Date() },
      });
    }

    const updated = await prisma.dispenser.update({
      where: { id: params.id },
      data: updateData,
    });

    await createAuditLog({
      userId: user.id,
      userName: user.nombre,
      action: 'STATUS_CHANGE',
      entity: 'DISPENSER',
      entityId: params.id,
      oldValue: { status: dispenser.status },
      newValue: { status, reason },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PUT /api/dispensers/[id]/status error:', error);
    return NextResponse.json({ error: 'Error al cambiar estado' }, { status: 500 });
  }
}

// PATCH is an alias for PUT (frontend compatibility)
export { PUT as PATCH };
