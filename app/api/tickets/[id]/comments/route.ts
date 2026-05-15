import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export const revalidate = 300; // 5 min

// GET /api/tickets/[id]/comments
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requirePermission('tickets:read');
  if (user instanceof NextResponse) return user;

  try {
    const comments = await prisma.ticketComment.findMany({
      where: { ticketId: params.id },
      include: { user: { select: { nombre: true, apellido: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(comments);
  } catch (error) {
    console.error('[API] GET /api/tickets/[id]/comments error:', error);
    await revalidateTag('tickets', 'default');
    return NextResponse.json({ error: 'Error al obtener comentarios' }, { status: 500 });
  }
}

// POST /api/tickets/[id]/comments
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requirePermission('tickets:write');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { message } = body;

    if (!message?.trim()) {
      await revalidateTag('tickets', 'default');
    return NextResponse.json({ error: 'El mensaje es requerido' }, { status: 400 });
    }

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: params.id,
        userId: user.id,
        message: message.trim(),
      },
      include: { user: { select: { nombre: true, apellido: true, role: true } } },
    });

    await revalidateTag('tickets', 'default');
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/tickets/[id]/comments error:', error);
    await revalidateTag('tickets', 'default');
    return NextResponse.json({ error: 'Error al crear comentario' }, { status: 500 });
  }
}
