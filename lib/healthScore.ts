import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getDiffHours, getDiffDays, calculateDispenserHealth, ratingToValue } from './analytics';

/**
 * Salud del parque — cálculo compartido y fotos mensuales.
 *
 * Las fotos (AssetHealthSnapshot) se escriben UNA vez por activo y mes y nunca se
 * actualizan, para que la evolución histórica quede fija aunque cambien los datos
 * cargados después o la fórmula. Si la fórmula cambia, incrementar HEALTH_FORMULA_VERSION.
 */
export const HEALTH_FORMULA_VERSION = 1;

/** Cantidad de meses cerrados que se completan con una carga inicial reconstruida. */
export const HEALTH_BACKFILL_MONTHS = 5;

export type HealthScope = {
  dispenserWhere?: Prisma.DispenserWhereInput;
  ticketWhere?: Prisma.TicketWhereInput;
  repairWhere?: Prisma.DispenserRepairHistoryWhereInput;
};

export const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/** Último instante del mes `YYYY-MM` (hora local del servidor). */
export function endOfMonthKey(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0, 23, 59, 59, 999);
}

/** Mes anterior a `month` en formato YYYY-MM. */
export function previousMonthKey(month: string, n = 1) {
  const [y, m] = month.split('-').map(Number);
  return monthKey(new Date(y, m - 1 - n, 1));
}

export const statusFromScore = (score: number) =>
  score > 80 ? 'ÓPTIMO' : score >= 50 ? 'ESTABLE' : 'CRÍTICO';

/** Carga los datos necesarios para calcular la salud de los activos del ámbito. */
export async function loadHealthData(scope: HealthScope = {}, extraSchedules = 0) {
  const [tickets, repairs, dispensers] = await Promise.all([
    prisma.ticket.findMany({
      where: { ...(scope.ticketWhere || {}), resolvedAt: { not: null } },
      select: { dispenserId: true, createdAt: true, resolvedAt: true },
    }),
    prisma.dispenserRepairHistory.findMany({
      where: scope.repairWhere || {},
      orderBy: { startDate: 'asc' },
    }),
    prisma.dispenser.findMany({
      where: scope.dispenserWhere || { active: true },
      include: {
        plant: { select: { id: true, clientId: true } },
        location: { include: { plant: true, sector: true } },
        maintenanceSchedules: {
          include: { checklist: true },
          orderBy: { scheduledMonth: 'desc' },
          take: 5 + extraSchedules,
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

  return { dispensers, repairsByDispenser, ticketsByDispenser };
}

export type HealthData = Awaited<ReturnType<typeof loadHealthData>>;
export type HealthDispenser = HealthData['dispensers'][number];

/**
 * Score de salud de un activo con la información disponible a la fecha `asOf`.
 * Sólo considera reparaciones, tickets resueltos y checklists anteriores a esa fecha.
 */
export function computeHealth(data: HealthData, d: HealthDispenser, asOf: Date) {
  const asOfMonth = monthKey(asOf);
  const lastMaintenances = d.maintenanceSchedules
    .filter(s => s.scheduledMonth <= asOfMonth && s.checklist)
    .slice(0, 5)
    .map(s => s.checklist!);

  const avgCondition = lastMaintenances.length > 0
    ? lastMaintenances.reduce((acc, curr) => acc + ratingToValue(curr.condicionGeneral), 0) / lastMaintenances.length
    : 100;

  const dispenserRepairs = (data.repairsByDispenser.get(d.id) || []).filter(r => r.startDate <= asOf);
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

  const resolved = (data.ticketsByDispenser.get(d.id) || []).filter(t => t.resolvedAt! <= asOf);
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
}

/**
 * Guarda la foto de salud de todos los activos activos para el mes `month`,
 * calculada al cierre de ese mes. Las fotos existentes NUNCA se modifican
 * (skipDuplicates), así que es seguro ejecutarla varias veces.
 */
export async function takeHealthSnapshot(
  month: string,
  source: 'CIERRE' | 'RECONSTRUIDO',
  preloaded?: HealthData,
) {
  const asOf = endOfMonthKey(month);
  const data = preloaded || await loadHealthData({}, HEALTH_BACKFILL_MONTHS + 1);

  const rows: Prisma.AssetHealthSnapshotCreateManyInput[] = data.dispensers
    .filter(d => d.createdAt <= asOf)
    .map(d => {
      const h = computeHealth(data, d, asOf);
      return {
        month,
        dispenserId: d.id,
        clientId: d.clientId || d.plant?.clientId || d.location?.plant?.clientId || null,
        ownerPlantId: d.plantId,
        locationPlantId: d.location?.plantId || null,
        equipmentType: d.equipmentType,
        criticality: d.criticality,
        score: h.score,
        status: statusFromScore(h.score),
        mtbfDays: Math.round(h.avgMtbf * 10) / 10,
        mttrHours: Math.round(h.avgMttr * 10) / 10,
        recurrences: h.recentRecurrences,
        condition: Math.round(h.avgCondition),
        lifespanPct: Math.round(h.progress * 1000) / 10,
        formulaVersion: HEALTH_FORMULA_VERSION,
        source,
      };
    });

  if (rows.length === 0) return { month, created: 0 };
  const res = await prisma.assetHealthSnapshot.createMany({ data: rows, skipDuplicates: true });
  return { month, created: res.count };
}

/**
 * Asegura que existan las fotos de los meses cerrados:
 * - mes anterior al actual → foto de CIERRE;
 * - si no hay ninguna foto todavía, carga inicial RECONSTRUIDA de los meses previos.
 * Idempotente: no modifica fotos existentes.
 */
export async function ensureHealthSnapshots(now = new Date()) {
  const current = monthKey(now);
  const lastClosed = previousMonthKey(current);
  const results: { month: string; created: number; source: string }[] = [];

  const data = await loadHealthData({}, HEALTH_BACKFILL_MONTHS + 1);

  const closing = await takeHealthSnapshot(lastClosed, 'CIERRE', data);
  results.push({ ...closing, source: 'CIERRE' });

  const hasOlder = await prisma.assetHealthSnapshot.findFirst({
    where: { month: { lt: lastClosed } },
    select: { id: true },
  });
  if (!hasOlder) {
    for (let i = 1; i <= HEALTH_BACKFILL_MONTHS; i++) {
      const month = previousMonthKey(lastClosed, i);
      const r = await takeHealthSnapshot(month, 'RECONSTRUIDO', data);
      results.push({ ...r, source: 'RECONSTRUIDO' });
    }
  }

  return results;
}
