import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { withIdempotency } from '@/lib/idempotency';
import { createAuditLog } from '@/lib/audit';

// GET /api/plants — List plants
export async function GET(req: Request) {
  const user = await requirePermission('plants:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    const where: any = { active: true };
    if (clientId) where.clientId = clientId;

    // Client scope
    if ((user.role === 'CLIENT_RESPONSIBLE') && user.clientId) {
      where.clientId = user.clientId;
    } else if (user.role === 'CLIENT_REQUESTER') {
      const access = await prisma.userPlantAccess.findMany({
        where: { userId: user.id }, select: { plantId: true },
      });
      where.id = { in: access.map(a => a.plantId) };
    }

    const plants = await prisma.plant.findMany({
      where,
      include: {
        client: { select: { id: true, nombre: true } },
        _count: { select: { locations: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json(plants);
  } catch (error) {
    console.error('[API] GET /api/plants error:', error);
    return NextResponse.json({ error: 'Error al obtener plantas' }, { status: 500 });
  }
}

// POST /api/plants
export async function POST(req: Request) {
  const user = await requirePermission('plants:write');
  if (user instanceof NextResponse) return user;

  return withIdempotency(req, async () => {
    try {
      const body = await req.json();
      const { clientId, nombre, direccion, lat, lng } = body;

      if (!clientId || !nombre?.trim()) {
        return NextResponse.json({ error: 'clientId y nombre son requeridos' }, { status: 400 });
      }

      const plant = await prisma.plant.create({
        data: {
          clientId,
          nombre: nombre.trim(),
          direccion: direccion?.trim() || null,
          lat: lat || null,
          lng: lng || null,
        },
      });

      await createAuditLog({
        userId: user.id, userName: user.nombre,
        action: 'CREATE', entity: 'PLANT', entityId: plant.id,
        newValue: plant,
      });

      return NextResponse.json(plant, { status: 201 });
    } catch (error) {
      console.error('[API] POST /api/plants error:', error);
      return NextResponse.json({ error: 'Error al crear planta' }, { status: 500 });
    }
  });
}
