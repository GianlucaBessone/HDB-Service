import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

// POST /api/stock/debts/[id]/resolve
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requirePermission('stock:write');
  if (user instanceof NextResponse) return user;

  try {
    const debt = await prisma.interPlantDebt.findUnique({
      where: { id: params.id },
    });

    if (!debt) {
      return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 });
    }

    if (debt.status === 'RESOLVED') {
      return NextResponse.json({ error: 'La deuda ya está resuelta' }, { status: 400 });
    }

    const resolvedDebt = await prisma.interPlantDebt.update({
      where: { id: params.id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
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
