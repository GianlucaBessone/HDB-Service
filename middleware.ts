import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Global middleware for the API.
 * - Disables HTTP caching for all GET API responses to ensure fresh data.
 * - Client-side caching is handled by React Query (staleTime: 5 min).
 * - Server-side ISR is handled via `export const revalidate = 300` in each route.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (request.method === 'GET') {
    response.headers.set('Cache-Control', 'no-store, private, max-age=0, must-revalidate');
  }
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
