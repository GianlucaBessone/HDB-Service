import { UserRole } from '@prisma/client';

/**
 * RBAC Permission Matrix
 * Defines what each role can do in the system.
 */

export type Permission =
  | 'clients:read'
  | 'clients:write'
  | 'plants:read'
  | 'plants:write'
  | 'sectors:read'
  | 'sectors:write'
  | 'locations:read'
  | 'locations:write'
  | 'dispensers:read'
  | 'dispensers:write'
  | 'dispensers:assign'
  | 'dispensers:status'
  | 'dispensers:release_block'
  | 'tickets:read'
  | 'tickets:write'
  | 'tickets:assign'
  | 'tickets:close'
  | 'maintenance:read'
  | 'maintenance:write'
  | 'stock:read'
  | 'stock:write'
  | 'stock:transfer'
  | 'users:read'
  | 'users:write'
  | 'dashboard:read'
  | 'reports:read'
  | 'reports:generate'
  | 'audit:read'
  | 'sectors:read'
  | 'sectors:write'
  | 'sla_config:write'
  | 'notifications:read';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'clients:read', 'clients:write',
    'plants:read', 'plants:write',
    'sectors:read', 'sectors:write',
    'locations:read', 'locations:write',
    'dispensers:read', 'dispensers:write', 'dispensers:assign', 'dispensers:status', 'dispensers:release_block',
    'tickets:read', 'tickets:write', 'tickets:assign', 'tickets:close',
    'maintenance:read', 'maintenance:write',
    'stock:read', 'stock:write', 'stock:transfer',
    'sectors:read', 'sectors:write',
    'users:read', 'users:write',
    'dashboard:read',
    'reports:read', 'reports:generate',
    'audit:read',
    'sla_config:write',
    'notifications:read',
  ],
  SUPERVISOR: [
    'clients:read', 'clients:write',
    'plants:read', 'plants:write',
    'sectors:read', 'sectors:write',
    'locations:read', 'locations:write',
    'dispensers:read', 'dispensers:write', 'dispensers:assign', 'dispensers:status',
    'tickets:read', 'tickets:write', 'tickets:assign', 'tickets:close',
    'maintenance:read', 'maintenance:write',
    'stock:read', 'stock:write', 'stock:transfer',
    'sectors:read', 'sectors:write',
    'users:read', 'users:write',
    'dashboard:read',
    'reports:read', 'reports:generate',
    'audit:read',
    'notifications:read',
  ],
  TECHNICIAN: [
    'dispensers:read', 'dispensers:write', 'dispensers:assign', 'dispensers:status',
    'locations:read', 'locations:write',
    'tickets:read', 'tickets:write',
    'maintenance:read', 'maintenance:write',
    'stock:read', 'stock:write',
    'dashboard:read',
    'reports:read',
    'notifications:read',
  ],
  CLIENT_RESPONSIBLE: [
    'clients:read',
    'plants:read',
    'sectors:read',
    'locations:read',
    'dispensers:read', 'dispensers:release_block',
    'tickets:read', 'tickets:write',
    'maintenance:read',
    'stock:read',
    'dashboard:read',
    'reports:read', 'reports:generate',
    'notifications:read',
  ],
  CLIENT_REQUESTER: [
    'dispensers:read',
    'locations:read',
    'tickets:read', 'tickets:write',
    'maintenance:read',
    'stock:read',
    'dashboard:read',
    'reports:read',
    'notifications:read',
  ],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has ALL of the specified permissions.
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the specified permissions.
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Get all permissions for a role.
 */
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Sidebar navigation items with role-based visibility.
 */
export interface NavItem {
  key: string;
  label: string;
  icon: string; // lucide-react icon name
  roles: UserRole[];
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: '/', label: 'Inicio', icon: 'Home', roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE', 'CLIENT_REQUESTER'] },
  { key: '/dashboard', label: 'Dashboard', icon: 'BarChart3', roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE', 'CLIENT_REQUESTER'] },
  { key: '/tickets', label: 'Tickets', icon: 'Ticket', roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE', 'CLIENT_REQUESTER'] },
  { key: '/dispensers', label: 'Dispensers', icon: 'GlassWater', roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE', 'CLIENT_REQUESTER'] },
  { key: '/maintenance', label: 'Mantenimiento', icon: 'Wrench', roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'] },
  { key: '/maintenance/approvals', label: 'Firmas', icon: 'FileSignature', roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'] },
  { key: '/inventory', label: 'Inventario', icon: 'Package', roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE', 'CLIENT_REQUESTER'] },
  { key: '/clients', label: 'Configuración', icon: 'Settings', roles: ['ADMIN', 'SUPERVISOR'] },
  { key: '/map', label: 'Mapa', icon: 'MapPin', roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'] },
  { key: '/qr/scan', label: 'Escanear QR', icon: 'ScanLine', roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE', 'CLIENT_REQUESTER'] },
  { key: '/users', label: 'Usuarios', icon: 'Users', roles: ['ADMIN', 'SUPERVISOR'] },
  { key: '/maintenance/reports', label: 'Reportes', icon: 'FileText', roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE'] },
];

/**
 * Check if a navigation item is visible for a given role.
 */
export function isNavVisible(key: string, role: UserRole): boolean {
  const item = NAV_ITEMS.find(n => n.key === key);
  if (!item) return false;
  return item.roles.includes(role);
}
