import { prisma } from './prisma';
import {
  EMAIL_TEMPLATES,
  EmailTemplateType,
  isPlaceholderTemplate,
  renderEmailHtml,
  renderEmailText,
  applyVariables,
} from './emailTemplates';
import { getMailConfig, deliverMail } from './mailer';

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

export type SendEmailResult = { sent: number; skipped?: string; redirectedTo?: string; error?: string };

export async function sendEmail(args: {
  to: string | string[] | null | undefined;
  templateType: string;
  variables?: Record<string, string>;
}): Promise<boolean> {
  const result = await sendEmailDetailed(args);
  return result.sent > 0;
}

/**
 * Envía un aviso usando su plantilla. Respeta el modo prueba (todo a una casilla)
 * y nunca lanza excepciones.
 */
export async function sendEmailDetailed({
  to,
  templateType,
  variables = {},
}: {
  to: string | string[] | null | undefined;
  templateType: string;
  variables?: Record<string, string>;
}): Promise<SendEmailResult> {
  try {
    const recipients = Array.from(new Set((Array.isArray(to) ? to : [to])
      .map(e => (e || '').trim().toLowerCase())
      .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))));
    if (recipients.length === 0) return { sent: 0, skipped: 'Sin destinatarios válidos' };

    const config = await getMailConfig();
    if (!config.apiKey) {
      console.warn('[Email] Falta la clave de API de Resend. No se envía el correo.');
      return { sent: 0, skipped: 'Correo no configurado' };
    }

    const template = await resolveEmailTemplate(templateType);
    if (!template) return { sent: 0, skipped: 'Plantilla inexistente' };
    if (template.skip) return { sent: 0, skipped: 'Plantilla desactivada' };

    const subject = applyVariables(template.subject, variables, { html: false });
    const html = renderEmailHtml({ subject: template.subject, body: template.body, variables, ctaLabel: template.ctaLabel });
    const text = renderEmailText(template.body, variables);

    const redirectedTo = config.testMode && config.testRecipient ? config.testRecipient : undefined;
    const finalRecipients = redirectedTo ? [redirectedTo] : recipients;
    const finalSubject = redirectedTo ? `[PRUEBA → ${recipients.join(', ')}] ${subject}` : subject;

    const result = await deliverMail(config, finalRecipients.map(rcpt => ({ to: rcpt, subject: finalSubject, html, text })));

    console.log(`[Email] ${templateType}: ${result.sent}/${finalRecipients.length} enviados${redirectedTo ? ` (modo prueba → ${redirectedTo}; destinatarios reales: ${recipients.join(', ')})` : ''}.`);
    return { sent: result.sent, redirectedTo, error: result.error };
  } catch (error: any) {
    console.error('[Email] Error al enviar email:', error);
    return { sent: 0, error: error?.message || 'Error inesperado' };
  }
}
