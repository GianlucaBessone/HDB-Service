'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileSpreadsheet, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function MaintenanceReportsPage() {
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  
  const [locationsData, setLocationsData] = useState<any[]>([]);
  const [clientsData, setClientsData] = useState<any[]>([]);
  
  const [clientId, setClientId] = useState('');
  const [plantId, setPlantId] = useState('');
  const [sectorId, setSectorId] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [matrixMonths, setMatrixMonths] = useState<string[]>([]);

  // For cascading dropdowns
  const selectedClient = clientsData.find(c => c.id === clientId);
  const availablePlants = locationsData.filter(p => !clientId || p.clientId === clientId);
  const selectedPlant = availablePlants.find(p => p.id === plantId);
  const availableSectors = selectedPlant?.sectors || [];

  useEffect(() => {
    // Basic defaults
    const now = new Date();
    const currentStr = now.toISOString().slice(0, 7);
    const pastStr = new Date(now.setMonth(now.getMonth() - 6)).toISOString().slice(0, 7);
    setStartMonth(pastStr);
    setEndMonth(currentStr);

    fetch('/api/locations')
      .then(res => res.json())
      .then(data => setLocationsData(data))
      .catch(() => toast.error('Error al cargar plantas'));

    fetch('/api/clients')
      .then(res => res.json())
      .then(data => setClientsData(data))
      .catch(() => console.error('No clients endpoint or error'));
  }, []);

  const handleGenerate = async () => {
    if (!startMonth || !endMonth) return toast.error('Seleccione un rango de meses');
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      if (startMonth) params.set('startMonth', startMonth);
      if (endMonth) params.set('endMonth', endMonth);
      if (clientId) params.set('clientId', clientId);
      if (plantId) params.set('plantId', plantId);
      if (sectorId) params.set('sectorId', sectorId);

      const res = await fetch(`/api/maintenance/reports?${params}`);
      if (!res.ok) throw new Error('Error al cargar reporte');
      const schedules = await res.json();

      // Pivot Data
      // 1. Determine all unique months in the range
      const monthsSet = new Set<string>();
      schedules.forEach((s: any) => monthsSet.add(s.scheduledMonth));
      
      // If no schedules, at least generate columns from start to end (simple string range not fully perfect, but good enough if data exists)
      const sortedMonths = Array.from(monthsSet).sort();
      setMatrixMonths(sortedMonths);

      // 2. Group by Dispenser
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
      if (dispenserMap.size === 0) {
        toast('No se encontraron registros para los filtros seleccionados', { icon: 'ℹ️' });
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
        'Estado Máquina': row.status,
      };

      matrixMonths.forEach(m => {
        baseRow[m] = row.months[m] || 'SIN PLANIFICAR';
      });

      return baseRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mantenimientos');
    
    XLSX.writeFile(workbook, `Reporte_Mantenimiento_${startMonth}_a_${endMonth}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Filter className="w-7 h-7 text-primary" />
          </div>
          Reportes de Mantenimiento
        </h1>
        <p className="text-muted-foreground mt-1">Análisis matricial y cumplimiento de SLAs</p>
      </div>

      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          
          <div>
            <label className="label">Desde Mes</label>
            <input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} className="input" />
          </div>
          
          <div>
            <label className="label">Hasta Mes</label>
            <input type="month" value={endMonth} onChange={e => setEndMonth(e.target.value)} className="input" />
          </div>

          <div>
            <label className="label">Cliente (Opcional)</label>
            <select value={clientId} onChange={e => { setClientId(e.target.value); setPlantId(''); setSectorId(''); }} className="select">
              <option value="">Todos</option>
              {clientsData.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Planta (Opcional)</label>
            <select value={plantId} onChange={e => { setPlantId(e.target.value); setSectorId(''); }} className="select" disabled={availablePlants.length === 0}>
              <option value="">Todas</option>
              {availablePlants.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          <button onClick={handleGenerate} disabled={isLoading} className="btn-primary gap-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Generar
          </button>
        </div>
      </div>

      {reportData.length > 0 && (
        <div className="glass-card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
            <h2 className="font-semibold text-lg">Resultados del Reporte ({reportData.length} dispensers)</h2>
            <button onClick={handleExportExcel} className="btn-outline btn-sm gap-2 bg-background">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Exportar a Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">ID Dispenser</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Planta / Ubicación</th>
                  {matrixMonths.map(m => (
                    <th key={m} className="px-4 py-3 text-center border-l border-border">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, i) => (
                  <tr key={row.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{row.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.client}</td>
                    <td className="px-4 py-3 text-xs">
                      {row.plant} <br/> <span className="text-muted-foreground">{row.location}</span>
                    </td>
                    {matrixMonths.map(m => {
                      const status = row.months[m];
                      return (
                        <td key={m} className="px-4 py-3 text-center border-l border-border/50">
                          {status ? (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                              status === 'SIGNED' ? 'bg-blue-100 text-blue-700' :
                              status === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                              status === 'OVERDUE' ? 'bg-amber-100 text-amber-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {status}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
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
