export type EquipmentType = 'DISPENSER' | 'AIR_CONDITIONER' | 'REFRIGERATOR' | 'OTHER';

export interface EquipmentItem {
  id: string;
  equipmentType?: EquipmentType | string;
  marca: string;
  modelo: string;
  numeroSerie?: string | null;
  status: string;
  locationId?: string | null;
  plantId?: string | null;
  clientId?: string | null;
}

export const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  DISPENSER: 'Dispenser',
  AIR_CONDITIONER: 'Aire Acondicionado',
  REFRIGERATOR: 'Heladera / Freezer',
  OTHER: 'Otro Equipo',
};

/**
 * Get human readable label for an equipment type.
 */
export function getEquipmentTypeLabel(type?: string | null): string {
  if (!type) return 'Equipo';
  return EQUIPMENT_TYPE_LABELS[type] || type;
}
