import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { EMAIL_TEMPLATES, EMAIL_TEMPLATE_TYPES, renderEmailHtml, renderEmailText, applyVariables } from '@/lib/emailTemplates';
import { getMailConfig, deliverMail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

/**
 * Envía una plantilla (tal como está en el editor) con datos de ejemplo al correo del usuario actual.
 * Sin `type`, envía un correo simple para verificar la configuración.
 */
export async function POST(req: Request) {
  const user = await requireRole('ADMIN', 'SUPERVISOR');
  if (user instanceof NextResponse) return user;

  try {
    const { type, subject, body } = await req.json().catch(() => ({}));
    const config = await getMailConfig();
    if (!config.apiKey) {
      return NextResponse.json({ error: 'Configurá primero la clave de API de Resend (Configuración → Correo).' }, { status: 400 });
    }

    let mail;
    if (type) {
      if (!EMAIL_TEMPLATE_TYPES.includes(type)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
      const def = EMAIL_TEMPLATES[type as keyof typeof EMAIL_TEMPLATES];
      mail = {
        to: user.email,
        subject: `[Prueba] ${applyVariables(subject || def.subject, def.sample, { html: false })}`,
        html: renderEmailHtml({ subject: subject || def.subject, body: body || def.body, variables: def.sample, ctaLabel: def.ctaLabel }),
        text: renderEmailText(body || def.body, def.sample),
      };
    } else {
      const testBody = `Hola ${user.nombre.split(' ')[0]}:\n\nEste es un correo de prueba de HDB Service. Si lo recibiste, el envío de notificaciones por correo está funcionando.`;
      mail = {
        to: user.email,
        subject: 'Prueba de correo · HDB Service',
        html: renderEmailHtml({ subject: 'Prueba de correo', body: testBody, variables: {} }),
        text: testBody,
      };
    }

    const result = await deliverMail(config, [mail]);
    if (result.sent === 0) {
      return NextResponse.json({ error: result.error || 'No se pudo enviar el correo' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, to: user.email, id: result.ids?.[0] });
  } catch (error: any) {
    console.error('[API] POST /api/email-templates/test:', error);
    return NextResponse.json({ error: error?.message || 'No se pudo enviar el correo de prueba' }, { status: 500 });
  }
}
