import { EquipmentType } from '@prisma/client';

export interface InspectionItem {
  id: string;
  label: string;
  category?: string;
  description?: string;
}

export interface MeasurementField {
  key: string;
  label: string;
  unit: string;
  placeholder: string;
  type: 'number' | 'select' | 'text';
  options?: { value: string; label: string }[];
  step?: string;
  min?: number;
  max?: number;
  criticalMin?: number;
  criticalMax?: number;
  helper?: string;
}

export const INSPECTION_POINTS_BY_TYPE: Record<EquipmentType, InspectionItem[]> = {
  AIR_CONDITIONER: [
    { id: 'limpieza_filtros', label: 'Limpieza y desinfección de filtros de aire' },
    { id: 'limpieza_serpentina_evap', label: 'Limpieza profunda de serpentina evaporadora' },
    { id: 'limpieza_condensadora', label: 'Desobstrucción y soplado de serpentina condensadora' },
    { id: 'control_drenaje', label: 'Verificación y purga de bandeja y manguera de drenaje' },
    { id: 'ajuste_bornes_electricos', label: 'Ajuste de bornes eléctricos, bornera y contactores' },
    { id: 'control_ventiladores', label: 'Inspección de balanceo y bujes de forzadores' },
    { id: 'control_fugas_gas', label: 'Detección de fugas en uniones flare y válvulas de servicio' },
    { id: 'control_aislacion_termica', label: 'Estado de aislación elastomérica (Armaflex)' },
  ],
  COLD_ROOM: [
    { id: 'hermeticidad_puertas', label: 'Control de burletes y hermeticidad de cierre de puerta' },
    { id: 'resistencia_marco_descongelamiento', label: 'Verificación de resistencia de marco y desescarche' },
    { id: 'bloqueo_hielo_evaporador', label: 'Comprobación de ausencia de hielo en aletas de evaporador' },
    { id: 'ventiladores_forzadores', label: 'Operatividad y rodamientos de ventiladores de evaporador' },
    { id: 'presostatos_alta_baja', label: 'Calibración y accionamiento de presostatos de alta/baja' },
    { id: 'visor_liquido_humedad', label: 'Revisión de visor de líquido (sin burbujas, indicador seco)' },
    { id: 'nivel_aceite_compresor', label: 'Comprobación de nivel y color de aceite en mirilla del cárter' },
    { id: 'valvula_expansion_sobrecalentamiento', label: 'Inspección de bulbo y aislación de válvula de expansión' },
    { id: 'controlador_digital_setpoint', label: 'Verificación de parámetros en controlador (Dixell/Full Gauge)' },
  ],
  DISPENSER: [
    { id: 'sanitizacion_reservorio', label: 'Sanitización profunda de reservorio y conductos' },
    { id: 'control_canillas_fugas', label: 'Control de estanqueidad y goteo de canillas' },
    { id: 'revision_filtros', label: 'Control de saturación y vida útil de filtros' },
    { id: 'limpieza_rejilla_condensador', label: 'Limpieza de rejilla condensadora trasera' },
    { id: 'corte_termostato_frio', label: 'Comprobación de corte de termostato de frío' },
    { id: 'corte_termostato_calor', label: 'Comprobación de corte de termostato de calor' },
    { id: 'puesta_a_tierra', label: 'Verificación de puesta a tierra y enchufe eléctrico' },
  ],
  REFRIGERATOR: [
    { id: 'limpieza_condensador', label: 'Limpieza de serpentina condensadora inferior/trasera' },
    { id: 'control_burletes_cierre', label: 'Estado y fijación de burletes magnéticos de puerta' },
    { id: 'ventilador_forzador', label: 'Comprobación de forzador y circulación de aire interno' },
    { id: 'desescarche_automatico', label: 'Revisión de ciclo de descongelamiento automático' },
    { id: 'iluminacion_interna', label: 'Estado de iluminación interna y micro-interruptor' },
  ],
  VENTILATION: [
    { id: 'tension_correas', label: 'Tensión, desgaste y alineación de correas trapezoidales' },
    { id: 'engrase_rodamientos', label: 'Lubricación/engrase de chumaceras y rodamientos' },
    { id: 'balanceo_alabes', label: 'Limpieza y balanceo dinámico de álabes/turbina' },
    { id: 'ajuste_soporteria', label: 'Ajuste de bulonería y tacos antivibratorios' },
    { id: 'compuertas_flujo', label: 'Operatividad de persianas/dampers de gravedad y retorno' },
  ],
  OTHER: [
    { id: 'inspeccion_visual_gabinete', label: 'Inspección visual general, limpieza y estructura' },
    { id: 'verificacion_cableado', label: 'Ajuste de cables, fichas y conexiones eléctricas' },
    { id: 'ausencia_vibracion', label: 'Comprobación de niveles normales de ruido y vibración' },
    { id: 'prueba_operativa', label: 'Prueba de ciclo completo de funcionamiento' },
  ],
};

