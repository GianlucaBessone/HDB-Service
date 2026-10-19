import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetSystem() {
  console.log('🔄 Iniciando reseteo del sistema HDB Service...\n');

  try {
    // ──────────────────────────────────────────
    // 1. USUARIOS: Dejar solo a gbessone.hdb@gmail.com como activo
    // ──────────────────────────────────────────
    console.log('👤 Configurando usuarios...');
    
    // Desactivar todos los demás usuarios
    const deactivated = await prisma.user.updateMany({
      where: {
        email: { not: 'gbessone.hdb@gmail.com' },
      },
      data: {
        active: false,
      },
    });
    console.log(`  ✓ ${deactivated.count} usuarios desactivados.`);

    // Asegurar que gbessone.hdb@gmail.com existe, es ADMIN y está activo
    const defaultPwd = await bcrypt.hash('HDBService2026!', 10);
    const adminUser = await prisma.user.upsert({
      where: { email: 'gbessone.hdb@gmail.com' },
      update: {
        active: true,
        role: 'ADMIN',
      },
      create: {
        email: 'gbessone.hdb@gmail.com',
        passwordHash: defaultPwd,
        nombre: 'Gianluca',
        apellido: 'Bessone',
        role: 'ADMIN',
        active: true,
        mustChangePassword: false,
      },
    });
    console.log(`  ✓ Usuario único activo: ${adminUser.email} (Rol: ${adminUser.role})`);

    // ──────────────────────────────────────────
    // 2. DISPOSITIVOS Y EQUIPOS: Reseteo y purga de historiales
    // ──────────────────────────────────────────
    console.log('\n⚙️ Reseteando dispositivos y equipos (flota de activos)...');

    // 2.1 Eliminar historiales y registros operativos vinculados a equipos
    const deletedRepairs = await prisma.dispenserRepairHistory.deleteMany({});
    console.log(`  ✓ Historial de reparaciones eliminado (${deletedRepairs.count} registros).`);

    const deletedConsumables = await prisma.dispenserConsumableHistory.deleteMany({});
    console.log(`  ✓ Historial de consumibles eliminado (${deletedConsumables.count} registros).`);

    const deletedSpareParts = await prisma.dispenserSparePartHistory.deleteMany({});
    console.log(`  ✓ Historial de repuestos eliminado (${deletedSpareParts.count} registros).`);

    const deletedLocations = await prisma.dispenserLocationHistory.deleteMany({});
    console.log(`  ✓ Historial de ubicaciones eliminado (${deletedLocations.count} registros).`);

    const deletedChecklists = await prisma.maintenanceChecklist.deleteMany({});
    console.log(`  ✓ Checklists de mantenimiento eliminados (${deletedChecklists.count} registros).`);

    const deletedSchedules = await prisma.maintenanceSchedule.deleteMany({});
    console.log(`  ✓ Rutas/Schedules de mantenimiento eliminadas (${deletedSchedules.count} registros).`);

    const deletedTicketComments = await prisma.ticketComment.deleteMany({});
    console.log(`  ✓ Comentarios de tickets eliminados (${deletedTicketComments.count} registros).`);

    const deletedTickets = await prisma.ticket.deleteMany({});
    console.log(`  ✓ Tickets de servicio eliminados (${deletedTickets.count} registros).`);

    // 2.2 Eliminar todos los equipos
    const deletedDispensers = await prisma.dispenser.deleteMany({});
    console.log(`  ✓ Equipos eliminados de la base de datos (${deletedDispensers.count} activos).`);

    console.log('\n✅ ¡Reseteo completado con éxito!');
    console.log('El sistema quedó con inventario en 0 y listo para cargar la flota real.');
    console.log(`Único usuario activo: ${adminUser.email}`);
  } catch (error) {
    console.error('❌ Error durante el reseteo:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetSystem();
