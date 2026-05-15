import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

// PUT /api/plants/[id]
export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const user = await requirePermission('plants:write');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { nombre, direccion, clientId, active } = body;

    const existing = await prisma.plant.findUnique({ where: { id } });
    if (!existing) { return NextResponse.json({ error: 'Planta no encontrada' }, { status: 404 }); }

    const updated = await prisma.plant.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(direccion !== undefined && { direccion: direccion?.trim() || null }),
        ...(clientId !== undefined && { clientId }),
        ...(active !== undefined && { active }),
      },
    });

    await createAuditLog({
      userId: user.id, userName: user.nombre,
      action: 'UPDATE', entity: 'PLANT', entityId: id,
      oldValue: existing, newValue: updated,
    });

    await revalidateTag('plants', 'default');
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PUT /api/plants/[id] error:', error);
    await revalidateTag('plants', 'default');
    return NextResponse.json({ error: 'Error al actualizar planta' }, { status: 500 });
  }
}

// DELETE /api/plants/[id]
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const user = await requirePermission('plants:write');
  if (user instanceof NextResponse) return user;

  try {
    const updated = await prisma.plant.update({
      where: { id },
      data: { active: false },
    });

    await createAuditLog({
      userId: user.id, userName: user.nombre,
      action: 'DELETE', entity: 'PLANT', entityId: id,
    });

    await revalidateTag('plants', 'default');
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] DELETE /api/plants/[id] error:', error);
    await revalidateTag('plants', 'default');
    return NextResponse.json({ error: 'Error al eliminar planta' }, { status: 500 });
  }
}
