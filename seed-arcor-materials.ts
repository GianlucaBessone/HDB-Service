import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const arcorMaterials = [
  { code: '41700100375', name: 'VASO CON ROSCA REPUESTO', type: 'SPARE_PART' },
  { code: '44643300001', name: 'TAPA SUPERIOR', type: 'SPARE_PART' },
  { code: '44643300004', name: 'CANILLA DE AGUA FRIA', type: 'SPARE_PART' },
  { code: '44643300005', name: 'TERMOSTATO (85°C)', type: 'SPARE_PART' },
  { code: '44643300006', name: 'TERMOSTATO (95°C)', type: 'SPARE_PART' },
  { code: '44643300007', name: 'CALDERA ARMADA', type: 'SPARE_PART' },
  { code: '44643300010', name: 'TAPA PREFILTRO', type: 'SPARE_PART' },
  { code: '44643300011', name: 'TAPA CON FLOTANTE', type: 'SPARE_PART' },
  { code: '44643300012', name: 'CANILLA DE AGUA CALIENTE', type: 'SPARE_PART' },
  { code: '44643300013', name: 'FILTRO DE CARBON ACTIVADO 40-KD', type: 'CONSUMABLE' },
  { code: '44643300014', name: 'PREFILTRO 20 MICRONES', type: 'CONSUMABLE' },
  { code: '44643300015', name: 'RESERVORIO CON REJILLA', type: 'SPARE_PART' },
  { code: '44643300019', name: 'TAPA FRONTAL INFERIOR', type: 'SPARE_PART' },
  { code: '44643300020', name: 'TAPA FRONTAL SUPERIOR', type: 'SPARE_PART' },
  { code: '44643300021', name: 'BUJE DE CONEXION PARA CANILLA', type: 'SPARE_PART' },
  { code: '44643300022', name: 'ESCUADRA P/PURIFICADOR Y PREFILTRO', type: 'SPARE_PART' },
  { code: '44643300028', name: 'TAPA ACRILICO', type: 'SPARE_PART' },
  { code: '44643300029', name: 'FILTRO QUANTUM', type: 'CONSUMABLE' },
  { code: '44643300030', name: 'REGENERANTE LIMPIEZA P/FILTRO QUANTUM', type: 'CONSUMABLE' },
  { code: '44643300031', name: 'CANILLA AGUA CALIENTE P/ECO-D', type: 'SPARE_PART' },
  { code: '44643300032', name: 'CANILLA AGUA FRÍA P/ECO-D', type: 'SPARE_PART' },
  { code: '44643300033', name: 'PASTILLA HIDROSENSIBLE P/ECO-D', type: 'CONSUMABLE' },
  { code: 'S/N', name: 'RESISTENCIA CALDERA', type: 'SPARE_PART' },
];

async function main() {
  const arcor = await prisma.client.findFirst({
    where: { nombre: { contains: 'ARCOR', mode: 'insensitive' } }
  });

  if (!arcor) {
    console.log('Cliente ARCOR no encontrado en la base de datos.');
    return;
  }

  console.log(`Seeding ARCOR materials for client ID: ${arcor.id}`);

  for (const mat of arcorMaterials) {
    await prisma.materialCatalog.upsert({
      where: { code: mat.code },
      update: {
        nombre: mat.name,
        type: mat.type,
        clientId: arcor.id,
      },
      create: {
        code: mat.code,
        nombre: mat.name,
        type: mat.type,
        clientId: arcor.id,
      }
    });
  }

  console.log('ARCOR materials seeded successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
