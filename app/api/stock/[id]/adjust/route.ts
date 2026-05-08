import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { notifyByRole } from '@/lib/onesignal';

export const dynamic = 'force-dynamic';

/**
 * POST /api/stock/[id]/adjust
 * Perform an inventory adjustment (modify quantity or delete entry).
 * Requires justification. Logs audit trail and notifies supervisors.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requirePermission('stock:write');
  if (user instanceof NextResponse) return user;

  try {
    const { id } = params;
    const body = await req.json();
    const { action, justificacion, newCantidad } = body;

    if (!justificacion?.trim()) {
      return NextResponse.json({ error: 'La justificación es obligatoria' }, { status: 400 });
    }

    if (!action || !['DELETE', 'ADJUST_QTY'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }

    // Get current entry
    const entry = await prisma.stockEntry.findUnique({
      where: { id },
      include: { plant: { select: { nombre: true } } },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Registro de stock no encontrado' }, { status: 404 });
    }

    const oldState = {
      id: entry.id,
      materialCode: entry.materialCode,
      nombre: entry.nombre,
      cantidad: entry.cantidad,
      plantId: entry.plantId,
      plantNombre: entry.plant.nombre,
      minLevel: entry.minLevel,
      maxLevel: entry.maxLevel,
    };

    let newState: any = null;
    let auditAction = '';
    let notifMessage = '';

    if (action === 'DELETE') {
      // Delete stock entry and associated consumables
      await prisma.consumable.updateMany({
        where: { plantId: entry.plantId, materialCode: entry.materialCode },
        data: { active: false },
      });

      await prisma.stockEntry.delete({ where: { id } });

      auditAction = 'STOCK_DELETE';
      newState = { deleted: true };
      notifMessage = `⚠️ Stock eliminado: ${entry.nombre} (${entry.materialCode}) de ${entry.plant.nombre}. Motivo: ${justificacion.trim()}`;

    } else if (action === 'ADJUST_QTY') {
      const qty = parseFloat(newCantidad);
      if (isNaN(qty) || qty < 0) {
        return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 });
      }

      const updated = await prisma.stockEntry.update({
        where: { id },
        data: { cantidad: qty },
      });

      auditAction = 'STOCK_ADJUST';
      newState = {
        id: updated.id,
        materialCode: updated.materialCode,
        nombre: updated.nombre,
        cantidad: updated.cantidad,
        cantidadAnterior: entry.cantidad,
      };
      notifMessage = `📦 Ajuste de inventario: ${entry.nombre} (${entry.materialCode}) en ${entry.plant.nombre}. Cantidad: ${entry.cantidad} → ${qty}. Motivo: ${justificacion.trim()}`;
    }

    // Audit log
    await createAuditLog({
      userId: user.id,
      userName: user.nombre,
      action: auditAction,
      entity: 'STOCK',
      entityId: entry.id,
      oldValue: oldState,
      newValue: { ...newState, justificacion: justificacion.trim() },
      metadata: { adjustedBy: user.email, timestamp: new Date().toISOString() },
    });

    // Notify supervisors via OneSignal
    try {
      await notifyByRole('SUPERVISOR', 'Ajuste de Inventario', notifMessage, {
        type: 'STOCK_ADJUSTMENT',
        stockEntryId: entry.id,
        action: auditAction,
      });
      // Also notify admins
      await notifyByRole('ADMIN', 'Ajuste de Inventario', notifMessage, {
        type: 'STOCK_ADJUSTMENT',
        stockEntryId: entry.id,
        action: auditAction,
      });
    } catch (notifErr) {
      console.error('[API] Notification error (non-fatal):', notifErr);
    }

    console.log(`[API] Stock adjustment: ${auditAction} by ${user.email} on ${entry.materialCode}`);
    return NextResponse.json({ success: true, action: auditAction, oldState, newState });

  } catch (error: any) {
    console.error('[API] POST /api/stock/adjust error:', error?.message || error);
    return NextResponse.json({ error: 'Error al ajustar inventario' }, { status: 500 });
  }
}
