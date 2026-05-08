import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, canAccessClient } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

// GET /api/clients/[id]
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const user = await requirePermission('clients:read');
  if (user instanceof NextResponse) return user;

  try {
    const client = await prisma.client.findUnique({
      where: { id: id },
      include: {
        plants: {
          where: { active: true },
          include: {
            _count: { select: { locations: true } },
          },
          orderBy: { nombre: 'asc' },
        },
        _count: { select: { users: true } },
        slaConfig: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    if (!canAccessClient(user, client.id)) {
      return NextResponse.json({ error: 'Sin acceso a este cliente' }, { status: 403 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('[API] GET /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 });
  }
}

// PUT /api/clients/[id]
export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const user = await requirePermission('clients:write');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { nombre, email, telefono, direccion, active } = body;

    const existing = await prisma.client.findUnique({ where: { id: id } });
    if (!existing) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const updated = await prisma.client.update({
      where: { id: id },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(telefono !== undefined && { telefono: telefono?.trim() || null }),
        ...(direccion !== undefined && { direccion: direccion?.trim() || null }),
        ...(active !== undefined && { active }),
      },
    });

    await createAuditLog({
      userId: user.id,
      userName: user.nombre,
      action: 'UPDATE',
      entity: 'CLIENT',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PUT /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}

// DELETE /api/clients/[id] — soft delete
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const user = await requirePermission('clients:write');
  if (user instanceof NextResponse) return user;

  try {
    const updated = await prisma.client.update({
      where: { id: id },
      data: { active: false },
    });

    await createAuditLog({
      userId: user.id,
      userName: user.nombre,
      action: 'DELETE',
      entity: 'CLIENT',
      entityId: id,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] DELETE /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
  }
}
