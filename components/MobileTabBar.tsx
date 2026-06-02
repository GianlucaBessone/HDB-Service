'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

  // Refs for direct DOM manipulation (no re-renders on scroll)
  const btnRef = useRef<HTMLAnchorElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);

  // Two-step scroll-linked animation via direct DOM writes
  const applyScrollPosition = useCallback((scrollY: number) => {
    const btn = btnRef.current;
    const label = labelRef.current;
    if (!btn) return;

    const s = Math.max(scrollY, 0);
    const T1 = 80;   // end of step 1: button at 5% protrusion
    const T2 = 160;  // end of step 2: button fully inside footer

    let topVal: number;
    let size: number;
    let labelOp: number;
    let labelTy: number;

    if (s <= T1) {
      // Step 1: sink from floating (-32px) to 5% protrusion (-3px), keep full size
      const r = s / T1;
      topVal = -32 + r * 29;
      size = 64;
      labelOp = Math.max(1 - s / 50, 0);
      labelTy = r * 8;
    } else {
      // Step 2: shrink slightly (64→54px) and pull fully inside footer (-3→13px)
      const r = Math.min((s - T1) / (T2 - T1), 1);
      topVal = -3 + r * 16;
      size = 64 - r * 10;
      labelOp = 0;
      labelTy = 8;
    }

    btn.style.top = `${topVal}px`;
    btn.style.width = `${size}px`;
    btn.style.height = `${size}px`;

    if (label) {
      label.style.opacity = `${labelOp}`;
      label.style.transform = `translateY(${labelTy}px)`;
      label.style.pointerEvents = labelOp === 0 ? 'none' : 'auto';
    }
  }, []);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        applyScrollPosition(mainEl.scrollTop);
      });
    };

    // Set initial position
    applyScrollPosition(mainEl.scrollTop);

    mainEl.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      mainEl.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [pathname, applyScrollPosition]);

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
              {/* Floating circular button — styled via ref, not state */}
              <Link
                ref={btnRef}
                href="/qr/scan"
                onClick={() => {
                  setIsPulsing(true);
                  setTimeout(() => setIsPulsing(false), 1000);
                }}
                className={clsx(
                  "absolute left-1/2 -translate-x-1/2 w-16 h-16 -top-8 rounded-full flex items-center justify-center border-2 shadow-lg will-change-[top,width,height]",
                  "bg-white dark:bg-zinc-900 border-cyan-500 shadow-cyan-500/25",
                  "active:scale-95",
                  isQrActive ? "ring-4 ring-cyan-500/20" : ""
                )}
                title="Escanear QR"
              >
                {isPulsing && (
                  <span className="absolute w-full h-full rounded-full bg-cyan-500/40 animate-ping -z-10" />
                )}
                <ScanLine className="w-6 h-6 text-cyan-500" />
              </Link>
              <span
                ref={labelRef}
                className={clsx(
                  "text-[10px] font-medium mt-1",
                  isQrActive ? "text-cyan-500 font-bold" : "text-muted-foreground"
                )}
              >
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
