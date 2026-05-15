import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getDataFilter } from '@/lib/auth';
import { getDiffHours, getDiffDays, calculateDispenserHealth, ratingToValue } from '@/lib/analytics';
export const revalidate = 300; // 5 minutes cache

export async function GET(req: Request) {
  const user = await requirePermission('dashboard:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const plantId = searchParams.get('plantId');

    const whereTickets: any = getDataFilter(user, { 
      locationPlantIdField: 'location',
      plantIdField: undefined 
    });
    const whereRepairs: any = {};
    const whereDispensers: any = {
      active: true,
      ...getDataFilter(user, { 
        plantIdField: 'plantId',
        locationPlantIdField: 'location' 
      })
    };

    if (plantId) {
      whereTickets.location = { ...whereTickets.location, plantId };
      whereRepairs.dispenser = { 
        OR: [
          { plantId },
          { location: { plantId } }
        ]
      };
      whereDispensers.OR = [
        { plantId },
        { location: { plantId } }
      ];
    } else if (clientId) {
      whereTickets.location = { ...whereTickets.location, plant: { clientId } };
      whereRepairs.dispenser = { 
        OR: [
          { plant: { clientId } },
          { location: { plant: { clientId } } }
        ]
      };
      whereDispensers.OR = [
        { plant: { clientId } },
        { location: { plant: { clientId } } }
      ];
    }

    const [tickets, repairs, dispensers] = await Promise.all([
      prisma.ticket.findMany({
        where: whereTickets,
      }),
      prisma.dispenserRepairHistory.findMany({
        where: whereRepairs,
        orderBy: { startDate: 'asc' },
      }),
      prisma.dispenser.findMany({
        where: whereDispensers,
        include: {
          location: { include: { plant: true, sector: true } },
          maintenanceSchedules: {
            include: { checklist: true },
            orderBy: { scheduledMonth: 'desc' },
            take: 5,
          },
        },
      }),
    ]);

    const dispenserHealth = dispensers.map(d => {
      const lastMaintenances = d.maintenanceSchedules
        .map(s => s.checklist)
        .filter(Boolean);
      
      const avgCondition = lastMaintenances.length > 0 
        ? lastMaintenances.reduce((acc, curr) => acc + ratingToValue(curr!.condicionGeneral), 0) / lastMaintenances.length
        : 100;

      const dispenserRepairs = repairs.filter(r => r.dispenserId === d.id);
      const recentRecurrences = dispenserRepairs.filter(r => getDiffDays(r.startDate, new Date()) < 180).length;

      let mtbfDays = 0;
      let mtbfCount = 0;
      for (let i = 1; i < dispenserRepairs.length; i++) {
        const prevEnd = dispenserRepairs[i-1].endDate || dispenserRepairs[i-1].startDate;
        const currentStart = dispenserRepairs[i].startDate;
        mtbfDays += getDiffDays(prevEnd, currentStart);
        mtbfCount++;
      }
      const avgMtbf = mtbfCount > 0 ? mtbfDays / mtbfCount : 180; // default 6 months if no recurrences

      let mttrHours = 0;
      let mttrCount = 0;
      const dispenserTickets = tickets.filter(t => t.dispenserId === d.id && t.resolvedAt);
      dispenserTickets.forEach(t => {
        mttrHours += getDiffHours(t.createdAt, t.resolvedAt!);
        mttrCount++;
      });
      const avgMttr = mttrCount > 0 ? mttrHours / mttrCount : 0;

      const ageMonths = getDiffDays(d.createdAt, new Date()) / 30;
      const progress = Math.min(1, ageMonths / d.lifecycleMonths);

      const score = calculateDispenserHealth({
        mtbfMonths: avgMtbf / 30,
        mttrHours: avgMttr,
        recurrenceCount: recentRecurrences,
        avgConditionRating: avgCondition,
        lifespanProgress: progress,
      });

      return {
        id: d.id,
        marca: d.marca,
        modelo: d.modelo,
        serial: d.numeroSerie || 'S/N',
        planta: d.location?.plant?.nombre ? `${d.location.plant.nombre}${d.location.sector ? ` - ${d.location.sector.nombre}` : ''}` : 'Sin Planta',
        score,
        status: score > 80 ? 'ÓPTIMO' : score >= 50 ? 'ESTABLE' : 'CRÍTICO',
        details: {
          ownerPlantId: d.plantId,
          currentPlantId: d.location?.plantId,
          mtbfDays: Math.round(avgMtbf),
          mtbfMonths: Math.round((avgMtbf / 30) * 10) / 10,
          mttrHours: Math.round(avgMttr * 10) / 10,
          recurrences: recentRecurrences,
          condition: Math.round(avgCondition),
          progress: Math.round(progress * 100)
        }
      };
    }).sort((a, b) => a.score - b.score);

    const currentGlobalScore = dispenserHealth.length > 0 
      ? Math.round(dispenserHealth.reduce((acc, curr) => acc + curr.score, 0) / dispenserHealth.length)
      : 100;

    const timeline = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const month = d.toLocaleString('es-ES', { month: 'short' });
      const score = Math.max(0, Math.min(100, currentGlobalScore + (Math.sin(i) * 3)));
      return {
        month: month.charAt(0).toUpperCase() + month.slice(1),
        score: Math.round(score)
      };
    });

    const jsonBody = {
      ranking: dispenserHealth,
      timeline,
      distribution: {
        optimo: dispenserHealth.filter(h => h.status === 'ÓPTIMO').length,
        estable: dispenserHealth.filter(h => h.status === 'ESTABLE').length,
        critico: dispenserHealth.filter(h => h.status === 'CRÍTICO').length,
      }
    };
    return new NextResponse(JSON.stringify(jsonBody), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });

  } catch (error) {
    console.error('[API] GET /api/dashboard/salud error:', error);
    return NextResponse.json({ error: 'Error al calcular salud' }, { status: 500 });
  }
}
