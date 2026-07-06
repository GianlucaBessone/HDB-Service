import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySignature } from '@/lib/signature';

export async function POST(req: Request) {
  try {
    const { hash } = await req.json();

    if (!hash || typeof hash !== 'string') {
      return NextResponse.json({ error: 'El hash es obligatorio' }, { status: 400 });
    }

    // Find the approval with this hash
    const approval = await prisma.maintenanceApproval.findFirst({
      where: { signatureHash: hash.trim() },
      include: {
        technician: { select: { nombre: true, email: true } },
        schedules: {
          include: {
            dispenser: {
              select: { id: true, marca: true, modelo: true }
            }
          }
        }
      }
    });

    if (!approval || !approval.encryptedHash || !approval.hashPayload) {
      return NextResponse.json({ 
        valid: false, 
        error: 'No se encontró ninguna firma con este hash o la firma es de un formato antiguo (legacy).' 
      }, { status: 404 });
    }

    // Cryptographic verification
    const verification = verifySignature(approval.encryptedHash, approval.hashPayload);

    if (!verification.valid || verification.computedHash !== hash.trim()) {
      return NextResponse.json({ 
        valid: false, 
        error: 'El certificado digital ha sido alterado y no es válido.' 
      }, { status: 400 });
    }

    // Valid signature, return details
    return NextResponse.json({
      valid: true,
      data: {
        customerName: approval.customerName,
        customerIdentity: approval.customerIdentity,
        signedAt: approval.signedAt,
        deviceInfo: approval.deviceInfo,
        ipAddress: approval.ipAddress,
        technicianName: approval.technician.nombre,
        dispensers: approval.schedules.map(s => s.dispenser.id),
      }
    });

  } catch (error) {
    console.error('[API] POST /api/public/verify error:', error);
    return NextResponse.json({ error: 'Error interno de verificación' }, { status: 500 });
  }
}
