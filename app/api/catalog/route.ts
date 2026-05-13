import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await requirePermission('stock:read');
  if (user instanceof NextResponse) return user;

  try {
    const catalog = await prisma.materialCatalog.findMany({
      where: { active: true },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(catalog);
  } catch (error) {
    console.error('[API] GET /api/catalog error:', error);
    return NextResponse.json({ error: 'Error al obtener catálogo' }, { status: 500 });
  }
}