export const MEASUREMENT_FIELDS_BY_TYPE: Record<EquipmentType, MeasurementField[]> = {
  AIR_CONDITIONER: [
    { key: 'presionBajaPsi', label: 'Presión Succión (Baja)', unit: 'PSI', placeholder: '60 - 130', type: 'number', step: '0.5', helper: 'R410A: ~110-130 PSI | R22: ~60-70 PSI' },
    { key: 'presionAltaPsi', label: 'Presión Descarga (Alta)', unit: 'PSI', placeholder: '200 - 380', type: 'number', step: '1', helper: 'R410A: ~280-360 PSI | R22: ~200-240 PSI' },
    { key: 'corrienteCompresorA', label: 'Corriente Compresor', unit: 'A', placeholder: 'Ej. 5.4', type: 'number', step: '0.1' },
    { key: 'tempAmbienteC', label: 'Temp. Retorno / Ambiente', unit: '°C', placeholder: 'Ej. 24.0', type: 'number', step: '0.5' },
    { key: 'tempInyeccionC', label: 'Temp. Inyección / Salida', unit: '°C', placeholder: 'Ej. 11.5', type: 'number', step: '0.5' },
    { key: 'saltoTermicoC', label: 'Salto Térmico Diferencial', unit: '°C', placeholder: 'Calculado', type: 'number', step: '0.5', helper: 'Debe ser >= 10°C en modo frío' },
  ],
  COLD_ROOM: [
    { key: 'presionBajaPsi', label: 'Presión Succión (Baja)', unit: 'PSI', placeholder: 'Ej. 22', type: 'number', step: '0.5' },
    { key: 'presionAltaPsi', label: 'Presión Descarga (Alta)', unit: 'PSI', placeholder: 'Ej. 240', type: 'number', step: '1' },
    { key: 'tempCamaraC', label: 'Temp. Interior Cámara', unit: '°C', placeholder: 'Ej. -18.5', type: 'number', step: '0.1' },
    { key: 'tempEvaporadorC', label: 'Temp. Evaporador', unit: '°C', placeholder: 'Ej. -24.0', type: 'number', step: '0.1' },
    { key: 'corrienteCompresorA', label: 'Corriente Compresor', unit: 'A', placeholder: 'Ej. 14.2', type: 'number', step: '0.1' },
    { key: 'corrienteVentiladoresA', label: 'Corriente Ventiladores', unit: 'A', placeholder: 'Ej. 2.1', type: 'number', step: '0.1' },
    {
      key: 'estadoDesescarche',
      label: 'Ciclo de Desescarche',
      unit: '',
      placeholder: '',
      type: 'select',
      options: [
        { value: 'OK', label: 'Correcto / Automático' },
        { value: 'MANUAL_REALIZADO', label: 'Manual Forzado Realizado' },
        { value: 'FALLA_RESISTENCIA', label: 'Falla Resistencia / Drenaje' },
      ],
    },
    {
      key: 'nivelAceite',
      label: 'Nivel Aceite Compresor',
      unit: '',
      placeholder: '',
      type: 'select',
      options: [
        { value: 'NORMAL', label: 'Normal (1/2 a 3/4 mirilla)' },
        { value: 'BAJO', label: 'Bajo (< 1/3 mirilla) - Requiere relleno' },
        { value: 'EXCESIVO', label: 'Excesivo (> 3/4 mirilla)' },
        { value: 'DEGRADADO', label: 'Oscurecido / Ácido' },
      ],
    },
  ],
  DISPENSER: [
    { key: 'tempAguaFriaC', label: 'Temp. Agua Fría', unit: '°C', placeholder: '4 - 10', type: 'number', step: '0.5' },
    { key: 'tempAguaCalienteC', label: 'Temp. Agua Caliente', unit: '°C', placeholder: '80 - 92', type: 'number', step: '0.5' },
    { key: 'presionEntradaBar', label: 'Presión Red Agua', unit: 'bar', placeholder: '1.5 - 3.0', type: 'number', step: '0.1' },
    { key: 'tdsEntradaPpm', label: 'TDS Entrada', unit: 'ppm', placeholder: 'Ej. 240', type: 'number', step: '1' },
    { key: 'tdsSalidaPpm', label: 'TDS Filtrada', unit: 'ppm', placeholder: 'Ej. 45', type: 'number', step: '1' },
  ],
  REFRIGERATOR: [
    { key: 'tempGabineteC', label: 'Temp. Interior', unit: '°C', placeholder: '2 - 6', type: 'number', step: '0.5' },
    { key: 'presionBajaPsi', label: 'Presión Succión', unit: 'PSI', placeholder: 'Ej. 15', type: 'number', step: '0.5' },
    { key: 'corrienteCompresorA', label: 'Consumo Eléctrico', unit: 'A', placeholder: 'Ej. 1.8', type: 'number', step: '0.1' },
  ],
  VENTILATION: [
    { key: 'caudalM3h', label: 'Caudal de Aire Medido', unit: 'm³/h', placeholder: 'Ej. 3500', type: 'number', step: '50' },
    { key: 'velocidadRpm', label: 'Velocidad Turbina', unit: 'RPM', placeholder: 'Ej. 1400', type: 'number', step: '10' },
    { key: 'corrienteMotorA', label: 'Consumo Motor Eléctrico', unit: 'A', placeholder: 'Ej. 6.8', type: 'number', step: '0.1' },
  ],
  OTHER: [
    { key: 'tensionAlimentacionV', label: 'Tensión de Red', unit: 'V', placeholder: 'Ej. 220 / 380', type: 'number', step: '1' },
    { key: 'corrienteOperacionA', label: 'Corriente de Consumo', unit: 'A', placeholder: 'Ej. 4.5', type: 'number', step: '0.1' },
    { key: 'temperaturaOperacionC', label: 'Temperatura de Operación', unit: '°C', placeholder: 'Ej. 35', type: 'number', step: '0.5' },
  ],
};

