import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

// GET /api/stock/transfer — List transfers
export async function GET(req: Request) {
  const user = await requirePermission('stock:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');

    const where: any = {};
    if (plantId) {
      where.OR = [{ fromPlantId: plantId }, { toPlantId: plantId }];
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

    return NextResponse.json(transfers);
  } catch (error) {
    console.error('[API] GET /api/stock/transfer error:', error);
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
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    if (cantidad <= 0) {
      return NextResponse.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 });
    }

    if (fromPlantId === toPlantId) {
      return NextResponse.json({ error: 'No se puede transferir a la misma planta' }, { status: 400 });
    }

    // Verify source stock
    const sourceStock = await prisma.stockEntry.findUnique({
      where: { plantId_itemType_materialCode: { plantId: fromPlantId, itemType, materialCode } },
    });

    if (!sourceStock || sourceStock.cantidad < cantidad) {
      return NextResponse.json({ error: 'Stock insuficiente en la planta origen' }, { status: 400 });
    }

    // Get target plant details to ensure we know the client
    const targetPlant = await prisma.plant.findUnique({
      where: { id: toPlantId },
      select: { clientId: true },
    });

    if (!targetPlant) {
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
      return tx.stockTransfer.create({
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
    });

    await createAuditLog({
      userId: user.id, userName: user.nombre,
      action: 'TRANSFER', entity: 'STOCK', entityId: transfer.id,
      newValue: transfer,
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/stock/transfer error:', error);
    return NextResponse.json({ error: 'Error al procesar transferencia' }, { status: 500 });
  }
}
