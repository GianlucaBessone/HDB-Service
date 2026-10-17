import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getDataFilter } from '@/lib/auth';
import { withIdempotency } from '@/lib/idempotency';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function logToFile(msg: string) {
  console.log(`[API] ${msg}`);
}

// GET /api/dispensers — List dispensers with filters
export async function GET(req: Request) {
  const startTime = Date.now();
  logToFile('GET /api/dispensers START');
  
  const user = await requirePermission('dispensers:read');
  if (user instanceof NextResponse) {
    logToFile('GET /api/dispensers: requirePermission failed');
    return user;
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const equipmentType = searchParams.get('equipmentType');
    const criticality = searchParams.get('criticality');
    const clientId = searchParams.get('clientId');
    const plantId = searchParams.get('plantId');
    const search = searchParams.get('search');
    logToFile(`GET /api/dispensers: status=${status}, equipmentType=${equipmentType}, clientId=${clientId}, plantId=${plantId}, search=${search}`);

    const where: any = { 
      active: true,
      ...getDataFilter(user, {
        plantIdField: 'plantId', // Owned by his plants
        locationPlantIdField: 'location', // Currently in his plants
      })
    };
    if (status) where.status = status;
    if (equipmentType) where.equipmentType = equipmentType;
    if (criticality) where.criticality = criticality;
    if (plantId) {
      where.OR = [
        { plantId },
        { location: { plantId } }
      ];
    }
    if (clientId && !user.clientId) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { clientId },
            { location: { plant: { clientId } } },
            { plant: { clientId } }
          ]
        }
      ];
    }
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { marca: { contains: search, mode: 'insensitive' } },
        { modelo: { contains: search, mode: 'insensitive' } },
        { numeroSerie: { contains: search, mode: 'insensitive' } },
      ];
    }

    logToFile('GET /api/dispensers: Fetching from Prisma');
    const [dispensers, total] = await Promise.all([
      prisma.dispenser.findMany({
        where,
        include: {
          client: { select: { id: true, nombre: true } },
          location: {
            include: {
              plant: { include: { client: { select: { id: true, nombre: true } } } },
              sector: { select: { id: true, nombre: true } },
            },
          },
          plant: { 
            select: { 
              id: true, 
              nombre: true, 
              clientId: true,
              client: { select: { id: true, nombre: true } }
            } 
          }, // Owner plant
          _count: {
            select: { tickets: true }, // Optimized: only count tickets for the list view
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      prisma.dispenser.count({ where }),
    ]);

    const duration = Date.now() - startTime;
    logToFile(`GET /api/dispensers: SUCCESS, found ${dispensers.length} dispensers in ${duration}ms`);
    return NextResponse.json({ dispensers, equipments: dispensers, assets: dispensers, total });
  } catch (error: any) {
    logToFile(`GET /api/dispensers: ERROR: ${error.message}`);
    console.error('[API] GET /api/dispensers error:', error);
    return NextResponse.json({ error: 'Error al obtener equipos' }, { status: 500 });
  }
}

// POST /api/dispensers — Create a new dispenser
export async function POST(req: Request) {
  const user = await requirePermission('dispensers:write');
  if (user instanceof NextResponse) return user;

  return withIdempotency(req, async () => {
    try {
      const body = await req.json();
      let { 
        id, 
        equipmentType = 'DISPENSER',
        criticality = 'MEDIUM',
        marca, 
        modelo, 
        lifecycleMonths, 
        numeroSerie, 
        fechaCompra, 
        notas, 
        clientId,
        plantId,
        technicalSpecs 
      } = body;

      if (!id?.trim() || !marca?.trim() || !modelo?.trim()) {
        return NextResponse.json(
          { error: 'ID, marca y modelo son requeridos' },
          { status: 400 }
        );
      }

      // If user is a client responsible/requester, force their clientId
      if (user.clientId) {
        clientId = user.clientId;
      } else if (!clientId && plantId) {
        const pl = await prisma.plant.findUnique({ where: { id: plantId }, select: { clientId: true } });
        if (pl) clientId = pl.clientId;
      }

      // Check ID uniqueness
      const existing = await prisma.dispenser.findUnique({ where: { id: id.trim() } });
      if (existing) {
        return NextResponse.json(
          { error: `Ya existe un equipo con ID "${id}"` },
          { status: 409 }
        );
      }

      const dispenser = await prisma.$transaction(async (tx) => {
        const d = await tx.dispenser.create({
          data: {
            id: id.trim(),
            equipmentType,
            criticality: criticality as any,
            marca: marca.trim(),
            modelo: modelo.trim(),
            lifecycleMonths: lifecycleMonths || 60,
            numeroSerie: numeroSerie?.trim() || null,
            fechaCompra: fechaCompra ? new Date(fechaCompra) : null,
            notas: notas?.trim() || null,
            clientId: clientId || null,
            plantId: plantId || null,
            technicalSpecs: technicalSpecs || null,
            status: 'BACKUP', // Starts in backup until assigned
          },
          include: {
            client: { select: { id: true, nombre: true } },
            plant: {
              include: { client: true }
            }
          }
        });

        return d;
      });

      await createAuditLog({
        userId: user.id,
        userName: user.nombre,
        action: 'CREATE',
        entity: 'DISPENSER',
        entityId: dispenser.id,
        newValue: dispenser,
      });

      revalidateTag('dispensers', 'default');
    return NextResponse.json(dispenser, { status: 201 });
    } catch (error) {
      console.error('[API] POST /api/dispensers error:', error);
    return NextResponse.json({ error: 'Error al crear equipo' }, { status: 500 });
    }
  });
}
