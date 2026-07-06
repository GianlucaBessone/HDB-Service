import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySignature } from '@/lib/signature';
import { requirePermission } from '@/lib/auth';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('maintenance:read');
  if (user instanceof NextResponse) return user;

  const params = await props.params;
  const { id } = params;

  try {
    const approval = await prisma.maintenanceApproval.findUnique({
      where: { id: id },
    });

    if (!approval) {
      return NextResponse.json({ error: 'Firma no encontrada' }, { status: 404 });
    }

    if (!approval.signatureHash || !approval.encryptedHash || !approval.hashPayload) {
      return NextResponse.json({ error: 'Esta firma no tiene certificado digital válido' }, { status: 400 });
    }

    const verificationResult = verifySignature(approval.encryptedHash, approval.hashPayload);

    return NextResponse.json(verificationResult);
  } catch (error) {
    console.error('[API] POST /api/maintenance/approvals/[id]/verify error:', error);
    return NextResponse.json({ error: 'Error al verificar integridad de la firma' }, { status: 500 });
  }
}
