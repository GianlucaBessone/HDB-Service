'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { NAV_ITEMS, isNavVisible } from '@/lib/rbac';
import { UserRole } from '@prisma/client';
import { Home, BarChart3, Ticket, GlassWater, Wrench, Package, Building2, MapPin, ScanLine, Users, FileText, Droplet, Settings, FileSignature } from 'lucide-react';
import clsx from 'clsx';

const iconMap: Record<string, React.ElementType> = {
  Home, BarChart3, Ticket, GlassWater, Wrench, Package, Building2, MapPin, ScanLine, Users, FileText, Settings, FileSignature
};

export default function Sidebar({ userRole }: { userRole: UserRole }) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter(item => isNavVisible(item.key, userRole));

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border hidden md:flex flex-col">
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Droplet className="w-6 h-6 text-primary" />
        </div>
        <span className="font-bold text-lg tracking-tight">HDB Service</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleItems.map(item => {
          const Icon = iconMap[item.icon];
          const isActive = pathname === item.key || (item.key !== '/' && pathname.startsWith(item.key));

          return (
            <Link
              key={item.key}
              href={item.key}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all',
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {Icon && <Icon className="w-5 h-5" />}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          v1.0.0
        </div>
      </div>
    </aside>
  );
}
