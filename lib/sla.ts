import { addMinutes, differenceInMinutes, isPast } from 'date-fns';
import { TicketPriority } from '@prisma/client';

interface SlaConfigData {
  responseTimeLow: number;
  responseTimeMedium: number;
  responseTimeHigh: number;
  responseTimeCritical: number;
  resolutionTimeLow: number;
  resolutionTimeMedium: number;
  resolutionTimeHigh: number;
  resolutionTimeCritical: number;
  nearBreachPercent: number;
}

const DEFAULT_SLA: SlaConfigData = {
  responseTimeLow: 480,
  responseTimeMedium: 240,
  responseTimeHigh: 120,
  responseTimeCritical: 60,
  resolutionTimeLow: 4320,
  resolutionTimeMedium: 1440,
  resolutionTimeHigh: 480,
  resolutionTimeCritical: 240,
  nearBreachPercent: 80,
};

export type SlaStatus = 'ON_TIME' | 'NEAR_BREACH' | 'BREACHED';

/**
 * Get response time in minutes for a given priority.
 */
export function getResponseTime(priority: TicketPriority, config?: SlaConfigData | null): number {
  const c = config || DEFAULT_SLA;
  switch (priority) {
    case 'LOW': return c.responseTimeLow;
    case 'MEDIUM': return c.responseTimeMedium;
    case 'HIGH': return c.responseTimeHigh;
    case 'CRITICAL': return c.responseTimeCritical;
  }
}

/**
 * Get resolution time in minutes for a given priority.
 */
export function getResolutionTime(priority: TicketPriority, config?: SlaConfigData | null): number {
  const c = config || DEFAULT_SLA;
  switch (priority) {
    case 'LOW': return c.resolutionTimeLow;
    case 'MEDIUM': return c.resolutionTimeMedium;
    case 'HIGH': return c.resolutionTimeHigh;
    case 'CRITICAL': return c.resolutionTimeCritical;
  }
}

/**
 * Calculate SLA deadlines based on priority and config.
 */
export function calculateSlaDeadlines(
  createdAt: Date,
  priority: TicketPriority,
  config?: SlaConfigData | null
) {
  return {
    responseDeadline: addMinutes(createdAt, getResponseTime(priority, config)),
    resolutionDeadline: addMinutes(createdAt, getResolutionTime(priority, config)),
  };
}

/**
 * Get current SLA status for a deadline.
 */
export function getSlaStatus(
  deadline: Date,
  nearBreachPercent: number = 80,
  totalMinutes: number,
  createdAt: Date
): SlaStatus {
  if (isPast(deadline)) return 'BREACHED';

  const elapsed = differenceInMinutes(new Date(), createdAt);
  const threshold = (totalMinutes * nearBreachPercent) / 100;

  if (elapsed >= threshold) return 'NEAR_BREACH';
  return 'ON_TIME';
}

/**
 * Calculate SLA compliance percentage for a set of tickets.
 */
export function calculateSlaCompliance(
  tickets: Array<{
    slaResolutionBreached: boolean;
    status: string;
    resolvedAt: Date | null;
    slaResolutionDeadline: Date | null;
  }>
): number {
  if (tickets.length === 0) return 100;

  const resolved = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
  if (resolved.length === 0) return 100;

  const onTime = resolved.filter(t => !t.slaResolutionBreached).length;
  return Math.round((onTime / resolved.length) * 100);
}
