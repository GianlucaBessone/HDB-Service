'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';
import { SessionUser } from '@/lib/auth';

export default function OneSignalInit({ user }: { user: SessionUser }) {

  useEffect(() => {
    async function initOneSignal() {
      if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return;
      
      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
          notifyButton: { enable: false } as any,
          allowLocalhostAsSecureOrigin: true,
        });

        // If user is logged in, tag them and login to OneSignal
        if (user?.id) {
          await OneSignal.login(user.id);
          
          // Optional: Send tags for targeted notifications
          await OneSignal.User.addTags({
            role: user.role,
            clientId: user.clientId || 'none',
          });
        }
      } catch (error) {
        console.error('Error initializing OneSignal:', error);
      }
    }

    if (typeof window !== 'undefined') {
      initOneSignal();
    }
  }, [user?.id]);

  return null; // This is a logic-only component
}
