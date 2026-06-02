import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { getSlaStatus } from '@/lib/sla';
import { sendPushNotification } from '@/lib/onesignal';

export const revalidate = 0; // Disable static rendering/caching for this cron route

export async function GET(req: Request) {
  try {
    // 1. Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    const results: any = {};

    console.log(`[CRON] Starting consolidated daily tasks at ${now.toISOString()}`);

    // =========================================================================
    // TASK A: Monthly Closure (Mark old schedules as EXPIRED)
    // =========================================================================
    try {
      const expiredSchedules = await prisma.maintenanceSchedule.updateMany({
        where: {
          scheduledMonth: { lt: currentMonth },
          status: { in: ['PENDING', 'OVERDUE'] }
        },
        data: { status: 'EXPIRED' }
      });
      results.monthlyClosure = { success: true, expiredCount: expiredSchedules.count };
      console.log(`[CRON] Monthly closure: ${expiredSchedules.count} schedules expired.`);
    } catch (err: any) {
      console.error('[CRON] Error during monthly closure:', err);
      results.monthlyClosure = { success: false, error: err.message };
    }

    // =========================================================================
    // TASK B: Maintenance Schedule Generation & Overdue Check
    // =========================================================================
    try {
      // 1. Mark past pending schedules as OVERDUE
      const overdueSchedules = await prisma.maintenanceSchedule.updateMany({
        where: {
          status: 'PENDING',
          scheduledMonth: { lt: currentMonth },
        },
        data: { status: 'OVERDUE' },
      });

      // 2. Generate schedules for current month for all active IN_SERVICE dispensers
      const activeDispensers = await prisma.dispenser.findMany({
        where: { status: 'IN_SERVICE', active: true },
        select: { id: true },
      });

      let createdSchedules = 0;
      for (const dispenser of activeDispensers) {
        const result = await prisma.maintenanceSchedule.upsert({
          where: {
            dispenserId_scheduledMonth: {
              dispenserId: dispenser.id,
              scheduledMonth: currentMonth,
            },
          },
          update: {}, // do nothing if exists
          create: {
            dispenserId: dispenser.id,
            scheduledMonth: currentMonth,
            status: 'PENDING',
          },
        });

        if (result.createdAt >= new Date(Date.now() - 5000)) {
          createdSchedules++;
        }
      }

      results.maintenanceSchedule = {
        success: true,
        overdueCount: overdueSchedules.count,
        processedCount: activeDispensers.length,
        createdCount: createdSchedules
      };
      console.log(`[CRON] Maintenance schedule: ${overdueSchedules.count} overdue, ${createdSchedules} created.`);
    } catch (err: any) {
      console.error('[CRON] Error during maintenance schedule:', err);
      results.maintenanceSchedule = { success: false, error: err.message };
    }

    // =========================================================================
    // TASK C: SLA Breach & Near-Breach Checking
    // =========================================================================
    try {
      const activeTickets = await prisma.ticket.findMany({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        include: {
          location: { include: { plant: { include: { client: { include: { slaConfig: true } } } } } },
        },
      });

      const ticketIds = activeTickets.map(t => t.id);
      const existingNearBreach = await prisma.notification.findMany({
        where: {
          type: 'SLA_NEAR_BREACH',
          relatedId: { in: ticketIds }
        },
        select: { relatedId: true }
      });
      const notifiedTicketIds = new Set(existingNearBreach.map(n => n.relatedId).filter(Boolean) as string[]);

      const updates = [];
      const notifications: { title: string; message: string; type: string; ticketId: string }[] = [];

      for (const ticket of activeTickets) {
        let shouldUpdate = false;
        const data: any = {};
        const config = ticket.location?.plant?.client?.slaConfig;

        // Check response SLA
        if (ticket.status === 'OPEN' && ticket.slaResponseDeadline && !ticket.slaResponseBreached) {
          if (now > ticket.slaResponseDeadline) {
            data.slaResponseBreached = true;
            shouldUpdate = true;
          }
        }

        // Check resolution SLA
        if (ticket.slaResolutionDeadline && !ticket.slaResolutionBreached) {
          if (now > ticket.slaResolutionDeadline) {
            data.slaResolutionBreached = true;
            shouldUpdate = true;

            notifications.push({
              title: 'SLA Incumplido',
              message: `Ticket ${ticket.id} (${ticket.reason.substring(0, 50)}) venció su SLA.`,
              type: 'SLA_BREACHED',
              ticketId: ticket.id,
            });
          } else {
            // Check near breach
            const totalMinutes = (ticket.slaResolutionDeadline.getTime() - ticket.createdAt.getTime()) / 60000;
            const status = getSlaStatus(ticket.slaResolutionDeadline, config?.nearBreachPercent, totalMinutes, ticket.createdAt);
            
            if (status === 'NEAR_BREACH' && !notifiedTicketIds.has(ticket.id)) {
              notifications.push({
                title: 'Próximo a Vencer SLA',
                message: `El ticket ${ticket.id} (${ticket.reason.substring(0, 50)}) está próximo a vencer su SLA de resolución.`,
                type: 'SLA_NEAR_BREACH',
                ticketId: ticket.id,
              });
            }
          }
        }

        if (shouldUpdate) {
          updates.push(
            prisma.ticket.update({ where: { id: ticket.id }, data })
          );
        }
      }

      if (updates.length > 0) {
        await prisma.$transaction(updates);
      }

      if (notifications.length > 0) {
        const supervisors = await prisma.user.findMany({
          where: { role: { in: ['SUPERVISOR', 'ADMIN'] }, active: true },
          select: { id: true, onesignalPlayerId: true },
        });

        const playerIds = supervisors.map(s => s.onesignalPlayerId).filter(Boolean) as string[];

        if (playerIds.length > 0) {
          await sendPushNotification({
            playerIds,
            title: 'Alertas SLA',
            message: `${notifications.length} tickets han incumplido su SLA.`,
          });
        }

        const notifData = supervisors.flatMap(s => 
          notifications.map(n => ({
            userId: s.id,
            title: n.title,
            message: n.message,
            type: n.type,
            relatedId: n.ticketId,
          }))
        );

        await prisma.notification.createMany({ data: notifData });
      }

      results.slaCheck = {
        success: true,
        checkedCount: activeTickets.length,
        updatedCount: updates.length,
        notificationCount: notifications.length
      };
      console.log(`[CRON] SLA check: ${activeTickets.length} checked, ${updates.length} updated.`);
    } catch (err: any) {
      console.error('[CRON] Error during SLA check:', err);
      results.slaCheck = { success: false, error: err.message };
    }

    return NextResponse.json({ success: true, timestamp: now.toISOString(), results });
  } catch (error) {
    console.error('[CRON] Fatal consolidated cron error:', error);
    return NextResponse.json({ error: 'Fatal Internal Server Error' }, { status: 500 });
  }
}
