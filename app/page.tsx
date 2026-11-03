'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV_ITEMS, NAV_GROUP_LABELS, NavGroup, isNavVisible } from '@/lib/rbac';
import Link from 'next/link';
import {
  LayoutDashboard,
  Ticket,
  Layers,
  Wrench,
  PenLine,
  Package,
  Settings,
  ScanLine,
  Users,
  FileText,
  Receipt,
  ChevronRight,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';

const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard,
  Ticket,
  Layers,
  Wrench,
  PenLine,
  Package,
  Settings,
  ScanLine,
  Users,
  FileText,
  Receipt,
};

const GROUP_ORDER: NavGroup[] = ['general', 'operacion', 'activos', 'gestion', 'admin'];

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState('Hola');

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
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 19) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  }, []);

  if (isLoading || !session?.user) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="skeleton h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const userRole = session.user.role;
  const firstName = String(session.user.nombre || '').split(' ')[0];
  const today = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const canScan = isNavVisible('/qr/scan', userRole);

  const groups = GROUP_ORDER.map(group => ({
    group,
    label: NAV_GROUP_LABELS[group] || 'General',
    items: NAV_ITEMS.filter(item => item.key !== '/' && item.group === group && isNavVisible(item.key, userRole)),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow={<span className="capitalize">{today}</span>}
        title={`${greeting}, ${firstName}`}
        description="Accedé a las secciones habilitadas para tu perfil."
        actions={
          <>
            {isNavVisible('/tickets', userRole) && (
              <Link href="/tickets" className="btn-outline">
                <Ticket className="h-4 w-4" /> Ver tickets
              </Link>
            )}
            {canScan && (
              <Link href="/qr/scan" className="btn-primary">
                <ScanLine className="h-4 w-4" /> Escanear QR
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(({ group, label, items }) => (
          <section key={group} className="glass-card overflow-hidden">
            <h2 className="eyebrow border-b border-border px-4 py-2.5">{label}</h2>
            <ul className="divide-y divide-border">
              {items.map(item => {
                const Icon = iconMap[item.icon];
                return (
                  <li key={item.key}>
                    <Link
                      href={item.key}
                      className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground group-hover:text-primary">
                        {Icon && <Icon className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                        {item.description && (
                          <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">{item.description}</span>
                        )}
                      </span>
                      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
