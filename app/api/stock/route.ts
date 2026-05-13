import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/stock
export async function GET(req: Request) {
  const user = await requirePermission('stock:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const plantId = searchParams.get('plantId');
    const itemType = searchParams.get('itemType');
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';

    const where: any = {};
    if (user.role !== 'ADMIN' && user.role !== 'SUPERVISOR' && user.role !== 'TECHNICIAN') {
      where.clientId = user.clientId;
    } else if (clientId) {
      where.clientId = clientId;
    }

    if (plantId) where.plantId = plantId;
    if (itemType) where.itemType = itemType;

    const entries = await prisma.stockEntry.findMany({
      where,
      include: {
        client: { select: { nombre: true } },
        plant: { select: { nombre: true } },
      },
      orderBy: [{ plant: { nombre: 'asc' } }, { nombre: 'asc' }],
    });

    // Fetch serial numbers for consumable entries
    const consWhere: any = { active: true, uniqueId: { not: null } };
    if (plantId) consWhere.plantId = plantId;
    
    const consumables = await prisma.consumable.findMany({
      where: consWhere,
      select: { uniqueId: true, materialCode: true, plantId: true },
    });

    // Map serial numbers by plantId+materialCode
    const serialMap: Record<string, string[]> = {};
    for (const c of consumables) {
      const key = `${c.plantId}|${c.materialCode}`;
      if (!serialMap[key]) serialMap[key] = [];
      if (c.uniqueId) serialMap[key].push(c.uniqueId);
    }

    // Attach serial numbers to entries
    const enriched = entries.map(e => ({
      ...e,
      serialNumbers: serialMap[`${e.plantId}|${e.materialCode}`] || [],
    }));

    // Post-filter low stock
    const result = lowStockOnly
      ? enriched.filter(e => e.cantidad < e.minLevel)
      : enriched;

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] GET /api/stock error:', error);
    return NextResponse.json({ error: 'Error al obtener stock' }, { status: 500 });
  }
}


// POST /api/stock — Create or update stock entry
export async function POST(req: Request) {
  const user = await requirePermission('stock:write');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { clientId, plantId, materialCode, cantidad, minLevel, maxLevel, unidad, uniqueId } = body;

    if (!clientId || !plantId || !materialCode) {
      return NextResponse.json(
        { error: 'clientId, plantId y materialCode son requeridos' },
        { status: 400 }
      );
    }

    // Fetch material from catalog to ensure it's standardized
    const catalogItem = await prisma.materialCatalog.findUnique({
      where: { code: materialCode.trim() }
    });

    if (!catalogItem) {
      return NextResponse.json({ error: 'Código de material no encontrado en el catálogo estandarizado.' }, { status: 400 });
    }

    // If it's a serialized material, create the consumable record first
    if (catalogItem.requiresSerial && uniqueId) {
      const existing = await prisma.consumable.findUnique({ where: { uniqueId: uniqueId.trim() } });
      if (existing) {
        return NextResponse.json({ error: 'Ese N° de Serie ya está registrado.' }, { status: 400 });
      }
      await prisma.consumable.create({
        data: {
          uniqueId: uniqueId.trim(),
          materialCode: catalogItem.code,
          nombre: catalogItem.nombre,
          plantId,
          expirationMonths: catalogItem.expirationMonths,
        }
      });
    } else if (catalogItem.requiresSerial && !uniqueId) {
      return NextResponse.json({ error: 'Este material requiere un número de serie.' }, { status: 400 });
    }

    // For serialized, we always ADD 1. For bulk, we INCREMENT to avoid overwriting existing stock
    const isSerialized = catalogItem.requiresSerial;
    const amount = isSerialized ? 1 : (parseFloat(cantidad) || 0);

    const entry = await prisma.stockEntry.upsert({
      where: {
        plantId_itemType_materialCode: { 
          plantId, 
          itemType: catalogItem.type as any, 
          materialCode: catalogItem.code 
        },
      },
      update: {
        cantidad: { increment: amount },
        minLevel: minLevel ?? undefined,
        maxLevel: maxLevel ?? undefined,
        nombre: catalogItem.nombre,
        unidad: unidad || 'unidad',
      },
      create: {
        clientId,
        plantId,
        itemType: catalogItem.type as any,
        materialCode: catalogItem.code,
        nombre: catalogItem.nombre,
        cantidad: amount,
        minLevel: minLevel ?? 0,
        maxLevel: maxLevel ?? 0,
        unidad: unidad || 'unidad',
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error('[API] POST /api/stock error:', error?.message || error);
    return NextResponse.json({ error: 'Error al gestionar stock' }, { status: 500 });
  }
}
