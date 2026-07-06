import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSignature } from '@/lib/signature';

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
    const { customerName, customerIdentity, signatureData, deviceInfo } = await req.json();

    if (!customerName || !customerIdentity || !signatureData) {
      await revalidateTag('public', 'default');
    return NextResponse.json({ error: 'Nombre, DNI/Identificación y firma son requeridos' }, { status: 400 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown';

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

    // Build signature components
    const dispenserIds = approval.schedules.map(s => s.dispenserId);
    const timestamp = new Date().toISOString();
    
    // Generate digital signature
    const signature = generateSignature({
      dispenserIds,
      timestamp,
      deviceInfo: deviceInfo || req.headers.get('user-agent') || 'Unknown Device',
      technicianId: approval.technicianId,
      customerName,
      customerIdentity
    });

    // Update approval with signature
    const updatedApproval = await prisma.maintenanceApproval.update({
      where: { id: id },
      data: {
        customerName,
        customerIdentity,
        signatureData,
        signatureHash: signature.signatureHash,
        encryptedHash: signature.encryptedHash,
        hashPayload: signature.rawPayload,
        signedAt: timestamp,
        deviceInfo: deviceInfo || req.headers.get('user-agent') || 'Unknown Device',
        ipAddress
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

export const dynamic = 'force-dynamic';
