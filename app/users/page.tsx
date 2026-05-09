'use client';

import { useEffect, useState } from 'react';
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
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        toast.error('Error al cargar usuarios');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  }

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
    `${user.nombre} ${user.apellido || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const classes: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
      SUPERVISOR: 'bg-blue-100 text-blue-700 border-blue-200',
      TECHNICIAN: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      CLIENT_RESPONSIBLE: 'bg-amber-100 text-amber-700 border-amber-200',
      CLIENT_REQUESTER: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    const className = classes[role] || 'bg-gray-100 text-gray-700 border-gray-200';
    return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${className}`}>{t(role)}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra los accesos y roles de todo el equipo y clientes.
          </p>
        </div>
        <button 
          onClick={() => { setSelectedUser(null); setIsModalOpen(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-background border border-border rounded-lg flex items-center gap-2 hover:bg-accent transition-colors">
              <Filter className="w-4 h-4" />
              Filtrar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Usuario</th>
                <th className="px-6 py-4 font-semibold">Rol</th>
                <th className="px-6 py-4 font-semibold">Cliente / Empresa</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold">Fecha Registro</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      Cargando usuarios...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-accent/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.nombre.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground leading-none">
                            {user.nombre} {user.apellido}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4">
                      {user.client ? (
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {user.client.nombre}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">— Interno —</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.active ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                          <UserCheck className="w-4 h-4" />
                          Activo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-500 text-sm font-medium">
                          <Ban className="w-4 h-4" />
                          Bloqueado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => { setSelectedUser(user); setIsModalOpen(true); }}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-primary"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleActive(user)}
                          className={`p-2 rounded-lg transition-colors ${user.active ? 'hover:bg-amber-100 text-amber-600' : 'hover:bg-emerald-100 text-emerald-600'}`}
                          title={user.active ? 'Bloquear' : 'Activar'}
                        >
                          {user.active ? <Ban className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => setConfirmDelete(user.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
          confirmLabel="Eliminar Usuario"
          onConfirm={handleDeleteUser}
          onClose={() => setConfirmDelete(null)}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}
