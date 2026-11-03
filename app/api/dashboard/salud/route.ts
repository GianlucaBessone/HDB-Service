import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getDataFilter } from '@/lib/auth';
import {
  loadHealthData, computeHealth, ensureHealthSnapshots, monthKey, previousMonthKey, endOfMonthKey, statusFromScore,
} from '@/lib/healthScore';
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

    const data = await loadHealthData(
      { dispenserWhere: whereDispensers, ticketWhere: whereTickets, repairWhere: whereRepairs },
      TIMELINE_MONTHS,
    );
    const now = new Date();

    const dispenserHealth = data.dispensers.map(d => {
      const h = computeHealth(data, d, now);
      return {
        id: d.id,
        equipmentType: d.equipmentType,
        criticality: d.criticality,
        marca: d.marca,
        modelo: d.modelo,
        serial: d.numeroSerie || 'S/N',
        planta: d.location?.plant?.nombre ? `${d.location.plant.nombre}${d.location.sector ? ` - ${d.location.sector.nombre}` : ''}` : 'Sin Planta',
        score: h.score,
        status: statusFromScore(h.score),
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

    // ── Evolución mensual ──────────────────────────────────────────────
    // Meses cerrados: fotos congeladas (AssetHealthSnapshot). Mes en curso: cálculo en vivo.
    const currentMonth = monthKey(now);
    const closedMonths = Array.from({ length: TIMELINE_MONTHS - 1 }, (_, i) =>
      previousMonthKey(currentMonth, TIMELINE_MONTHS - 1 - i)
    );

    // Ámbito de las fotos según lo registrado al momento de cada foto
    const snapshotScope: any[] = [];
    if (user.role === 'CLIENT_RESPONSIBLE') {
      snapshotScope.push({ clientId: user.clientId || '__none__' });
    } else if (user.role === 'CLIENT_REQUESTER') {
      snapshotScope.push({ OR: [{ ownerPlantId: { in: user.plantIds } }, { locationPlantId: { in: user.plantIds } }] });
    }
    if (plantId) snapshotScope.push({ OR: [{ ownerPlantId: plantId }, { locationPlantId: plantId }] });
    else if (clientId) snapshotScope.push({ clientId });

    let snapshotsAvailable = true;
    let snapshotRows: { month: string; score: number; source: string }[] = [];
    try {
      // Garantiza que el último mes cerrado tenga su foto aunque el cron no haya corrido
      const lastClosed = closedMonths[closedMonths.length - 1];
      const hasLastClosed = await prisma.assetHealthSnapshot.findFirst({ where: { month: lastClosed }, select: { id: true } });
      if (!hasLastClosed) await ensureHealthSnapshots(now);

      snapshotRows = await prisma.assetHealthSnapshot.findMany({
        where: { month: { in: closedMonths }, AND: snapshotScope },
        select: { month: true, score: true, source: true },
      });
    } catch (err) {
      // La tabla todavía no existe en la base (falta `prisma db push`): se informa en la respuesta.
      console.error('[API] salud: fotos mensuales no disponibles', err);
      snapshotsAvailable = false;
    }

    const monthLabel = (month: string) => {
      const label = endOfMonthKey(month).toLocaleString('es-AR', { month: 'short' }).replace('.', '');
      return label.charAt(0).toUpperCase() + label.slice(1);
    };

    const timeline = closedMonths.map(month => {
      const rows = snapshotRows.filter(r => r.month === month);
      if (rows.length === 0) {
        return { month: monthLabel(month), key: month, score: null as number | null, assets: 0, source: 'SIN_DATOS' };
      }
      const reconstructed = rows.some(r => r.source === 'RECONSTRUIDO');
      return {
        month: monthLabel(month),
        key: month,
        score: Math.round(rows.reduce((acc, r) => acc + r.score, 0) / rows.length),
        assets: rows.length,
        source: reconstructed ? 'RECONSTRUIDO' : 'CIERRE',
      };
    });

    timeline.push({
      month: monthLabel(currentMonth),
      key: currentMonth,
      score: dispenserHealth.length > 0
        ? Math.round(dispenserHealth.reduce((acc, h) => acc + h.score, 0) / dispenserHealth.length)
        : null,
      assets: dispenserHealth.length,
      source: 'EN_CURSO',
    });

    const jsonBody = {
      ranking: dispenserHealth,
      timeline,
      snapshotsAvailable,
      distribution: {
        optimo: dispenserHealth.filter(h => h.status === 'ÓPTIMO').length,
        estable: dispenserHealth.filter(h => h.status === 'ESTABLE').length,
        critico: dispenserHealth.filter(h => h.status === 'CRÍTICO').length,
      }
    };
    return new NextResponse(JSON.stringify(jsonBody), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store',
      },
    });

  } catch (error) {
    console.error('[API] GET /api/dashboard/salud error:', error);
    return NextResponse.json({ error: 'Error al calcular salud' }, { status: 500 });
  }
}
