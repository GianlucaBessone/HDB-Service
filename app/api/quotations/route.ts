import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getDataFilter } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/quotations
export async function GET(req: Request) {
  const user = await requirePermission('quotations:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const dispenserId = searchParams.get('dispenserId');
    const ticketId = searchParams.get('ticketId');
    const clientId = searchParams.get('clientId');

    const where: any = {
      ...getDataFilter(user, { clientIdField: 'clientId' }),
    };

    if (status) where.status = status;
    if (dispenserId) where.dispenserId = dispenserId;
    if (ticketId) where.ticketId = ticketId;
    if (clientId && !user.clientId) where.clientId = clientId;

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        client: { select: { id: true, nombre: true } },
        dispenser: { 
          select: { 
            id: true, 
            marca: true, 
            modelo: true, 
            equipmentType: true,
            criticality: true,
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(quotations);
  } catch (error) {
    console.error('[API] GET /api/quotations error:', error);
    return NextResponse.json({ error: 'Error al obtener cotizaciones' }, { status: 500 });
  }
}

// POST /api/quotations
export async function POST(req: Request) {
  const user = await requirePermission('quotations:write');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const {
      clientId,
      dispenserId,
      ticketId,
      titulo,
      descripcion,
      moneda = 'ARS',
      items = [],
      notes,
    } = body;

    if (!titulo?.trim()) {
      return NextResponse.json({ error: 'El título de la cotización es obligatorio' }, { status: 400 });
    }

    // Determine target client
    let resolvedClientId = user.clientId || clientId;
    if (!resolvedClientId && dispenserId) {
      const asset = await prisma.dispenser.findUnique({
        where: { id: dispenserId },
        select: { clientId: true, location: { select: { plant: { select: { clientId: true } } } } }
      });
      resolvedClientId = asset?.clientId || asset?.location?.plant?.clientId;
    }

    if (!resolvedClientId) {
      return NextResponse.json({ error: 'Debe especificar o asociar un cliente a la cotización' }, { status: 400 });
    }

    // Calculate total from items
    const calculatedTotal = items.reduce(
      (acc: number, item: any) => acc + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 
      0
    );

    const quotation = await prisma.quotation.create({
      data: {
        clientId: resolvedClientId,
        dispenserId: dispenserId || null,
        ticketId: ticketId || null,
        createdByUserId: user.id,
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || null,
        moneda,
        total: calculatedTotal,
        items: items,
        status: 'DRAFT',
        notes: notes?.trim() || null,
      },
      include: {
        client: { select: { id: true, nombre: true } },
        dispenser: { select: { id: true, marca: true, modelo: true, equipmentType: true } },
      }
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/quotations error:', error);
    return NextResponse.json({ error: 'Error al crear cotización' }, { status: 500 });
  }
}
