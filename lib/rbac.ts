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
  | 'notifications:read'
  | 'quotations:read'
  | 'quotations:write'
  | 'quotations:approve';

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
    'quotations:read', 'quotations:write', 'quotations:approve',
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
    'quotations:read', 'quotations:write', 'quotations:approve',
  ],
  TECHNICIAN: [
    'plants:read',
    'dispensers:read', 'dispensers:status',
    'locations:read',
    'tickets:read', 'tickets:write',
    'maintenance:read', 'maintenance:write',
    'stock:read', 'stock:write',
    'dashboard:read',
    'reports:read',
    'notifications:read',
    'quotations:read', 'quotations:write',
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
    'quotations:read', 'quotations:approve',
  ],
  CLIENT_REQUESTER: [
    'plants:read',
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

export type NavGroup = 'general' | 'operacion' | 'activos' | 'gestion' | 'admin';

export const NAV_GROUP_LABELS: Record<NavGroup, string | null> = {
  general: null,
  operacion: 'Operación',
  activos: 'Activos y stock',
  gestion: 'Gestión',
  admin: 'Administración',
};

export interface NavItem {
  key: string;
  label: string;
  /** Título corto para la barra superior (si difiere del label). */
  title?: string;
  icon: string; // lucide-react icon name
  roles: UserRole[];
  group: NavGroup;
  badge?: string;
  description?: string;
}

const ALL_ROLES: UserRole[] = ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE', 'CLIENT_REQUESTER'];
const STAFF: UserRole[] = ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'];
const MANAGERS: UserRole[] = ['ADMIN', 'SUPERVISOR'];

export const NAV_ITEMS: NavItem[] = [
  { key: '/', label: 'Inicio', icon: 'Home', roles: ALL_ROLES, group: 'general' },
  {
    key: '/dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    roles: ALL_ROLES,
    group: 'general',
    description: 'Indicadores de operación: SLA, MTTR, estado de la flota y productividad.',
  },
  {
    key: '/tickets',
    label: 'Tickets',
    icon: 'Ticket',
    roles: ALL_ROLES,
    group: 'operacion',
    description: 'Incidencias y solicitudes de servicio, asignación y seguimiento.',
  },
  {
    key: '/maintenance',
    label: 'Mantenimiento',
    icon: 'Wrench',
    roles: STAFF,
    group: 'operacion',
    description: 'Rutas de mantenimiento preventivo y checklists del período.',
  },
  {
    key: '/maintenance/approvals',
    label: 'Firmas',
    title: 'Firmas de conformidad',
    icon: 'PenLine',
    roles: STAFF,
    group: 'operacion',
    description: 'Conformidades firmadas por clientes y actas de mantenimiento.',
  },
  {
    key: '/qr/scan',
    label: 'Escanear QR',
    icon: 'ScanLine',
    roles: ALL_ROLES,
    group: 'operacion',
    description: 'Identificar un activo en planta y abrir su ficha o un reporte.',
  },
  {
    key: '/dispensers',
    label: 'Activos',
    icon: 'Layers',
    roles: ALL_ROLES,
    group: 'activos',
    description: 'Parque instalado, fichas técnicas e historial de intervenciones.',
  },
  {
    key: '/inventory',
    label: 'Inventario',
    icon: 'Package',
    roles: ALL_ROLES,
    group: 'activos',
    description: 'Stock de insumos y repuestos, transferencias y deudas entre plantas.',
  },
  {
    key: '/quotations',
    label: 'Presupuestos y OC',
    icon: 'Receipt',
    roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE'],
    group: 'gestion',
    description: 'Cotizaciones de reparación y mano de obra, vinculadas a órdenes de compra.',
  },
  {
    key: '/maintenance/reports',
    label: 'Reportes',
    title: 'Matriz de mantenimiento',
    icon: 'FileText',
    roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_RESPONSIBLE'],
    group: 'gestion',
    description: 'Cumplimiento por período y exportaciones.',
  },
  {
    key: '/users',
    label: 'Usuarios',
    icon: 'Users',
    roles: MANAGERS,
    group: 'admin',
    description: 'Accesos, roles y personal de la plataforma.',
  },
  {
    key: '/clients',
    label: 'Configuración',
    icon: 'Settings',
    roles: MANAGERS,
    group: 'admin',
    description: 'Clientes, plantas, sectores, ubicaciones, catálogo y correo.',
  },
];

/** Devuelve el ítem de navegación que corresponde a una ruta (prefijo más largo). */
export function getNavItemForPath(pathname: string): NavItem | undefined {
  if (pathname === '/') return NAV_ITEMS[0];
  return NAV_ITEMS
    .filter(n => n.key !== '/' && (pathname === n.key || pathname.startsWith(n.key + '/')))
    .sort((a, b) => b.key.length - a.key.length)[0];
}

/**
 * Check if a navigation item is visible for a given role.
 */
export function isNavVisible(key: string, role: UserRole): boolean {
  const item = NAV_ITEMS.find(n => n.key === key);
  if (!item) return false;
  return item.roles.includes(role);
}
