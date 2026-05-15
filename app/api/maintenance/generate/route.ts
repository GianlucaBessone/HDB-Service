import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

// POST /api/maintenance/generate
export async function POST(req: Request) {
  const user = await requirePermission('maintenance:write');
  if (user instanceof NextResponse) return user;

  try {
    const { month } = await req.json(); // Format: YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      await revalidateTag('maintenance', 'default');
    return NextResponse.json({ error: 'Formato de mes inválido (YYYY-MM)' }, { status: 400 });
    }

    // Get all active dispensers in service or backup (not out of service)
    const activeDispensers = await prisma.dispenser.findMany({
      where: {
        active: true,
        status: { in: ['IN_SERVICE', 'BACKUP', 'UNDER_REPAIR', 'IN_TECHNICAL_SERVICE'] }
      },
      select: { id: true }
    });

    if (activeDispensers.length === 0) {
      await revalidateTag('maintenance', 'default');
    return NextResponse.json({ message: 'No hay dispensers activos para generar mantenimiento' });
    }

    // Create schedule for each dispenser if it doesn't exist
    const results = { created: 0, skipped: 0 };
    
    // We do this in a transaction or individually to handle unique constraints
    for (const dispenser of activeDispensers) {
      const existing = await prisma.maintenanceSchedule.findUnique({
        where: {
          dispenserId_scheduledMonth: {
            dispenserId: dispenser.id,
            scheduledMonth: month
          }
        }
      });

      if (!existing) {
        await prisma.maintenanceSchedule.create({
          data: {
            dispenserId: dispenser.id,
            scheduledMonth: month,
            status: 'PENDING'
          }
        });
        results.created++;
      } else {
        results.skipped++;
      }
    }

    await revalidateTag('maintenance', 'default');
    return NextResponse.json({ 
      success: true, 
      message: `Mantenimiento generado: ${results.created} creados, ${results.skipped} ya existían.`,
      ...results 
    });

  } catch (error) {
    console.error('[API] POST /api/maintenance/generate error:', error);
    await revalidateTag('maintenance', 'default');
    return NextResponse.json({ error: 'Error al generar cronograma' }, { status: 500 });
  }
}
