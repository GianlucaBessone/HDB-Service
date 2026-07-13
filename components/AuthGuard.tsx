'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NAV_ITEMS, isNavVisible } from '@/lib/rbac';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store/useAuthStore';

export default function AuthGuard({ 
  children,
  session
}: { 
  children: React.ReactNode;
  session: any;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  useEffect(() => {

    if (!session?.user) {
      clearUser();
      if (
        pathname !== '/login' && 
        pathname !== '/login/set-password' && 
        pathname !== '/ideas-sugerencias-reclamos' &&
        !pathname.startsWith('/public')
      ) {
        router.push('/login');
      }
      return;
    }

    // Populate global store for client components to use synchronously
    setUser({
      id: session.user.id,
      email: session.user.email,
      nombre: session.user.nombre,
      role: session.user.role,
      clientId: session.user.clientId,
      plantIds: session.user.plantIds || [],
    });

    // Ignore login routes if authenticated (login page handles its own redirect, but we can do it here too)
    if (pathname === '/login' || pathname === '/login/set-password') {
      return;
    }

    // Check against NAV_ITEMS RBAC logic
    // Some routes like /dispensers/[id] might not match perfectly.
    // We match the base route.
    const baseRoute = '/' + pathname.split('/')[1];
    
    // Find matching nav item
    const navItem = NAV_ITEMS.find(n => n.key === baseRoute || n.key === pathname);
    
    // If it's a known route and the user role doesn't have permission, kick them to home
    if (navItem && !isNavVisible(navItem.key, session.user.role)) {
      router.push('/');
    }
  }, [pathname, session, router]);



  // Prevent rendering children if the user is authenticated but doesn't have access to the matched route
  if (session?.user) {
    const baseRoute = '/' + pathname.split('/')[1];
    const navItem = NAV_ITEMS.find(n => n.key === baseRoute || n.key === pathname);
    if (navItem && !isNavVisible(navItem.key, session.user.role)) {
      return null; // Will redirect in useEffect
    }
  }

  return <>{children}</>;
}
