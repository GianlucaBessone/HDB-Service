import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { 
  getDiffHours, 
  getDiffDays, 
  calculateDispenserHealth, 
  ratingToValue 
} from '@/lib/analytics';

export async function GET(req: Request) {
  const user = await requirePermission('dashboard:read');
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const plantId = searchParams.get('plantId');
    const sectorId = searchParams.get('sectorId');
    const dispenserId = searchParams.get('dispenserId');

    // Build common where clause
    const whereTickets: any = {};
    const whereRepairs: any = {};
    const whereMaintenances: any = {};
    const whereDispensers: any = { active: true };

    if (dispenserId) {
      whereTickets.dispenserId = dispenserId;
      whereRepairs.dispenserId = dispenserId;
      whereMaintenances.schedule = { dispenserId };
      whereDispensers.id = dispenserId;
    } else if (sectorId) {
      whereTickets.location = { sectorId };
      whereRepairs.dispenser = { location: { sectorId } };
      whereMaintenances.schedule = { dispenser: { location: { sectorId } } };
      whereDispensers.location = { sectorId };
    } else if (plantId) {
      whereTickets.location = { plantId };
      whereRepairs.dispenser = { location: { plantId } };
      whereMaintenances.schedule = { dispenser: { location: { plantId } } };
      whereDispensers.location = { plantId };
    } else if (clientId) {
      whereTickets.location = { plant: { clientId } };
      whereRepairs.dispenser = { location: { plant: { clientId } } };
      whereMaintenances.schedule = { dispenser: { location: { plant: { clientId } } } };
      whereDispensers.location = { plant: { clientId } };
    }

    // Role-based restrictions
    if (user.role === 'CLIENT_RESPONSIBLE' && user.clientId) {
       // Force client filter
       const clientWhere = { plant: { clientId: user.clientId } };
       whereTickets.location = { ...whereTickets.location, ...clientWhere };
       whereDispensers.location = { ...whereDispensers.location, ...clientWhere };
    }

    // 1. Fetch Data in Parallel
    const [tickets, repairs, maintenances, dispensers] = await Promise.all([
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
        orderBy: { completedAt: 'desc' },
        take: 50, // Limit for broad analysis
      }),
      prisma.dispenser.findMany({
        where: whereDispensers,
        include: {
          maintenanceSchedules: {
            include: { checklist: true },
            orderBy: { scheduledMonth: 'desc' },
            take: 5,
          },
        },
      }),
    ]);

    // 2. Calculations
    
    // SLA & MTTR
    let totalSlaHours = 0;
    let slaCount = 0;
    let totalMttrHours = 0;
    let mttrCount = 0;

    tickets.forEach(ticket => {
      if (ticket.resolvedAt) {
        const mttr = getDiffHours(ticket.createdAt, ticket.resolvedAt);
        totalMttrHours += mttr;
        mttrCount++;

        // SLA: until repair or closed
        // Find first transition to a "work in progress" or "resolved" or check status history for repair
        const repairHistory = repairs.filter(r => r.dispenserId === ticket.dispenserId && r.startDate >= ticket.createdAt);
        const actionDate = repairHistory.length > 0 ? repairHistory[0].startDate : ticket.resolvedAt;
        
        totalSlaHours += getDiffHours(ticket.createdAt, actionDate);
        slaCount++;
      }
    });

    const avgSla = slaCount > 0 ? totalSlaHours / slaCount : 0;
    const avgMttr = mttrCount > 0 ? totalMttrHours / mttrCount : 0;

    // MTBF
    let totalMtbfDays = 0;
    let mtbfCount = 0;

    // Group repairs by dispenser to calculate MTBF per unit
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

    // Failure Analysis (100% Data-Driven)
    const failureStats: Record<string, { count: number, durations: number[], isCritical: boolean }> = {};
    
    maintenances.forEach(m => {
      const fallas = m.fallas as string[] || [];
      fallas.forEach(f => {
        if (!failureStats[f]) failureStats[f] = { count: 0, durations: [], isCritical: false };
        failureStats[f].count++;
        
        // Find if there's a ticket for this dispenser around the same time to get actual duration
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
          : avgMttr; // Fallback only to the calculated global average of real data

        return {
          name,
          count: stats.count,
          avgRepairTime: Math.round(avgDuration * 10) / 10,
          severity: stats.isCritical || stats.count > 10 ? 'HIGH' : 'MEDIUM',
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 3. Health Algorithm for Top Dispensers
    const dispenserHealth = dispensers.map(d => {
      const lastMaintenances = d.maintenanceSchedules
        .map(s => s.checklist)
        .filter(Boolean);
      
      const avgCondition = lastMaintenances.length > 0 
        ? lastMaintenances.reduce((acc, curr) => acc + ratingToValue(curr!.condicionGeneral), 0) / lastMaintenances.length
        : 100;

      const dispenserRepairs = repairs.filter(r => r.dispenserId === d.id);
      const recentRecurrences = dispenserRepairs.filter(r => getDiffDays(r.startDate, new Date()) < 180).length;

      // Lifespan progress
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
        score,
        status: score > 80 ? 'BUENO' : score >= 50 ? 'MEDIO' : 'MALO',
      };
    }).sort((a, b) => a.score - b.score); // Worst first

    return NextResponse.json({
      kpis: {
        sla: Math.round(avgSla * 10) / 10,
        mttr: Math.round(avgMttr * 10) / 10,
        mtbf: Math.round(avgMtbf * 10) / 10,
      },
      failures: {
        top: topFailures,
        totalReported: Object.keys(failureStats).length,
      },
      health: {
        ranking: dispenserHealth.slice(0, 10), // Top 10 worst
        distribution: {
          bueno: dispenserHealth.filter(h => h.status === 'BUENO').length,
          medio: dispenserHealth.filter(h => h.status === 'MEDIO').length,
          malo: dispenserHealth.filter(h => h.status === 'MALO').length,
        }
      }
    });

  } catch (error) {
    console.error('[API] GET /api/dashboard/analytics error:', error);
    return NextResponse.json({ error: 'Error al calcular analíticas' }, { status: 500 });
  }
}
