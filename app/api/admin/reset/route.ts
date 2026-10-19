import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Verificación de seguridad: o usuario autenticado ADMIN o token secreto de cron/admin
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const secret = req.headers.get('x-admin-secret') || searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    const isAuthorized = 
      (user && user.role === 'ADMIN') || 
      (cronSecret && secret === cronSecret);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'No autorizado. Se requieren permisos de ADMIN o clave de administración.' },
        { status: 403 }
      );
    }

    const mode = searchParams.get('mode') || 'purge'; // 'purge' (borrado de equipos) o 'status_reset' (restablecer a operativo)

    // ──────────────────────────────────────────
    // 1. USUARIOS: Dejar solo a gbessone.hdb@gmail.com como activo
    // ──────────────────────────────────────────
    const deactivated = await prisma.user.updateMany({
      where: {
        email: { not: 'gbessone.hdb@gmail.com' },
      },
      data: {
        active: false,
      },
    });

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

    // ──────────────────────────────────────────
    // 2. DISPOSITIVOS Y EQUIPOS
    // ──────────────────────────────────────────
    let equipmentResult = {};

    if (mode === 'purge') {
      // Eliminar registros operativos dependientes de equipos
      await prisma.dispenserRepairHistory.deleteMany({});
      await prisma.dispenserConsumableHistory.deleteMany({});
      await prisma.dispenserSparePartHistory.deleteMany({});
      await prisma.dispenserLocationHistory.deleteMany({});
      await prisma.maintenanceChecklist.deleteMany({});
      await prisma.maintenanceSchedule.deleteMany({});
      await prisma.ticketComment.deleteMany({});
      await prisma.ticket.deleteMany({});

      // Eliminar todos los equipos
      const deletedEquipments = await prisma.dispenser.deleteMany({});

      equipmentResult = {
        action: 'purge',
        deletedEquipmentsCount: deletedEquipments.count,
        message: 'Todos los equipos, historiales, rutas y tickets fueron eliminados. Inventario en 0.',
      };
    } else {
      // Resetear estado operativo a IN_SERVICE (como nuevo)
      const updatedEquipments = await prisma.dispenser.updateMany({
        data: {
          status: 'IN_SERVICE',
          blockedReason: null,
          blockedAt: null,
          lifecyclePausedAt: null,
          lifecycleAccumulatedPauseDays: 0,
          active: true,
        },
      });

      equipmentResult = {
        action: 'status_reset',
        updatedEquipmentsCount: updatedEquipments.count,
        message: 'Todos los equipos fueron restablecidos a estado EN SERVICIO y desbloqueados.',
      };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      userManagement: {
        deactivatedCount: deactivated.count,
        activeUser: {
          email: adminUser.email,
          role: adminUser.role,
          active: adminUser.active,
        },
      },
      equipmentManagement: equipmentResult,
    });
  } catch (error: any) {
    console.error('Error en /api/admin/reset:', error);
    return NextResponse.json(
      { error: 'Error durante el reseteo', details: error.message },
      { status: 500 }
    );
  }
}
