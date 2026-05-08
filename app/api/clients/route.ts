import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { withIdempotency } from '@/lib/idempotency';
import { createAuditLog } from '@/lib/audit';

// GET /api/clients — List all clients
export async function GET() {
  const user = await requirePermission('clients:read');
  if (user instanceof NextResponse) return user;

  try {
    const where: any = { active: true };

    // Client users can only see their own client
    if (user.role === 'CLIENT_RESPONSIBLE' || user.role === 'CLIENT_REQUESTER') {
      if (!user.clientId) return NextResponse.json([]);
      where.id = user.clientId;
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        _count: { select: { plants: true, users: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('[API] GET /api/clients error:', error);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

// POST /api/clients — Create a new client
export async function POST(req: Request) {
  const user = await requirePermission('clients:write');
  if (user instanceof NextResponse) return user;

  return withIdempotency(req, async () => {
    try {
      const body = await req.json();
      const { nombre, email, telefono, direccion } = body;

      if (!nombre?.trim()) {
        return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
      }

      const client = await prisma.client.create({
        data: {
          nombre: nombre.trim(),
          email: email?.trim() || null,
          telefono: telefono?.trim() || null,
          direccion: direccion?.trim() || null,
        },
      });

      await createAuditLog({
        userId: user.id,
        userName: user.nombre,
        action: 'CREATE',
        entity: 'CLIENT',
        entityId: client.id,
        newValue: client,
      });

      return NextResponse.json(client, { status: 201 });
    } catch (error) {
      console.error('[API] POST /api/clients error:', error);
      return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
    }
  });
}
