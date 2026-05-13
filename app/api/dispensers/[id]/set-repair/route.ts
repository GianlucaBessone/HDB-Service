import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

// POST /api/dispensers/[id]/set-repair
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requirePermission('dispensers:write');
  if (user instanceof NextResponse) return user;

  try {
    const { id } = params;
    
    const dispenser = await prisma.dispenser.findUnique({
      where: { id },
      include: { location: true }
    });

    if (!dispenser) {
      return NextResponse.json({ error: 'Dispenser no encontrado' }, { status: 404 });
    }

    const oldLocationId = dispenser.locationId;

    await prisma.$transaction(async (tx) => {
      // 1. Update dispenser status and remove location
      await tx.dispenser.update({
        where: { id },
        data: {
          status: 'UNDER_REPAIR',
          locationId: null
        }
      });

      // 2. Record location history if it was in a location
      if (oldLocationId) {
        await tx.dispenserLocationHistory.updateMany({
          where: { dispenserId: id, locationId: oldLocationId, removedAt: null },
          data: { removedAt: new Date() }
        });
      }

      // 3. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userName: user.nombre,
          action: 'UPDATE',
          entity: 'DISPENSER',
          entityId: id,
          newValue: { status: 'UNDER_REPAIR', locationId: null },
          oldValue: { status: dispenser.status, locationId: oldLocationId }
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] POST /api/dispensers/set-repair error:', error);
    return NextResponse.json({ error: 'Error al actualizar dispenser' }, { status: 500 });
  }
}
