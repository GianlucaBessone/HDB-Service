import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

// POST /api/maintenance/[id]/checklist
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requirePermission('maintenance:write');
  if (user instanceof NextResponse) return user;

  try {
    const { id } = params;
    const body = await req.json();
    const { condicionGeneral, fallas, problemasEstructurales, observaciones, consumablesUsed } = body;

    if (!condicionGeneral) {
      await revalidateTag('maintenance', 'default');
    return NextResponse.json({ error: 'Condición general requerida' }, { status: 400 });
    }

    // Check if checklist already exists and get plant info
    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: { checklist: true, dispenser: { include: { location: true } } }
    });

    if (!schedule) {
      await revalidateTag('maintenance', 'default');
    return NextResponse.json({ error: 'Mantenimiento no encontrado' }, { status: 404 });
    }

    if (schedule.checklist) {
      await revalidateTag('maintenance', 'default');
    return NextResponse.json({ error: 'El checklist ya fue completado para este mantenimiento' }, { status: 400 });
    }

    const plantId = schedule.dispenser?.location?.plantId;

    // Use Interactive Transaction to check stock dynamically and process everything
    const [checklist, updatedSchedule] = await prisma.$transaction(async (tx) => {
      // 1. Process Consumables/Spare Parts
      if (consumablesUsed && Array.isArray(consumablesUsed) && consumablesUsed.length > 0) {
        if (!plantId) {
          throw new Error('No se puede usar stock porque el dispenser no está asignado a una planta válida.');
        }

        for (const item of consumablesUsed) {
          if (!item.cantidad || item.cantidad <= 0) continue;

          // Fetch catalog item for expiration and type info
          const catalogItem = await tx.materialCatalog.findUnique({
            where: { code: item.materialCode }
          });

          if (!catalogItem) {
            throw new Error(`El material con código ${item.materialCode} no existe en el catálogo estandarizado.`);
          }

          // Mark previous as removed (only for the same material code)
          await tx.dispenserConsumableHistory.updateMany({
            where: { dispenserId: schedule.dispenserId, materialCode: item.materialCode, removedAt: null },
            data: { removedAt: new Date() }
          });

          const expiresAt = catalogItem.expirationMonths 
            ? new Date(new Date().setMonth(new Date().getMonth() + catalogItem.expirationMonths))
            : null;

          if (item.type === 'SERIALIZED') {
            // Mark consumable as inactive in stock
            const cons = await tx.consumable.update({
              where: { id: item.id },
              data: { active: false }
            });

            // Decrement aggregate stock using the correct itemType from catalog
            await tx.stockEntry.update({
              where: { plantId_itemType_materialCode: { plantId, itemType: catalogItem.type as any, materialCode: cons.materialCode } },
              data: { cantidad: { decrement: 1 } }
            });

            // Record history with link to consumable
            await tx.dispenserConsumableHistory.create({
              data: {
                dispenserId: schedule.dispenserId,
                consumableId: cons.id,
                materialCode: cons.materialCode,
                nombre: cons.nombre,
                installedById: user.id,
                expiresAt
              }
            });
          } else {
            // BULK processing
            const stock = await tx.stockEntry.findUnique({
              where: { plantId_itemType_materialCode: { plantId, itemType: catalogItem.type as any, materialCode: item.materialCode } }
            });

            if (!stock || stock.cantidad < item.cantidad) {
              throw new Error(`Sin stock suficiente de ${item.nombre} (Stock: ${stock?.cantidad || 0})`);
            }

            await tx.stockEntry.update({
              where: { id: stock.id },
              data: { cantidad: { decrement: item.cantidad } }
            });

            for (let i = 0; i < item.cantidad; i++) {
              await tx.dispenserConsumableHistory.create({
                data: {
                  dispenserId: schedule.dispenserId,
                  materialCode: item.materialCode,
                  nombre: item.nombre,
                  installedById: user.id,
                  expiresAt
                }
              });
            }
          }
        }
      }

      // 2. Create Checklist
      const newChecklist = await tx.maintenanceChecklist.create({
        data: {
          scheduleId: id,
          condicionGeneral,
          fallas: fallas || [],
          problemasEstructurales: problemasEstructurales || [],
          observaciones: observaciones || '',
          completedById: user.id
        }
      });

      // 3. Update Schedule Status
      const newSchedule = await tx.maintenanceSchedule.update({
        where: { id },
        data: { status: 'COMPLETED' }
      });

      return [newChecklist, newSchedule];
    });

    await revalidateTag('maintenance', 'default');
    return NextResponse.json({ success: true, checklist, schedule: updatedSchedule });
  } catch (error: any) {
    console.error('[API] POST /api/maintenance/checklist error:', error);
    // Return the specific stock error if it was thrown intentionally
    const message = error.message.includes('Sin stock suficiente') ? error.message : 'Error al procesar el checklist';
    await revalidateTag('maintenance', 'default');
    return NextResponse.json({ error: message }, { status: error.message.includes('stock') ? 400 : 500 });
  }
}
