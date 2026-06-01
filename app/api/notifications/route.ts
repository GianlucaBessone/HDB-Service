import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const revalidate = 0; // Don't cache notifications API

// GET /api/notifications
export async function GET(req: Request) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        read: false,
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('[API] GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 });
  }
}

// PUT /api/notifications - Mark as read
export async function PUT(req: Request) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { id, all } = body;

    if (all) {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
    } else if (id) {
      await prisma.notification.update({
        where: { id, userId: user.id },
        data: { read: true },
      });
    } else {
      return NextResponse.json({ error: 'Falta id o flag all' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] PUT /api/notifications error:', error);
    return NextResponse.json({ error: 'Error al actualizar notificaciones' }, { status: 500 });
  }
}

// DELETE /api/notifications - Delete notification(s)
export async function DELETE(req: Request) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  try {
    let id: string | null = null;
    let all = false;
    try {
      const body = await req.json();
      id = body.id;
      all = body.all;
    } catch {
      const { searchParams } = new URL(req.url);
      id = searchParams.get('id');
      all = searchParams.get('all') === 'true';
    }

    if (all) {
      await prisma.notification.deleteMany({
        where: { userId: user.id },
      });
    } else if (id) {
      await prisma.notification.delete({
        where: { id, userId: user.id },
      });
    } else {
      return NextResponse.json({ error: 'Falta id o flag all' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/notifications error:', error);
    return NextResponse.json({ error: 'Error al eliminar notificaciones' }, { status: 500 });
  }
}

