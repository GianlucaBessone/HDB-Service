import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfMonth, subMonths, format } from 'date-fns';

export async function GET(req: Request) {
  try {
    // Vercel Cron Verification (Optional depending on your auth strategy)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const currentMonth = format(new Date(), 'yyyy-MM');

    // Find all schedules that are PENDING or OVERDUE and are from months prior to current
    // In our logic, scheduledMonth is like "2026-05"
    // Using string comparison, "2026-04" < "2026-05" is true.
    const expiredSchedules = await prisma.maintenanceSchedule.updateMany({
      where: {
        scheduledMonth: {
          lt: currentMonth
        },
        status: {
          in: ['PENDING', 'OVERDUE']
        }
      },
      data: {
        status: 'EXPIRED'
      }
    });

    console.log(`[CRON] Monthly closure: Updated ${expiredSchedules.count} records to EXPIRED.`);

    return NextResponse.json({ 
      success: true, 
      updatedCount: expiredSchedules.count,
      closedBefore: currentMonth
    });
  } catch (error) {
    console.error('[CRON] Error during monthly closure:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
