import { Wind, Snowflake, GlassWater, Refrigerator, Fan, Cpu, LucideIcon } from 'lucide-react';
import type {
  Dispenser as PrismaDispenser,
  DispenserStatus as PrismaDispenserStatus,
  DispenserLocationHistory as PrismaDispenserLocationHistory,
  DispenserRepairHistory as PrismaDispenserRepairHistory,
  DispenserConsumableHistory as PrismaDispenserConsumableHistory,
  DispenserSparePartHistory as PrismaDispenserSparePartHistory,
} from '@prisma/client';

export type EquipmentType = 
  | 'DISPENSER' 
  | 'AIR_CONDITIONER' 
  | 'COLD_ROOM' 
  | 'REFRIGERATOR' 
  | 'VENTILATION' 
  | 'OTHER';

export const ALL_EQUIPMENT_TYPES: EquipmentType[] = [
  'AIR_CONDITIONER',
  'COLD_ROOM',
  'DISPENSER',
  'REFRIGERATOR',
  'VENTILATION',
  'OTHER',
];

export type AssetCriticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Standardized Domain Aliases (Fase 3 Non-Destructive DB Abstraction)
 * Allows application code to reference Equipment/Asset types while preserving
 * the physical PostgreSQL "Dispenser" tables intact.
 */
export type Equipment = PrismaDispenser;
export type Asset = PrismaDispenser;
export type EquipmentStatus = PrismaDispenserStatus;
export type EquipmentLocationHistory = PrismaDispenserLocationHistory;
export type EquipmentRepairHistory = PrismaDispenserRepairHistory;
export type EquipmentConsumableHistory = PrismaDispenserConsumableHistory;
export type EquipmentSparePartHistory = PrismaDispenserSparePartHistory;

export interface EquipmentItem {
  id: string;
  equipmentType?: EquipmentType | string;
  criticality?: AssetCriticality | string;
  marca: string;
  modelo: string;
  numeroSerie?: string | null;
  status: string;
  technicalSpecs?: Record<string, any> | null;
  locationId?: string | null;
  plantId?: string | null;
  clientId?: string | null;
}

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  DISPENSER: 'Dispenser / bebedero',
  AIR_CONDITIONER: 'Aire acondicionado',
  COLD_ROOM: 'Cámara frigorífica',
  REFRIGERATOR: 'Heladera / freezer comercial',
  VENTILATION: 'Ventilación / extracción',
  OTHER: 'Otro activo',
};

export const CRITICALITY_LABELS: Record<AssetCriticality, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const CRITICALITY_COLORS: Record<AssetCriticality, string> = {
  LOW: 'bg-muted text-foreground border-border',
  MEDIUM: 'bg-info/10 text-info border-info/25',
  HIGH: 'bg-warning/10 text-warning border-warning/25',
  CRITICAL: 'bg-destructive/10 text-destructive border-destructive/25',
};

export interface SpecField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
  placeholder?: string;
  unit?: string;
}

