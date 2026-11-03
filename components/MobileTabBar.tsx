'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/lib/store/useUIStore';
import { isNavVisible, getNavItemForPath } from '@/lib/rbac';
import { UserRole } from '@prisma/client';
import { Home, Ticket, ScanLine, Wrench, Layers, Package, Menu } from 'lucide-react';
import clsx from 'clsx';

interface TabItem {
  key: string;
  label: string;
  icon: React.ElementType;
}

/**
 * Barra de navegación inferior (< 768px).
 * 5 accesos fijos; el central (Escanear) es la acción primaria de campo.
 */
export default function MobileTabBar({ userRole }: { userRole: UserRole }) {
  const pathname = usePathname();
  const toggleSidebar = useUIStore(state => state.toggleSidebar);
  const isSidebarOpen = useUIStore(state => state.isSidebarOpen);
  const activeKey = getNavItemForPath(pathname)?.key;

  const canScanQr = isNavVisible('/qr/scan', userRole);

  let fourthSlot: TabItem = { key: '/inventory', label: 'Inventario', icon: Package };
  if (isNavVisible('/maintenance', userRole)) {
    fourthSlot = { key: '/maintenance', label: 'Tareas', icon: Wrench };
  } else if (isNavVisible('/dispensers', userRole)) {
    fourthSlot = { key: '/dispensers', label: 'Activos', icon: Layers };
  }

  const left: TabItem[] = [
    { key: '/', label: 'Inicio', icon: Home },
    { key: '/tickets', label: 'Tickets', icon: Ticket },
  ];

  const renderTab = (item: TabItem) => {
    const Icon = item.icon;
    const isActive = activeKey === item.key;
    return (
      <Link
        key={item.key}
        href={item.key}
        aria-current={isActive ? 'page' : undefined}
        className={clsx(
          'relative flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {isActive && <span className="absolute inset-x-5 top-0 h-[2px] rounded-b bg-primary" aria-hidden="true" />}
        <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2 : 1.75} />
        <span className={clsx('text-2xs leading-none', isActive ? 'font-semibold' : 'font-medium')}>{item.label}</span>
      </Link>
    );
  };

  const isQrActive = pathname === '/qr/scan';

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-safe supports-[backdrop-filter]:backdrop-blur md:hidden"
      aria-label="Navegación inferior"
    >
      <div className="flex h-16 items-stretch px-1">
        {left.map(renderTab)}

        {canScanQr ? (
          <Link
            href="/qr/scan"
            aria-current={isQrActive ? 'page' : undefined}
            className="flex h-full flex-1 flex-col items-center justify-center gap-1"
          >
            <span
              className={clsx(
                'flex h-10 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-colors',
                isQrActive && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-card'
              )}
            >
              <ScanLine className="h-[22px] w-[22px]" strokeWidth={2} />
            </span>
            <span className={clsx('sr-only')}>Escanear QR</span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        {renderTab(fourthSlot)}

        <button
          onClick={toggleSidebar}
          aria-expanded={isSidebarOpen}
          className={clsx(
            'flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors',
            isSidebarOpen ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Menu className="h-[22px] w-[22px]" strokeWidth={1.75} />
          <span className="text-2xs font-medium leading-none">Más</span>
        </button>
      </div>
    </nav>
  );
}
