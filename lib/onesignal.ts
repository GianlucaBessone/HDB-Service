/**
 * Notificaciones push vía OneSignal (API REST).
 *
 * Los usuarios se identifican con su id de HDB como External ID: el cliente llama a
 * OneSignal.login(user.id) al iniciar sesión (components/OneSignalInit.tsx).
 */

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '';
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY || '';
const ONESIGNAL_ENDPOINT = 'https://api.onesignal.com/notifications';
const MAX_ALIASES_PER_REQUEST = 2000;

interface SendNotificationParams {
  /** Ids de usuario de HDB (External ID en OneSignal). */
  userIds?: string[];
  /** Ids de suscripción (compatibilidad). */
  playerIds?: string[];
  title: string;
  message: string;
  data?: Record<string, any>;
  /** Enlace que se abre al tocar la notificación. */
  url?: string;
}

export interface PushResult {
  ok: boolean;
  /** Dispositivos alcanzados según OneSignal (si lo informa). */
  recipients?: number;
  id?: string;
  error?: string;
}

export function isPushConfigured() {
  return Boolean(ONESIGNAL_APP_ID && ONESIGNAL_API_KEY);
}

/** Las claves nuevas (os_v2_…) usan "Key"; las claves REST heredadas usan "Basic". */
function authHeader() {
  return ONESIGNAL_API_KEY.startsWith('os_v2_') ? `Key ${ONESIGNAL_API_KEY}` : `Basic ${ONESIGNAL_API_KEY}`;
}

async function postNotification(payload: Record<string, any>): Promise<PushResult> {
  const response = await fetch(ONESIGNAL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
    body: JSON.stringify(payload),
  });

  const body: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = JSON.stringify(body?.errors || body || response.statusText);
    console.error(`[OneSignal] HTTP ${response.status}:`, error);
    return { ok: false, error };
  }

  // OneSignal responde 200 aunque ningún dispositivo esté suscripto (id vacío + errors).
  // Con algunos destinatarios inválidos devuelve id y errors: es un envío parcial.
  const errors = body?.errors;
  const hasErrors = errors && (Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0);
  if (!body?.id) {
    const error = JSON.stringify(errors || 'Sin destinatarios suscriptos');
    console.warn('[OneSignal] No se envió a ningún dispositivo:', error);
    return { ok: false, recipients: 0, error };
  }
  if (hasErrors) console.warn('[OneSignal] Envío parcial; destinatarios sin suscripción:', JSON.stringify(errors));

  return { ok: true, id: body.id, recipients: typeof body.recipients === 'number' ? body.recipients : undefined };
}

/**
 * Envía una notificación push a usuarios (External ID) o suscripciones puntuales.
 * Nunca lanza excepciones: devuelve el resultado para poder registrarlo.
 */
export async function sendPushNotificationDetailed(params: SendNotificationParams): Promise<PushResult> {
  if (!isPushConfigured()) {
    console.warn('[OneSignal] Falta ONESIGNAL_APP_ID u ONESIGNAL_API_KEY; no se envía la notificación.');
    return { ok: false, error: 'OneSignal no está configurado' };
  }

  const userIds = Array.from(new Set((params.userIds || []).filter(Boolean)));
  const playerIds = Array.from(new Set((params.playerIds || []).filter(Boolean)));

  if (userIds.length === 0 && playerIds.length === 0) {
    return { ok: false, error: 'Sin destinatarios' };
  }

  const base: Record<string, any> = {
    app_id: ONESIGNAL_APP_ID,
    headings: { es: params.title, en: params.title },
    contents: { es: params.message, en: params.message },
    data: params.data || {},
    target_channel: 'push',
  };
  if (params.url) base.web_url = params.url;

  try {
    const results: PushResult[] = [];
    // Un único parámetro de segmentación por pedido (OneSignal rechaza combinarlos).
    for (let i = 0; i < userIds.length; i += MAX_ALIASES_PER_REQUEST) {
      results.push(await postNotification({ ...base, include_aliases: { external_id: userIds.slice(i, i + MAX_ALIASES_PER_REQUEST) } }));
    }
    if (playerIds.length > 0) {
      results.push(await postNotification({ ...base, include_subscription_ids: playerIds }));
    }

    const ok = results.some(r => r.ok);
    const recipients = results.reduce((acc, r) => acc + (r.recipients || 0), 0);
    if (ok) console.log(`[OneSignal] Notificación enviada (${recipients || '?'} dispositivos).`);
    return { ok, recipients, id: results.find(r => r.id)?.id, error: ok ? undefined : results.map(r => r.error).filter(Boolean).join(' | ') };
  } catch (error: any) {
    console.error('[OneSignal] Error enviando notificación:', error);
    return { ok: false, error: error?.message || 'Error de red' };
  }
}

/** Compatibilidad con los llamadores existentes. */
export async function sendPushNotification(params: SendNotificationParams): Promise<boolean> {
  const result = await sendPushNotificationDetailed(params);
  return result.ok;
}

/** Envía a todos los usuarios activos de un rol. */
export async function notifyByRole(
  role: string,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  const { prisma } = await import('./prisma');
  const users = await prisma.user.findMany({
    where: { role: role as any, active: true },
    select: { id: true },
  });
  const userIds = users.map(u => u.id);
  if (userIds.length > 0) {
    await sendPushNotification({ userIds, title, message, data });
  }
}
