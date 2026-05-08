import { auth } from '@/lib/auth/server';

export default auth.middleware({
  // Redirects unauthenticated users to sign-in page
  loginUrl: '/login',
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - API routes: api/ (they handle their own auth via requirePermission)
     * - Public routes: login, qr/
     * - Next.js internal: _next/static, _next/image
     * - Static assets: favicon.ico, icons, manifest.json, service workers, etc.
     */
    '/((?!api/|login|qr/|_next/static|_next/image|favicon.ico|icons|manifest.json|OneSignalSDKWorker.js|sw.js|workbox-.*|offline.html).*)',
  ],
};
