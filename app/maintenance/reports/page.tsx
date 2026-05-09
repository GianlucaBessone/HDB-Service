'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileSpreadsheet, Search, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { t, getStatusColor } from '@/lib/translations';

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
  const availablePlants = plantsData.filter(p => !clientId || p.clientId === clientId);

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
      .then(res => res.json())
      .then(data => setPlantsData(data))
      .catch(() => toast.error('Error al cargar plantas'));

    fetch('/api/clients')
      .then(res => res.json())
      .then(data => setClientsData(data))
      .catch(() => console.error('Error al cargar clientes'));
  }, []);

  // Fetch sectors when plant changes
  useEffect(() => {
    if (plantId) {
      fetch(`/api/sectors?plantId=${plantId}`)
        .then(res => res.json())
        .then(data => setSectorsData(data))
        .catch(() => toast.error('Error al cargar sectores'));
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
        'Dispenser ID': row.id,
        'Cliente': row.client,
        'Planta': row.plant,
        'Sector': row.sector,
        'Ubicación': row.location,
        'Estado Máquina': t(row.status),
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

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <LayoutGrid className="w-8 h-8 text-primary" />
            Matriz de Mantenimiento
          </h1>
          <p className="text-muted-foreground mt-1">Reporte de cumplimiento y estado de flota por periodo.</p>
        </div>
      </div>

      <div className="glass-card p-6 bg-muted/20">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          
          <div className="lg:col-span-1">
            <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Desde</label>
            <input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          
          <div className="lg:col-span-1">
            <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Hasta</label>
            <input type="month" value={endMonth} onChange={e => setEndMonth(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          <div className="lg:col-span-1">
            <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Cliente</label>
            <select 
              value={clientId} 
              onChange={e => { setClientId(e.target.value); setPlantId(''); setSectorId(''); }} 
              className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Todos los Clientes</option>
              {clientsData.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div className="lg:col-span-1">
            <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Planta</label>
            <select 
              value={plantId} 
              onChange={e => { setPlantId(e.target.value); setSectorId(''); }} 
              className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              disabled={availablePlants.length === 0}
            >
              <option value="">Todas las Plantas</option>
              {availablePlants.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          <div className="lg:col-span-1">
            <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Sector</label>
            <select 
              value={sectorId} 
              onChange={e => setSectorId(e.target.value)} 
              className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              disabled={sectorsData.length === 0}
            >
              <option value="">Todos los Sectores</option>
              {sectorsData.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          <button onClick={handleGenerate} disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Filtrar
          </button>
        </div>
      </div>

      {reportData.length > 0 && (
        <div className="glass-card flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-4 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/30">
            <h2 className="font-bold text-lg">Reporte de Flota ({reportData.length} unidades)</h2>
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-semibold">
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold tracking-widest border-b border-border">
                  <th className="px-6 py-4 sticky left-0 bg-muted/50 z-10">Dispenser</th>
                  <th className="px-6 py-4">Ubicación</th>
                  {matrixMonths.map(m => (
                    <th key={m} className="px-4 py-4 text-center border-l border-border min-w-[120px]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reportData.map((row) => (
                  <tr key={row.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground sticky left-0 bg-background/80 backdrop-blur-sm z-10 border-r border-border/50">
                      {row.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-primary/80">{row.plant}</span>
                        <span className="text-xs text-muted-foreground">{row.sector} - {row.location}</span>
                      </div>
                    </td>
                    {matrixMonths.map(m => {
                      const status = row.months[m];
                      return (
                        <td key={m} className="px-4 py-4 text-center border-l border-border/50">
                          {status ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold ${getStatusColor(status)}`}>
                              {t(status)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/20 text-xs">—</span>
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
      )}
    </div>
  );
}
