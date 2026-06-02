import { PrismaClient } from '@prisma/client';
import { sendEmail } from './lib/email';
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.systemSetting.findMany();
  if (settings.length === 0) {
    console.log('No SMTP config found in DB.');
    return;
  }

  // 1. Ticket Creado
  const res1 = await sendEmail({
    to: 'test@example.com',
    templateType: 'TICKET_CREATED',
    variables: {
      id_ticket: 'T-1030',
      motivo: 'Fuga de agua en el filtro',
      reportador_completo: 'María López',
      primer_nombre_reportador: 'María',
      prioridad: 'MEDIA',
      planta: 'Planta Logística Sur',
      ubicacion: 'Depósito 2'
    }
  });
  console.log('Test 1 (TICKET_CREATED):', res1);

  // 2. Ticket Asignado
  const res2 = await sendEmail({
    to: 'test@example.com',
    templateType: 'TICKET_ASSIGNED',
    variables: {
      id_ticket: 'T-1030',
      motivo: 'Fuga de agua en el filtro',
      tecnico_completo: 'Diego Técnico',
      primer_nombre_tecnico: 'Diego',
      prioridad: 'MEDIA',
      planta: 'Planta Logística Sur',
      ubicacion: 'Depósito 2',
      dias_vencimiento_sla: '2',
      fecha_vencimiento_sla: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR')
    }
  });
  console.log('Test 2 (TICKET_ASSIGNED):', res2);

  // 3. Ticket Resuelto
  const res3 = await sendEmail({
    to: 'test@example.com',
    templateType: 'TICKET_RESOLVED',
    variables: {
      id_ticket: 'T-1030',
      motivo: 'Fuga de agua en el filtro',
      resolucion: 'Se reemplazó el filtro sellado y se ajustó la válvula.',
      tecnico_completo: 'Diego Técnico',
      primer_nombre_tecnico: 'Diego',
      reportador_completo: 'María López',
      primer_nombre_reportador: 'María',
      planta: 'Planta Logística Sur',
      ubicacion: 'Depósito 2',
      fecha_resolucion: new Date().toLocaleDateString('es-AR')
    }
  });
  console.log('Test 3 (TICKET_RESOLVED):', res3);
}

main().finally(() => prisma.$disconnect());
