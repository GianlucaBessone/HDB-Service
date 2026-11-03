'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileSpreadsheet, Search, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { t, getStatusColor } from '@/lib/translations';
import Link from 'next/link';
import { Wrench, FileText, FileSignature } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';

export default function MaintenanceReportsPage() {
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  
  const [plantsData, setPlantsData] = useState<any[]>([]);
  const [clientsData, setClientsData] = useState<any[]>([]);
  const [sectorsData, setSectorsData] = useState<any[]>([]);
  
  const [clientId, setClientId] = useState('');
  const [plantId, setPlantId] = useState('');
  const [sectorId, setSectorId] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [matrixMonths, setMatrixMonths] = useState<string[]>([]);

  // Cascading logic
  const availablePlants = (Array.isArray(plantsData) ? plantsData : []).filter(p => !clientId || p.clientId === clientId);

  useEffect(() => {
    // Set default month range (last 6 months)
    const now = new Date();
    const currentStr = now.toISOString().slice(0, 7);
    const past = new Date();
    past.setMonth(now.getMonth() - 5);
    const pastStr = past.toISOString().slice(0, 7);
    
    setStartMonth(pastStr);
    setEndMonth(currentStr);

    // Initial data load
    fetch('/api/plants')
      .then(res => res.ok ? res.json() : [])
      .then(data => setPlantsData(Array.isArray(data) ? data : []))
      .catch(() => setPlantsData([]));

    fetch('/api/clients')
      .then(res => res.ok ? res.json() : [])
      .then(data => setClientsData(Array.isArray(data) ? data : []))
      .catch(() => setClientsData([]));
  }, []);

  // Fetch sectors when plant changes
  useEffect(() => {
    if (plantId) {
      fetch(`/api/sectors?plantId=${plantId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setSectorsData(Array.isArray(data) ? data : []))
        .catch(() => setSectorsData([]));
    } else {
      setSectorsData([]);
      setSectorId('');
    }
  }, [plantId]);

  const handleGenerate = async () => {
    if (!startMonth || !endMonth) return toast.error('Seleccione un rango de meses');
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('startMonth', startMonth);
      params.set('endMonth', endMonth);
      if (clientId) params.set('clientId', clientId);
      if (plantId) params.set('plantId', plantId);
      if (sectorId) params.set('sectorId', sectorId);

      const res = await fetch(`/api/maintenance/reports?${params}`);
      if (!res.ok) throw new Error('Error al cargar reporte');
      const schedules = await res.json();

      // Matrix building logic
      const monthsSet = new Set<string>();
      schedules.forEach((s: any) => monthsSet.add(s.scheduledMonth));
      
      const sortedMonths = Array.from(monthsSet).sort();
      setMatrixMonths(sortedMonths);

      const dispenserMap = new Map<string, any>();

      schedules.forEach((s: any) => {
        const dId = s.dispenser.id;
        if (!dispenserMap.has(dId)) {
          dispenserMap.set(dId, {
            id: dId,
            equipmentType: s.dispenser.equipmentType || 'DISPENSER',
            client: s.dispenser.location?.plant?.client?.nombre || '-',
            plant: s.dispenser.location?.plant?.nombre || '-',
            sector: s.dispenser.location?.sector?.nombre || '-',
            location: s.dispenser.location?.nombre || '-',
            status: s.dispenser.status,
            months: {}
          });
        }
        const record = dispenserMap.get(dId);
        record.months[s.scheduledMonth] = s.status;
      });

      setReportData(Array.from(dispenserMap.values()));
      if (schedules.length === 0) {
        toast('No se encontraron registros', { icon: 'ℹ️' });
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;

    const dataToExport = reportData.map(row => {
      const baseRow: any = {
        'ID Equipo / Activo': row.id,
        'Tipo de Equipo': row.equipmentType === 'AIR_CONDITIONER' ? 'Aire Acondicionado' :
                          row.equipmentType === 'COLD_ROOM' ? 'Cámara Frigorífica' :
                          row.equipmentType === 'DISPENSER' ? 'Dispenser de Agua' :
                          row.equipmentType === 'REFRIGERATOR' ? 'Heladera Comercial' :
                          row.equipmentType === 'VENTILATION' ? 'Ventilación / Extracción' : 'Otro Equipo',
        'Cliente': row.client,
        'Planta': row.plant,
        'Sector': row.sector,
        'Ubicación': row.location,
        'Estado Equipo': t(row.status),
      };

      matrixMonths.forEach(m => {
        baseRow[m] = t(row.months[m] || 'SIN PLANIFICAR');
      });

      return baseRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mantenimientos');
    XLSX.writeFile(workbook, `Reporte_HDB_${startMonth}_a_${endMonth}.xlsx`);
  };

  const fieldCls = 'select';
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Matriz de mantenimiento"
        description="Cumplimiento y estado de la flota por período."
        actions={
          reportData.length > 0 && (
            <button onClick={handleExportExcel} className="btn-outline">
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel
            </button>
          )
        }
      />

      <nav className="tabs" aria-label="Secciones de mantenimiento">
        <Link href="/maintenance" className="tab"><Wrench className="h-4 w-4" /> Planificación</Link>
        <Link href="/maintenance/approvals" className="tab"><FileSignature className="h-4 w-4" /> Firmas</Link>
        <span className="tab-active" aria-current="page"><FileText className="h-4 w-4" /> Reportes</span>
      </nav>

      <div className="glass-card p-4">
        <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <label className="label mb-1.5">Desde</label>
            <input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label mb-1.5">Hasta</label>
            <input type="month" value={endMonth} onChange={e => setEndMonth(e.target.value)} className="input" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="label mb-1.5">Cliente</label>
            <select value={clientId} onChange={e => { setClientId(e.target.value); setPlantId(''); setSectorId(''); }} className={fieldCls}>
              <option value="">Todos los clientes</option>
              {clientsData.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label mb-1.5">Planta</label>
            <select value={plantId} onChange={e => { setPlantId(e.target.value); setSectorId(''); }} className={fieldCls} disabled={availablePlants.length === 0}>
              <option value="">Todas las plantas</option>
              {availablePlants.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label mb-1.5">Sector</label>
            <select value={sectorId} onChange={e => setSectorId(e.target.value)} className={fieldCls} disabled={sectorsData.length === 0}>
              <option value="">Todos los sectores</option>
              {sectorsData.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <button onClick={handleGenerate} disabled={isLoading} className="btn-primary col-span-2 md:col-span-1">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Generar reporte
          </button>
        </div>
      </div>

      {reportData.length > 0 ? (
        <div className="glass-card overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="panel-title">Reporte de flota</h2>
            <span className="text-xs text-muted-foreground tabular">{reportData.length} unidades</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-muted">Activo</th>
                  <th className="min-w-[180px]">Ubicación</th>
                  {matrixMonths.map(m => (
                    <th key={m} className="min-w-[110px] border-l border-border text-center">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row) => (
                  <tr key={row.id}>
                    <td className="sticky left-0 z-10 border-r border-border bg-card font-mono font-medium">{row.id}</td>
                    <td>
                      <div className="font-medium">{row.plant}</div>
                      <div className="text-xs text-muted-foreground">{row.sector} · {row.location}</div>
                    </td>
                    {matrixMonths.map(m => {
                      const status = row.months[m];
                      return (
                        <td key={m} className="border-l border-border text-center">
                          {status ? (
                            <span className={`badge ${getStatusColor(status)}`}>{t(status)}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !isLoading && (
          <EmptyState icon={FileText} title="Sin datos para mostrar" description="Elegí el período y los filtros, y generá el reporte." />
        )
      )}
    </div>
  );
}
