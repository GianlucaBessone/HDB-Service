import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSlaStatus } from '@/lib/sla';
import { sendPushNotification } from '@/lib/onesignal';

// Vercel Cron Secret check (optional, but good practice)
// If VERCEL_CRON_SECRET is set, ensure it's provided in headers

// GET /api/cron/sla-check
export async function GET(req: Request) {
  try {
    // 1. Get open/in-progress tickets
    const activeTickets = await prisma.ticket.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      include: {
        location: { include: { plant: { include: { client: { include: { slaConfig: true } } } } } },
      },
    });

    const now = new Date();
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

          // Notify supervisor/admin
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
          
          if (status === 'NEAR_BREACH') {
            // we could send a warning notification if we haven't already
            // This requires tracking if near_breach notification was sent to avoid spam.
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

    // Send notifications
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

    return NextResponse.json({ success: true, checked: activeTickets.length, updated: updates.length });
  } catch (error) {
    console.error('[CRON] SLA Check error:', error);
    return NextResponse.json({ error: 'Failed to run SLA check' }, { status: 500 });
  }
}
