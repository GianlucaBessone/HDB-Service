import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

/** Claves secretas: nunca se devuelven completas al navegador. */
const SECRET_KEYS = new Set(['RESEND_API_KEY', 'SMTP_PASS']);
const MASK_PREFIX = '••••';

const mask = (value: string) => (value ? `${MASK_PREFIX}${value.slice(-4)}` : '');

export async function GET(req: Request) {
  const auth = await requireRole('ADMIN', 'SUPERVISOR');
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(req.url);
    const keysParam = searchParams.get('keys');

    const where = keysParam ? { key: { in: keysParam.split(',') } } : {};
    const settings = await prisma.systemSetting.findMany({ where });

    const result = settings.reduce((acc, curr) => {
      acc[curr.key] = SECRET_KEYS.has(curr.key) ? mask(curr.value) : curr.value;
      return acc;
    }, {} as Record<string, string>);

    // Informa si la clave de Resend viene de una variable de entorno del servidor
    if (!keysParam || keysParam.split(',').includes('RESEND_API_KEY')) {
      result.RESEND_API_KEY_FROM_ENV = process.env.RESEND_API_KEY ? 'true' : 'false';
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] GET /api/settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireRole('ADMIN');
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();

    const entries = Object.entries(body)
      .filter(([key]) => key !== 'RESEND_API_KEY_FROM_ENV')
      // Un secreto enmascarado o vacío significa "no cambiar"
      .filter(([key, value]) => !(SECRET_KEYS.has(key) && (!value || String(value).startsWith(MASK_PREFIX))));

    await prisma.$transaction(entries.map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), id: `setting_${key}` },
      })
    ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] PUT /api/settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