export const SPEC_FIELDS_BY_TYPE: Record<EquipmentType, SpecField[]> = {
  AIR_CONDITIONER: [
    { key: 'acType', label: 'Tipo de equipo', type: 'select', options: ['Split Muro', 'Piso Techo', 'Roof-Top', 'VRV / VRF', 'Cassette', 'Ventana', 'Compacto'] },
    { key: 'coolingCapacity', label: 'Capacidad frigorífica', type: 'text', placeholder: 'Ej: 4500 Frig / 18000 BTU' },
    { key: 'refrigerantType', label: 'Gas refrigerante', type: 'select', options: ['R410A', 'R22', 'R32', 'R134a', 'R407C', 'Otro'] },
    { key: 'gasChargeKg', label: 'Carga gas nominal', type: 'number', placeholder: 'Ej: 1.25', unit: 'kg' },
    { key: 'voltage', label: 'Tensión eléctrica', type: 'select', options: ['220V Monofásico', '380V Trifásico'] },
    { key: 'inverter', label: 'Tecnología inverter', type: 'select', options: ['Sí', 'No'] },
  ],
  COLD_ROOM: [
    { key: 'roomType', label: 'Tipo de cámara', type: 'select', options: ['Conservación / Frescos (0°C a +4°C)', 'Congelados (-18°C a -25°C)', 'Túnel de Supercongelado (-35°C)', 'Climatizada (+10°C a +15°C)'] },
    { key: 'temperatureSetpoint', label: 'Temperatura Setpoint', type: 'text', placeholder: 'Ej: -20°C' },
    { key: 'volumeM3', label: 'Volumen', type: 'number', placeholder: 'Ej: 45', unit: 'm³' },
    { key: 'refrigerantType', label: 'Gas refrigerante', type: 'select', options: ['R404A', 'R507', 'R134a', 'R22', 'R449A', 'Amoníaco (NH3)', 'Otro'] },
    { key: 'compressorHp', label: 'Potencia compresor', type: 'text', placeholder: 'Ej: 5 HP' },
    { key: 'voltage', label: 'Alimentación eléctrica', type: 'select', options: ['380V Trifásico', '220V Monofásico'] },
    { key: 'defrostType', label: 'Desescarche / defrost', type: 'select', options: ['Resistencias Eléctricas', 'Gas Caliente', 'Natural por Aire', 'Agua'] },
  ],
  DISPENSER: [
    { key: 'supplyType', label: 'Tipo de conexión', type: 'select', options: ['Red Directa de Agua', 'Botellón (12L / 20L)'] },
    { key: 'coldSystem', label: 'Sistema de enfriamiento', type: 'select', options: ['Motocompresor', 'Placa Termoeléctrica'] },
    { key: 'waterConnection', label: 'Conexión entrada', type: 'select', options: ['Manguera 1/4"', 'Manguera 3/8"', 'Rosca 1/2"', 'Sin conexión'] },
    { key: 'filterCount', label: 'Cantidad de filtros', type: 'number', placeholder: 'Ej: 2' },
  ],
  REFRIGERATOR: [
    { key: 'volumeLiters', label: 'Capacidad', type: 'number', placeholder: 'Ej: 450', unit: 'L' },
    { key: 'doorType', label: 'Tipo de puertas', type: 'select', options: ['Vidrio Batiente', 'Vidrio Corrediza', 'Ciega'] },
    { key: 'temperatureRange', label: 'Rango de temperatura', type: 'text', placeholder: 'Ej: 0°C a 5°C' },
    { key: 'refrigerantType', label: 'Gas refrigerante', type: 'select', options: ['R134a', 'R600a', 'R290', 'R404A', 'Otro'] },
    { key: 'voltage', label: 'Tensión eléctrica', type: 'select', options: ['220V Monofásico', '380V Trifásico'] },
  ],
  VENTILATION: [
    { key: 'airFlowM3h', label: 'Caudal de aire', type: 'number', placeholder: 'Ej: 3500', unit: 'm³/h' },
    { key: 'ductDiameterMm', label: 'Diámetro de conducto', type: 'number', placeholder: 'Ej: 300', unit: 'mm' },
    { key: 'motorHp', label: 'Potencia motor', type: 'text', placeholder: 'Ej: 1.5 HP' },
    { key: 'voltage', label: 'Tensión eléctrica', type: 'select', options: ['220V Monofásico', '380V Trifásico'] },
  ],
  OTHER: [
    { key: 'description', label: 'Descripción técnica', type: 'text', placeholder: 'Detalles y características del activo...' },
    { key: 'voltage', label: 'Tensión / alimentación', type: 'text', placeholder: 'Ej: 220V / 380V / Neumática' },
  ]
};

/**
 * Get human readable label for an equipment type.
 */
export function getEquipmentTypeLabel(type?: string | null): string {
  if (!type) return 'Equipo';
  return (EQUIPMENT_TYPE_LABELS as any)[type] || type;
}

/**
 * Get human readable label for criticality.
 */
export function getCriticalityLabel(crit?: string | null): string {
  if (!crit) return 'Media';
  return (CRITICALITY_LABELS as any)[crit] || crit;
}

/**
 * Get badge color classes for criticality.
 */
export function getCriticalityColor(crit?: string | null): string {
  if (!crit) return CRITICALITY_COLORS.MEDIUM;
  return (CRITICALITY_COLORS as any)[crit] || CRITICALITY_COLORS.MEDIUM;
}

/**
 * Get icon component for an equipment type.
 */
export function getEquipmentTypeIcon(type?: string | null): LucideIcon {
  switch (type) {
    case 'AIR_CONDITIONER':
      return Wind;
    case 'COLD_ROOM':
      return Snowflake;
    case 'DISPENSER':
      return GlassWater;
    case 'REFRIGERATOR':
      return Refrigerator;
    case 'VENTILATION':
      return Fan;
    case 'OTHER':
    default:
      return Cpu;
  }
}
