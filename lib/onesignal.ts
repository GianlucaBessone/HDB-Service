/**
 * OneSignal push notification helper.
 * Sends notifications via OneSignal REST API.
 */

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY || '';

interface SendNotificationParams {
  userIds?: string[];
  playerIds?: string[];
  title: string;
  message: string;
  data?: Record<string, any>;
  url?: string;
}

/**
 * Send push notification to specific users via OneSignal.
 * Supports targeting by user IDs (linked via OneSignal.login(userId)) or legacy playerIds.
 */
export async function sendPushNotification(params: SendNotificationParams): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    console.warn('[OneSignal] Missing APP_ID or API_KEY, skipping notification.');
    return false;
  }

  const userIds = (params.userIds || []).filter(Boolean);
  const playerIds = (params.playerIds || []).filter(Boolean);

  if (userIds.length === 0 && playerIds.length === 0) {
    console.warn('[OneSignal] No userIds or playerIds provided, skipping.');
    return false;
  }

  try {
    const payload: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: { es: params.title, en: params.title },
      contents: { es: params.message, en: params.message },
      data: params.data || {},
      url: params.url,
    };

    if (userIds.length > 0) {
      payload.include_external_user_ids = userIds;
      payload.include_aliases = { external_id: userIds };
      payload.target_channel = 'push';
    } else if (playerIds.length > 0) {
      payload.include_player_ids = playerIds;
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
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
    where: { role: role as any, active: true },
    select: { id: true },
  });

  const userIds = users.map(u => u.id);

  if (userIds.length > 0) {
    await sendPushNotification({ userIds, title, message, data });
  }
}
