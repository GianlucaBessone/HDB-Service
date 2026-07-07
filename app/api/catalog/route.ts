import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await requirePermission('stock:read');
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');

  try {
    const catalog = await prisma.materialCatalog.findMany({
      where: { 
        active: true,
        ...(clientId ? { clientId } : {})
      },
      include: {
        client: { select: { nombre: true } }
      },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(catalog);
  } catch (error) {
    console.error('[API] GET /api/catalog error:', error);
    return NextResponse.json({ error: 'Error al obtener catálogo' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await requirePermission('clients:write');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { code, nombre, type, requiresSerial, expirationMonths, clientId } = body;

    if (!code || !nombre || !type || !clientId) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const existing = await prisma.materialCatalog.findUnique({
      where: { code: code.trim() }
    });
    if (existing) {
      return NextResponse.json({ error: 'El código de material ya existe' }, { status: 400 });
    }

    const item = await prisma.materialCatalog.create({
      data: {
        code: code.trim(),
        nombre: nombre.trim(),
        type,
        requiresSerial: !!requiresSerial,
        expirationMonths: expirationMonths ? parseInt(expirationMonths) : null,
        clientId,
      },
      include: { client: { select: { nombre: true } } }
    });

    return NextResponse.json(item);
  } catch (error: any) {
    console.error('[API] POST /api/catalog error:', error);
    return NextResponse.json({ error: error.message || 'Error al crear catálogo' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await requirePermission('clients:write');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { id, code, nombre, type, expirationMonths, clientId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID del item' }, { status: 400 });
    }

    const item = await prisma.materialCatalog.update({
      where: { id },
      data: {
        ...(code ? { code: code.trim() } : {}),
        ...(nombre ? { nombre: nombre.trim() } : {}),
        ...(type ? { type } : {}),
        ...(clientId ? { clientId } : {}),
        expirationMonths: expirationMonths != null ? (expirationMonths || null) : undefined,
      },
      include: { client: { select: { nombre: true } } }
    });

    return NextResponse.json(item);
  } catch (error: any) {
    console.error('[API] PUT /api/catalog error:', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar' }, { status: 500 });
  }
}
