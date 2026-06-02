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
  Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { UserRole } from '@prisma/client';
import { t } from '@/lib/translations';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { useUIStore } from '@/lib/store/useUIStore';

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
        return <Wrench className="w-4 h-4 text-blue-500" />;
      case 'SLA_NEAR_BREACH':
        return <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />;
      case 'SLA_BREACHED':
        return <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />;
      case 'MAINTENANCE_DUE':
        return <Clock className="w-4 h-4 text-emerald-500" />;
      case 'STOCK_LOW':
        return <Package className="w-4 h-4 text-orange-500" />;
      case 'DEBT_CREATED':
        return <Landmark className="w-4 h-4 text-purple-500" />;
      default:
        return <BellRing className="w-4 h-4 text-primary" />;
    }
  }

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      
      {/* Mobile Menu Button */}
      <button 
        onClick={toggleSidebar}
        className="md:hidden p-2 text-muted-foreground hover:bg-accent rounded-md"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Spacer for desktop */}
      <div className="hidden md:block" />

      {/* Right side actions */}
      <div className="flex items-center gap-3 md:gap-5">
        
        {/* Theme Toggle */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-muted-foreground hover:bg-accent hover:text-foreground rounded-full transition-colors flex items-center justify-center w-9 h-9"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-500" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          )}
        </button>

        {/* Notifications Dropdown Toggle */}
        <div id="notification-bell-container" className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`relative p-2 rounded-full transition-colors ${
              isDropdownOpen ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent'
            }`}
            title="Notificaciones"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span 
                className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-[9px] font-bold text-white rounded-full flex items-center justify-center border-2 border-card animate-pulse-soft"
                style={{ transform: 'translate(25%, -25%)' }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in">
              {/* Dropdown Header */}
              <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between bg-accent/20">
                <span className="font-semibold text-xs text-foreground">Notificaciones</span>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] text-primary hover:underline font-semibold"
                    >
                      Marcar leídas
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={deleteAllNotifications}
                      className="p-1 text-muted-foreground hover:text-red-500 rounded-md hover:bg-red-500/10 transition-colors"
                      title="Eliminar todas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dropdown List (Preview top 5) */}
              <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
                {notifications.slice(0, 5).length > 0 ? (
                  notifications.slice(0, 5).map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-3 flex items-start gap-3 transition-colors hover:bg-accent/40 ${
                        !n.read ? 'bg-primary/[0.02]' : ''
                      }`}
                    >
                      <div className="mt-0.5 p-1.5 rounded-lg bg-accent/60 flex-shrink-0">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className={`text-xs truncate ${!n.read ? 'font-bold text-foreground' : 'text-muted-foreground font-medium'}`}>
                            {n.title}
                          </p>
                          <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        
                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 mt-1.5 pt-1 border-t border-border/10">
                          {!n.read && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Leída
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(n.id)}
                            className="text-[10px] text-muted-foreground hover:text-red-500 font-semibold flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <Inbox className="w-8 h-8 opacity-40" />
                    <p className="text-xs">No tienes notificaciones</p>
                  </div>
                )}
              </div>

              {/* Dropdown Footer */}
              {notifications.length > 0 && (
                <div className="p-2 bg-accent/10 border-t border-border/50 text-center">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsHistoryModalOpen(true);
                    }}
                    className="w-full py-1.5 text-xs text-primary hover:text-primary-hover font-semibold flex items-center justify-center gap-1 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    Ver historial completo <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* User Dropdown Toggle (Visual) */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold leading-none">{user.nombre}</span>
            <span className="text-xs text-muted-foreground mt-1">
              {user.role === 'CLIENT_REQUESTER' 
                ? 'Referente' 
                : user.role === 'CLIENT_RESPONSIBLE' 
                ? 'Responsable' 
                : t(user.role)}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {user.nombre.charAt(0).toUpperCase()}
          </div>
          <button 
            onClick={handleSignOut}
            className="p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors ml-1"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* Historial Completo Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-accent/10">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-base text-foreground">Historial de Notificaciones</h2>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toolbar */}
            {notifications.length > 0 && (
              <div className="px-6 py-2.5 border-b border-border/60 bg-accent/5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  Total: {notifications.length} notificaciones
                </span>
                <div className="flex items-center gap-4">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Marcar todas leídas
                    </button>
                  )}
                  <button
                    onClick={deleteAllNotifications}
                    className="text-red-500 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar todo
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body / Scroll Area */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-6 py-4 flex items-start gap-4 transition-colors hover:bg-accent/30 ${
                      !n.read ? 'bg-primary/[0.01]' : ''
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-accent flex-shrink-0">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <h4 className={`text-xs ${!n.read ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'}`}>
                            {n.title}
                          </h4>
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">
                            {new Date(n.createdAt).toLocaleString('es-ES', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!n.read && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="p-1.5 hover:bg-primary/10 hover:text-primary text-muted-foreground rounded-lg transition-colors"
                              title="Marcar como leída"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(n.id)}
                            className="p-1.5 hover:bg-red-500/10 hover:text-red-500 text-muted-foreground rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-16 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <Inbox className="w-12 h-12 opacity-30" />
                  <p className="font-semibold text-sm">Historial vacío</p>
                  <p className="text-xs text-muted-foreground max-w-[280px]">
                    No tienes notificaciones registradas en este momento.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-accent/5 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent/80 text-foreground rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

