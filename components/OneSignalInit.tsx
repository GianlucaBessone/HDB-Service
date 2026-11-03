'use client';

import { useEffect } from 'react';
import { SessionUser } from '@/lib/auth';
import { identifyPushUser } from '@/lib/pushClient';

/** Inicializa OneSignal y vincula el dispositivo al usuario logueado. */
export default function OneSignalInit({ user }: { user: SessionUser }) {
  useEffect(() => {
    if (user?.id) identifyPushUser(user);
  }, [user?.id, user?.role, user?.clientId]);

  return null;
}
