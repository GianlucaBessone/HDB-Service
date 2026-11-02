/**
 * Traducciones para los estados y roles de la aplicación.
 */

export const TRANSLATIONS: Record<string, string> = {
  // Roles de Usuario
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  TECHNICIAN: 'Técnico',
  CLIENT_RESPONSIBLE: 'Responsable Cliente',
  CLIENT_REQUESTER: 'Referente Cliente',

  // Estados de Dispenser / Activo
  IN_SERVICE: 'En Servicio',
  UNDER_REPAIR: 'En Reparación',
  OUT_OF_SERVICE: 'Fuera de Servicio',
  BLOCKED: 'Bloqueado',
  BACKUP: 'Backup / Reserva',
  IN_TECHNICAL_SERVICE: 'En Servicio Técnico',
  BLOCKED_WAITING_OC: 'Bloqueado (Esperando OC)',

  // Tipos de Activos / Equipos
  DISPENSER: 'Dispenser / Bebedero',
  AIR_CONDITIONER: 'Aire Acondicionado',
  COLD_ROOM: 'Cámara Frigorífica',
  REFRIGERATOR: 'Heladera / Freezer',
  VENTILATION: 'Ventilación / Extracción',
  OTHER: 'Otro Equipo',

  // Criticidad
  CRITICALITY_LOW: 'Baja',
  CRITICALITY_MEDIUM: 'Media',
  CRITICALITY_HIGH: 'Alta',
  CRITICALITY_CRITICAL: 'Crítica',

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
  const SUCCESS = 'bg-success/10 text-success border-success/25';
  const WARNING = 'bg-warning/10 text-warning border-warning/25';
  const DANGER = 'bg-destructive/10 text-destructive border-destructive/25';
  const INFO = 'bg-info/10 text-info border-info/25';
  const NEUTRAL = 'bg-muted text-muted-foreground border-border';

  const colors: Record<string, string> = {
    // Activos / Tickets
    IN_SERVICE: SUCCESS,
    OPEN: INFO,
    IN_PROGRESS: WARNING,
    RESOLVED: SUCCESS,
    CLOSED: NEUTRAL,

    // Mantenimiento
    PENDING: WARNING,
    COMPLETED: SUCCESS,
    SIGNED: INFO,
    EXPIRED: DANGER,
    OVERDUE: DANGER,

    // Prioridades
    CRITICAL: DANGER,
    HIGH: WARNING,
    MEDIUM: INFO,
    LOW: NEUTRAL,

    // Otros
    BLOCKED: DANGER,
    UNDER_REPAIR: WARNING,
    APPROVED: SUCCESS,
    REJECTED: DANGER,
    CANCELLED: NEUTRAL,
  };

  return colors[status] || NEUTRAL;
}
