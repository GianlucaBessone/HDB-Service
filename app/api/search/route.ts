import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ equipments: [], clients: [], tickets: [] });
    }

    const [equipments, clients, tickets] = await Promise.all([
      // 1. Equipos / Dispensers
      prisma.dispenser.findMany({
        where: {
          OR: [
            { id: { contains: query, mode: 'insensitive' } },
            { modelo: { contains: query, mode: 'insensitive' } },
            { marca: { contains: query, mode: 'insensitive' } },
            { location: { nombre: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: {
          location: {
            include: {
              plant: {
                include: { client: true },
              },
            },
          },
        },
        take: 6,
      }),

      // 2. Clientes
      prisma.client.findMany({
        where: {
          OR: [
            { nombre: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 4,
      }),

      // 3. Tickets
      prisma.ticket.findMany({
        where: {
          OR: [
            { id: { contains: query, mode: 'insensitive' } },
            { reason: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          dispenser: true,
          location: {
            include: {
              plant: {
                include: { client: true },
              },
            },
          },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      equipments: equipments.map(e => ({
        id: e.id,
        modelo: e.modelo,
        marca: e.marca,
        status: e.status,
        equipmentType: (e as any).equipmentType || 'DISPENSER',
        clientName: e.location?.plant?.client?.nombre || 'Sin cliente',
        locationName: e.location?.nombre || 'Sin ubicación',
      })),
      clients: clients.map(c => ({
        id: c.id,
        nombre: c.nombre,
      })),
      tickets: tickets.map(t => ({
        id: t.id,
        titulo: t.reason,
        status: t.status,
        prioridad: t.priority,
        equipmentId: t.dispenserId,
        clientName: t.location?.plant?.client?.nombre || 'N/A',
      })),
    });
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
