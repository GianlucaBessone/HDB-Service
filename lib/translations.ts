/**
 * Traducciones para los estados y roles de la aplicación.
 */

export const TRANSLATIONS: Record<string, string> = {
  // Roles de Usuario
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  TECHNICIAN: 'Técnico',
  CLIENT_RESPONSIBLE: 'Responsable Cliente',
  CLIENT_REQUESTER: 'Solicitante Cliente',

  // Estados de Dispenser
  IN_SERVICE: 'En Servicio',
  UNDER_REPAIR: 'En Reparación',
  OUT_OF_SERVICE: 'Fuera de Servicio',
  BLOCKED: 'Bloqueado',
  BACKUP: 'Backup / Reserva',
  IN_TECHNICAL_SERVICE: 'En Servicio Técnico',
  BLOCKED_WAITING_OC: 'Bloqueado (Esperando OC)',

  // Estados de Ticket
  OPEN: 'Abierto',
  IN_PROGRESS: 'En Proceso',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',

  // Prioridades de Ticket
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',

  // Estados de Mantenimiento
  PENDING: 'Pendiente',
  COMPLETED: 'Completado',
  OVERDUE: 'Atrasado',
  EXPIRED: 'Vencido',
  SIGNED: 'Firmado',

  // Calificaciones de Condición
  GOOD: 'Bueno',
  FAIR: 'Regular',
  POOR: 'Malo',
  // CRITICAL ya está arriba en prioridades

  // Estados de Deuda y Transferencia
  RESOLVED_DEBT: 'Resuelto', // Para evitar colisión con Resolved de Ticket si fuera necesario
  CANCELLED: 'Cancelado',
};

/**
 * Traduce un string (key) al español si existe en el diccionario.
 */
export function t(key: string | null | undefined): string {
  if (!key) return '-';
  return TRANSLATIONS[key] || key;
}

/**
 * Obtiene el color asociado a un estado (opcional, para centralizar visuales)
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Dispensers / Tickets
    IN_SERVICE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    OPEN: 'bg-blue-100 text-blue-700 border-blue-200',
    IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-200',
    RESOLVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
    
    // Mantenimiento
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    SIGNED: 'bg-blue-100 text-blue-700 border-blue-200',
    EXPIRED: 'bg-red-100 text-red-700 border-red-200',
    OVERDUE: 'bg-rose-100 text-rose-700 border-rose-200',

    // Prioridades
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    
    // Otros
    BLOCKED: 'bg-red-100 text-red-700 border-red-200',
    UNDER_REPAIR: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  };
  
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}
