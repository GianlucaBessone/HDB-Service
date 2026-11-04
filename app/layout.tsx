import { Metadata } from 'next';
import { PrefetchProvider } from "@/providers/PrefetchProvider";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import localFont from 'next/font/local';
import './globals.css';
import { getSession } from '@/lib/auth';
import { ThemeProvider } from '@/components/ThemeProvider';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import MobileTabBar from '@/components/MobileTabBar';
import OneSignalInit from '@/components/OneSignalInit';
import { Toaster } from 'react-hot-toast';
import { headers } from 'next/headers';
import { Analytics } from '@vercel/analytics/next';
import AuthGuard from '@/components/AuthGuard';

// IBM Plex alojada en el proyecto (subconjunto latino, licencia OFL en app/fonts/OFL.txt).
// Con next/font/google el build depende de descargar las fuentes de Google en ese
// momento, y en Vercel fallaba ("Can't resolve '@vercel/turbopack-next/internal/font/google/font'").
const fontSans = localFont({
  src: [{ path: './fonts/IBMPlexSans-latin-variable.woff2', weight: '400 700', style: 'normal' }],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
});

const fontMono = localFont({
  src: [
    { path: './fonts/IBMPlexMono-latin-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/IBMPlexMono-latin-500.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
});

export const metadata: Metadata = {
  title: {
    default: 'HDB Service',
    template: '%s · HDB Service',
  },
  description: 'Gestión de mantenimiento técnico, climatización, refrigeración y equipamiento industrial.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HDB Service',
  },
  icons: {
    icon: [{ url: '/logo.svg?v=2', type: 'image/svg+xml' }],
    apple: '/icons/v2/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#171b22' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

import ForcePasswordChangeModal from '@/components/ForcePasswordChangeModal';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';

  const showSidebar = session && !pathname.startsWith('/login');
  const mustChangePassword = session?.user.mustChangePassword && !pathname.startsWith('/login');

  return (
    <html lang="es" suppressHydrationWarning className={`${fontSans.variable} ${fontMono.variable}`}>
      <body className="min-h-dvh bg-background font-sans" suppressHydrationWarning>
        <ReactQueryProvider>
          <PrefetchProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              <AuthGuard session={session}>
                {showSidebar ? (
                  <div className="flex h-dvh overflow-hidden">
                    <Sidebar userRole={session!.user.role} />
                    <div className="flex min-w-0 flex-1 flex-col lg:pl-[248px]">
                      <TopBar user={session!.user} />
                      <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="mx-auto w-full max-w-[1440px] px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-10 lg:px-8 lg:pt-7">
                          {children}
                        </div>
                      </main>
                    </div>
                    <OneSignalInit user={session!.user} />
                    {mustChangePassword && <ForcePasswordChangeModal />}
                    <MobileTabBar userRole={session!.user.role} />
                  </div>
                ) : (
                  <main className={pathname.startsWith('/login') ? "min-h-dvh flex items-center justify-center" : ""}>
                    {children}
                    {mustChangePassword && <ForcePasswordChangeModal />}
                  </main>
                )}
              </AuthGuard>
              <Toaster
                position="top-center"
                toastOptions={{
                  className: 'hdb-toast',
                  duration: 4000,
                  success: { iconTheme: { primary: 'hsl(152 62% 29%)', secondary: '#fff' } },
                  error: { iconTheme: { primary: 'hsl(0 70% 44%)', secondary: '#fff' } },
                }}
              />
              <Analytics />
            </ThemeProvider>
          </PrefetchProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
