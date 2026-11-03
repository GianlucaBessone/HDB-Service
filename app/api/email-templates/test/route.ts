import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { EMAIL_TEMPLATES, EMAIL_TEMPLATE_TYPES, renderEmailHtml, renderEmailText, applyVariables } from '@/lib/emailTemplates';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

/** Envía la plantilla (tal como está en el editor) con datos de ejemplo al correo del usuario actual. */
export async function POST(req: Request) {
  const user = await requireRole('ADMIN', 'SUPERVISOR');
  if (user instanceof NextResponse) return user;

  try {
    const { type, subject, body } = await req.json();
    if (!EMAIL_TEMPLATE_TYPES.includes(type)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    const def = EMAIL_TEMPLATES[type as keyof typeof EMAIL_TEMPLATES];

    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_NAME', 'SMTP_FROM_EMAIL'] } },
    });
    const smtp = Object.fromEntries(settings.map(s => [s.key, s.value]));
    if (!smtp.SMTP_HOST || !smtp.SMTP_USER || !smtp.SMTP_PASS) {
      return NextResponse.json({ error: 'Configurá primero el servidor SMTP.' }, { status: 400 });
    }

    const vars = def.sample;
    const finalSubject = `[Prueba] ${applyVariables(subject || def.subject, vars, { html: false })}`;
    const port = parseInt(smtp.SMTP_PORT || '587');
    const transporter = nodemailer.createTransport({
      host: smtp.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: smtp.SMTP_USER, pass: smtp.SMTP_PASS },
      tls: { rejectUnauthorized: false },
      family: 4,
    } as any);

    await transporter.sendMail({
      from: `"${smtp.SMTP_FROM_NAME || 'HDB Service'}" <${smtp.SMTP_FROM_EMAIL || smtp.SMTP_USER}>`,
      to: user.email,
      subject: finalSubject,
      html: renderEmailHtml({ subject: subject || def.subject, body: body || def.body, variables: vars, ctaLabel: def.ctaLabel }),
      text: renderEmailText(body || def.body, vars),
    });

    return NextResponse.json({ ok: true, to: user.email });
  } catch (error: any) {
    console.error('[API] POST /api/email-templates/test:', error);
    return NextResponse.json({ error: error?.message || 'No se pudo enviar el correo de prueba' }, { status: 500 });
  }
}
