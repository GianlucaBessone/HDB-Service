import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⏳ Creando registro de deuda inter-planta de ejemplo...');

  // Buscar plantas válidas en la base de datos
  const plantBlando = await prisma.plant.findUnique({ where: { id: 'plant-blando' } });
  const plantChicle = await prisma.plant.findUnique({ where: { id: 'plant-chicle' } });

  if (!plantBlando || !plantChicle) {
    console.error('❌ Error: No se encontraron las plantas "plant-blando" o "plant-chicle" en la base de datos. Ejecuta primero "npm run seed".');
    process.exit(1);
  }

  // Crear la deuda de ejemplo
  const debt = await prisma.interPlantDebt.create({
    data: {
      creditorPlantId: plantBlando.id, // Planta que prestó el material (Acreedor)
      debtorPlantId: plantChicle.id,   // Planta que recibió el material y debe devolverlo (Deudor)
      materialCode: 'FIL-CARB-01',
      nombre: 'Filtro Carbón Activado',
      cantidad: 2,
      status: 'PENDING',
    },
  });

  console.log('✅ Deuda de ejemplo creada exitosamente:');
  console.log(JSON.stringify(debt, null, 2));
  console.log('\n👉 Ya puedes entrar a la vista de Inventario > Deudas Inter-Plantas para verla y resolverla.');
}

main()
  .catch((e) => {
    console.error('❌ Error al crear la deuda:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
