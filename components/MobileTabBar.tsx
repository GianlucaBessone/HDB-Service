'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/lib/store/useUIStore';
import { isNavVisible } from '@/lib/rbac';
import { UserRole } from '@prisma/client';
import { 
  Home, 
  Ticket, 
  ScanLine, 
  Wrench, 
  GlassWater, 
  Package, 
  Menu 
} from 'lucide-react';
import clsx from 'clsx';

export default function MobileTabBar({ userRole }: { userRole: UserRole }) {
  const pathname = usePathname();
  const toggleSidebar = useUIStore(state => state.toggleSidebar);
  
  const [isPulsing, setIsPulsing] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Monitor the scroll of the main content container
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    const handleScroll = () => {
      if (mainEl.scrollTop > 80) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // Check initial scroll state
    handleScroll();

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  // Check visibility of items
  const canScanQr = isNavVisible('/qr/scan', userRole);

  // Determine the dynamic 4th slot item based on permissions
  let fourthSlot = {
    key: '/inventory',
    label: 'Inventario',
    icon: Package
  };

  if (isNavVisible('/maintenance', userRole)) {
    fourthSlot = {
      key: '/maintenance',
      label: 'Tareas',
      icon: Wrench
    };
  } else if (isNavVisible('/dispensers', userRole)) {
    fourthSlot = {
      key: '/dispensers',
      label: 'Equipos',
      icon: GlassWater
    };
  }

  interface TabItem {
    key?: string;
    label?: string;
    icon?: React.ComponentType<any>;
    isQr?: boolean;
    isMore?: boolean;
  }

  // Navigation config
  const navItems: TabItem[] = [
    { key: '/', label: 'Inicio', icon: Home },
    { key: '/tickets', label: 'Tickets', icon: Ticket },
    // Slot 3 is the floating QR button (handled separately for custom design)
    { isQr: true },
    fourthSlot,
    { isMore: true, label: 'Más', icon: Menu }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-card/95 dark:bg-card/98 backdrop-blur-lg border-t border-border/40 rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] md:hidden z-40 flex items-center justify-around px-2">
      {navItems.map((item, index) => {
        if (item.isQr) {
          if (!canScanQr) return <div key="qr-placeholder" className="w-16" />;

          const isQrActive = pathname === '/qr/scan';

          return (
            <div key="qr-floating" className="relative w-16 h-full flex flex-col items-center justify-end pb-1.5">
              {/* Floating circular button */}
              <Link
                href="/qr/scan"
                onClick={() => {
                  setIsPulsing(true);
                  setTimeout(() => setIsPulsing(false), 1000);
                }}
                className={clsx(
                  "absolute left-1/2 -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg",
                  "bg-white dark:bg-zinc-900 border-cyan-500 shadow-cyan-500/25",
                  isQrActive ? "ring-4 ring-cyan-500/20" : "",
                  isScrolled ? "-top-[3px]" : "-top-8"
                )}
                title="Escanear QR"
              >
                {/* Rippling radar effect triggered on click */}
                {isPulsing && (
                  <span className="absolute w-full h-full rounded-full bg-cyan-500/40 animate-ping -z-10" />
                )}
                <ScanLine className="w-6 h-6 text-cyan-500 animate-pulse-soft" />
              </Link>
              <span className={clsx(
                "text-[10px] font-medium mt-1 transition-all duration-300",
                isQrActive ? "text-cyan-500 font-bold" : "text-muted-foreground",
                isScrolled ? "opacity-0 translate-y-2 pointer-events-none" : "opacity-100 translate-y-0"
              )}>
                Escanear
              </span>
            </div>
          );
        }

        if (item.isMore) {
          const Icon = item.icon!;
          return (
            <button
              key="more-menu"
              onClick={toggleSidebar}
              className="relative flex-1 h-full flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground active:scale-90 transition-all pb-1"
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        }

        // Standard link items
        const Icon = item.icon!;
        const isActive = pathname === item.key || (item.key !== '/' && pathname.startsWith(item.key!));

        return (
          <Link
            key={item.key}
            href={item.key!}
            className={clsx(
              "relative flex-1 h-full flex flex-col items-center justify-center gap-1 active:scale-95 transition-all pb-1",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {/* Active top line indicator */}
            <div 
              className={clsx(
                "absolute top-0 w-8 h-1 rounded-b-full bg-primary transition-all duration-300",
                isActive ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )} 
            />
            <Icon className="w-5 h-5" />
            <span className={clsx("text-[10px] font-medium", isActive && "font-semibold")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
