import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { getSession } from '@/lib/auth';
import { ThemeProvider } from '@/components/ThemeProvider';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import OneSignalInit from '@/components/OneSignalInit';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HDB-Service | Water Dispenser Management',
  description: 'Gestión de mantenimiento y servicio de dispensers de agua',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HDB Service',
  },
  icons: {
    apple: '/icon-192x192.png',
  },
};

export const viewport = {
  themeColor: '#0b8296',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {session ? (
            <div className="flex h-screen overflow-hidden">
              <Sidebar userRole={session.user.role} />
              <div className="flex flex-col flex-1 overflow-hidden ml-0 md:ml-64 transition-all duration-300">
                <TopBar user={session.user} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                  {children}
                </main>
              </div>
              {session.user.role !== 'CLIENT_REQUESTER' && <OneSignalInit user={session.user} />}
            </div>
          ) : (
            <main className="h-screen flex items-center justify-center">
              {children}
            </main>
          )}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
