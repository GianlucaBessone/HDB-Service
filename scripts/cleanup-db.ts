import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Manually load .env variables for standalone execution
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const prisma = new PrismaClient();

async function main() {
  console.log('⏳ Iniciando limpieza de la base de datos...');

  // Deletions in order of foreign key dependency
  await prisma.$transaction([
    // 1. Suggestions/claims (Ideas, sugerencias y reclamos)
    prisma.sugerencia.deleteMany(),

    // 2. Ticket comments and status history
    prisma.ticketComment.deleteMany(),
    prisma.ticketStatusHistory.deleteMany(),
    
    // 3. Tickets
    prisma.ticket.deleteMany(),
    
    // 4. Maintenance checklists, schedules, and approvals
    prisma.maintenanceChecklist.deleteMany(),
    prisma.maintenanceSchedule.deleteMany(),
    prisma.maintenanceApproval.deleteMany(),

    // 5. Dispenser histories
    prisma.dispenserLocationHistory.deleteMany(),
    prisma.dispenserRepairHistory.deleteMany(),
    prisma.dispenserConsumableHistory.deleteMany(),
    prisma.dispenserSparePartHistory.deleteMany(),
    
    // 6. Dispensers
    prisma.dispenser.deleteMany(),

    // 7. Stock and Inventory transactions/entries
    prisma.stockTransfer.deleteMany(),
    prisma.interPlantDebt.deleteMany(),
    prisma.stockEntry.deleteMany(),
    prisma.consumable.deleteMany(),

    // 8. General logs, notifications, and keys
    prisma.notification.deleteMany(),
    prisma.idempotencyKey.deleteMany(),
    prisma.auditLog.deleteMany(),
  ]);

  console.log('✅ Base de datos limpiada exitosamente.');
  console.log('   - Se eliminaron las sugerencias y reclamos.');
  console.log('   - Se eliminaron todos los Tickets y su historial/comentarios.');
  console.log('   - Se eliminaron todos los Dispensers, mantenimiento, checklist y aprobaciones.');
  console.log('   - Se eliminó el Stock (StockEntries, Consumables, Transferencias y Deudas).');
  console.log('   - Se eliminaron las Notificaciones, llaves de idempotencia y Logs de Auditoría.');
  console.log('\n🛡️  Se mantuvieron intactos:');
  console.log('   - Clientes');
  console.log('   - Plantas');
  console.log('   - Sectores');
  console.log('   - Ubicaciones');
  console.log('   - Usuarios y sus accesos (para que puedas seguir iniciando sesión)');
  console.log('   - Configuración de SLA');
  console.log('   - Catálogo de Materiales y Plantillas de Email');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la limpieza de la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
