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
  ChevronRight,
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
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState('¡Hola');

  useEffect(() => {
    const fetchSession = async () => {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      }
      setIsLoading(false);
    };
    fetchSession();
  }, []);

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
    <div className="relative space-y-6 md:space-y-8 animate-fade-in pb-12">
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
      <div className="grid md:hidden grid-cols-2 gap-3.5">
        {visibleItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isScan = item.key === '/qr/scan';

          return (
            <Link
              key={item.key}
              href={item.key}
              className={`group relative rounded-2xl border border-border/60 bg-card/90 dark:bg-card/40 p-4 transition-all duration-200 active:scale-[0.98] flex flex-col justify-between min-h-[110px] cursor-pointer shadow-sm hover:border-primary/40 ${
                isScan ? 'border-primary/40 bg-primary/[0.03]' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl transition-all duration-200 ${
                  isScan 
                    ? 'bg-primary text-white shadow-sm shadow-primary/30' 
                    : 'bg-primary/10 text-primary group-active:bg-primary group-active:text-white'
                }`}>
                  {Icon && <Icon className="w-5 h-5" />}
                </div>
              </div>
              <div>
                <span className="font-semibold text-sm text-foreground tracking-tight block leading-snug group-active:text-primary transition-colors">
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Grid para PC */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleItems.map((item) => {
          const Icon = iconMap[item.icon];
          const description = item.description || `Acceder a la sección de ${item.label}.`;
          const isScan = item.key === '/qr/scan';

          return (
            <Link
              key={item.key}
              href={item.key}
              className={`group relative rounded-2xl border border-border/60 bg-card/80 dark:bg-card/30 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between min-h-[170px] cursor-pointer overflow-hidden ${
                isScan ? 'border-primary/40 bg-primary/[0.02]' : ''
              }`}
            >
              {/* Subtle hover accent bar */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary/0 group-hover:bg-primary/80 transition-all duration-300" />

              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-3 rounded-xl transition-all duration-300 ${
                    isScan 
                      ? 'bg-primary text-white shadow-md shadow-primary/20' 
                      : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white group-hover:shadow-md group-hover:shadow-primary/20'
                  }`}>
                    {Icon && <Icon className="w-6 h-6" />}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                    <span>Ingresar</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                  {item.label}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                  {description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
