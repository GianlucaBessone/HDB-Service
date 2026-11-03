'use client';

import OneSignal from 'react-onesignal';

/**
 * Cliente de notificaciones push (OneSignal Web SDK v16).
 *
 * El service worker de OneSignal se registra en un scope propio (/push/onesignal/)
 * para no competir con el service worker de la PWA (next-pwa, scope "/").
 */

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '';

let initPromise: Promise<boolean> | null = null;
let loggedInUser: string | null = null;

export type PushState =
  | 'not-configured' // falta NEXT_PUBLIC_ONESIGNAL_APP_ID
  | 'unsupported'    // navegador sin Web Push (p. ej. iOS sin instalar la app)
  | 'loading'
  | 'denied'         // el usuario bloqueó las notificaciones en el navegador
  | 'default'        // todavía no se pidió permiso
  | 'subscribed'
  | 'unsubscribed';  // permiso concedido pero suscripción desactivada

export function initPush(): Promise<boolean> {
  if (typeof window === 'undefined' || !APP_ID) return Promise.resolve(false);
  if (!initPromise) {
    initPromise = OneSignal.init({
      appId: APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
      serviceWorkerParam: { scope: '/push/onesignal/' },
      notifyButton: { enable: false } as any,
    })
      .then(() => true)
      .catch((error: unknown) => {
        // El SDK lanza si ya estaba inicializado (p. ej. recarga en caliente)
        if (String(error).includes('already initialized')) return true;
        console.error('[Push] Error al inicializar OneSignal:', error);
        initPromise = null;
        return false;
      });
  }
  return initPromise;
}

/** Vincula el dispositivo con el usuario de HDB (External ID = user.id). */
export async function identifyPushUser(user: { id: string; role?: string; clientId?: string | null }) {
  const ready = await initPush();
  if (!ready || !user?.id) return;
  try {
    if (loggedInUser !== user.id) {
      await OneSignal.login(user.id);
      loggedInUser = user.id;
    }
    await OneSignal.User.addTags({ role: user.role || 'unknown', clientId: user.clientId || 'none' });
  } catch (error) {
    console.error('[Push] Error al identificar usuario en OneSignal:', error);
  }
}

export async function logoutPush() {
  try {
    if (initPromise && (await initPromise)) await OneSignal.logout();
  } catch { /* noop */ }
  loggedInUser = null;
}

export async function getPushState(): Promise<PushState> {
  if (!APP_ID) return 'not-configured';
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  const ready = await initPush();
  if (!ready) return 'unsupported';
  if (!OneSignal.Notifications.isPushSupported()) return 'unsupported';
  const permission = OneSignal.Notifications.permissionNative;
  if (permission === 'denied') return 'denied';
  if (permission !== 'granted') return 'default';
  return OneSignal.User.PushSubscription.optedIn ? 'subscribed' : 'unsubscribed';
}

/** Pide permiso (si hace falta) y activa la suscripción. Devuelve el estado final. */
export async function enablePush(): Promise<PushState> {
  const ready = await initPush();
  if (!ready) return getPushState();
  try {
    if (OneSignal.Notifications.permissionNative !== 'granted') {
      await OneSignal.Notifications.requestPermission();
    }
    if (OneSignal.Notifications.permissionNative === 'granted' && !OneSignal.User.PushSubscription.optedIn) {
      await OneSignal.User.PushSubscription.optIn();
    }
  } catch (error) {
    console.error('[Push] Error al activar notificaciones:', error);
  }
  return getPushState();
}

export async function disablePush(): Promise<PushState> {
  const ready = await initPush();
  if (ready) {
    try {
      await OneSignal.User.PushSubscription.optOut();
    } catch (error) {
      console.error('[Push] Error al desactivar notificaciones:', error);
    }
  }
  return getPushState();
}

export function onPushChange(listener: () => void) {
  initPush().then(ready => {
    if (!ready) return;
    try {
      OneSignal.User.PushSubscription.addEventListener('change', listener);
      OneSignal.Notifications.addEventListener('permissionChange', listener as any);
    } catch { /* noop */ }
  });
}
