import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const auth = await requireRole('ADMIN', 'SUPERVISOR');
  if (auth instanceof NextResponse) return auth;

  const templates = await prisma.emailTemplate.findMany({
    orderBy: { type: 'asc' }
  });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const auth = await requireRole('ADMIN', 'SUPERVISOR');
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await req.json();
    const template = await prisma.emailTemplate.create({
      data: {
        type: data.type,
        subject: data.subject,
        body: data.body,
      }
    });
    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear plantilla' }, { status: 500 });
  }
}
