import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { withIdempotency } from '@/lib/idempotency';
import { createAuditLog } from '@/lib/audit';

// GET /api/dispensers — List dispensers with filters
export async function GET(req: Request) {
  const user = await requirePermission('dispensers:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const plantId = searchParams.get('plantId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = { active: true };

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { marca: { contains: search, mode: 'insensitive' } },
        { modelo: { contains: search, mode: 'insensitive' } },
        { numeroSerie: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Scope by plant/client
    if (plantId) {
      where.location = { plantId };
    } else if (clientId) {
      where.location = { plant: { clientId } };
    }

    // Client users: scope to their client
    if ((user.role === 'CLIENT_RESPONSIBLE' || user.role === 'CLIENT_REQUESTER') && user.clientId) {
      where.location = { ...where.location, plant: { ...where.location?.plant, clientId: user.clientId } };
    }

    const [dispensers, total] = await Promise.all([
      prisma.dispenser.findMany({
        where,
        include: {
          location: {
            include: {
              plant: { include: { client: { select: { id: true, nombre: true } } } },
              sector: { select: { id: true, nombre: true } },
            },
          },
          _count: {
            select: { tickets: true, repairHistory: true, maintenanceSchedules: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dispenser.count({ where }),
    ]);

    return NextResponse.json({ dispensers, total, page, limit });
  } catch (error) {
    console.error('[API] GET /api/dispensers error:', error);
    return NextResponse.json({ error: 'Error al obtener dispensers' }, { status: 500 });
  }
}

// POST /api/dispensers — Create a new dispenser
export async function POST(req: Request) {
  const user = await requirePermission('dispensers:write');
  if (user instanceof NextResponse) return user;

  return withIdempotency(req, async () => {
    try {
      const body = await req.json();
      const { id, marca, modelo, lifecycleMonths, numeroSerie, fechaCompra, notas } = body;

      if (!id?.trim() || !marca?.trim() || !modelo?.trim()) {
        return NextResponse.json(
          { error: 'ID, marca y modelo son requeridos' },
          { status: 400 }
        );
      }

      // Check ID uniqueness
      const existing = await prisma.dispenser.findUnique({ where: { id: id.trim() } });
      if (existing) {
        return NextResponse.json(
          { error: `Ya existe un dispenser con ID "${id}"` },
          { status: 409 }
        );
      }

      const dispenser = await prisma.dispenser.create({
        data: {
          id: id.trim(),
          marca: marca.trim(),
          modelo: modelo.trim(),
          lifecycleMonths: lifecycleMonths || 60,
          numeroSerie: numeroSerie?.trim() || null,
          fechaCompra: fechaCompra ? new Date(fechaCompra) : null,
          notas: notas?.trim() || null,
          status: 'BACKUP', // Starts in backup until assigned
        },
      });

      await createAuditLog({
        userId: user.id,
        userName: user.nombre,
        action: 'CREATE',
        entity: 'DISPENSER',
        entityId: dispenser.id,
        newValue: dispenser,
      });

      return NextResponse.json(dispenser, { status: 201 });
    } catch (error) {
      console.error('[API] POST /api/dispensers error:', error);
      return NextResponse.json({ error: 'Error al crear dispenser' }, { status: 500 });
    }
  });
}
