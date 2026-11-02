import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getDataFilter } from '@/lib/auth';
import { getDiffHours, getDiffDays, calculateDispenserHealth, ratingToValue } from '@/lib/analytics';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await requirePermission('dashboard:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const plantId = searchParams.get('plantId');

    // Security check: restrict non-admins/supervisors from querying unassigned clients/plants
    if (user.role !== 'ADMIN' && user.role !== 'SUPERVISOR') {
      if (plantId && !user.plantIds.includes(plantId)) {
        return NextResponse.json({ error: 'Acceso denegado a esta planta' }, { status: 403 });
      }
      if (clientId && user.clientId !== clientId) {
        return NextResponse.json({ error: 'Acceso denegado a este cliente' }, { status: 403 });
      }
    }

    const whereTickets: any = getDataFilter(user, { 
      locationPlantIdField: 'location',
      plantIdField: undefined 
    });
    const whereRepairs: any = {
      dispenser: {
        active: true,
        ...getDataFilter(user, {
          plantIdField: 'plantId',
          locationPlantIdField: 'location'
        })
      }
    };
    const whereDispensers: any = {
      active: true,
      ...getDataFilter(user, { 
        plantIdField: 'plantId',
        locationPlantIdField: 'location' 
      })
    };

    // Los filtros de planta/cliente se combinan con AND para no pisar el filtro de acceso por rol.
    if (plantId) {
      whereTickets.location = { ...whereTickets.location, plantId };
      const scope = { OR: [{ plantId }, { location: { plantId } }] };
      whereRepairs.dispenser = { ...whereRepairs.dispenser, AND: [scope] };
      whereDispensers.AND = [...(whereDispensers.AND || []), scope];
    } else if (clientId) {
      whereTickets.location = { ...whereTickets.location, plant: { clientId } };
      const scope = { OR: [{ plant: { clientId } }, { location: { plant: { clientId } } }] };
      whereRepairs.dispenser = { ...whereRepairs.dispenser, AND: [scope] };
      whereDispensers.AND = [...(whereDispensers.AND || []), scope];
    }

    const TIMELINE_MONTHS = 6;

    const [tickets, repairs, dispensers] = await Promise.all([
      prisma.ticket.findMany({
        where: { ...whereTickets, resolvedAt: { not: null } },
        select: { dispenserId: true, createdAt: true, resolvedAt: true },
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
            // 5 para el promedio de condición + margen para reconstruir los meses del historial
            take: 5 + TIMELINE_MONTHS,
          },
        },
      }),
    ]);

    const repairsByDispenser = new Map<string, typeof repairs>();
    for (const r of repairs) {
      const list = repairsByDispenser.get(r.dispenserId) || [];
      list.push(r);
      repairsByDispenser.set(r.dispenserId, list);
    }
    const ticketsByDispenser = new Map<string, typeof tickets>();
    for (const t of tickets) {
      if (!t.dispenserId) continue;
      const list = ticketsByDispenser.get(t.dispenserId) || [];
      list.push(t);
      ticketsByDispenser.set(t.dispenserId, list);
    }

    const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    /**
     * Calcula el score de salud de un activo con la información disponible a una fecha dada.
     * Sólo considera reparaciones, tickets resueltos y checklists anteriores a `asOf`.
     */
    const computeHealth = (d: typeof dispensers[number], asOf: Date) => {
      const asOfMonth = monthKey(asOf);
      const lastMaintenances = d.maintenanceSchedules
        .filter(s => s.scheduledMonth <= asOfMonth && s.checklist)
        .slice(0, 5)
        .map(s => s.checklist!);

      const avgCondition = lastMaintenances.length > 0
        ? lastMaintenances.reduce((acc, curr) => acc + ratingToValue(curr.condicionGeneral), 0) / lastMaintenances.length
        : 100;

      const dispenserRepairs = (repairsByDispenser.get(d.id) || []).filter(r => r.startDate <= asOf);
      const recentRecurrences = dispenserRepairs.filter(r => getDiffDays(r.startDate, asOf) < 180).length;

      let mtbfDays = 0;
      let mtbfCount = 0;
      for (let i = 1; i < dispenserRepairs.length; i++) {
        const prev = dispenserRepairs[i - 1];
        const prevEnd = prev.endDate && prev.endDate <= asOf ? prev.endDate : prev.startDate;
        mtbfDays += getDiffDays(prevEnd, dispenserRepairs[i].startDate);
        mtbfCount++;
      }
      const avgMtbf = mtbfCount > 0 ? mtbfDays / mtbfCount : 180; // 6 meses por defecto si no hay recurrencias

      const resolved = (ticketsByDispenser.get(d.id) || []).filter(t => t.resolvedAt! <= asOf);
      const avgMttr = resolved.length > 0
        ? resolved.reduce((acc, t) => acc + getDiffHours(t.createdAt, t.resolvedAt!), 0) / resolved.length
        : 0;

      const ageMonths = getDiffDays(d.createdAt, asOf) / 30;
      const progress = Math.min(1, Math.max(0, ageMonths / d.lifecycleMonths));

      const score = calculateDispenserHealth({
        mtbfMonths: avgMtbf / 30,
        mttrHours: avgMttr,
        recurrenceCount: recentRecurrences,
        avgConditionRating: avgCondition,
        lifespanProgress: progress,
        equipmentType: d.equipmentType,
        criticality: d.criticality,
      });

      return { score, avgMtbf, avgMttr, recentRecurrences, avgCondition, progress };
    };

    const now = new Date();

    const dispenserHealth = dispensers.map(d => {
      const h = computeHealth(d, now);
      return {
        id: d.id,
        equipmentType: d.equipmentType,
        criticality: d.criticality,
        marca: d.marca,
        modelo: d.modelo,
        serial: d.numeroSerie || 'S/N',
        planta: d.location?.plant?.nombre ? `${d.location.plant.nombre}${d.location.sector ? ` - ${d.location.sector.nombre}` : ''}` : 'Sin Planta',
        score: h.score,
        status: h.score > 80 ? 'ÓPTIMO' : h.score >= 50 ? 'ESTABLE' : 'CRÍTICO',
        details: {
          ownerPlantId: d.plantId,
          currentPlantId: d.location?.plantId,
          mtbfDays: Math.round(h.avgMtbf),
          mtbfMonths: Math.round((h.avgMtbf / 30) * 10) / 10,
          mttrHours: Math.round(h.avgMttr * 10) / 10,
          recurrences: h.recentRecurrences,
          condition: Math.round(h.avgCondition),
          progress: Math.round(h.progress * 100)
        }
      };
    }).sort((a, b) => a.score - b.score);

    // Evolución real: score promedio de la flota existente al cierre de cada mes
    // (el mes en curso se calcula a la fecha de hoy). Sin activos dados de alta → sin dato.
    const timeline = Array.from({ length: TIMELINE_MONTHS }).map((_, i) => {
      const offset = TIMELINE_MONTHS - 1 - i;
      const asOf = offset === 0
        ? now
        : new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999);
      const fleet = dispensers.filter(d => d.createdAt <= asOf);
      const score = fleet.length > 0
        ? Math.round(fleet.reduce((acc, d) => acc + computeHealth(d, asOf).score, 0) / fleet.length)
        : null;
      const label = asOf.toLocaleString('es-AR', { month: 'short' }).replace('.', '');
      return {
        month: label.charAt(0).toUpperCase() + label.slice(1),
        score,
        assets: fleet.length,
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
