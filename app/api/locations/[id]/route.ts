import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

// PUT /api/locations/[id]
export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const user = await requirePermission('locations:write');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { nombre, plantId, sectorId, piso, area, descripcion, active } = body;

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) { return NextResponse.json({ error: 'Ubicación no encontrada' }, { status: 404 }); }

    const updated = await prisma.location.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(plantId !== undefined && { plantId }),
        ...(sectorId !== undefined && { sectorId: sectorId || null }),
        ...(piso !== undefined && { piso: piso?.trim() || null }),
        ...(area !== undefined && { area: area?.trim() || null }),
        ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
        ...(active !== undefined && { active }),
      },
    });

    await createAuditLog({
      userId: user.id, userName: user.nombre,
      action: 'UPDATE', entity: 'LOCATION', entityId: id,
      oldValue: existing, newValue: updated,
    });

    await revalidateTag('locations', 'default');
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PUT /api/locations/[id] error:', error);
    await revalidateTag('locations', 'default');
    return NextResponse.json({ error: 'Error al actualizar ubicación' }, { status: 500 });
  }
}

// DELETE /api/locations/[id]
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const user = await requirePermission('locations:write');
  if (user instanceof NextResponse) return user;

  try {
    const updated = await prisma.location.update({
      where: { id },
      data: { active: false },
    });

    await createAuditLog({
      userId: user.id, userName: user.nombre,
      action: 'DELETE', entity: 'LOCATION', entityId: id,
    });

    await revalidateTag('locations', 'default');
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] DELETE /api/locations/[id] error:', error);
    await revalidateTag('locations', 'default');
    return NextResponse.json({ error: 'Error al eliminar ubicación' }, { status: 500 });
  }
}
