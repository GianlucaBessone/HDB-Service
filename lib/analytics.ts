import { ConditionRating, DispenserStatus } from '@prisma/client';

/**
 * Calculates the health score of a dispenser (0-100).
 * BUENO: > 80
 * MEDIO: 50-80
 * MALO: < 50
 */
export function calculateDispenserHealth({
  mtbfMonths, // Average months between failures
  mttrHours,  // Average hours to repair
  recurrenceCount, // Failures in last 6 months
  avgConditionRating, // 0-100 based on ConditionRating enum
  lifespanProgress, // 0-1 (consumed / total)
}: {
  mtbfMonths: number;
  mttrHours: number;
  recurrenceCount: number;
  avgConditionRating: number;
  lifespanProgress: number;
}) {
  // 1. MTBF Score (30%) - Target: 6 months or more
  const mtbfScore = Math.min(100, (mtbfMonths / 6) * 100) * 0.30;

  // 2. MTTR Score (20%) - Target: 24 hours or less
  const mttrScore = Math.max(0, 100 - (mttrHours / 48) * 100) * 0.20;

  // 3. Visual/Maintenance State (20%)
  const conditionScore = avgConditionRating * 0.20;

  // 4. Recurrences Penalty (15%) - Penalty after 2 failures
  const recurrenceScore = Math.max(0, 100 - (recurrenceCount * 20)) * 0.15;

  // 5. Lifespan Score (15%)
  const lifespanScore = (1 - lifespanProgress) * 100 * 0.15;

  return Math.round(mtbfScore + mttrScore + conditionScore + recurrenceScore + lifespanScore);
}

/**
 * Maps a ConditionRating enum to a numeric value (0-100)
 */
export function ratingToValue(rating: ConditionRating): number {
  switch (rating) {
    case 'GOOD': return 100;
    case 'FAIR': return 70;
    case 'POOR': return 40;
    case 'CRITICAL': return 0;
    default: return 50;
  }
}

/**
 * Gets human readable status from score
 */
export function getHealthStatus(score: number): 'BUENO' | 'MEDIO' | 'MALO' {
  if (score > 80) return 'BUENO';
  if (score >= 50) return 'MEDIO';
  return 'MALO';
}

/**
 * Calculates intervals in hours
 */
export function getDiffHours(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/**
 * Calculates intervals in days
 */
export function getDiffDays(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
}
