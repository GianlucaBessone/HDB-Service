import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/quotations/[id]
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requirePermission('quotations:read');
  if (user instanceof NextResponse) return user;

  try {
    const { id } = params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, nombre: true, email: true, direccion: true, telefono: true } },
        dispenser: { 
          select: { 
            id: true, 
            marca: true, 
            modelo: true, 
            equipmentType: true,
            criticality: true,
            technicalSpecs: true,
            location: {
              include: {
                plant: { select: { nombre: true } },
                sector: { select: { nombre: true } },
              }
            }
          } 
        },
        ticket: { select: { id: true, reason: true, status: true, priority: true } },
        createdByUser: { select: { id: true, nombre: true, email: true } },
      }
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    if (user.clientId && quotation.clientId !== user.clientId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json(quotation);
  } catch (error) {
    console.error('[API] GET /api/quotations/[id] error:', error);
    return NextResponse.json({ error: 'Error al consultar cotización' }, { status: 500 });
  }
}

// PUT /api/quotations/[id]
export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requirePermission('quotations:write');
  if (user instanceof NextResponse) return user;

  try {
    const { id } = params;
    const body = await req.json();
    const { titulo, descripcion, moneda, items, status, notes, orderNumber } = body;

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    const data: any = {};
    if (titulo !== undefined) data.titulo = titulo.trim();
    if (descripcion !== undefined) data.descripcion = descripcion?.trim() || null;
    if (moneda !== undefined) data.moneda = moneda;
    if (notes !== undefined) data.notes = notes?.trim() || null;
    if (orderNumber !== undefined) data.orderNumber = orderNumber?.trim() || null;
    if (status !== undefined) data.status = status;

    if (items !== undefined && Array.isArray(items)) {
      data.items = items;
      data.total = items.reduce(
        (acc: number, item: any) => acc + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 
        0
      );
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, nombre: true } },
        dispenser: { select: { id: true, marca: true, modelo: true, equipmentType: true } },
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PUT /api/quotations/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar cotización' }, { status: 500 });
  }
}

// DELETE /api/quotations/[id]
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requirePermission('quotations:write');
  if (user instanceof NextResponse) return user;

  try {
    const { id } = params;
    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    if (existing.status === 'APPROVED') {
      return NextResponse.json({ error: 'No se puede eliminar una cotización que ya fue aprobada con OC' }, { status: 400 });
    }

    await prisma.quotation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/quotations/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar cotización' }, { status: 500 });
  }
}
