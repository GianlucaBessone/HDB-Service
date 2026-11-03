import { prisma } from './prisma';
import nodemailer from 'nodemailer';
import {
  EMAIL_TEMPLATES,
  EmailTemplateType,
  isPlaceholderTemplate,
  renderEmailHtml,
  renderEmailText,
  applyVariables,
} from './emailTemplates';

/**
 * Modo prueba: mientras esté activo, TODOS los correos se redirigen a una única casilla.
 * Se configura en Configuración → Servidor SMTP (EMAIL_TEST_MODE / EMAIL_TEST_RECIPIENT).
 * Si nunca se configuró, se mantiene el comportamiento anterior (redirigir a la casilla de pruebas).
 */
const LEGACY_TEST_RECIPIENT = 'gbessone.hdb@gmail.com';

const SMTP_KEYS = [
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_NAME', 'SMTP_FROM_EMAIL', 'SMTP_SECURE',
  'EMAIL_TEST_MODE', 'EMAIL_TEST_RECIPIENT',
];

async function getSmtpConfig() {
  const settings = await prisma.systemSetting.findMany({ where: { key: { in: SMTP_KEYS } } });
  return settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);
}

/** Devuelve la plantilla vigente: la de la base si está cargada; si no, la predeterminada. */
export async function resolveEmailTemplate(type: string) {
  const def = EMAIL_TEMPLATES[type as EmailTemplateType];
  const stored = await prisma.emailTemplate.findUnique({ where: { type } });

  if (stored && !stored.active) return { skip: true as const };
  if (stored && !isPlaceholderTemplate(stored)) {
    return { skip: false as const, subject: stored.subject, body: stored.body, ctaLabel: def?.ctaLabel };
  }
  if (def) return { skip: false as const, subject: def.subject, body: def.body, ctaLabel: def.ctaLabel };
  return null;
}

export type SendEmailResult = { sent: number; skipped?: string; redirectedTo?: string };

export async function sendEmail({
  to,
  templateType,
  variables = {},
}: {
  to: string | string[] | null | undefined;
  templateType: string;
  variables?: Record<string, string>;
}): Promise<boolean> {
  const result = await sendEmailDetailed({ to, templateType, variables });
  return result.sent > 0;
}

export async function sendEmailDetailed({
  to,
  templateType,
  variables = {},
  forceRecipient,
}: {
  to: string | string[] | null | undefined;
  templateType: string;
  variables?: Record<string, string>;
  /** Para envíos de prueba desde el panel: ignora el modo prueba y envía a esta casilla. */
  forceRecipient?: string;
}): Promise<SendEmailResult> {
  try {
    const recipients = Array.from(new Set((Array.isArray(to) ? to : [to])
      .map(e => (e || '').trim().toLowerCase())
      .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))));

    if (recipients.length === 0 && !forceRecipient) {
      return { sent: 0, skipped: 'Sin destinatarios válidos' };
    }

    const smtp = await getSmtpConfig();
    if (!smtp.SMTP_HOST || !smtp.SMTP_USER || !smtp.SMTP_PASS) {
      console.warn('[Email] Configuración SMTP incompleta. No se envía el correo.');
      return { sent: 0, skipped: 'Configuración SMTP incompleta' };
    }

    const template = await resolveEmailTemplate(templateType);
    if (!template) {
      console.warn(`[Email] Plantilla inexistente: ${templateType}`);
      return { sent: 0, skipped: 'Plantilla inexistente' };
    }
    if (template.skip) {
      return { sent: 0, skipped: 'Plantilla desactivada' };
    }

    const subject = applyVariables(template.subject, variables, { html: false });
    const html = renderEmailHtml({ subject: template.subject, body: template.body, variables, ctaLabel: template.ctaLabel });
    const text = renderEmailText(template.body, variables);

    // Modo prueba
    const testMode = smtp.EMAIL_TEST_MODE === undefined ? true : smtp.EMAIL_TEST_MODE === 'true';
    const testRecipient = (smtp.EMAIL_TEST_RECIPIENT ?? LEGACY_TEST_RECIPIENT).trim();
    let finalRecipients = recipients;
    let redirectedTo: string | undefined;
    if (forceRecipient) {
      finalRecipients = [forceRecipient];
    } else if (testMode && testRecipient) {
      finalRecipients = [testRecipient];
      redirectedTo = testRecipient;
    }

    const port = parseInt(smtp.SMTP_PORT || '587');
    const transporter = nodemailer.createTransport({
      host: smtp.SMTP_HOST,
      port,
      secure: port === 465, // 465 = SSL; otros puertos usan STARTTLS
      auth: { user: smtp.SMTP_USER, pass: smtp.SMTP_PASS },
      tls: { rejectUnauthorized: false },
      family: 4,
    } as any);

    const from = `"${smtp.SMTP_FROM_NAME || 'HDB Service'}" <${smtp.SMTP_FROM_EMAIL || smtp.SMTP_USER}>`;
    const subjectLine = redirectedTo ? `[PRUEBA → ${recipients.join(', ')}] ${subject}` : subject;

    let sent = 0;
    for (const rcpt of finalRecipients) {
      try {
        await transporter.sendMail({ from, to: rcpt, subject: subjectLine, html, text });
        sent++;
      } catch (err) {
        console.error(`[Email] Error enviando a ${rcpt}:`, err);
      }
    }

    console.log(`[Email] ${templateType}: ${sent}/${finalRecipients.length} enviados${redirectedTo ? ` (modo prueba → ${redirectedTo}; destinatarios reales: ${recipients.join(', ')})` : ''}.`);
    return { sent, redirectedTo };
  } catch (error) {
    console.error('[Email] Error al enviar email:', error);
    return { sent: 0, skipped: 'Error inesperado' };
  }
}
