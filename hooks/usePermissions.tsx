import { useQuery } from '@tanstack/react-query';
import { UserRole } from '@prisma/client';

export type Permission = 
  | 'tickets:read'
  | 'tickets:write'
  | 'tickets:close'
  | 'tickets:assign'
  | 'maintenance:read'
  | 'maintenance:write'
  | 'inventory:read'
  | 'inventory:write'
  | 'users:manage'
  | 'plants:manage';

export const RolePermissions: Record<UserRole, Permission[]> = {
  ADMIN: [
    'tickets:read', 'tickets:write', 'tickets:close', 'tickets:assign',
    'maintenance:read', 'maintenance:write',
    'inventory:read', 'inventory:write',
    'users:manage', 'plants:manage'
  ],
  SUPERVISOR: [
    'tickets:read', 'tickets:write', 'tickets:close', 'tickets:assign',
    'maintenance:read', 'maintenance:write',
    'inventory:read', 'inventory:write',
    'plants:manage'
  ],
  TECHNICIAN: [
    'tickets:read', 'tickets:write',
    'maintenance:read', 'maintenance:write',
    'inventory:read', 'inventory:write'
  ],
  CLIENT_RESPONSIBLE: [
    'tickets:read', 'tickets:write', 'tickets:close',
    'maintenance:read',
    'inventory:read'
  ],
  CLIENT_REQUESTER: [
    'tickets:read', 'tickets:write'
  ]
};

export function usePermissions() {
  const { data: session } = useQuery<any>({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return { user: null };
      return res.json();
    }
  });

  const user = session?.user;

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    const permissions = RolePermissions[user.role as UserRole] || [];
    return permissions.includes(permission);
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role as UserRole);
    }
    return user.role === roles;
  };

  return {
    hasPermission,
    hasRole,
    role: user?.role as UserRole | undefined,
    user
  };
}

/**
 * Utility Component to conditionally render children based on permissions.
 * Usage:
 * <Can perform="tickets:write"> <button>Edit Ticket</button> </Can>
 * <Can role={['ADMIN', 'SUPERVISOR']}> <AdminPanel /> </Can>
 */
export function Can({ 
  perform, 
  role, 
  children, 
  fallback = null 
}: { 
  perform?: Permission; 
  role?: UserRole | UserRole[]; 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) {
  const { hasPermission, hasRole } = usePermissions();

  let canRender = false;

  if (perform) {
    canRender = hasPermission(perform);
  } else if (role) {
    canRender = hasRole(role);
  }

  return canRender ? <>{children}</> : <>{fallback}</>;
}
