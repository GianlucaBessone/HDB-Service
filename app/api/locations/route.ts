import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { withIdempotency } from '@/lib/idempotency';
import { createAuditLog } from '@/lib/audit';

export const revalidate = 300; // 5 min

// GET /api/locations
export async function GET(req: Request) {
  const user = await requirePermission('locations:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');
    const sectorId = searchParams.get('sectorId');

    const where: any = { active: true };
    if (plantId) where.plantId = plantId;
    if (sectorId) where.sectorId = sectorId;

    const locations = await prisma.location.findMany({
      where,
      include: {
        plant: { select: { id: true, nombre: true, client: { select: { nombre: true } } } },
        sector: { select: { id: true, nombre: true } },
        dispensers: {
          where: { status: 'IN_SERVICE' },
          select: { id: true, marca: true, modelo: true, status: true },
        },
      },
    });

    // Natural sort by plant name then location name
    locations.sort((a, b) => {
      const plantCmp = a.plant.nombre.localeCompare(b.plant.nombre, undefined, { numeric: true });
      if (plantCmp !== 0) return plantCmp;
      return a.nombre.localeCompare(b.nombre, undefined, { numeric: true });
    });

    await revalidateTag('locations', 'default');
    return NextResponse.json(locations);
  } catch (error) {
    console.error('[API] GET /api/locations error:', error);
    await revalidateTag('locations', 'default');
    return NextResponse.json({ error: 'Error al obtener ubicaciones' }, { status: 500 });
  }
}

// POST /api/locations
export async function POST(req: Request) {
  const user = await requirePermission('locations:write');
  if (user instanceof NextResponse) return user;

  return withIdempotency(req, async () => {
    try {
      const body = await req.json();
      let { id, plantId, sectorId, nombre, piso, area, descripcion } = body;

      if (!plantId || !nombre?.trim()) {
        await revalidateTag('locations', 'default');
    return NextResponse.json(
          { error: 'plantId y nombre son requeridos' },
          { status: 400 }
        );
      }

      // AUTO-INCREMENTAL ID LOGIC
      if (!id || !id.trim()) {
        const lastLocation = await prisma.location.findFirst({
          where: { id: { startsWith: 'LOC-' } },
          orderBy: { id: 'desc' },
        });

        if (lastLocation) {
          const match = lastLocation.id.match(/LOC-(\d+)/);
          if (match) {
            const nextNum = parseInt(match[1]) + 1;
            id = `LOC-${nextNum.toString().padStart(3, '0')}`;
          } else {
            id = `LOC-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          }
        } else {
          id = 'LOC-001';
        }
      }

      // Verify ID uniqueness (GLOBAL)
      const existing = await prisma.location.findUnique({ where: { id: id.trim() } });
      if (existing) {
        // If auto-generated failed or manual collision
        await revalidateTag('locations', 'default');
    return NextResponse.json(
          { error: `Ya existe una ubicación con ID "${id}"` },
          { status: 409 }
        );
      }

      const location = await prisma.location.create({
        data: {
          id: id.trim(),
          plantId,
          sectorId: sectorId || null,
          nombre: nombre.trim(),
          piso: piso?.trim() || null,
          area: area?.trim() || null,
          descripcion: descripcion?.trim() || null,
        },
      });

      await createAuditLog({
        userId: user.id, userName: user.nombre,
        action: 'CREATE', entity: 'LOCATION', entityId: location.id,
        newValue: location,
      });

      await revalidateTag('locations', 'default');
    return NextResponse.json(location, { status: 201 });
    } catch (error) {
      console.error('[API] POST /api/locations error:', error);
      await revalidateTag('locations', 'default');
    return NextResponse.json({ error: 'Error al crear ubicación' }, { status: 500 });
    }
  });
}