export const COMMON_FAILURES_BY_TYPE: Record<EquipmentType, string[]> = {
  AIR_CONDITIONER: [
    'Falta de refrigerante / Fuga detectada',
    'Filtros de aire completamente saturados',
    'Gotea agua hacia el interior (drenaje obstruido)',
    'Capacitor de arranque desvalorizado / Compresor no arranca',
    'Serpentina evaporadora bloqueada de hielo',
    'Ruido excesivo o roce en turbina forzadora',
    'Falla en sensor de temperatura / Código de error en display',
    'Salta disyuntor o llave térmica de alimentación',
    'Aislación térmica de cañería deteriorada',
  ],
  COLD_ROOM: [
    'Bloqueo severo de hielo en evaporador',
    'Temperatura interior por encima de setpoint crítico',
    'Fuga de gas refrigerante en circuito / Caída de presión',
    'Disparo de presostato de baja por falta de gas o frío',
    'Disparo de presostato de alta por condensador sucio o ventilador parado',
    'Burletes rotos o deformados / Entrada continua de aire húmedo',
    'Falla en resistencia eléctrica de descongelamiento',
    'Nivel bajo de aceite en mirilla del cárter',
    'Contactor electromagnético quemado / Falla de fase trifásica',
  ],
  DISPENSER: [
    'Pérdida de agua en gabinete',
    'Filtro de sedimentos saturado',
    'Filtro de carbón vencido',
    'Canilla rota o con goteo continuo',
    'No enfría (compresor no arranca / falta gas)',
    'No calienta (resistencia o bimetal abierto)',
    'Ruido excesivo del compresor o ventilador',
    'Sabor u olor anómalo en agua dispensada',
    'Cable o ficha eléctrica con signos de sobrecalentamiento',
  ],
  REFRIGERATOR: [
    'No alcanza temperatura de corte de termostato',
    'Condensador tapado de suciedad y pelusa',
    'Forzador evaporador trabado o ruidoso',
    'Fuga de refrigerante en circuito sellado',
    'Burlete magnético desprendido / fuga de frío',
  ],
  VENTILATION: [
    'Correa trapezoidal rota, desgastada o destensada',
    'Chumaceras o rodamientos de motor con ruido y juego excesivo',
    'Turbina desbalanceada generando vibración estructural',
    'Consumo de corriente por encima de la placa de motor',
    'Persianas o compuertas de retorno trabadas',
  ],
  OTHER: [
    'Anomalía mecánica en partes móviles',
    'Falla en circuito eléctrico / cortocircuito',
    'Ruido o vibración fuera de tolerancia',
    'Pérdida de fluidos operativos',
    'Componente desgastado o dañado',
  ],
};
