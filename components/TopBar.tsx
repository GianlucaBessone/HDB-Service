'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Bell, 
  Menu, 
  LogOut, 
  User as UserIcon,
  Trash2, 
  Check, 
  CheckCheck, 
  Inbox, 
  AlertCircle, 
  Wrench, 
  Package, 
  Landmark, 
  BellRing, 
  X, 
  ArrowRight,
  Clock,
  Sun,
  Moon,
  Monitor,
  Search,
  ChevronDown,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { getNavItemForPath } from '@/lib/rbac';
import { useTheme } from 'next-themes';
import { UserRole } from '@prisma/client';
import { t } from '@/lib/translations';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { useUIStore } from '@/lib/store/useUIStore';
import CommandPalette from '@/components/CommandPalette';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  relatedId: string | null;
  read: boolean;
  createdAt: string;
}

export default function TopBar({ user }: { user: { nombre: string; email: string; role: UserRole } }) {
  const { theme, setTheme } = useTheme();
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const setUnreadCount = useNotificationStore(state => state.setUnreadCount);
  const decrementUnread = useNotificationStore(state => state.decrementUnread);
  const toggleSidebar = useUIStore(state => state.toggleSidebar);
  const supabase = createClient();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const sectionTitle = (() => {
    const item = getNavItemForPath(pathname);
    if (!item) return 'HDB Service';
    return item.title || item.label;
  })();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ctrl/⌘ + K abre/cierra la búsqueda global
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Cerrar menú de usuario al hacer clic fuera / Escape
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('#user-menu-container')) setIsUserMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsUserMenuOpen(false);
    document.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [isUserMenuOpen]);

  const roleLabel =
    user.role === 'CLIENT_REQUESTER' ? 'Referente' :
    user.role === 'CLIENT_RESPONSIBLE' ? 'Responsable' :
    t(user.role);

  const initials = user.nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p.charAt(0).toUpperCase())
    .join('');

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#notification-bell-container')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isDropdownOpen]);

  // Mark one as read
  const markAsRead = async (id: string) => {
    // 1. Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    decrementUnread();

    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        console.error('Server failed to mark notification as read');
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    // 1. Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      if (!res.ok) {
        console.error('Server failed to mark all notifications as read');
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Delete single notification
  const deleteNotification = async (id: string) => {
    // Find item to check if it's unread
    const item = notifications.find(n => n.id === id);

    // 1. Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (item && !item.read) {
      decrementUnread();
    }

    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        console.error('Server failed to delete notification');
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Delete all notifications
  const deleteAllNotifications = async () => {
    // 1. Optimistic update
    setNotifications([]);
    setUnreadCount(0);

    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      if (!res.ok) {
        console.error('Server failed to clear notifications');
      }
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Helper for displaying relative time
  function formatRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin}m`;
    if (diffHr < 24) return `Hace ${diffHr}h`;
    return `Hace ${diffDays}d`;
  }

  // Map icon to type
  function getNotificationIcon(type: string) {
    switch (type) {
      case 'TICKET_ASSIGNED':
        return <Wrench className="w-4 h-4 text-muted-foreground" />;
      case 'SLA_NEAR_BREACH':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'SLA_BREACHED':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'MAINTENANCE_DUE':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'STOCK_LOW':
        return <Package className="w-4 h-4 text-warning" />;
      case 'DEBT_CREATED':
        return <Landmark className="w-4 h-4 text-muted-foreground" />;
      default:
        return <BellRing className="w-4 h-4 text-muted-foreground" />;
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/95 px-3 supports-[backdrop-filter]:bg-card/90 supports-[backdrop-filter]:backdrop-blur sm:px-4 lg:px-6 pt-safe">
      {/* Menú (tablet) */}
      <button
        onClick={toggleSidebar}
        className="btn-icon btn-ghost hidden md:inline-flex lg:hidden"
        aria-label="Abrir menú"
        title="Menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Título de sección */}
      <div className="min-w-0 flex-1 lg:flex-none lg:w-56 xl:w-64">
        <p className="truncate text-[15px] font-semibold text-foreground">{sectionTitle}</p>
      </div>

      {/* Búsqueda (desktop) */}
      <div className="hidden flex-1 justify-center md:flex">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="group flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/30"
          title="Buscar (Ctrl + K)"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-left">Buscar activo, ticket o cliente…</span>
          <kbd className="hidden shrink-0 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-2xs lg:inline-block">Ctrl K</kbd>
        </button>
      </div>

      {/* Acciones */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="btn-icon btn-ghost md:hidden"
          aria-label="Buscar"
          title="Buscar"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Notificaciones */}
        <div id="notification-bell-container" className="relative">
          <button
            onClick={() => { setIsDropdownOpen(!isDropdownOpen); setIsUserMenuOpen(false); }}
            className={clsx('btn-icon btn-ghost relative', isDropdownOpen && 'bg-accent text-foreground')}
            aria-label={unreadCount > 0 ? `Notificaciones (${unreadCount} sin leer)` : 'Notificaciones'}
            aria-expanded={isDropdownOpen}
            title="Notificaciones"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-2xs font-semibold leading-none text-destructive-foreground ring-2 ring-card tabular">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isDropdownOpen && (
            <div className="fixed inset-x-2 top-[calc(3.5rem+env(safe-area-inset-top))] z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-lg animate-fade-in sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="text-sm font-semibold text-foreground">Notificaciones</span>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="btn-ghost btn-sm text-primary">
                      Marcar leídas
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={deleteAllNotifications}
                      className="btn-icon btn-ghost h-8 w-8 sm:h-8 sm:w-8 hover:text-destructive"
                      aria-label="Eliminar todas"
                      title="Eliminar todas"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[60dvh] divide-y divide-border overflow-y-auto sm:max-h-96">
                {notifications.slice(0, 5).length > 0 ? (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className={clsx('flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50', !n.read && 'bg-primary/[0.04]')}
                    >
                      <div className="mt-0.5 shrink-0">{getNotificationIcon(n.type)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={clsx('text-[13px] leading-5', !n.read ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                            {n.title}
                          </p>
                          <span className="shrink-0 pt-0.5 text-2xs text-muted-foreground tabular">
                            {formatRelativeTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{n.message}</p>
                        <div className="mt-1.5 flex items-center gap-3">
                          {!n.read && (
                            <button onClick={() => markAsRead(n.id)} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                              <Check className="h-3.5 w-3.5" /> Marcar leída
                            </button>
                          )}
                          <button onClick={() => deleteNotification(n.id)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar
                          </button>
                        </div>
                      </div>
                      {!n.read && <span className="status-dot mt-2 bg-primary" aria-hidden="true" />}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-muted-foreground">
                    <Inbox className="h-6 w-6" />
                    <p className="text-sm">No hay notificaciones</p>
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="border-t border-border p-1.5">
                  <button
                    onClick={() => { setIsDropdownOpen(false); setIsHistoryModalOpen(true); }}
                    className="btn-ghost w-full text-[13px] text-foreground"
                  >
                    Ver historial completo <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Menú de usuario */}
        <div id="user-menu-container" className="relative ml-1">
          <button
            onClick={() => { setIsUserMenuOpen(o => !o); setIsDropdownOpen(false); }}
            className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-accent sm:pr-2"
            aria-label="Menú de usuario"
            aria-expanded={isUserMenuOpen}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials || 'U'}
            </span>
            <span className="hidden min-w-0 flex-col items-start text-left xl:flex">
              <span className="max-w-[160px] truncate text-[13px] font-semibold leading-4 text-foreground">{user.nombre}</span>
              <span className="text-2xs text-muted-foreground">{roleLabel}</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-popover shadow-lg animate-fade-in">
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-sm font-semibold text-foreground">{user.nombre}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                <span className="badge-neutral mt-2">{roleLabel}</span>
              </div>
              <div className="px-4 py-3">
                <p className="eyebrow mb-2">Apariencia</p>
                <div className="segmented w-full">
                  {([
                    { value: 'light', label: 'Claro', icon: Sun },
                    { value: 'dark', label: 'Oscuro', icon: Moon },
                    { value: 'system', label: 'Sistema', icon: Monitor },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={clsx('flex-1 justify-center', mounted && theme === opt.value ? 'segmented-item-active' : 'segmented-item')}
                    >
                      <opt.icon className="h-3.5 w-3.5" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-border p-1.5">
                <button onClick={handleSignOut} className="btn-ghost w-full justify-start text-[13px] text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historial completo */}
      {isHistoryModalOpen && (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && setIsHistoryModalOpen(false)}>
          <div className="modal-content flex max-w-2xl flex-col">
            <div className="modal-header">
              <h2>Historial de notificaciones</h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="modal-close" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>

            {notifications.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs sm:px-6">
                <span className="text-muted-foreground tabular">{notifications.length} notificaciones</span>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="flex items-center gap-1 font-medium text-primary hover:underline">
                      <CheckCheck className="h-3.5 w-3.5" /> Marcar todas leídas
                    </button>
                  )}
                  <button onClick={deleteAllNotifications} className="flex items-center gap-1 font-medium text-destructive hover:underline">
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar todo
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 divide-y divide-border">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n.id} className={clsx('flex items-start gap-3 px-4 py-3.5 sm:px-6', !n.read && 'bg-primary/[0.04]')}>
                    <div className="mt-0.5 shrink-0">{getNotificationIcon(n.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className={clsx('text-[13px]', !n.read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground')}>
                            {n.title}
                          </h4>
                          <span className="mt-0.5 block text-2xs text-muted-foreground tabular">
                            {new Date(n.createdAt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {!n.read && (
                            <button onClick={() => markAsRead(n.id)} className="btn-icon btn-ghost h-8 w-8 sm:h-8 sm:w-8" aria-label="Marcar como leída" title="Marcar como leída">
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => deleteNotification(n.id)} className="btn-icon btn-ghost h-8 w-8 sm:h-8 sm:w-8 hover:text-destructive" aria-label="Eliminar" title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{n.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
                  <Inbox className="h-8 w-8" />
                  <p className="text-sm font-medium">Sin notificaciones</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setIsHistoryModalOpen(false)} className="btn-outline">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        userRole={user.role}
      />
    </header>
  );
}
