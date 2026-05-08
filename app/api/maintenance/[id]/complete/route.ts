import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

// POST /api/maintenance/[id]/complete
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requirePermission('maintenance:write');
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const { condicionGeneral, fallas, problemasEstructurales, observaciones, fotosUrls } = body;

    if (!condicionGeneral) {
      return NextResponse.json({ error: 'Condición general es requerida' }, { status: 400 });
    }

    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id: params.id },
      include: { checklist: true },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Mantenimiento no encontrado' }, { status: 404 });
    }

    if (schedule.status === 'COMPLETED') {
      return NextResponse.json({ error: 'El mantenimiento ya fue completado' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark schedule as completed
      const s = await tx.maintenanceSchedule.update({
        where: { id: params.id },
        data: { status: 'COMPLETED' },
      });

      // 2. Create checklist
      await tx.maintenanceChecklist.create({
        data: {
          scheduleId: params.id,
          condicionGeneral,
          fallas: fallas || [],
          problemasEstructurales: problemasEstructurales || [],
          observaciones: observaciones?.trim() || null,
          fotosUrls: fotosUrls || [],
          completedById: user.id,
        },
      });

      return s;
    });

    await createAuditLog({
      userId: user.id, userName: user.nombre,
      action: 'UPDATE', entity: 'MAINTENANCE', entityId: params.id,
      newValue: { status: 'COMPLETED', condicionGeneral },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] POST /api/maintenance/[id]/complete error:', error);
    return NextResponse.json({ error: 'Error al completar mantenimiento' }, { status: 500 });
  }
}
