/**
 * OneSignal push notification helper.
 * Sends notifications via OneSignal REST API.
 */

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY || '';

interface SendNotificationParams {
  playerIds?: string[];
  title: string;
  message: string;
  data?: Record<string, any>;
  url?: string;
}

/**
 * Send push notification to specific users via OneSignal.
 */
export async function sendPushNotification(params: SendNotificationParams): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    console.warn('[OneSignal] Missing APP_ID or API_KEY, skipping notification.');
    return false;
  }

  if (!params.playerIds || params.playerIds.length === 0) {
    console.warn('[OneSignal] No playerIds provided, skipping.');
    return false;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: params.playerIds.filter(Boolean),
        headings: { en: params.title },
        contents: { en: params.message },
        data: params.data || {},
        url: params.url,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[OneSignal] Failed to send notification:', error);
      return false;
    }

    console.log('[OneSignal] Notification sent successfully.');
    return true;
  } catch (error) {
    console.error('[OneSignal] Error sending notification:', error);
    return false;
  }
}

/**
 * Send notification to all users with specific role.
 */
export async function notifyByRole(
  role: string,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  // Dynamically import prisma to avoid circular deps
  const { prisma } = await import('./prisma');

  const users = await prisma.user.findMany({
    where: { role: role as any, active: true, onesignalPlayerId: { not: null } },
    select: { onesignalPlayerId: true },
  });

  const playerIds = users
    .map(u => u.onesignalPlayerId)
    .filter((id): id is string => !!id);

  if (playerIds.length > 0) {
    await sendPushNotification({ playerIds, title, message, data });
  }
}
