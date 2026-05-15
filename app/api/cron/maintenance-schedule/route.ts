import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export const revalidate = 300; // 5 min

// GET /api/cron/maintenance-schedule
export async function GET(req: Request) {
  try {
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');

    // 1. Mark past pending schedules as OVERDUE
    await prisma.maintenanceSchedule.updateMany({
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

    let created = 0;

    for (const dispenser of activeDispensers) {
      // Upsert to avoid duplicates
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

      if (result.createdAt >= new Date(Date.now() - 5000)) { // rough check if newly created
        created++;
      }
    }

    return NextResponse.json({ success: true, processed: activeDispensers.length, created });
  } catch (error) {
    console.error('[CRON] Maintenance schedule error:', error);
    return NextResponse.json({ error: 'Failed to generate schedules' }, { status: 500 });
  }
}
