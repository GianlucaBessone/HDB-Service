import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with Arcor S.A. data...');

  // ──────────────────────────────────────────
  // 1. CLIENT
  // ──────────────────────────────────────────
  const arcor = await prisma.client.upsert({
    where: { id: 'arcor-sa' },
    update: {},
    create: {
      id: 'arcor-sa',
      nombre: 'Arcor S.A.',
      email: 'contacto@arcor.com',
      telefono: '+54 351 499-0000',
      direccion: 'Av. Fulvio Pagani 487, Arroyito, Córdoba',
    },
  });
  console.log('  ✓ Cliente:', arcor.nombre);

  // SLA Config for Arcor
  await prisma.slaConfig.upsert({
    where: { clientId: arcor.id },
    update: {},
    create: {
      clientId: arcor.id,
      responseTimeLow: 480,
      responseTimeMedium: 240,
      responseTimeHigh: 120,
      responseTimeCritical: 60,
      resolutionTimeLow: 4320,
      resolutionTimeMedium: 1440,
      resolutionTimeHigh: 480,
      resolutionTimeCritical: 240,
    },
  });

  // ──────────────────────────────────────────
  // 2. USERS
  // ──────────────────────────────────────────
  const pwd = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'gbessone.hdb@gmail.com' },
    update: {},
    create: {
      email: 'gbessone.hdb@gmail.com',
      passwordHash: pwd,
      nombre: 'Gianluca',
      apellido: 'Bessone',
      role: 'ADMIN',
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@hdb.com' },
    update: {},
    create: {
      email: 'supervisor@hdb.com',
      passwordHash: pwd,
      nombre: 'Super',
      apellido: 'Visor',
      role: 'SUPERVISOR',
    },
  });

  const tech1 = await prisma.user.upsert({
    where: { email: 'tech1@hdb.com' },
    update: {},
    create: {
      email: 'tech1@hdb.com',
      passwordHash: pwd,
      nombre: 'Técnico',
      apellido: 'Juan',
      role: 'TECHNICIAN',
    },
  });
  console.log('  ✓ Usuarios creados');

  // ──────────────────────────────────────────
  // 3. PLANTS (11 plantas de Arcor)
  // ──────────────────────────────────────────
  const plantNames = [
    'MAPHI', 'Blando', 'Chicle', 'Oblea', 'Duro',
    'Servicios Centrales', 'Administración', 'CTMS',
    'Agropecuaria', 'Centro de Distribución', 'Molienda 3',
  ];

  const plants: Record<string, any> = {};
  for (const name of plantNames) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[áéíóú]/g, c => 
      ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' } as any)[c] || c
    );
    const id = `plant-${slug}`;
    plants[name] = await prisma.plant.upsert({
      where: { id },
      update: {},
      create: { id, clientId: arcor.id, nombre: name },
    });
  }
  console.log(`  ✓ ${plantNames.length} plantas creadas`);

  // ──────────────────────────────────────────
  // 4. SECTORS (12 sectores)
  // ──────────────────────────────────────────
  const sectorNames = [
    'Comedor', 'Planta', 'Laboratorio', 'Sala Reunión',
    'Museo', 'Departamento Médico', 'Oficina', 'MAPHI',
    'Compras', 'Mesa de Ayuda', 'Taller', 'Backup',
  ];

  const sectors: Record<string, any> = {};
  for (const name of sectorNames) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[áéíóú]/g, c =>
      ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' } as any)[c] || c
    );
    const id = `sector-${slug}`;
    sectors[name] = await prisma.sector.upsert({
      where: { id },
      update: {},
      create: { id, nombre: name },
    });
  }
  console.log(`  ✓ ${sectorNames.length} sectores creados`);

  // ──────────────────────────────────────────
  // 5. PLANT-SECTOR JUNCTION
  // ──────────────────────────────────────────
  // Map: which sectors exist in which plants (derived from user's AppSheet data)
  const plantSectorMap: Record<string, string[]> = {
    'MAPHI':                  ['MAPHI'],
    'Blando':                 ['Laboratorio', 'Planta', 'Comedor', 'Taller', 'Sala Reunión'],
    'Chicle':                 ['Comedor', 'Sala Reunión', 'Planta', 'Laboratorio'],
    'Oblea':                  ['Comedor', 'Planta'],
    'Duro':                   ['Comedor', 'Laboratorio', 'Planta', 'Sala Reunión'],
    'Servicios Centrales':    ['Compras', 'Sala Reunión', 'Museo', 'Departamento Médico'],
    'Administración':         ['Comedor', 'Oficina'],
    'CTMS':                   ['Comedor', 'Taller', 'Oficina'],
    'Agropecuaria':           ['Oficina'],
    'Centro de Distribución': ['Comedor', 'Backup', 'Planta'],
    'Molienda 3':             ['Oficina'],
  };

  for (const [plantName, sectorList] of Object.entries(plantSectorMap)) {
    const plant = plants[plantName];
    for (const sectorName of sectorList) {
      const sector = sectors[sectorName];
      if (!plant || !sector) continue;
      await prisma.plantSector.upsert({
        where: { plantId_sectorId: { plantId: plant.id, sectorId: sector.id } },
        update: {},
        create: { plantId: plant.id, sectorId: sector.id },
      });
    }
  }
  console.log('  ✓ Asociaciones planta-sector creadas');

  // ──────────────────────────────────────────
  // 6. LOCATIONS (67 ubicaciones)
  // ──────────────────────────────────────────
  // Format: [ubicacion#, plantName, sectorName]
  const locationData: [number, string, string][] = [
    [1,  'MAPHI',                  'MAPHI'],
    [2,  'Blando',                 'Laboratorio'],
    [3,  'Blando',                 'Planta'],
    [4,  'Blando',                 'Planta'],
    [5,  'Blando',                 'Planta'],
    [6,  'Blando',                 'Planta'],
    [7,  'Blando',                 'Planta'],
    [8,  'Blando',                 'Planta'],
    [9,  'Blando',                 'Planta'],
    [10, 'Blando',                 'Planta'],
    [11, 'Blando',                 'Planta'],
    [12, 'Blando',                 'Planta'],
    [13, 'Blando',                 'Comedor'],
    [14, 'Blando',                 'Comedor'],
    [15, 'Blando',                 'Comedor'],
    [16, 'Chicle',                 'Comedor'],
    [17, 'Chicle',                 'Comedor'],
    [18, 'Chicle',                 'Comedor'],
    [19, 'Chicle',                 'Sala Reunión'],
    [20, 'Chicle',                 'Planta'],
    [21, 'Chicle',                 'Laboratorio'],
    [22, 'Chicle',                 'Planta'],
    [23, 'Oblea',                  'Comedor'],
    [24, 'Oblea',                  'Comedor'],
    [25, 'Oblea',                  'Comedor'],
    [26, 'Oblea',                  'Comedor'],
    [27, 'Oblea',                  'Planta'],
    [28, 'Oblea',                  'Planta'],
    [29, 'Oblea',                  'Planta'],
    [30, 'Duro',                   'Comedor'],
    [31, 'Duro',                   'Laboratorio'],
    [32, 'Duro',                   'Planta'],
    [33, 'Duro',                   'Sala Reunión'],
    [34, 'Duro',                   'Comedor'],
    [35, 'Duro',                   'Comedor'],
    [36, 'Duro',                   'Comedor'],
    [37, 'Duro',                   'Comedor'],
    [38, 'Duro',                   'Planta'],
    [39, 'Servicios Centrales',    'Compras'],
    [40, 'Servicios Centrales',    'Sala Reunión'],
    [41, 'Servicios Centrales',    'Museo'],
    [42, 'Servicios Centrales',    'Museo'],
    [43, 'Servicios Centrales',    'Departamento Médico'],
    [44, 'Administración',         'Comedor'],
    [45, 'Administración',         'Oficina'],
    [46, 'Administración',         'Comedor'],
    [47, 'Administración',         'Oficina'],
    [48, 'Administración',         'Comedor'],
    [49, 'Administración',         'Oficina'],
    [50, 'Administración',         'Oficina'],
    [51, 'CTMS',                   'Comedor'],
    [52, 'CTMS',                   'Taller'],
    [53, 'CTMS',                   'Oficina'],
    [54, 'CTMS',                   'Oficina'],
    [55, 'Agropecuaria',           'Oficina'],
    [56, 'Centro de Distribución', 'Comedor'],
    [57, 'Centro de Distribución', 'Comedor'],
    [58, 'Centro de Distribución', 'Comedor'],
    [59, 'Centro de Distribución', 'Comedor'],
    [60, 'Centro de Distribución', 'Comedor'],
    [61, 'Centro de Distribución', 'Backup'],
    [62, 'Centro de Distribución', 'Planta'],
    [63, 'Molienda 3',            'Oficina'],
    [64, 'Oblea',                  'Comedor'],
    [65, 'Blando',                 'Taller'],
    [66, 'Blando',                 'Sala Reunión'],
    [67, 'Administración',         'Oficina'],
  ];

  let locCreated = 0;
  for (const [num, plantName, sectorName] of locationData) {
    const plant = plants[plantName];
    const sector = sectors[sectorName];
    if (!plant || !sector) {
      console.warn(`  ⚠ Skipping location ${num}: plant="${plantName}" or sector="${sectorName}" not found`);
      continue;
    }
    const locId = `LOC-${String(num).padStart(3, '0')}`;
    await prisma.location.upsert({
      where: { id: locId },
      update: {},
      create: {
        id: locId,
        plantId: plant.id,
        sectorId: sector.id,
        nombre: `Ubicación ${num}`,
      },
    });
    locCreated++;
  }
  console.log(`  ✓ ${locCreated} ubicaciones creadas`);

  // ──────────────────────────────────────────
  // 7. DISPENSERS (4 PSA de prueba)
  // ──────────────────────────────────────────
  const dispenserData = [
    { id: 'DISP-A066', marca: 'PSA', modelo: '02P-B-F/C' },
    { id: 'DISP-A069', marca: 'PSA', modelo: '02P-B-F/C' },
    { id: 'DISP-A058', marca: 'PSA', modelo: '02P-B-F/C' },
    { id: 'DISP-A059', marca: 'PSA', modelo: '02P-B-F/C' },
  ];

  // Assign first 3 dispensers to Chicle/Comedor (LOC-016, LOC-017, LOC-018)
  const locationAssignments: Record<string, string> = {
    'DISP-A066': 'LOC-016',
    'DISP-A069': 'LOC-017',
    'DISP-A058': 'LOC-018',
    // DISP-A059 stays in BACKUP (no location)
  };

  for (const d of dispenserData) {
    const locationId = locationAssignments[d.id] || null;
    await prisma.dispenser.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        marca: d.marca,
        modelo: d.modelo,
        numeroSerie: d.id,
        status: locationId ? 'IN_SERVICE' : 'BACKUP',
        locationId,
        plantId: 'plant-chicle', // Assing all to Chicle by default
        lifecycleMonths: 60,
        lifecycleStartDate: locationId ? new Date('2024-06-01') : null,
      },
    });

    // Create location history entry for assigned dispensers
    if (locationId) {
      const existing = await prisma.dispenserLocationHistory.findFirst({
        where: { dispenserId: d.id, locationId, removedAt: null },
      });
      if (!existing) {
        await prisma.dispenserLocationHistory.create({
          data: {
            dispenserId: d.id,
            locationId,
            assignedById: admin.id,
            assignedAt: new Date('2024-06-01'),
          },
        });
      }
    }
  }
  console.log(`  ✓ ${dispenserData.length} dispensers creados`);

  // ──────────────────────────────────────────
  // 8. SAMPLE STOCK ENTRIES
  // ──────────────────────────────────────────
  const stockItems = [
    { materialCode: 'FIL-CARB-01', nombre: 'Filtro Carbón Activado', cantidad: 15, minLevel: 10, maxLevel: 50 },
    { materialCode: 'FIL-SEDI-01', nombre: 'Filtro Sedimentos', cantidad: 8, minLevel: 10, maxLevel: 40 },
    { materialCode: 'LAM-UV-01', nombre: 'Lámpara UV', cantidad: 3, minLevel: 5, maxLevel: 20 },
    { materialCode: 'ORG-GOMA-01', nombre: 'O-Ring Goma', cantidad: 25, minLevel: 10, maxLevel: 100 },
    { materialCode: 'VAL-SOL-01', nombre: 'Válvula Solenoide', cantidad: 2, minLevel: 3, maxLevel: 10 },
  ];

  // Add stock to Chicle plant
  const chicle = plants['Chicle'];
  for (const item of stockItems) {
    await prisma.stockEntry.upsert({
      where: {
        plantId_itemType_materialCode: {
          plantId: chicle.id,
          itemType: 'CONSUMABLE',
          materialCode: item.materialCode,
        },
      },
      update: {},
      create: {
        clientId: arcor.id,
        plantId: chicle.id,
        itemType: 'CONSUMABLE',
        materialCode: item.materialCode,
        nombre: item.nombre,
        cantidad: item.cantidad,
        minLevel: item.minLevel,
        maxLevel: item.maxLevel,
      },
    });
  }
  console.log('  ✓ Stock de ejemplo creado en planta Chicle');

  console.log('\n✅ Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
