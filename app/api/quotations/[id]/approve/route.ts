import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/quotations/[id]/approve
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requirePermission('quotations:approve');
  if (user instanceof NextResponse) return user;

  try {
    const { id } = params;
    const body = await req.json();
    const { orderNumber, approvedBy, notes } = body;

    if (!orderNumber?.trim()) {
      return NextResponse.json({ error: 'El número de Orden de Compra (OC) es obligatorio para aprobar' }, { status: 400 });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { ticket: true }
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    if (user.clientId && quotation.clientId !== user.clientId) {
      return NextResponse.json({ error: 'No tiene permiso para aprobar cotizaciones de otro cliente' }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update quotation
      const quote = await tx.quotation.update({
        where: { id },
        data: {
          status: 'APPROVED',
          orderNumber: orderNumber.trim(),
          approvedAt: new Date(),
          approvedBy: approvedBy?.trim() || user.nombre,
          notes: notes ? `${quotation.notes ? quotation.notes + '\n' : ''}[OC ${orderNumber}]: ${notes}` : quotation.notes,
        }
      });

      // 2. If tied to a ticket, add status comment
      if (quotation.ticketId) {
        await tx.ticketComment.create({
          data: {
            ticketId: quotation.ticketId,
            userId: user.id,
            message: `📄 PRESUPUESTO APROBADO: Se vinculó la Orden de Compra (OC) N° ${orderNumber.trim()} por un total de ${quote.moneda} ${quote.total.toLocaleString()}. Aprobado por: ${approvedBy?.trim() || user.nombre}.`
          }
        });
      }

      return quote;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] POST /api/quotations/[id]/approve error:', error);
    return NextResponse.json({ error: 'Error al aprobar cotización con Orden de Compra' }, { status: 500 });
  }
}
