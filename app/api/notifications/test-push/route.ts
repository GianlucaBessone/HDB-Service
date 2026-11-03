import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sendPushNotificationDetailed, isPushConfigured } from '@/lib/onesignal';
import { appUrl } from '@/lib/appUrl';

export const dynamic = 'force-dynamic';

/** Envía una notificación de prueba a los dispositivos del usuario actual. */
export async function POST() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  if (!isPushConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Faltan las variables ONESIGNAL_APP_ID y ONESIGNAL_API_KEY en el servidor.' },
      { status: 503 }
    );
  }

  const result = await sendPushNotificationDetailed({
    userIds: [session.user.id],
    title: 'Notificaciones activas',
    message: `Hola ${session.user.nombre.split(' ')[0]}, este dispositivo recibe los avisos de HDB Service.`,
    url: appUrl('/'),
    data: { type: 'TEST' },
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
