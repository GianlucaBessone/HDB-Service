import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export const revalidate = 300; // 5 min

// GET /api/stock/debts
export async function GET(req: Request) {
  const user = await requirePermission('stock:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');
    const status = searchParams.get('status') || 'PENDING';

    const where: any = { status };

    if (user.role === 'CLIENT_REQUESTER') {
      where.OR = [
        { creditorPlantId: { in: user.plantIds } },
        { debtorPlantId: { in: user.plantIds } }
      ];
    } else if (user.role === 'CLIENT_RESPONSIBLE' && user.clientId) {
      where.OR = [
        { creditorPlant: { clientId: user.clientId } },
        { debtorPlant: { clientId: user.clientId } }
      ];
    }

    if (plantId) {
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: [{ creditorPlantId: plantId }, { debtorPlantId: plantId }] }
        ];
        delete where.OR;
      } else {
        where.OR = [
          { creditorPlantId: plantId },
          { debtorPlantId: plantId },
        ];
      }
    }

    const debts = await prisma.interPlantDebt.findMany({
      where,
      include: {
        creditorPlant: { select: { nombre: true } },
        debtorPlant: { select: { nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(debts);
  } catch (error) {
    console.error('[API] GET /api/stock/debts error:', error);
    return NextResponse.json({ error: 'Error al obtener deudas' }, { status: 500 });
  }
}
