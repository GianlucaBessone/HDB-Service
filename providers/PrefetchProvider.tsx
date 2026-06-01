"use client";

import { ReactNode, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';

export function PrefetchProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    async function prefetchApp() {
      try {
        // 1. Fetch user session to determine role and access permissions
        const sessionData = await queryClient.fetchQuery({
          queryKey: ['session'],
          queryFn: async () => {
            const res = await fetch('/api/auth/session');
            if (!res.ok) return { user: null };
            return res.json();
          }
        });

        const user = sessionData?.user;
        if (!user) {
          useAuthStore.getState().clearUser();
          return; // User is not authenticated, do not prefetch private API views
        }
        useAuthStore.getState().setUser(user);

        const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

        // 2. Define queries to prefetch in the background
        const queries = [
          {
            queryKey: ['dashboard-stats'],
            queryFn: async () => {
              const res = await fetch('/api/dashboard');
              if (!res.ok) throw new Error('Failed to fetch dashboard stats');
              return res.json();
            }
          },
          {
            queryKey: ['dispensers', '', ''],
            queryFn: async () => {
              const res = await fetch('/api/dispensers');
              if (!res.ok) throw new Error('Failed to fetch dispensers');
              return res.json();
            }
          },
          {
            queryKey: ['tickets', '', ''],
            queryFn: async () => {
              const res = await fetch('/api/tickets');
              if (!res.ok) throw new Error('Failed to fetch tickets');
              return res.json();
            }
          },
          {
            queryKey: ['maintenance-schedules', currentMonthStr, ''],
            queryFn: async () => {
              const res = await fetch(`/api/maintenance?month=${currentMonthStr}`);
              if (!res.ok) throw new Error('Failed to fetch maintenance schedules');
              return res.json();
            }
          },
          {
            queryKey: ['plants'],
            queryFn: async () => {
              const res = await fetch('/api/plants');
              if (!res.ok) throw new Error('Failed to fetch plants');
              const data = await res.json();
              return Array.isArray(data) ? data : [];
            }
          },
          {
            queryKey: ['stock', ''],
            queryFn: async () => {
              const res = await fetch('/api/stock');
              if (!res.ok) throw new Error('Failed to fetch stock');
              const data = await res.json();
              return Array.isArray(data) ? data : [];
            }
          },
          {
            queryKey: ['transfers', ''],
            queryFn: async () => {
              const res = await fetch('/api/stock/transfer');
              if (!res.ok) throw new Error('Failed to fetch transfers');
              const data = await res.json();
              return Array.isArray(data) ? data : [];
            }
          },
          {
            queryKey: ['debts'],
            queryFn: async () => {
              const res = await fetch('/api/stock/debts');
              if (!res.ok) throw new Error('Failed to fetch debts');
              const data = await res.json();
              return Array.isArray(data) ? data : [];
            }
          },
          {
            queryKey: ['dashboard-salud', '', ''],
            queryFn: async () => {
              const res = await fetch('/api/dashboard/salud');
              if (!res.ok) throw new Error('Failed to fetch dashboard salud');
              return res.json();
            }
          }
        ];

        // Add admin/supervisor specific queries
        if (['ADMIN', 'SUPERVISOR'].includes(user.role)) {
          queries.push({
            queryKey: ['users'],
            queryFn: async () => {
              const res = await fetch('/api/users');
              if (!res.ok) throw new Error('Failed to fetch users');
              return res.json();
            }
          });
        }

        // 3. Prefetch all queries in parallel, catching potential individual failures gracefully
        await Promise.allSettled(
          queries.map(q => 
            queryClient.prefetchQuery({
              queryKey: q.queryKey,
              queryFn: q.queryFn,
              staleTime: 5 * 60 * 1000, // Make sure they stay fresh for 5 mins
            }).catch(err => {
              console.warn(`Background prefetch failed for queryKey: ${JSON.stringify(q.queryKey)}`, err);
            })
          )
        );
      } catch (err) {
        console.error('Error during app prefetching:', err);
      }
    }

    prefetchApp();
  }, [queryClient]);

  return <>{children}</>;
}
