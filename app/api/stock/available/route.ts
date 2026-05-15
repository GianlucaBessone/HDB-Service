import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export const revalidate = 300; // 5 min


export async function GET(req: Request) {
  const user = await requirePermission('stock:read');
  if (user instanceof NextResponse) {
    console.log('[API] GET /api/stock/available - Auth/Permission failed:', user.status);
    return user;
  }

  try {
    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');

    const whereStock: any = { itemType: { in: ['CONSUMABLE', 'SPARE_PART'] }, cantidad: { gt: 0 } };
    const whereCons: any = { active: true, uniqueId: { not: null } };

    if (plantId && plantId !== 'all') {
      whereStock.plantId = plantId;
      whereCons.plantId = plantId;
    }

    // Get bulk stock (cantidad > 0)
    const stockEntries = await prisma.stockEntry.findMany({
      where: whereStock,
      select: { materialCode: true, nombre: true, cantidad: true, plantId: true }
    });

    // Get active serialized consumables
    const serialized = await prisma.consumable.findMany({
      where: whereCons,
      select: { id: true, materialCode: true, nombre: true, uniqueId: true, expirationMonths: true, plantId: true }
    });

    // Group serialized by materialCode to deduct from bulk options
    const serializedCounts: Record<string, number> = {};
    for (const item of serialized) {
      serializedCounts[item.materialCode] = (serializedCounts[item.materialCode] || 0) + 1;
    }

    // Combine them into a simple list of options for the UI
    const options: any[] = [];

    for (const entry of stockEntries) {
      const serialCount = serializedCounts[entry.materialCode] || 0;
      const bulkCount = entry.cantidad - serialCount;

      if (bulkCount > 0) {
        options.push({
          type: 'BULK',
          plantId: entry.plantId,
          materialCode: entry.materialCode,
          nombre: entry.nombre,
          maxQuantity: bulkCount,
          label: `${entry.materialCode} - ${entry.nombre} (Stock: ${bulkCount})`
        });
      }
    }

    for (const s of serialized) {
      options.push({
        type: 'SERIALIZED',
        id: s.id,
        plantId: s.plantId,
        materialCode: s.materialCode,
        nombre: s.nombre,
        uniqueId: s.uniqueId,
        expirationMonths: s.expirationMonths,
        maxQuantity: 1,
        label: `[${s.uniqueId}] ${s.nombre}`
      });
    }

    return NextResponse.json(options);
  } catch (error) {
    console.error('[API] GET /api/stock/available error:', error);
    return NextResponse.json({ error: 'Error al obtener stock disponible' }, { status: 500 });
  }
}
