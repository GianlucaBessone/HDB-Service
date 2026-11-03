'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { NAV_ITEMS, NAV_GROUP_LABELS, NavGroup, isNavVisible, getNavItemForPath } from '@/lib/rbac';
import { UserRole } from '@prisma/client';
import { useUIStore } from '@/lib/store/useUIStore';
import {
  Home, LayoutDashboard, Ticket, Layers, Wrench, Package, Settings, ScanLine,
  Users, FileText, PenLine, Receipt, X, LifeBuoy,
} from 'lucide-react';
import clsx from 'clsx';
import { BrandLogo } from '@/components/ui/BrandMark';

const iconMap: Record<string, React.ElementType> = {
  Home, LayoutDashboard, Ticket, Layers, Wrench, Package, Settings, ScanLine, Users, FileText, PenLine, Receipt,
};

const GROUP_ORDER: NavGroup[] = ['general', 'operacion', 'activos', 'gestion', 'admin'];

export default function Sidebar({ userRole }: { userRole: UserRole }) {
  const pathname = usePathname();
  const { isSidebarOpen, closeSidebar } = useUIStore();
  const activeItem = getNavItemForPath(pathname);

  // Cerrar el cajón al navegar y con Escape
  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSidebar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSidebarOpen, closeSidebar]);

  const groups = GROUP_ORDER.map(group => ({
    group,
    label: NAV_GROUP_LABELS[group],
    items: NAV_ITEMS.filter(item => item.group === group && isNavVisible(item.key, userRole)),
  })).filter(g => g.items.length > 0);

  return (
    <>
      {/* Fondo del cajón (móvil / tablet) */}
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-slate-950/50 transition-opacity duration-200 lg:hidden',
          isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-[272px] max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground lg:w-[248px]',
          'border-r border-sidebar-border transition-transform duration-200 ease-out lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        )}
        aria-label="Navegación principal"
      >
        {/* Marca */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-4 pt-safe">
          <Link href="/" className="min-w-0 rounded-md focus-visible:ring-2 focus-visible:ring-sidebar-active">
            <BrandLogo tone="inverse" />
          </Link>
          <button
            onClick={closeSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 scrollbar-none">
          {groups.map(({ group, label, items }) => (
            <div key={group} className={clsx(label && 'mt-5')}>
              {label && (
                <p className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-wider text-sidebar-muted/80">
                  {label}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map(item => {
                  const Icon = iconMap[item.icon];
                  const isActive = activeItem?.key === item.key;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.key}
                        aria-current={isActive ? 'page' : undefined}
                        className={clsx(
                          'relative flex min-h-[40px] items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150 lg:min-h-[36px]',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-foreground'
                            : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                        )}
                      >
                        {isActive && (
                          <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-sidebar-active" aria-hidden="true" />
                        )}
                        {Icon && (
                          <Icon
                            className={clsx('h-[18px] w-[18px] shrink-0', isActive ? 'text-sidebar-active' : 'opacity-80')}
                            strokeWidth={1.75}
                          />
                        )}
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Pie */}
        <div className="shrink-0 border-t border-sidebar-border px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Link
            href="/ideas-sugerencias-reclamos"
            className="flex min-h-[36px] items-center gap-3 rounded-md px-3 text-[13px] text-sidebar-muted transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <LifeBuoy className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Sugerencias y reclamos
          </Link>
          <p className="mt-2 px-3 text-2xs text-sidebar-muted/70 tabular">HDB Service · v1.0.1</p>
        </div>
      </aside>
    </>
  );
}
