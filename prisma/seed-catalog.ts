import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const materials = [
    // --- Dispensers de Agua ---
    {
      code: '2026001',
      nombre: 'Filtro Quantum Sedimentos',
      expirationMonths: 12,
      type: 'CONSUMABLE',
      category: 'WATER_FILTERS',
      requiresSerial: true,
    },
    {
      code: '2026002',
      nombre: 'Filtro Bacteriostático Carbón Activado',
      expirationMonths: 6,
      type: 'CONSUMABLE',
      category: 'WATER_FILTERS',
      requiresSerial: false,
    },
    {
      code: '2026003',
      nombre: 'Canilla PVC Básica Fría',
      expirationMonths: null,
      type: 'SPARE_PART',
      category: 'WATER_FILTERS',
      requiresSerial: false,
    },
    {
      code: '2026004',
      nombre: 'Canilla PVC Básica Caliente',
      expirationMonths: null,
      type: 'SPARE_PART',
      category: 'WATER_FILTERS',
      requiresSerial: false,
    },

    // --- Climatización y Refrigeración (Aires Acondicionados y Cámaras) ---
    {
      code: '2026101',
      nombre: 'Gas Refrigerante R410A (kg)',
      expirationMonths: null,
      type: 'CONSUMABLE',
      category: 'REFRIGERATION',
      requiresSerial: false,
    },
    {
      code: '2026102',
      nombre: 'Gas Refrigerante R404A (kg)',
      expirationMonths: null,
      type: 'CONSUMABLE',
      category: 'REFRIGERATION',
      requiresSerial: false,
    },
    {
      code: '2026103',
      nombre: 'Gas Refrigerante R22 (kg)',
      expirationMonths: null,
      type: 'CONSUMABLE',
      category: 'REFRIGERATION',
      requiresSerial: false,
    },
    {
      code: '2026104',
      nombre: 'Gas Refrigerante R134a (kg)',
      expirationMonths: null,
      type: 'CONSUMABLE',
      category: 'REFRIGERATION',
      requiresSerial: false,
    },
    {
      code: '2026105',
      nombre: 'Filtro Deshidratador / Secador Soldable',
      expirationMonths: null,
      type: 'SPARE_PART',
      category: 'REFRIGERATION',
      requiresSerial: false,
    },
    {
      code: '2026106',
      nombre: 'Capacitor de Arranque 35uF / 450V',
      expirationMonths: null,
      type: 'SPARE_PART',
      category: 'ELECTRICAL',
      requiresSerial: false,
    },
    {
      code: '2026107',
      nombre: 'Capacitor Dual 50+5uF / 450V',
      expirationMonths: null,
      type: 'SPARE_PART',
      category: 'ELECTRICAL',
      requiresSerial: false,
    },
    {
      code: '2026108',
      nombre: 'Contactor Bipolar / Tripolar 25A',
      expirationMonths: null,
      type: 'SPARE_PART',
      category: 'ELECTRICAL',
      requiresSerial: false,
    },
    {
      code: '2026109',
      nombre: 'Aceite Polioléster Sintético POE (Litro)',
      expirationMonths: 24,
      type: 'CONSUMABLE',
      category: 'REFRIGERATION',
      requiresSerial: false,
    },
    {
      code: '2026110',
      nombre: 'Controlador Digital de Temperatura (Full Gauge / Dixell)',
      expirationMonths: null,
      type: 'SPARE_PART',
      category: 'REFRIGERATION',
      requiresSerial: false,
    },
    {
      code: '2026111',
      nombre: 'Aislación Elastomérica Armaflex (tira)',
      expirationMonths: null,
      type: 'CONSUMABLE',
      category: 'REFRIGERATION',
      requiresSerial: false,
    },
    {
      code: '2026112',
      nombre: 'Correa Trapezoidal A-32 / B-42 Ventilación',
      expirationMonths: null,
      type: 'SPARE_PART',
      category: 'MECHANICAL',
      requiresSerial: false,
    },
  ];

  console.log('Seed: Estandarizando catálogo multiactivo de materiales...');

  for (const m of materials) {
    await prisma.materialCatalog.upsert({
      where: { code: m.code },
      update: m,
      create: m,
    });
  }

  console.log(`Seed: Catálogo actualizado con ${materials.length} materiales estandarizados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
