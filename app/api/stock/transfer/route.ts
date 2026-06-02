import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/stock/transfer — List transfers
export async function GET(req: Request) {
  const user = await requirePermission('stock:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');

    const where: any = {};
    if (user.role === 'CLIENT_REQUESTER') {
      where.OR = [
        { fromPlantId: { in: user.plantIds } },
        { toPlantId: { in: user.plantIds } }
      ];
    } else if (user.role === 'CLIENT_RESPONSIBLE' && user.clientId) {
      where.OR = [
        { fromPlant: { clientId: user.clientId } },
        { toPlant: { clientId: user.clientId } }
      ];
    }

    if (plantId) {
      // Further filter if a specific plant was requested
      if (where.OR) {
         where.AND = [
           { OR: where.OR },
           { OR: [{ fromPlantId: plantId }, { toPlantId: plantId }] }
         ];
         delete where.OR;
      } else {
        where.OR = [{ fromPlantId: plantId }, { toPlantId: plantId }];
      }
    }

    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: {
        fromPlant: { select: { nombre: true } },
        toPlant: { select: { nombre: true } },
        transferredBy: { select: { nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    await revalidateTag('stock', 'default');
    return NextResponse.json(transfers);
  } catch (error) {
    console.error('[API] GET /api/stock/transfer error:', error);
    await revalidateTag('stock', 'default');
    return NextResponse.json({ error: 'Error al obtener transferencias' }, { status: 500 });
  }
}

// POST /api/stock/transfer
export async function POST(req: Request) {
  const user = await requirePermission('stock:transfer');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { fromPlantId, toPlantId, itemType, materialCode, nombre, cantidad } = body;

    if (!fromPlantId || !toPlantId || !itemType || !materialCode || !cantidad) {
      await revalidateTag('stock', 'default');
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    if (cantidad <= 0) {
      await revalidateTag('stock', 'default');
    return NextResponse.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 });
    }

    if (fromPlantId === toPlantId) {
      await revalidateTag('stock', 'default');
    return NextResponse.json({ error: 'No se puede transferir a la misma planta' }, { status: 400 });
    }

    // Verify source stock
    const sourceStock = await prisma.stockEntry.findUnique({
      where: { plantId_itemType_materialCode: { plantId: fromPlantId, itemType, materialCode } },
    });

    if (!sourceStock || sourceStock.cantidad < cantidad) {
      await revalidateTag('stock', 'default');
    return NextResponse.json({ error: 'Stock insuficiente en la planta origen' }, { status: 400 });
    }

    // Get target plant details to ensure we know the client
    const targetPlant = await prisma.plant.findUnique({
      where: { id: toPlantId },
      select: { clientId: true },
    });

    if (!targetPlant) {
      await revalidateTag('stock', 'default');
    return NextResponse.json({ error: 'Planta destino no encontrada' }, { status: 404 });
    }

    const transfer = await prisma.$transaction(async (tx) => {
      // 1. Reduce source stock
      await tx.stockEntry.update({
        where: { id: sourceStock.id },
        data: { cantidad: sourceStock.cantidad - cantidad },
      });

      // 2. Increase target stock (or create entry)
      await tx.stockEntry.upsert({
        where: { plantId_itemType_materialCode: { plantId: toPlantId, itemType, materialCode } },
        update: { cantidad: { increment: cantidad } },
        create: {
          clientId: targetPlant.clientId,
          plantId: toPlantId,
          itemType,
          materialCode,
          nombre: nombre || sourceStock.nombre,
          cantidad,
          minLevel: 0,
          maxLevel: 0,
          unidad: sourceStock.unidad,
        },
      });

      // 3. Create transfer record
      const newTransfer = await tx.stockTransfer.create({
        data: {
          fromPlantId,
          toPlantId,
          itemType,
          materialCode,
          nombre: nombre || sourceStock.nombre,
          cantidad,
          status: 'COMPLETED',
          transferredById: user.id,
          completedAt: new Date(),
        },
      });

      // 4. Auto-resolve debts (if fromPlant owed toPlant)
      const pendingDebts = await tx.interPlantDebt.findMany({
        where: {
          debtorPlantId: fromPlantId,
          creditorPlantId: toPlantId,
          materialCode: materialCode,
          status: 'PENDING'
        },
        orderBy: { createdAt: 'asc' }
      });

      let remainingToResolve = cantidad;
      for (const debt of pendingDebts) {
        if (remainingToResolve >= debt.cantidad) {
          // Resolve full debt
          await tx.interPlantDebt.update({
            where: { id: debt.id },
            data: { status: 'RESOLVED', resolvedAt: new Date() }
          });
          remainingToResolve -= debt.cantidad;
        } else if (remainingToResolve > 0) {
          // Partially resolve debt (split it)
          await tx.interPlantDebt.update({
            where: { id: debt.id },
            data: { cantidad: debt.cantidad - remainingToResolve }
          });
          await tx.interPlantDebt.create({
            data: {
              creditorPlantId: debt.creditorPlantId,
              debtorPlantId: debt.debtorPlantId,
              materialCode: debt.materialCode,
              nombre: debt.nombre,
              consumableId: debt.consumableId,
              cantidad: remainingToResolve,
              status: 'RESOLVED',
              resolvedAt: new Date()
            }
          });
          remainingToResolve = 0;
        }
        if (remainingToResolve <= 0) break;
      }

      return newTransfer;
    });

    await createAuditLog({
      userId: user.id, userName: user.nombre,
      action: 'TRANSFER', entity: 'STOCK', entityId: transfer.id,
      newValue: transfer,
    });

    await revalidateTag('stock', 'default');
    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/stock/transfer error:', error);
    await revalidateTag('stock', 'default');
    return NextResponse.json({ error: 'Error al procesar transferencia' }, { status: 500 });
  }
}
