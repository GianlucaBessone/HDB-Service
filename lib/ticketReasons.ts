import { EquipmentType } from '@prisma/client';

export const REASONS_BY_EQUIPMENT_TYPE: Record<EquipmentType, string[]> = {
  AIR_CONDITIONER: [
    'No enfría / Enfría poco',
    'No enciende / No responde al control remoto',
    'Gotea agua hacia el interior',
    'Pérdida de gas refrigerante',
    'Ruido o vibración excesiva',
    'Olor a humedad o quemado',
    'Salta térmica o disyuntor al arrancar',
    'Display parpadea / Código de error',
    'Serpentina congelada',
    'No calienta (modo calor)',
    'Mantenimiento preventivo',
    'Instalación / Reubicación',
    'Otro',
  ],
  COLD_ROOM: [
    'Alarma de temperatura alta / Fuera de setpoint',
    'Bloqueo severo de hielo en evaporador',
    'Compresor no arranca',
    'Compresor arranca y corta continuamente (ciclo corto)',
    'Presostato disparado (Alta / Baja)',
    'Pérdida de refrigerante detectada',
    'Puerta no cierra hermética / Burlete roto',
    'Agua acumulada en piso de cámara / Drenaje tapado',
    'Falla en resistencia de marco o descongelamiento',
    'Falla en controlador digital (Dixell / Full Gauge)',
    'Nivel bajo de aceite en mirilla de compresor',
    'Ruido anormal en sala de máquinas',
    'Otro',
  ],
  DISPENSER: [
    'Pérdida de agua',
    'No enfría',
    'No calienta',
    'Cortocircuito / No enciende',
    'Ruido excesivo',
    'Agua con mal sabor / olor',
    'Fuga en canilla',
    'Fuga en manguera o conector',
    'Botón o pulsador roto',
    'Canilla rota (Agua Fría)',
    'Canilla rota (Agua Caliente)',
    'Bandeja de goteo desborda',
    'Display apagado',
    'Filtro obstruido / Poco caudal',
    'Mantenimiento preventivo',
    'Instalación / Reubicación',
    'Otro',
  ],
  REFRIGERATOR: [
    'No enfría gabinete / Temperatura alta',
    'Compresor funciona sin cortar',
    'Forzador evaporador no gira',
    'Pérdida de agua abajo del gabinete',
    'Burlete magnético roto o despegado',
    'Ruido excesivo',
    'Falla eléctrica',
    'Otro',
  ],
  VENTILATION: [
    'Turbina / Extractor no enciende',
    'Correa rota o floja (chillido)',
    'Vibración anormal o desbalanceo',
    'Bajo caudal de extracción de aire',
    'Motor recalentado / olor a bobinado',
    'Persianas de gravedad trabadas',
    'Otro',
  ],
  OTHER: [
    'Falla operativa general',
    'No enciende / Corte eléctrico',
    'Ruido excesivo o anómalo',
    'Pérdida de fluidos',
    'Rotura mecánica',
    'Mantenimiento preventivo',
    'Otro',
  ],
};

export const ALL_DEFAULT_REASONS = Array.from(
  new Set(Object.values(REASONS_BY_EQUIPMENT_TYPE).flat())
);

export function getReasonsForEquipment(equipmentType?: EquipmentType | string | null): string[] {
  if (equipmentType && equipmentType in REASONS_BY_EQUIPMENT_TYPE) {
    return REASONS_BY_EQUIPMENT_TYPE[equipmentType as EquipmentType];
  }
  return ALL_DEFAULT_REASONS;
}
