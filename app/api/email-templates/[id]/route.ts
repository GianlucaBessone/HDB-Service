import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole('ADMIN', 'SUPERVISOR');
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await req.json();
    const template = await prisma.emailTemplate.update({
      where: { id: params.id },
      data: {
        subject: data.subject,
        body: data.body,
        active: data.active !== undefined ? data.active : true,
      }
    });
    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar plantilla' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole('ADMIN', 'SUPERVISOR');
  if (auth instanceof NextResponse) return auth;

  try {
    await prisma.emailTemplate.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar plantilla' }, { status: 500 });
  }
}
