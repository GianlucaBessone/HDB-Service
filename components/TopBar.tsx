'use client';

import { authClient } from '@/lib/auth/client';
import { Bell, Menu, LogOut, User as UserIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { UserRole } from '@prisma/client';
import { useNotificationStore } from '@/lib/store/useNotificationStore';

export default function TopBar({ user }: { user: { nombre: string; email: string; role: UserRole } }) {
  const { theme, setTheme } = useTheme();
  const unreadCount = useNotificationStore(state => state.unreadCount);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      
      {/* Mobile Menu Button (placeholder for now) */}
      <button className="md:hidden p-2 text-muted-foreground hover:bg-accent rounded-md">
        <Menu className="w-6 h-6" />
      </button>

      {/* Spacer for desktop */}
      <div className="hidden md:block" />

      {/* Right side actions */}
      <div className="flex items-center gap-3 md:gap-5">
        
        {/* Theme Toggle */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-muted-foreground hover:bg-accent rounded-full transition-colors"
        >
          <span className="text-sm font-medium">{theme === 'dark' ? '🌙' : '☀️'}</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-muted-foreground hover:bg-accent rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card" />
          )}
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* User Dropdown Toggle (Visual) */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold leading-none">{user.nombre}</span>
            <span className="text-xs text-muted-foreground mt-1 capitalize">
              {user.role.replace('_', ' ').toLowerCase()}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {user.nombre.charAt(0).toUpperCase()}
          </div>
          <button 
            onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/login'; } } })}
            className="p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors ml-1"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

      </div>
    </header>
  );
}
