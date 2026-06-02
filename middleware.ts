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
  
  // Expose current pathname to Server Components (like layout.tsx)
  response.headers.set('x-pathname', request.nextUrl.pathname);

  if (request.method === 'GET' && request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, private, max-age=0, must-revalidate');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
