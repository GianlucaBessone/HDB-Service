'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';
import { SessionUser } from '@/lib/auth';

// Track initialization in module scope to prevent duplicate calls within the same session lifetime
let isOneSignalInitialized = false;

export default function OneSignalInit({ user }: { user: SessionUser }) {

  useEffect(() => {
    async function initOneSignal() {
      if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return;
      
      try {
        const isAlreadyInited = isOneSignalInitialized || (
          typeof window !== 'undefined' && 
          (window as any).OneSignal && 
          (window as any).OneSignal.initialized
        );

        if (!isAlreadyInited) {
          await OneSignal.init({
            appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
            notifyButton: { enable: false } as any,
            allowLocalhostAsSecureOrigin: true,
          });
          isOneSignalInitialized = true;
        }

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
        if (typeof error === 'string' && error.includes('already initialized')) {
          isOneSignalInitialized = true;
          if (user?.id) {
            try {
              await OneSignal.login(user.id);
              await OneSignal.User.addTags({
                role: user.role,
                clientId: user.clientId || 'none',
              });
            } catch (loginError) {
              console.error('Error logging in to OneSignal after checking init:', loginError);
            }
          }
          return;
        }
        console.error('Error initializing OneSignal:', error);
      }
    }

    if (typeof window !== 'undefined') {
      initOneSignal();
    }
  }, [user?.id]);

  return null; // This is a logic-only component
}
