'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Mail,
  UserCheck,
  UserMinus,
  Loader2,
  Building2,
  Edit,
  Trash2,
  Lock,
  Ban
} from 'lucide-react';
import toast from 'react-hot-toast';
import { t } from '@/lib/translations';
import UserModal from '@/components/UserModal';
import ConfirmModal from '@/components/ConfirmModal';

interface User {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  clientId?: string;
  client?: { nombre: string } | null;
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: users = [], isLoading, refetch: fetchUsers } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    }
  });

  // Prefetch clients and plants for instant modal rendering
  useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const res = await fetch('/api/clients');
      return res.ok ? res.json() : [];
    },
    staleTime: 10 * 60 * 1000,
  });

  useQuery({
    queryKey: ['plants-list', '', 'TECHNICIAN'],
    queryFn: async () => {
      const res = await fetch('/api/plants');
      return res.ok ? res.json() : [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const handleDeleteUser = async () => {
    if (!confirmDelete) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${confirmDelete}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Usuario eliminado correctamente');
        setConfirmDelete(null);
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al eliminar');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });
      if (res.ok) {
        toast.success(user.active ? 'Usuario bloqueado' : 'Usuario activado');
        fetchUsers();
      } else {
        toast.error('Error al cambiar estado');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const filteredUsers = users.filter(user =>
    (`${user.nombre} ${user.apellido || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!roleFilter || user.role === roleFilter) &&
    (!statusFilter || (statusFilter === 'active' ? user.active : !user.active))
  );

  const getRoleBadge = (role: string) => {
    const classes: Record<string, string> = {
      ADMIN: 'bg-primary/10 text-primary border-primary/25',
      SUPERVISOR: 'bg-info/10 text-info border-info/25',
      TECHNICIAN: 'bg-muted text-foreground border-border',
      CLIENT_RESPONSIBLE: 'bg-warning/10 text-warning border-warning/25',
      CLIENT_REQUESTER: 'bg-muted text-foreground border-border',
    };
    const className = classes[role] || 'bg-muted text-foreground border-border';
    return <span className={`badge ${className}`}>{t(role)}</span>;
  };

  const initials = (u: any) => `${u.nombre?.charAt(0) || ''}${u.apellido?.charAt(0) || ''}`.toUpperCase();

  const actions = (user: any) => (
    <div className="flex justify-end gap-0.5">
      <button onClick={() => { setSelectedUser(user); setIsModalOpen(true); }} className="btn-icon btn-ghost" title="Editar" aria-label={`Editar ${user.nombre}`}>
        <Edit className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleToggleActive(user)}
        className="btn-icon btn-ghost"
        title={user.active ? 'Bloquear acceso' : 'Activar acceso'}
        aria-label={user.active ? `Bloquear a ${user.nombre}` : `Activar a ${user.nombre}`}
      >
        {user.active ? <Ban className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
      </button>
      <button onClick={() => setConfirmDelete(user.id)} className="btn-icon btn-ghost hover:text-destructive" title="Eliminar" aria-label={`Eliminar ${user.nombre}`}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Usuarios"
        description="Accesos y roles del equipo interno y de los clientes."
        actions={
          <button onClick={() => { setSelectedUser(null); setIsModalOpen(true); }} className="btn-primary">
            <UserPlus className="h-4 w-4" />
            Nuevo usuario
          </button>
        }
      />

      <div className="filter-bar">
        <div className="relative sm:col-span-2 lg:min-w-[240px] lg:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por nombre o email…"
            aria-label="Buscar usuarios"
            className="input pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="select lg:w-52" aria-label="Rol">
          <option value="">Todos los roles</option>
          {['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE', 'CLIENT_REQUESTER'].map(r => (
            <option key={r} value={r}>{t(r)}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select lg:w-40" aria-label="Estado">
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="blocked">Bloqueados</option>
        </select>
      </div>

      {isLoading && users.length === 0 ? (
        <div className="glass-card divide-y divide-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="skeleton h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2"><div className="skeleton h-3.5 w-40" /><div className="skeleton h-3 w-56" /></div>
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState icon={Users} title="No se encontraron usuarios" description="Probá con otros criterios de búsqueda." />
      ) : (
        <>
          {/* Móvil */}
          <ul className="glass-card divide-y divide-border overflow-hidden md:hidden">
            {filteredUsers.map(user => (
              <li key={user.id} className="flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">{initials(user)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{user.nombre} {user.apellido}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {getRoleBadge(user.role)}
                    {user.active ? <span className="badge-success">Activo</span> : <span className="badge-danger">Bloqueado</span>}
                    {user.client && <span className="badge-neutral"><Building2 className="h-3 w-3" />{user.client.nombre}</span>}
                  </div>
                </div>
                {actions(user)}
              </li>
            ))}
          </ul>

          {/* Desktop */}
          <div className="table-container hidden md:block">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Cliente / empresa</th>
                  <th>Estado</th>
                  <th className="hidden lg:table-cell">Alta</th>
                  <th className="text-right"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">{initials(user)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{user.nombre} {user.apellido}</p>
                          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><Mail className="h-3 w-3" />{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>
                      {user.client ? (
                        <span className="flex items-center gap-1.5 text-[13px]"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{user.client.nombre}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Interno</span>
                      )}
                    </td>
                    <td>
                      {user.active ? (
                        <span className="badge-success"><UserCheck className="h-3 w-3" /> Activo</span>
                      ) : (
                        <span className="badge-danger"><Ban className="h-3 w-3" /> Bloqueado</span>
                      )}
                    </td>
                    <td className="hidden text-[13px] text-muted-foreground tabular lg:table-cell">
                      {new Date(user.createdAt).toLocaleDateString('es-AR')}
                    </td>
                    <td className="text-right">{actions(user)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <UserModal 
          user={selectedUser} 
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => { setIsModalOpen(false); fetchUsers(); }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal 
          title="¿Eliminar usuario?"
          description="Esta acción es irreversible. El usuario perderá el acceso al sistema de forma permanente."
          confirmLabel="Eliminar usuario"
          onConfirm={handleDeleteUser}
          onClose={() => setConfirmDelete(null)}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}
