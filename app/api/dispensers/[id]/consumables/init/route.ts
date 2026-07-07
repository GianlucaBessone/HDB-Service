import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  const user = await requirePermission('dispensers:write');
  if (user instanceof NextResponse) return user;

  try {
    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Lista de consumibles vacía' }, { status: 400 });
    }

    const dispenser = await prisma.dispenser.findUnique({
      where: { id },
      include: {
        plant: true
      }
    });

    if (!dispenser) {
      return NextResponse.json({ error: 'Dispenser no encontrado' }, { status: 404 });
    }

    const plantId = dispenser.plantId;

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        let catalogItem = await tx.materialCatalog.findUnique({
          where: { code: item.materialCode.trim() }
        });

        // 1. Ensure Catalog exists
        if (!catalogItem && item.isNew) {
          catalogItem = await tx.materialCatalog.create({
            data: {
              code: item.materialCode.trim(),
              nombre: item.nombre.trim(),
              type: 'CONSUMABLE',
              requiresSerial: !!item.uniqueId?.trim(),
              expirationMonths: item.expirationMonths || null,
            }
          });
        }

        if (!catalogItem) {
          throw new Error(`Código de material ${item.materialCode} no encontrado y no se puede crear.`);
        }

        const expiresAt = catalogItem.expirationMonths 
          ? new Date(new Date().setMonth(new Date().getMonth() + catalogItem.expirationMonths))
          : null;

        let finalConsumableId = null;
        let displayName = catalogItem.nombre;

        if (plantId) {
          // INTERACT WITH INVENTORY
          if (item.isNew) {
            // It's a new item, we must simulate adding to inventory and then consuming
            if (catalogItem.requiresSerial && item.uniqueId?.trim()) {
              // Create serialized consumable
              const existingCons = await tx.consumable.findUnique({ where: { uniqueId: item.uniqueId.trim() } });
              if (existingCons) throw new Error(`El N° de Serie ${item.uniqueId} ya existe.`);

              const cons = await tx.consumable.create({
                data: {
                  uniqueId: item.uniqueId.trim(),
                  materialCode: catalogItem.code,
                  nombre: catalogItem.nombre,
                  plantId,
                  expirationMonths: catalogItem.expirationMonths,
                  active: false, // Immediately marked as used
                }
              });
              finalConsumableId = cons.id;
              displayName = `${catalogItem.nombre} (S/N: ${item.uniqueId.trim()})`;

              // Upsert stock entry (net change 0, but ensures record exists)
              await tx.stockEntry.upsert({
                where: { plantId_itemType_materialCode: { plantId, itemType: 'CONSUMABLE', materialCode: catalogItem.code } },
                update: { nombre: catalogItem.nombre },
                create: {
                  clientId: dispenser.plant!.clientId,
                  plantId,
                  itemType: 'CONSUMABLE',
                  materialCode: catalogItem.code,
                  nombre: catalogItem.nombre,
                  cantidad: 0,
                }
              });
            } else {
              // Non-serialized, ensure stock entry exists
              await tx.stockEntry.upsert({
                where: { plantId_itemType_materialCode: { plantId, itemType: 'CONSUMABLE', materialCode: catalogItem.code } },
                update: { nombre: catalogItem.nombre },
                create: {
                  clientId: dispenser.plant!.clientId,
                  plantId,
                  itemType: 'CONSUMABLE',
                  materialCode: catalogItem.code,
                  nombre: catalogItem.nombre,
                  cantidad: 0,
                }
              });
            }
          } else {
            // Not new, must consume existing stock
            if (catalogItem.requiresSerial && item.uniqueId?.trim()) {
              const cons = await tx.consumable.findUnique({ where: { uniqueId: item.uniqueId.trim() } });
              if (!cons || !cons.active) throw new Error(`Consumible serializado ${item.uniqueId} no disponible en stock.`);
              
              await tx.consumable.update({
                where: { id: cons.id },
                data: { active: false }
              });
              finalConsumableId = cons.id;
              displayName = `${catalogItem.nombre} (S/N: ${item.uniqueId.trim()})`;

              await tx.stockEntry.update({
                where: { plantId_itemType_materialCode: { plantId, itemType: 'CONSUMABLE', materialCode: catalogItem.code } },
                data: { cantidad: { decrement: 1 } }
              });
            } else {
              // Bulk consume
              const stock = await tx.stockEntry.findUnique({
                where: { plantId_itemType_materialCode: { plantId, itemType: 'CONSUMABLE', materialCode: catalogItem.code } }
              });
              const cantidadToDeduct = item.cantidad || 1;
              if (!stock || stock.cantidad < cantidadToDeduct) {
                throw new Error(`Sin stock suficiente de ${catalogItem.nombre}`);
              }
              await tx.stockEntry.update({
                where: { id: stock.id },
                data: { cantidad: { decrement: cantidadToDeduct } }
              });
            }
          }
        } else {
          // NO PLANT ID - Skip inventory entirely
          if (catalogItem.requiresSerial && item.uniqueId?.trim()) {
            displayName = `${catalogItem.nombre} (S/N: ${item.uniqueId.trim()})`;
          }
        }

        // Generate history
        const qty = (!catalogItem.requiresSerial && item.cantidad > 1) ? item.cantidad : 1;
        for (let i = 0; i < qty; i++) {
          await tx.dispenserConsumableHistory.create({
            data: {
              dispenserId: dispenser.id,
              materialCode: catalogItem.code,
              nombre: displayName,
              consumableId: finalConsumableId,
              installedById: user.id,
              expiresAt
            }
          });
        }
      }
    });

    await createAuditLog({
      userId: user.id,
      userName: user.nombre,
      action: 'UPDATE',
      entity: 'DISPENSER',
      entityId: id,
      newValue: { event: 'INITIALIZED_CONSUMABLES', itemCount: items.length },
    });

    await revalidateTag('dispensers', 'default');
    await revalidateTag('stock', 'default');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] POST /api/dispensers/[id]/consumables/init error:', error);
    return NextResponse.json({ error: error.message || 'Error al inicializar consumibles' }, { status: 500 });
  }
}
