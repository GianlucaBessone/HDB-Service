import { prisma } from './prisma';

/**
 * Envío de correos con Resend (https://resend.com) vía API REST.
 *
 * Configuración (Configuración → Correo, o variables de entorno):
 * - RESEND_API_KEY      Clave de API. La variable de entorno tiene prioridad sobre la guardada en la app.
 * - EMAIL_FROM_NAME     Nombre del remitente (por defecto "HDB Service").
 * - EMAIL_FROM_ADDRESS  Remitente; debe pertenecer a un dominio verificado en Resend.
 *                       Sin dominio verificado se usa onboarding@resend.dev, que sólo entrega
 *                       a la casilla dueña de la cuenta de Resend.
 * - EMAIL_REPLY_TO      Casilla para respuestas (opcional).
 * - EMAIL_TEST_MODE / EMAIL_TEST_RECIPIENT  Modo prueba (ver lib/email.ts).
 */

export const MAIL_SETTING_KEYS = [
  'RESEND_API_KEY',
  'EMAIL_FROM_NAME',
  'EMAIL_FROM_ADDRESS',
  'EMAIL_REPLY_TO',
  'EMAIL_TEST_MODE',
  'EMAIL_TEST_RECIPIENT',
] as const;

export const RESEND_DEFAULT_FROM = 'onboarding@resend.dev';
const RESEND_ENDPOINT = 'https://api.resend.com';

export type MailConfig = {
  apiKey: string;
  from: string;
  replyTo?: string;
  testMode: boolean;
  testRecipient: string;
  /** Casilla de prueba por defecto si nunca se configuró (comportamiento anterior). */
};

const LEGACY_TEST_RECIPIENT = 'gbessone.hdb@gmail.com';

export async function getMailConfig(): Promise<MailConfig> {
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: [...MAIL_SETTING_KEYS] } } });
  const s = Object.fromEntries(rows.map(r => [r.key, r.value])) as Record<string, string>;

  const name = (s.EMAIL_FROM_NAME || 'HDB Service').replace(/["<>]/g, '').trim();
  const address = (s.EMAIL_FROM_ADDRESS || RESEND_DEFAULT_FROM).trim();

  return {
    apiKey: (process.env.RESEND_API_KEY || s.RESEND_API_KEY || '').trim(),
    from: `${name} <${address}>`,
    replyTo: s.EMAIL_REPLY_TO?.trim() || undefined,
    testMode: s.EMAIL_TEST_MODE === undefined ? true : s.EMAIL_TEST_MODE === 'true',
    testRecipient: (s.EMAIL_TEST_RECIPIENT ?? LEGACY_TEST_RECIPIENT).trim(),
  };
}

export type OutgoingMail = { to: string; subject: string; html: string; text: string };

export type DeliveryResult = { sent: number; failed: number; error?: string; ids?: string[] };

async function resendRequest(apiKey: string, path: string, body: unknown) {
  const res = await fetch(`${RESEND_ENDPOINT}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(`Resend: ${message}`);
  }
  return data;
}

/**
 * Envía uno o varios correos (cada uno a un único destinatario, para no exponer direcciones).
 * Usa el endpoint batch de Resend (hasta 100 por pedido) cuando hay más de uno.
 */
export async function deliverMail(config: MailConfig, mails: OutgoingMail[]): Promise<DeliveryResult> {
  if (!config.apiKey) return { sent: 0, failed: mails.length, error: 'Falta la clave de API de Resend' };
  if (mails.length === 0) return { sent: 0, failed: 0 };

  const toPayload = (m: OutgoingMail) => ({
    from: config.from,
    to: [m.to],
    subject: m.subject,
    html: m.html,
    text: m.text,
    ...(config.replyTo ? { reply_to: config.replyTo } : {}),
  });

  let sent = 0;
  let failed = 0;
  const ids: string[] = [];
  const errors: string[] = [];

  try {
    if (mails.length === 1) {
      const data = await resendRequest(config.apiKey, '/emails', toPayload(mails[0]));
      if (data?.id) ids.push(data.id);
      sent = 1;
    } else {
      for (let i = 0; i < mails.length; i += 100) {
        const chunk = mails.slice(i, i + 100);
        try {
          const data = await resendRequest(config.apiKey, '/emails/batch', chunk.map(toPayload));
          const created = Array.isArray(data?.data) ? data.data : [];
          created.forEach((d: any) => d?.id && ids.push(d.id));
          sent += chunk.length;
        } catch (err: any) {
          failed += chunk.length;
          errors.push(err?.message || 'Error de envío');
        }
      }
    }
  } catch (err: any) {
    failed = mails.length - sent;
    errors.push(err?.message || 'Error de envío');
  }

  if (errors.length) console.error('[Email] Resend:', errors.join(' | '));
  return { sent, failed, ids, error: errors.length ? errors.join(' | ') : undefined };
}
