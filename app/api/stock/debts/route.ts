import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

// GET /api/stock/debts
export async function GET(req: Request) {
  const user = await requirePermission('stock:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');
    const status = searchParams.get('status') || 'PENDING';

    const where: any = { status };

    if (plantId) {
      where.OR = [
        { creditorPlantId: plantId },
        { debtorPlantId: plantId },
      ];
    }

    const debts = await prisma.interPlantDebt.findMany({
      where,
      include: {
        creditorPlant: { select: { nombre: true } },
        debtorPlant: { select: { nombre: true } },
        dispenserBlocked: { select: { id: true, marca: true, modelo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(debts);
  } catch (error) {
    console.error('[API] GET /api/stock/debts error:', error);
    return NextResponse.json({ error: 'Error al obtener deudas' }, { status: 500 });
  }
}
