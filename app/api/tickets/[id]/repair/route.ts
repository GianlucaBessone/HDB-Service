import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

// POST /api/tickets/[id]/repair
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requirePermission('tickets:write');
  if (user instanceof NextResponse) return user;

  try {
    const { id } = params;
    const body = await req.json();
    const { descripcion, diagnostico, consumablesUsed } = body;

    if (!descripcion) {
      return NextResponse.json({ error: 'La descripción es obligatoria' }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { dispenser: { include: { location: true } } }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }

    if (!ticket.dispenserId) {
      return NextResponse.json({ error: 'El ticket no tiene un dispenser asociado' }, { status: 400 });
    }

    const plantId = ticket.dispenser?.location?.plantId;

    await prisma.$transaction(async (tx) => {
      // 1. Process Consumables/Spare Parts
      if (consumablesUsed && Array.isArray(consumablesUsed) && consumablesUsed.length > 0) {
        if (!plantId) {
          throw new Error('No se puede usar stock porque el dispenser no está asignado a una planta válida.');
        }

        for (const item of consumablesUsed) {
          if (!item.cantidad || item.cantidad <= 0) continue;

          // Fetch catalog item for expiration info
          const catalogItem = await tx.materialCatalog.findUnique({
            where: { code: item.materialCode }
          });

          if (!catalogItem) {
            throw new Error(`El material con código ${item.materialCode} no existe en el catálogo estandarizado.`);
          }

          // Mark previous as removed
          await tx.dispenserConsumableHistory.updateMany({
            where: { dispenserId: ticket.dispenserId!, materialCode: item.materialCode, removedAt: null },
            data: { removedAt: new Date() }
          });

          const expiresAt = catalogItem.expirationMonths 
            ? new Date(new Date().setMonth(new Date().getMonth() + catalogItem.expirationMonths))
            : null;

          if (item.type === 'SERIALIZED') {
            const cons = await tx.consumable.update({
              where: { id: item.id },
              data: { active: false }
            });

            await tx.stockEntry.update({
              where: { plantId_itemType_materialCode: { plantId, itemType: catalogItem.type as any, materialCode: cons.materialCode } },
              data: { cantidad: { decrement: 1 } }
            });

            await tx.dispenserConsumableHistory.create({
              data: {
                dispenserId: ticket.dispenserId!,
                consumableId: cons.id,
                materialCode: cons.materialCode,
                nombre: cons.nombre,
                installedById: user.id,
                expiresAt
              }
            });
          } else {
            const stock = await tx.stockEntry.findUnique({
              where: { plantId_itemType_materialCode: { plantId, itemType: catalogItem.type as any, materialCode: item.materialCode } }
            });

            if (!stock || stock.cantidad < item.cantidad) {
              throw new Error(`Sin stock suficiente de ${item.nombre}`);
            }

            await tx.stockEntry.update({
              where: { id: stock.id },
              data: { cantidad: { decrement: item.cantidad } }
            });

            for (let i = 0; i < item.cantidad; i++) {
              await tx.dispenserConsumableHistory.create({
                data: {
                  dispenserId: ticket.dispenserId!,
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

      // 2. Create Repair History
      await tx.dispenserRepairHistory.create({
        data: {
          dispenserId: ticket.dispenserId!,
          technicianId: user.id,
          descripcion,
          diagnostico,
          partesUsadas: consumablesUsed as any,
          endDate: new Date()
        }
      });

      // 3. Update Ticket (Add comment about repair)
      await tx.ticketComment.create({
        data: {
          ticketId: id,
          userId: user.id,
          message: `🛠️ REPARACIÓN REGISTRADA:\nProblema: ${descripcion}\nSolución: ${diagnostico}`
        }
      });

      // 4. Change Ticket status to RESOLVED (optional, but requested by flow usually)
      // Actually, let's keep it in its current status or move to RESOLVED if user wants.
      // For now, I'll just keep it as is, or maybe the user wants to close it later.
      // But usually repair means resolution. Let's move to RESOLVED.
      await tx.ticket.update({
        where: { id },
        data: { 
          status: 'RESOLVED',
          resolvedAt: new Date()
        }
      });
      
      // Add status history
      await tx.ticketStatusHistory.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status,
          toStatus: 'RESOLVED',
          changedBy: user.nombre,
          notes: 'Reparación completada'
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] POST /api/tickets/repair error:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar reparación' }, { status: 500 });
  }
}
