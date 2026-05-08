import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

// POST /api/stock/debts/[id]/resolve
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requirePermission('stock:write');
  if (user instanceof NextResponse) return user;

  try {
    const debt = await prisma.interPlantDebt.findUnique({
      where: { id: params.id },
      include: { dispenserBlocked: true },
    });

    if (!debt) {
      return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 });
    }

    if (debt.status === 'RESOLVED') {
      return NextResponse.json({ error: 'La deuda ya está resuelta' }, { status: 400 });
    }

    const resolvedDebt = await prisma.$transaction(async (tx) => {
      // 1. Resolve debt
      const updatedDebt = await tx.interPlantDebt.update({
        where: { id: params.id },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });

      // 2. Unblock dispenser if it was blocked by this debt
      if (debt.dispenserBlockedId && debt.dispenserBlocked?.status === 'BLOCKED') {
        await tx.dispenser.update({
          where: { id: debt.dispenserBlockedId },
          data: {
            status: 'IN_SERVICE',
            blockedReason: null,
            blockedAt: null,
          },
        });

        // Log unblock
        await tx.auditLog.create({
          data: {
            userId: user.id, userName: user.nombre,
            action: 'RELEASE', entity: 'DISPENSER', entityId: debt.dispenserBlockedId,
            newValue: { reason: 'Debt resolved' },
          },
        });
      }

      return updatedDebt;
    });

    await createAuditLog({
      userId: user.id, userName: user.nombre,
      action: 'UPDATE', entity: 'INTER_PLANT_DEBT', entityId: params.id,
      oldValue: { status: 'PENDING' }, newValue: { status: 'RESOLVED' },
    });

    return NextResponse.json(resolvedDebt);
  } catch (error) {
    console.error('[API] POST /api/stock/debts/[id]/resolve error:', error);
    return NextResponse.json({ error: 'Error al resolver deuda' }, { status: 500 });
  }
}
