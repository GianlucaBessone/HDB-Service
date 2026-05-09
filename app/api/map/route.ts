import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const plants = await prisma.plant.findMany({
      where: {
        active: true,
        lat: { not: null },
        lng: { not: null },
      },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        lat: true,
        lng: true,
        client: {
          select: {
            nombre: true
          }
        }
      }
    });

    return NextResponse.json(plants);
  } catch (error) {
    console.error('Error fetching map data:', error);
    return NextResponse.json({ error: 'Error al obtener datos del mapa' }, { status: 500 });
  }
}
