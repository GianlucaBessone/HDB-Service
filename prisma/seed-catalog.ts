import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const materials = [
    {
      code: '2026001',
      nombre: 'Filtro Quantum',
      expirationMonths: 12,
      type: 'CONSUMABLE',
      requiresSerial: true,
    },
    {
      code: '2026002',
      nombre: 'Filtro Bacteriostatico',
      expirationMonths: 6,
      type: 'CONSUMABLE',
      requiresSerial: false,
    },
    {
      code: '2026003',
      nombre: 'Canilla PVC Básica Fría',
      expirationMonths: null,
      type: 'SPARE_PART',
      requiresSerial: false,
    },
    {
      code: '2026004',
      nombre: 'Canilla PVC Básica Caliente',
      expirationMonths: null,
      type: 'SPARE_PART',
      requiresSerial: false,
    },
  ];

  console.log('Seed: Standardizing material catalog...');

  for (const m of materials) {
    await prisma.materialCatalog.upsert({
      where: { code: m.code },
      update: m,
      create: m,
    });
  }

  console.log('Seed: Material catalog standardized.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
