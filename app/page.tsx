'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV_ITEMS, isNavVisible } from '@/lib/rbac';
import Link from 'next/link';
import {
  BarChart3,
  Ticket,
  GlassWater,
  Wrench,
  FileSignature,
  Package,
  Settings,
  ScanLine,
  Users,
  FileText,
  ArrowRight,
  Loader2
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  BarChart3,
  Ticket,
  GlassWater,
  Wrench,
  FileSignature,
  Package,
  Settings,
  ScanLine,
  Users,
  FileText
};

export default function Home() {
  const router = useRouter();
  const [greeting, setGreeting] = useState('¡Hola');

  const { data: session, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return { user: null };
      return res.json();
    }
  });

  useEffect(() => {
    if (!isLoading && !session?.user) {
      router.push('/login');
    }
  }, [session, isLoading, router]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('¡Buenos días');
    else if (hour < 19) setGreeting('¡Buenas tardes');
    else setGreeting('¡Buenas noches');
  }, []);

  if (isLoading || !session?.user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const userRole = session.user.role;
  const visibleItems = NAV_ITEMS.filter(
    (item) => item.key !== '/' && isNavVisible(item.key, userRole)
  );

  return (
    <div className="relative space-y-6 md:space-y-8 animate-fade-in pb-12 overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-primary/5 dark:bg-primary/10 blur-[80px] pointer-events-none -z-10 animate-pulse-soft" />
      <div className="absolute bottom-[20%] right-[-10%] w-[250px] h-[250px] rounded-full bg-cyan-500/5 dark:bg-cyan-500/10 blur-[80px] pointer-events-none -z-10" />

      <div className="flex flex-col gap-1 md:gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {greeting}, {session.user.nombre}!
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Bienvenido al Sistema de Gestión Integral (HDB SGI). Selecciona una sección para comenzar.
        </p>
      </div>

      {/* Grid para Mobile */}
      <div className="grid md:hidden grid-cols-2 gap-4">
        {visibleItems.map((item) => {
          const Icon = iconMap[item.icon];
          const borderLeftClass = item.borderLeftClass || 'border-l-primary';
          const bgClass = item.bgClass || 'bg-primary/10 text-primary';
          const isScan = item.key === '/qr/scan';

          return (
            <Link
              key={item.key}
              href={item.key}
              className={`group glass-card p-4 border-l-4 ${borderLeftClass} active:scale-95 transition-all flex flex-col justify-between h-28 cursor-pointer hover:shadow-md ${
                isScan ? 'ring-1.5 ring-rose-500/30 bg-rose-500/[0.02] dark:bg-rose-500/[0.03]' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${bgClass} group-active:scale-110 transition-transform ${
                  isScan ? 'animate-pulse-soft' : ''
                }`}>
                  {Icon && <Icon className="w-5 h-5" />}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-50 group-active:translate-x-1 transition-transform" />
              </div>
              <span className="font-bold text-sm text-foreground tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Grid para PC */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleItems.map((item) => {
          const Icon = iconMap[item.icon];
          const colorClass = item.colorClass || 'text-primary border-t-primary';
          const bgClass = item.bgClass || 'bg-primary/10 text-primary';
          const description = item.description || `Acceder a la sección de ${item.label}.`;
          const isScan = item.key === '/qr/scan';

          return (
            <Link
              key={item.key}
              href={item.key}
              className={`group glass-card p-6 border-t-4 ${colorClass} hover:scale-[1.02] transition-all hover:shadow-lg flex flex-col justify-between h-56 cursor-pointer ${
                isScan ? 'ring-1.5 ring-rose-500/20 bg-rose-500/[0.01] dark:bg-rose-500/[0.02]' : ''
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                    {item.label}
                  </span>
                  <div className={`p-2.5 rounded-xl ${bgClass} group-hover:scale-110 transition-transform duration-300 ${
                    isScan ? 'animate-pulse-soft' : ''
                  }`}>
                    {Icon && <Icon className="w-6 h-6" />}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {description}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Ingresar <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
