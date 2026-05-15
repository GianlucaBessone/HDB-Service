import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { withIdempotency } from '@/lib/idempotency';
import { createAuditLog } from '@/lib/audit';

export const revalidate = 300; // 5 min

// GET /api/sectors — List sectors, optionally filtered by plant
export async function GET(req: Request) {
  const user = await requirePermission('sectors:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');

    if (plantId) {
      // Return sectors associated with a specific plant
      const plantSectors = await prisma.plantSector.findMany({
        where: { plantId },
        include: {
          sector: true,
        },
        orderBy: { sector: { nombre: 'asc' } },
      });
      await revalidateTag('sectors', 'default');
    return NextResponse.json(plantSectors.map(ps => ps.sector));
    }

    // Return all sectors
    const sectors = await prisma.sector.findMany({
      where: { active: true },
      include: {
        _count: { select: { locations: true, plants: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    await revalidateTag('sectors', 'default');
    return NextResponse.json(sectors);
  } catch (error) {
    console.error('[API] GET /api/sectors error:', error);
    await revalidateTag('sectors', 'default');
    return NextResponse.json({ error: 'Error al obtener sectores' }, { status: 500 });
  }
}

// POST /api/sectors — Create a new sector
export async function POST(req: Request) {
  const user = await requirePermission('sectors:write');
  if (user instanceof NextResponse) return user;

  return withIdempotency(req, async () => {
    try {
      const body = await req.json();
      const { nombre, descripcion } = body;

      if (!nombre?.trim()) {
        await revalidateTag('sectors', 'default');
    return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 });
      }

      const sector = await prisma.sector.create({
        data: {
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
        },
      });

      await createAuditLog({
        userId: user.id,
        userName: user.nombre,
        action: 'CREATE',
        entity: 'SECTOR',
        entityId: sector.id,
        newValue: sector,
      });

      await revalidateTag('sectors', 'default');
    return NextResponse.json(sector, { status: 201 });
    } catch (error) {
      console.error('[API] POST /api/sectors error:', error);
      await revalidateTag('sectors', 'default');
    return NextResponse.json({ error: 'Error al crear sector' }, { status: 500 });
    }
  });
}
