"use client";

import { ReactNode, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';

export function PrefetchProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const endpoints = [
      '/api/dispensers',
      '/api/clients',
      '/api/plants',
      '/api/locations',
      '/api/tickets',
      '/api/stock',
      '/api/maintenance',
      '/api/sectors',
      '/api/dashboard/salud',
      '/api/dashboard/performance',
      '/api/dashboard/analytics',
    ];
    endpoints.forEach(url =>
      fetch(url, {
        method: 'GET',
        credentials: 'include',
        cache: 'force-cache',
      })
        .then(r => { if (!r.ok) console.warn(`Prefetch ${url} → ${r.status}`); return r.json(); })
        .catch(e => console.error(`Prefetch ${url} error:`, e))
    );
  }, []);
  return <>{children}</>;
}
