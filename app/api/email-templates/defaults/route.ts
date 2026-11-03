import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { EMAIL_TEMPLATES, EMAIL_TEMPLATE_TYPES, isPlaceholderTemplate } from '@/lib/emailTemplates';

export const dynamic = 'force-dynamic';

/**
 * Guarda en la base los textos recomendados de las plantillas.
 * mode = 'missing'  → crea las que faltan y reemplaza las que tienen texto de relleno (por defecto)
 * mode = 'reset'    → restaura una plantilla puntual (requiere `type`)
 */
export async function POST(req: Request) {
  const auth = await requireRole('ADMIN', 'SUPERVISOR');
  if (auth instanceof NextResponse) return auth;

  try {
    const { mode = 'missing', type } = await req.json().catch(() => ({}));
    const types = mode === 'reset' ? [type].filter(t => EMAIL_TEMPLATE_TYPES.includes(t)) : EMAIL_TEMPLATE_TYPES;
    if (types.length === 0) return NextResponse.json({ error: 'Tipo de plantilla inválido' }, { status: 400 });

    const existing = await prisma.emailTemplate.findMany({ where: { type: { in: types } } });
    const byType = new Map(existing.map(t => [t.type, t]));
    const saved: string[] = [];

    for (const t of types) {
      const def = EMAIL_TEMPLATES[t as keyof typeof EMAIL_TEMPLATES];
      const current = byType.get(t);
      if (!current) {
        await prisma.emailTemplate.create({ data: { type: t, subject: def.subject, body: def.body, active: true } });
        saved.push(t);
      } else if (mode === 'reset' || isPlaceholderTemplate(current)) {
        await prisma.emailTemplate.update({ where: { id: current.id }, data: { subject: def.subject, body: def.body } });
        saved.push(t);
      }
    }

    const templates = await prisma.emailTemplate.findMany({ orderBy: { type: 'asc' } });
    return NextResponse.json({ saved, templates });
  } catch (error) {
    console.error('[API] POST /api/email-templates/defaults:', error);
    return NextResponse.json({ error: 'Error al guardar las plantillas' }, { status: 500 });
  }
}
