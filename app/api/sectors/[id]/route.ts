import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

// PUT /api/sectors/[id]
export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const user = await requirePermission('sectors:write');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { nombre, descripcion, active } = body;

    const existing = await prisma.sector.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Sector no encontrado' }, { status: 404 });

    const updated = await prisma.sector.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
        ...(active !== undefined && { active }),
      },
    });

    await createAuditLog({
      userId: user.id, userName: user.nombre,
      action: 'UPDATE', entity: 'SECTOR', entityId: id,
      oldValue: existing, newValue: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PUT /api/sectors/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar sector' }, { status: 500 });
  }
}

// DELETE /api/sectors/[id]
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const user = await requirePermission('sectors:write');
  if (user instanceof NextResponse) return user;

  try {
    const updated = await prisma.sector.update({
      where: { id },
      data: { active: false },
    });

    await createAuditLog({
      userId: user.id, userName: user.nombre,
      action: 'DELETE', entity: 'SECTOR', entityId: id,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] DELETE /api/sectors/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar sector' }, { status: 500 });
  }
}
