import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getDataFilter } from '@/lib/auth';
import { getDiffHours, getDiffDays } from '@/lib/analytics';
import { startOfMonth, subMonths, format } from 'date-fns';

export async function GET(req: Request) {
  const user = await requirePermission('dashboard:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const plantId = searchParams.get('plantId');
    const failureName = searchParams.get('failureName');

    const whereTickets: any = getDataFilter(user, { 
      locationPlantIdField: 'location',
      plantIdField: undefined 
    });
    const whereRepairs: any = {
      ...getDataFilter(user, { locationPlantIdField: 'dispenser.location' })
    };
    const whereMaintenances: any = {
      ...getDataFilter(user, { locationPlantIdField: 'schedule.dispenser.location' })
    };

    if (plantId) {
      whereTickets.location = { ...whereTickets.location, plantId };
      whereRepairs.dispenser = { ...whereRepairs.dispenser, location: { ...whereRepairs.dispenser?.location, plantId } };
      whereMaintenances.schedule = { ...whereMaintenances.schedule, dispenser: { ...whereMaintenances.schedule?.dispenser, location: { ...whereMaintenances.schedule?.dispenser?.location, plantId } } };
    } else if (clientId) {
      whereTickets.location = { ...whereTickets.location, plant: { clientId } };
      whereRepairs.dispenser = { ...whereRepairs.dispenser, location: { ...whereRepairs.dispenser?.location, plant: { clientId } } };
      whereMaintenances.schedule = { ...whereMaintenances.schedule, dispenser: { ...whereMaintenances.schedule?.dispenser, location: { ...whereMaintenances.schedule?.dispenser?.location, plant: { clientId } } } };
    }

    const [tickets, repairs, maintenances] = await Promise.all([
      prisma.ticket.findMany({
        where: whereTickets,
        include: { statusHistory: true },
      }),
      prisma.dispenserRepairHistory.findMany({
        where: whereRepairs,
        orderBy: { startDate: 'asc' },
      }),
      prisma.maintenanceChecklist.findMany({
        where: whereMaintenances,
        include: { schedule: true },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    // SLA & MTTR with Timeline grouping
    let totalSlaHours = 0;
    let slaCount = 0;
    let totalMttrHours = 0;
    let mttrCount = 0;

    const timelineSla: Record<string, { total: number; count: number }> = {};
    const timelineMttr: Record<string, { total: number; count: number }> = {};
    const failureStats: Record<string, { count: number, durations: number[], isCritical: boolean }> = {};

    // 6 months timeline initialization
    for (let i = 5; i >= 0; i--) {
      const monthStr = format(subMonths(new Date(), i), 'MMM yyyy');
      timelineSla[monthStr] = { total: 0, count: 0 };
      timelineMttr[monthStr] = { total: 0, count: 0 };
    }

    tickets.forEach(ticket => {
      // Filter out tickets that do not match the selected failure if one is selected
      const isTicketRelatedToFailure = failureName 
         ? maintenances.some(m => m.schedule.dispenserId === ticket.dispenserId && Math.abs(getDiffDays(ticket.createdAt, m.completedAt)) < 7 && (m.fallas as string[])?.includes(failureName))
         : true;

      if (!isTicketRelatedToFailure) return;

      if (ticket.resolvedAt) {
        const mttr = getDiffHours(ticket.createdAt, ticket.resolvedAt);
        totalMttrHours += mttr;
        mttrCount++;
        
        const monthStr = format(startOfMonth(ticket.resolvedAt), 'MMM yyyy');
        if (timelineMttr[monthStr]) {
          timelineMttr[monthStr].total += mttr;
          timelineMttr[monthStr].count++;
        }

        const repairHistory = repairs.filter(r => r.dispenserId === ticket.dispenserId && r.startDate >= ticket.createdAt);
        const actionDate = repairHistory.length > 0 ? repairHistory[0].startDate : ticket.resolvedAt;
        
        const sla = getDiffHours(ticket.createdAt, actionDate);
        totalSlaHours += sla;
        slaCount++;

        if (timelineSla[monthStr]) {
          timelineSla[monthStr].total += sla;
          timelineSla[monthStr].count++;
        }
      }
    });

    const avgSla = slaCount > 0 ? totalSlaHours / slaCount : 0;
    const avgMttr = mttrCount > 0 ? totalMttrHours / mttrCount : 0;

    // MTBF
    let totalMtbfDays = 0;
    let mtbfCount = 0;
    const repairsByDispenser: Record<string, any[]> = {};
    
    repairs.forEach(r => {
      if (!repairsByDispenser[r.dispenserId]) repairsByDispenser[r.dispenserId] = [];
      repairsByDispenser[r.dispenserId].push(r);
    });

    Object.values(repairsByDispenser).forEach(dispRepairs => {
      for (let i = 1; i < dispRepairs.length; i++) {
        const prevEnd = dispRepairs[i-1].endDate || dispRepairs[i-1].startDate;
        const currentStart = dispRepairs[i].startDate;
        totalMtbfDays += getDiffDays(prevEnd, currentStart);
        mtbfCount++;
      }
    });

    const avgMtbf = mtbfCount > 0 ? totalMtbfDays / mtbfCount : 0;

    maintenances.forEach(m => {
      const fallas = m.fallas as string[] || [];
      fallas.forEach(f => {
        if (!failureStats[f]) failureStats[f] = { count: 0, durations: [], isCritical: false };
        failureStats[f].count++;
        
        const relatedTicket = tickets.find(t => 
          t.dispenserId === m.schedule.dispenserId && 
          Math.abs(getDiffDays(t.createdAt, m.completedAt)) < 7
        );
        
        if (relatedTicket?.resolvedAt) {
          failureStats[f].durations.push(getDiffHours(relatedTicket.createdAt, relatedTicket.resolvedAt));
          if (relatedTicket.priority === 'CRITICAL' || relatedTicket.priority === 'HIGH') {
            failureStats[f].isCritical = true;
          }
        }
      });
    });

    const topFailures = Object.entries(failureStats)
      .map(([name, stats]) => {
        const avgDuration = stats.durations.length > 0 
          ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length 
          : avgMttr;
        return {
          name,
          count: stats.count,
          avgRepairTime: Math.round(avgDuration * 10) / 10,
          severity: stats.isCritical || stats.count > 10 ? 'HIGH' : 'MEDIUM',
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const timelineData = Object.keys(timelineSla).map(month => ({
      month,
      sla: timelineSla[month].count > 0 ? Math.round((timelineSla[month].total / timelineSla[month].count) * 10) / 10 : 0,
      mttr: timelineMttr[month].count > 0 ? Math.round((timelineMttr[month].total / timelineMttr[month].count) * 10) / 10 : 0,
    }));

    return NextResponse.json({
      kpis: {
        sla: Math.round(avgSla * 10) / 10,
        mttr: Math.round(avgMttr * 10) / 10,
        mtbf: Math.round(avgMtbf * 10) / 10,
      },
      failures: topFailures,
      timeline: timelineData
    });

  } catch (error) {
    console.error('[API] GET /api/dashboard/performance error:', error);
    return NextResponse.json({ error: 'Error al calcular analíticas' }, { status: 500 });
  }
}

export const revalidate = 300; // 5 min
