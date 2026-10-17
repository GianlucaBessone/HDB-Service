import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requirePermission, getDataFilter } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/dispensers/[id]
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const user = await requirePermission('dispensers:read');
  if (user instanceof NextResponse) return user;

  try {
    const dispenser = await prisma.dispenser.findUnique({
      where: { 
        id: id,
        ...getDataFilter(user, {
          plantIdField: 'plantId',
          locationPlantIdField: 'location',
        })
      },
      include: {
        client: { select: { id: true, nombre: true, email: true } },
        location: {
          include: {
            plant: { include: { client: true } },
            sector: true,
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
        locationHistory: {
          include: {
            location: { include: { plant: { select: { nombre: true } } } },
            assignedBy: { select: { nombre: true } },
          },
          orderBy: { assignedAt: 'desc' },
          take: 20,
        },
        repairHistory: {
          include: { technician: { select: { nombre: true } } },
          orderBy: { startDate: 'desc' },
          take: 20,
        },
        consumableHistory: {
          orderBy: { installedAt: 'desc' },
        },
        sparePartHistory: {
          orderBy: { replacedAt: 'desc' },
          take: 20,
        },
        maintenanceSchedules: {
          include: { checklist: true },
          orderBy: { scheduledMonth: 'desc' },
          take: 12,
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            reason: true,
            priority: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: { tickets: true, repairHistory: true },
        },
      },
    });

    if (!dispenser) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    // Calculate lifecycle expiration
    let lifecycleExpiration: Date | null = null;
    let lifecycleRemainingDays: number | null = null;

    if (dispenser.lifecycleStartDate) {
      const totalDays = dispenser.lifecycleMonths * 30;
      const effectiveDays = totalDays + dispenser.lifecycleAccumulatedPauseDays;
      lifecycleExpiration = new Date(dispenser.lifecycleStartDate);
      lifecycleExpiration.setDate(lifecycleExpiration.getDate() + effectiveDays);

      // If currently paused, don't count time since pause
      if (dispenser.lifecyclePausedAt) {
        const pausedDays = Math.floor(
          (Date.now() - dispenser.lifecyclePausedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        lifecycleExpiration.setDate(lifecycleExpiration.getDate() + pausedDays);
      }

      lifecycleRemainingDays = Math.max(
        0,
        Math.floor((lifecycleExpiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      );
    }

    return NextResponse.json({
      ...dispenser,
      lifecycleExpiration,
      lifecycleRemainingDays,
    });
  } catch (error) {
    console.error('[API] GET /api/dispensers/[id] error:', error);
    return NextResponse.json({ error: 'Error al obtener equipo' }, { status: 500 });
  }
}

// PUT /api/dispensers/[id]
export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const user = await requirePermission('dispensers:write');
  if (user instanceof NextResponse) return user;

  const isAdmin = user.role === 'ADMIN';

  try {
    const body = await req.json();
    const { 
      marca, 
      modelo, 
      equipmentType,
      criticality,
      technicalSpecs,
      lifecycleMonths, 
      numeroSerie, 
      fechaCompra, 
      notas, 
      active, 
      clientId,
      plantId, 
      lifecycleStartDate 
    } = body;

    const existing = await prisma.dispenser.findUnique({ where: { id: id } });
    if (!existing) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    let resolvedClientId = clientId !== undefined ? (clientId || null) : undefined;
    if (resolvedClientId === undefined && plantId) {
      const plant = await prisma.plant.findUnique({ where: { id: plantId }, select: { clientId: true } });
      if (plant?.clientId) {
        resolvedClientId = plant.clientId;
      }
    }

    const updated = await prisma.dispenser.update({
      where: { id: id },
      data: {
        ...(marca !== undefined && { marca: marca.trim() }),
        ...(modelo !== undefined && { modelo: modelo.trim() }),
        ...(equipmentType !== undefined && { equipmentType: equipmentType as any }),
        ...(criticality !== undefined && { criticality: criticality as any }),
        ...(technicalSpecs !== undefined && { technicalSpecs }),
        ...(lifecycleMonths !== undefined && { lifecycleMonths }),
        ...(numeroSerie !== undefined && { numeroSerie: numeroSerie?.trim() || null }),
        ...(fechaCompra !== undefined && { fechaCompra: fechaCompra ? new Date(fechaCompra) : null }),
        ...(notas !== undefined && { notas: notas?.trim() || null }),
        ...(active !== undefined && { active }),
        ...(resolvedClientId !== undefined && { clientId: resolvedClientId }),
        ...(plantId !== undefined && { plantId: plantId || null }),
        ...(isAdmin && !existing.lifecycleStartDate && lifecycleStartDate !== undefined && { lifecycleStartDate: lifecycleStartDate ? new Date(lifecycleStartDate) : null }),
      },
    });

    await createAuditLog({
      userId: user.id,
      userName: user.nombre,
      action: 'UPDATE',
      entity: 'DISPENSER',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });

    revalidateTag('dispensers', 'default');
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PUT /api/dispensers/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar equipo' }, { status: 500 });
  }
}

// DELETE /api/dispensers/[id]
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  // Only ADMIN can delete
  const user = await requirePermission('dispensers:write');
  if (user instanceof NextResponse) return user;
  
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sólo administradores pueden eliminar equipos' }, { status: 403 });
  }

  try {
    const existing = await prisma.dispenser.findUnique({ where: { id: id } });
    if (!existing) {
    return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    await prisma.dispenser.delete({
      where: { id: id },
    });

    await createAuditLog({
      userId: user.id,
      userName: user.nombre,
      action: 'DELETE',
      entity: 'DISPENSER',
      entityId: id,
      oldValue: existing,
    });

    revalidateTag('dispensers', 'default');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/dispensers/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar equipo' }, { status: 500 });
  }
}
