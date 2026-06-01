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
    'users:read', 'users:write',
    'dashboard:read',
    'reports:read', 'reports:generate',
    'audit:read',
    'notifications:read',
  ],
  TECHNICIAN: [
    'dispensers:read', 'dispensers:status',
    'locations:read',
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

export interface NavItem {
  key: string;
  label: string;
  icon: string; // lucide-react icon name
  roles: UserRole[];
  badge?: string;
  description?: string;
  colorClass?: string;
  bgClass?: string;
  borderLeftClass?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: '/', label: 'Inicio', icon: 'Home', roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE', 'CLIENT_REQUESTER'] },
  { 
    key: '/dashboard', 
    label: 'Dashboard', 
    icon: 'BarChart3', 
    roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE', 'CLIENT_REQUESTER'],
    description: 'Resumen y métricas de operación, SLA, MTTR y visualización de la performance de los equipos.',
    colorClass: 'text-primary border-t-primary',
    bgClass: 'bg-primary/10 text-primary',
    borderLeftClass: 'border-l-primary'
  },
  { 
    key: '/tickets', 
    label: 'Tickets', 
    icon: 'Ticket', 
    roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE', 'CLIENT_REQUESTER'],
    description: 'Gestión y seguimiento de incidencias, solicitudes de servicio y reportes de soporte técnico.',
    colorClass: 'text-blue-500 border-t-blue-500',
    bgClass: 'bg-blue-500/10 text-blue-500',
    borderLeftClass: 'border-l-blue-500'
  },
  { 
    key: '/dispensers', 
    label: 'Dispensers', 
    icon: 'GlassWater', 
    roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE', 'CLIENT_REQUESTER'],
    description: 'Catálogo de dispensers instalados, historial de reparaciones y estado en tiempo real.',
    colorClass: 'text-emerald-500 border-t-emerald-500',
    bgClass: 'bg-emerald-500/10 text-emerald-500',
    borderLeftClass: 'border-l-emerald-500'
  },
  { 
    key: '/maintenance', 
    label: 'Mantenimiento', 
    icon: 'Wrench', 
    roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'],
    description: 'Rutinas de mantenimiento preventivo, visitas agendadas y checklists de control técnico.',
    colorClass: 'text-amber-500 border-t-amber-500',
    bgClass: 'bg-amber-500/10 text-amber-500',
    borderLeftClass: 'border-l-amber-500'
  },
  { 
    key: '/maintenance/approvals', 
    label: 'Firmas', 
    icon: 'FileSignature', 
    roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'],
    description: 'Firmas digitales de conformidad, aprobaciones de trabajos y actas de mantenimiento.',
    colorClass: 'text-indigo-500 border-t-indigo-500',
    bgClass: 'bg-indigo-500/10 text-indigo-500',
    borderLeftClass: 'border-l-indigo-500'
  },
  { 
    key: '/inventory', 
    label: 'Inventario', 
    icon: 'Package', 
    roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE', 'CLIENT_REQUESTER'],
    description: 'Niveles de stock de insumos y repuestos, control de transferencias y deudas inter-plantas.',
    colorClass: 'text-purple-500 border-t-purple-500',
    bgClass: 'bg-purple-500/10 text-purple-500',
    borderLeftClass: 'border-l-purple-500'
  },
  { 
    key: '/clients', 
    label: 'Configuración', 
    icon: 'Settings', 
    roles: ['ADMIN', 'SUPERVISOR'],
    description: 'Gestión administrativa de clientes, plantas operativas y configuración de sectores.',
    colorClass: 'text-cyan-500 border-t-cyan-500',
    bgClass: 'bg-cyan-500/10 text-cyan-500',
    borderLeftClass: 'border-l-cyan-500'
  },
  { 
    key: '/qr/scan', 
    label: 'Escanear QR', 
    icon: 'ScanLine', 
    roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE', 'CLIENT_REQUESTER'],
    description: 'Lector rápido de códigos QR para escaneo de dispensers e inicio rápido de reportes.',
    colorClass: 'text-rose-500 border-t-rose-500',
    bgClass: 'bg-rose-500/10 text-rose-500',
    borderLeftClass: 'border-l-rose-500'
  },
  { 
    key: '/users', 
    label: 'Usuarios', 
    icon: 'Users', 
    roles: ['ADMIN', 'SUPERVISOR'],
    description: 'Administración de usuarios de la plataforma, control de accesos, roles y personal.',
    colorClass: 'text-orange-500 border-t-orange-500',
    bgClass: 'bg-orange-500/10 text-orange-500',
    borderLeftClass: 'border-l-orange-500'
  },
  { 
    key: '/maintenance/reports', 
    label: 'Reportes', 
    icon: 'FileText', 
    roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE'],
    description: 'Descarga de reportes periódicos, historial de visitas y exportaciones analíticas.',
    colorClass: 'text-violet-500 border-t-violet-500',
    bgClass: 'bg-violet-500/10 text-violet-500',
    borderLeftClass: 'border-l-violet-500'
  },
];

/**
 * Check if a navigation item is visible for a given role.
 */
export function isNavVisible(key: string, role: UserRole): boolean {
  const item = NAV_ITEMS.find(n => n.key === key);
  if (!item) return false;
  return item.roles.includes(role);
}
