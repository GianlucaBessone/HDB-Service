import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Global middleware for the API.
 * - Adds `Cache-Control` header to every GET request so the CDN (Vercel) caches the response
 *   for 5 minutes (`s-maxage=300`) and serves stale content while revalidating (`stale-while-revalidate=60`).
 * - The middleware runs only for paths under `/api/*`.
 * - POST/PUT/DELETE routes should manually trigger a revalidation of the related tag
 *   (e.g., `await revalidateTag('dispensers')`) after mutating data.
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
