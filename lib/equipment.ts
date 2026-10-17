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
  DISPENSER: 'Dispenser / Bebedero',
  AIR_CONDITIONER: 'Aire Acondicionado',
  COLD_ROOM: 'Cámara Frigorífica',
  REFRIGERATOR: 'Heladera / Freezer Comercial',
  VENTILATION: 'Ventilación / Extracción',
  OTHER: 'Otro Activo',
};

export const CRITICALITY_LABELS: Record<AssetCriticality, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const CRITICALITY_COLORS: Record<AssetCriticality, string> = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
  MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
  HIGH: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
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
    { key: 'acType', label: 'Tipo de Equipo', type: 'select', options: ['Split Muro', 'Piso Techo', 'Roof-Top', 'VRV / VRF', 'Cassette', 'Ventana', 'Compacto'] },
    { key: 'coolingCapacity', label: 'Capacidad Frigorífica', type: 'text', placeholder: 'Ej: 4500 Frig / 18000 BTU' },
    { key: 'refrigerantType', label: 'Gas Refrigerante', type: 'select', options: ['R410A', 'R22', 'R32', 'R134a', 'R407C', 'Otro'] },
    { key: 'gasChargeKg', label: 'Carga Gas Nominal', type: 'number', placeholder: 'Ej: 1.25', unit: 'kg' },
    { key: 'voltage', label: 'Tensión Eléctrica', type: 'select', options: ['220V Monofásico', '380V Trifásico'] },
    { key: 'inverter', label: 'Tecnología Inverter', type: 'select', options: ['Sí', 'No'] },
  ],
  COLD_ROOM: [
    { key: 'roomType', label: 'Tipo de Cámara', type: 'select', options: ['Conservación / Frescos (0°C a +4°C)', 'Congelados (-18°C a -25°C)', 'Túnel de Supercongelado (-35°C)', 'Climatizada (+10°C a +15°C)'] },
    { key: 'temperatureSetpoint', label: 'Temperatura Setpoint', type: 'text', placeholder: 'Ej: -20°C' },
    { key: 'volumeM3', label: 'Volumen', type: 'number', placeholder: 'Ej: 45', unit: 'm³' },
    { key: 'refrigerantType', label: 'Gas Refrigerante', type: 'select', options: ['R404A', 'R507', 'R134a', 'R22', 'R449A', 'Amoníaco (NH3)', 'Otro'] },
    { key: 'compressorHp', label: 'Potencia Compresor', type: 'text', placeholder: 'Ej: 5 HP' },
    { key: 'voltage', label: 'Alimentación Eléctrica', type: 'select', options: ['380V Trifásico', '220V Monofásico'] },
    { key: 'defrostType', label: 'Desescarche / Defrost', type: 'select', options: ['Resistencias Eléctricas', 'Gas Caliente', 'Natural por Aire', 'Agua'] },
  ],
  DISPENSER: [
    { key: 'supplyType', label: 'Tipo de Conexión', type: 'select', options: ['Red Directa de Agua', 'Botellón (12L / 20L)'] },
    { key: 'coldSystem', label: 'Sistema de Enfriamiento', type: 'select', options: ['Motocompresor', 'Placa Termoeléctrica'] },
    { key: 'waterConnection', label: 'Conexión Entrada', type: 'select', options: ['Manguera 1/4"', 'Manguera 3/8"', 'Rosca 1/2"', 'Sin conexión'] },
    { key: 'filterCount', label: 'Cantidad de Filtros', type: 'number', placeholder: 'Ej: 2' },
  ],
  REFRIGERATOR: [
    { key: 'volumeLiters', label: 'Capacidad', type: 'number', placeholder: 'Ej: 450', unit: 'L' },
    { key: 'doorType', label: 'Tipo de Puertas', type: 'select', options: ['Vidrio Batiente', 'Vidrio Corrediza', 'Ciega'] },
    { key: 'temperatureRange', label: 'Rango de Temperatura', type: 'text', placeholder: 'Ej: 0°C a 5°C' },
    { key: 'refrigerantType', label: 'Gas Refrigerante', type: 'select', options: ['R134a', 'R600a', 'R290', 'R404A', 'Otro'] },
    { key: 'voltage', label: 'Tensión Eléctrica', type: 'select', options: ['220V Monofásico', '380V Trifásico'] },
  ],
  VENTILATION: [
    { key: 'airFlowM3h', label: 'Caudal de Aire', type: 'number', placeholder: 'Ej: 3500', unit: 'm³/h' },
    { key: 'ductDiameterMm', label: 'Diámetro de Conducto', type: 'number', placeholder: 'Ej: 300', unit: 'mm' },
    { key: 'motorHp', label: 'Potencia Motor', type: 'text', placeholder: 'Ej: 1.5 HP' },
    { key: 'voltage', label: 'Tensión Eléctrica', type: 'select', options: ['220V Monofásico', '380V Trifásico'] },
  ],
  OTHER: [
    { key: 'description', label: 'Descripción Técnica', type: 'text', placeholder: 'Detalles y características del activo...' },
    { key: 'voltage', label: 'Tensión / Alimentación', type: 'text', placeholder: 'Ej: 220V / 380V / Neumática' },
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
