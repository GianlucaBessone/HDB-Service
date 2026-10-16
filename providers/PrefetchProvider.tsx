"use client";

import { ReactNode } from 'react';

/**
 * PrefetchProvider
 * Kept for architectural compatibility with app layout.
 * Data prefetching is delegated to TanStack React Query on demand
 * per component view to prevent database connection pool saturation.
 */
export function PrefetchProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
