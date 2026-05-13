import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { withIdempotency } from '@/lib/idempotency';
import { createAuditLog } from '@/lib/audit';
import fs from 'fs';
import path from 'path';

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
    const search = searchParams.get('search');
    logToFile(`GET /api/dispensers: status=${status}, search=${search}`);

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

    logToFile('GET /api/dispensers: Fetching from Prisma');
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
          plant: { select: { id: true, nombre: true } }, // Owner plant
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
    return NextResponse.json({ dispensers, total });
  } catch (error: any) {
    logToFile(`GET /api/dispensers: ERROR: ${error.message}`);
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
      const { id, marca, modelo, lifecycleMonths, numeroSerie, fechaCompra, notas, initialConsumables, plantId } = body;

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

      const dispenser = await prisma.$transaction(async (tx) => {
        const d = await tx.dispenser.create({
          data: {
            id: id.trim(),
            marca: marca.trim(),
            modelo: modelo.trim(),
            lifecycleMonths: lifecycleMonths || 60,
            numeroSerie: numeroSerie?.trim() || null,
            fechaCompra: fechaCompra ? new Date(fechaCompra) : null,
            notas: notas?.trim() || null,
            plantId: plantId || null,
            status: 'BACKUP', // Starts in backup until assigned
          },
        });

        // Record initial consumables if provided
        if (initialConsumables && Array.isArray(initialConsumables)) {
          for (const item of initialConsumables) {
            if (!item.materialCode) continue;

            const catalogItem = await tx.materialCatalog.findUnique({
              where: { code: item.materialCode }
            });

            if (catalogItem) {
              const expiresAt = catalogItem.expirationMonths 
                ? new Date(new Date().setMonth(new Date().getMonth() + catalogItem.expirationMonths))
                : null;

              await tx.dispenserConsumableHistory.create({
                data: {
                  dispenserId: d.id,
                  materialCode: item.materialCode,
                  nombre: catalogItem.nombre,
                  consumableId: null, // Since it's factory included, it might not be in our physical stock yet
                  installedById: user.id,
                  expiresAt,
                  // Optionally record serial if provided
                  ...(item.serialNumber && { nombre: `${catalogItem.nombre} (S/N: ${item.serialNumber})` })
                }
              });
            }
          }
        }
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

      return NextResponse.json(dispenser, { status: 201 });
    } catch (error) {
      console.error('[API] POST /api/dispensers error:', error);
      return NextResponse.json({ error: 'Error al crear dispenser' }, { status: 500 });
    }
  });
}
