import * as XLSX from 'xlsx';
import { t } from './translations';

export function exportDispenserToExcel(dispenser: any) {
  const wb = XLSX.utils.book_new();

  // 1. Info General
  const infoData = [
    ['ID Dispenser', dispenser.id],
    ['Marca', dispenser.marca],
    ['Modelo', dispenser.modelo],
    ['N° Serie', dispenser.numeroSerie || ''],
    ['Estado', t(dispenser.status)],
    ['Ubicación Actual', dispenser.location ? `${dispenser.location.plant?.nombre} - ${dispenser.location.nombre}` : 'Sin Asignar'],
    ['Vida Útil (meses)', dispenser.lifecycleMonths],
    ['Fecha Compra', dispenser.fechaCompra ? new Date(dispenser.fechaCompra).toLocaleDateString('es-AR') : ''],
    ['Notas', dispenser.notas || ''],
  ];
  const infoWs = XLSX.utils.aoa_to_sheet(infoData);
  XLSX.utils.book_append_sheet(wb, infoWs, 'Info General');

  // 2. Historial de Ubicaciones
  if (dispenser.locationHistory && dispenser.locationHistory.length > 0) {
    const locData = dispenser.locationHistory.map((h: any) => ({
      'Planta': h.location?.plant?.nombre || '',
      'Ubicación': h.location?.nombre || h.locationId,
      'Asignado el': new Date(h.assignedAt).toLocaleDateString('es-AR'),
      'Asignado por': h.assignedBy?.nombre || '',
      'Retirado el': h.removedAt ? new Date(h.removedAt).toLocaleDateString('es-AR') : 'Actual',
    }));
    const locWs = XLSX.utils.json_to_sheet(locData);
    XLSX.utils.book_append_sheet(wb, locWs, 'Ubicaciones');
  }

  // 3. Reparaciones
  if (dispenser.repairHistory && dispenser.repairHistory.length > 0) {
    const repData = dispenser.repairHistory.map((r: any) => ({
      'Fecha Inicio': new Date(r.startDate).toLocaleDateString('es-AR'),
      'Fecha Fin': r.endDate ? new Date(r.endDate).toLocaleDateString('es-AR') : 'En Curso',
      'Descripción': r.descripcion,
      'Diagnóstico': r.diagnostico || '',
      'Técnico': r.technician?.nombre || '',
      'Costo': r.costo || 0,
    }));
    const repWs = XLSX.utils.json_to_sheet(repData);
    XLSX.utils.book_append_sheet(wb, repWs, 'Reparaciones');
  }

  // 4. Consumibles
  if (dispenser.consumableHistory && dispenser.consumableHistory.length > 0) {
    const consData = dispenser.consumableHistory.map((c: any) => ({
      'Material': c.nombre,
      'Código': c.materialCode,
      'Instalado el': new Date(c.installedAt).toLocaleDateString('es-AR'),
      'Vencimiento': c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('es-AR') : '',
    }));
    const consWs = XLSX.utils.json_to_sheet(consData);
    XLSX.utils.book_append_sheet(wb, consWs, 'Consumibles');
  }

  XLSX.writeFile(wb, `Dispenser_${dispenser.id}.xlsx`);
}
