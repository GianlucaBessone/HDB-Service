import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  try {
    const approval = await prisma.maintenanceApproval.findUnique({
      where: { id: id },
      include: {
        technician: { select: { id: true, nombre: true } },
        schedules: {
          include: {
            dispenser: {
              select: {
                id: true,
                marca: true,
                modelo: true,
                location: {
                  include: {
                    plant: { select: { nombre: true, client: { select: { nombre: true } } } },
                    sector: { select: { nombre: true } }
                  }
                }
              }
            },
            checklist: true
          }
        }
      }
    });

    if (!approval) {
      await revalidateTag('public', 'default');
    return NextResponse.json({ error: 'Aprobación no encontrada' }, { status: 404 });
    }

    await revalidateTag('public', 'default');
    return NextResponse.json(approval);
  } catch (error) {
    console.error('[API] GET /api/public/approvals/[id] error:', error);
    await revalidateTag('public', 'default');
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  try {
    const { customerName, customerIdentity, signatureData } = await req.json();

    if (!customerName || !signatureData) {
      await revalidateTag('public', 'default');
    return NextResponse.json({ error: 'Nombre y firma son requeridos' }, { status: 400 });
    }

    const approval = await prisma.maintenanceApproval.findUnique({
      where: { id: id },
      include: { schedules: true }
    });

    if (!approval) {
      await revalidateTag('public', 'default');
    return NextResponse.json({ error: 'Aprobación no encontrada' }, { status: 404 });
    }

    if (approval.signatureData) {
      await revalidateTag('public', 'default');
    return NextResponse.json({ error: 'Esta aprobación ya fue firmada' }, { status: 400 });
    }

    // Update approval with signature
    const updatedApproval = await prisma.maintenanceApproval.update({
      where: { id: id },
      data: {
        customerName,
        customerIdentity,
        signatureData
      }
    });

    // Update schedules to SIGNED
    await prisma.maintenanceSchedule.updateMany({
      where: { approvalId: id },
      data: { status: 'SIGNED' }
    });

    await revalidateTag('public', 'default');
    return NextResponse.json(updatedApproval);
  } catch (error) {
    console.error('[API] PUT /api/public/approvals/[id] error:', error);
    await revalidateTag('public', 'default');
    return NextResponse.json({ error: 'Error al guardar la firma' }, { status: 500 });
  }
}

export const revalidate = 300; // 5 min
