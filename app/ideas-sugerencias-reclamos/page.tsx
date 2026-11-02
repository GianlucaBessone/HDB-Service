'use client';

import { useState } from 'react';
import { Lightbulb, AlertTriangle, ShieldAlert, TrendingDown, Award, HelpCircle, Lock, Mail, Loader2, CheckCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { submitSugerencia } from './actions';
import PageHeader from '@/components/ui/PageHeader';

export default function IdeasSugerenciasReclamos() {
  const [presentacion, setPresentacion] = useState<'ANONIMA' | 'IDENTIFICADA'>('ANONIMA');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set('presentacion', presentacion);

    const result = await submitSugerencia(formData);

    if (result.success) {
      toast.success('Registro enviado exitosamente');
      setSubmitted(true);
    } else {
      toast.error(result.error || 'Ocurrió un error al enviar');
    }

    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center px-4 py-10">
        <div className="glass-card w-full max-w-md p-6 text-center sm:p-8">
          <CheckCircle className="mx-auto mb-4 h-8 w-8 text-success" />
          <h2 className="mb-1 text-lg font-semibold text-foreground">Registro enviado</h2>
          <p className="mb-6 text-sm text-muted-foreground">Gracias por tu aporte. El equipo lo evaluará como parte de la mejora continua.</p>
          <button onClick={() => setSubmitted(false)} className="btn-primary w-full">
            Enviar otro registro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-0 py-2 sm:py-4">
      <div>
        <PageHeader
          className="mb-6"
          title="Ideas, sugerencias y reclamos"
          description="Tu opinión aporta a la mejora continua. Completá el formulario; podés hacerlo de forma anónima."
        />

        <form onSubmit={handleSubmit} className="glass-card space-y-8 p-4 sm:p-6 md:p-8">
          
          {/* SECCIÓN: Modalidad de Presentación */}
          <section className="space-y-4">
            <h3 className="border-b border-border pb-2 text-[15px] font-semibold text-foreground">Modalidad de presentación</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={`cursor-pointer flex flex-col gap-1.5 rounded-md border p-4 transition-colors ${presentacion === 'ANONIMA' ? 'border-primary bg-primary/[0.05]' : 'border-border bg-card hover:bg-accent'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="modalidad" className="sr-only" checked={presentacion === 'ANONIMA'} onChange={() => setPresentacion('ANONIMA')} />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${presentacion === 'ANONIMA' ? 'border-primary' : 'border-muted-foreground'}`}>
                    {presentacion === 'ANONIMA' && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <span className="font-semibold text-foreground">Anónima</span>
                </div>
                <p className="pl-7 text-[13px] text-muted-foreground">No se registrará tu identidad. Ideal para reportes confidenciales.</p>
              </label>

              <label className={`cursor-pointer flex flex-col gap-1.5 rounded-md border p-4 transition-colors ${presentacion === 'IDENTIFICADA' ? 'border-primary bg-primary/[0.05]' : 'border-border bg-card hover:bg-accent'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="modalidad" className="sr-only" checked={presentacion === 'IDENTIFICADA'} onChange={() => setPresentacion('IDENTIFICADA')} />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${presentacion === 'IDENTIFICADA' ? 'border-primary' : 'border-muted-foreground'}`}>
                    {presentacion === 'IDENTIFICADA' && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <span className="font-semibold text-foreground">Identificada</span>
                </div>
                <p className="pl-7 text-[13px] text-muted-foreground">Permite hacer seguimiento del caso y recibir notificaciones de estado.</p>
              </label>
            </div>

            {presentacion === 'IDENTIFICADA' && (
              <div className="mt-4 space-y-4 rounded-md border border-border bg-muted/40 p-4 animate-fade-in">
                <div className="flex items-start gap-2.5 text-[13px] text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Para evitar suplantación de identidad, ingresá tus credenciales del sistema.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="label">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <input type="email" name="email" required className="input pl-9" placeholder="usuario@empresa.com" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="label">Contraseña</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <input type="password" name="password" required className="input pl-9" placeholder="••••••••" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECCIÓN: Detalles */}
          <section className="space-y-5">
            <h3 className="border-b border-border pb-2 text-[15px] font-semibold text-foreground">Detalles del registro</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="label">Tipo de registro <span className="text-destructive">*</span></label>
                <select name="tipo_registro" required className="select">
                  <option value="">Seleccionar…</option>
                  <option value="IDEA">Idea de mejora</option>
                  <option value="SUGERENCIA">Sugerencia</option>
                  <option value="RECLAMO">Reclamo</option>
                  <option value="SEGURIDAD">Observación de seguridad</option>
                  <option value="AHORRO">Oportunidad de ahorro</option>
                  <option value="RECONOCIMIENTO">Reconocimiento a un compañero</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="label">Área involucrada <span className="text-destructive">*</span></label>
                <select name="area_involucrada" required className="select">
                  <option value="">Seleccionar…</option>
                  <option value="PRODUCCION">Producción</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                  <option value="CALIDAD">Calidad</option>
                  <option value="SEGURIDAD">Seguridad e higiene</option>
                  <option value="LOGISTICA">Logística</option>
                  <option value="COMPRAS">Compras</option>
                  <option value="ADMINISTRACION">Administración</option>
                  <option value="SISTEMAS">Sistemas</option>
                  <option value="RRHH">Recursos humanos</option>
                  <option value="DIRECCION">Dirección</option>
                  <option value="OTRA">Otra</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="label">Título <span className="text-destructive">*</span></label>
              <input type="text" name="titulo" maxLength={150} required className="input" placeholder="Resumen del asunto (máx. 150 caracteres)" />
            </div>

            <div className="space-y-1.5">
              <label className="label">Descripción <span className="text-destructive">*</span></label>
              <textarea name="descripcion" required className="textarea min-h-[120px]" placeholder="Situación observada, problema u oportunidad…"></textarea>
            </div>
          </section>

          {/* SECCIÓN: Impacto y Solución */}
          <section className="space-y-5">
            <h3 className="border-b border-border pb-2 text-[15px] font-semibold text-foreground">Impacto y frecuencia</h3>

            <div className="space-y-2">
              <label className="label">Beneficios esperados (múltiple elección)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {[
                  { id: 'Mayor seguridad', label: 'Mayor seguridad' },
                  { id: 'Mejor calidad', label: 'Mejor calidad' },
                  { id: 'Menor costo', label: 'Menor costo' },
                  { id: 'Menor tiempo', label: 'Menor tiempo ejecución' },
                  { id: 'Mayor productividad', label: 'Mayor productividad' },
                  { id: 'Mejor ambiente', label: 'Mejor ambiente laboral' },
                  { id: 'Satisfacción cliente', label: 'Satisfacción cliente' },
                  { id: 'Cumplimiento normativo', label: 'Cumpl. normativo' },
                  { id: 'Otro', label: 'Otro' },
                ].map((ben) => (
                  <label key={ben.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors">
                    <input type="checkbox" name="beneficios" value={ben.id} className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]" />
                    {ben.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="label">Impacto estimado <span className="text-destructive">*</span></label>
                <select name="impacto_estimado" required className="select">
                  <option value="">Seleccionar…</option>
                  <option value="BAJO">Bajo</option>
                  <option value="MEDIO">Medio</option>
                  <option value="ALTO">Alto</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="label">Frecuencia <span className="font-normal text-muted-foreground">(opcional)</span></label>
                <select name="frecuencia_problema" className="select">
                  <option value="">¿Con qué frecuencia ocurre?</option>
                  <option value="UNA_VEZ">Ocurrió una sola vez</option>
                  <option value="SEMANALMENTE">Semanalmente</option>
                  <option value="VARIAS_POR_SEMANA">Varias veces por semana</option>
                  <option value="DIARIAMENTE">Diariamente</option>
                  <option value="VARIAS_POR_DIA">Varias veces por día</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="label">Propuesta de solución <span className="font-normal text-muted-foreground">(opcional)</span></label>
              <textarea name="propuesta_solucion" className="textarea min-h-[80px]" placeholder="¿Cómo podría resolverse o mejorarse?"></textarea>
            </div>
          </section>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary btn-lg w-full md:w-auto"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
