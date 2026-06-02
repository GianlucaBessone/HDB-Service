'use client';

import { useState } from 'react';
import { Lightbulb, AlertTriangle, ShieldAlert, TrendingDown, Award, HelpCircle, Lock, Mail, Loader2, CheckCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { submitSugerencia } from './actions';

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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-pulse-soft" />
        <div className="glass-card max-w-md w-full p-8 text-center z-10 relative">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-foreground mb-2">¡Gracias por tu aporte!</h2>
          <p className="text-muted-foreground mb-6">Tu registro ha sido enviado y será evaluado por nuestro equipo. Valoramos tu contribución a la mejora continua.</p>
          <button onClick={() => setSubmitted(false)} className="btn-primary w-full">
            Enviar otro registro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden py-12 px-4 sm:px-6">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-pulse-soft pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-cyan-500/10 blur-[150px] rounded-full mix-blend-multiply dark:mix-blend-screen pointer-events-none" />

      <div className="max-w-3xl mx-auto z-10 relative">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 text-white mb-6 shadow-lg shadow-primary/20 rotate-3 hover:rotate-0 transition-transform">
            <Lightbulb className="w-8 h-8 fill-white/20" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-3">
            Ideas, Sugerencias y Reclamos
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Tu opinión es fundamental para nuestra mejora continua. Completa el formulario y ayúdanos a crecer juntos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 md:p-10 space-y-8 border-t border-l border-white/20 dark:border-white/5 shadow-2xl">
          
          {/* SECCIÓN: Modalidad de Presentación */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
              <ShieldAlert className="w-5 h-5 text-primary" /> Modalidad de Presentación
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 flex flex-col gap-2 ${presentacion === 'ANONIMA' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="modalidad" className="hidden" checked={presentacion === 'ANONIMA'} onChange={() => setPresentacion('ANONIMA')} />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${presentacion === 'ANONIMA' ? 'border-primary' : 'border-muted-foreground'}`}>
                    {presentacion === 'ANONIMA' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                  </div>
                  <span className="font-semibold text-foreground">Anónima</span>
                </div>
                <p className="text-sm text-muted-foreground pl-8">No se registrará tu identidad. Ideal para reportes confidenciales.</p>
              </label>

              <label className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 flex flex-col gap-2 ${presentacion === 'IDENTIFICADA' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="modalidad" className="hidden" checked={presentacion === 'IDENTIFICADA'} onChange={() => setPresentacion('IDENTIFICADA')} />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${presentacion === 'IDENTIFICADA' ? 'border-primary' : 'border-muted-foreground'}`}>
                    {presentacion === 'IDENTIFICADA' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                  </div>
                  <span className="font-semibold text-foreground">Identificada</span>
                </div>
                <p className="text-sm text-muted-foreground pl-8">Permite hacer seguimiento del caso y recibir notificaciones de estado.</p>
              </label>
            </div>

            {presentacion === 'IDENTIFICADA' && (
              <div className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border animate-fade-in space-y-4">
                <div className="flex items-start gap-3 mb-4 text-sm text-muted-foreground bg-primary/10 text-primary p-3 rounded-md">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>Para evitar suplantación de identidad, por favor ingresa tus credenciales del sistema.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <input type="email" name="email" required className="input pl-9" placeholder="usuario@empresa.com" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Contraseña</label>
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
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
              <AlertTriangle className="w-5 h-5 text-primary" /> Detalles del Registro
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Tipo de Registro <span className="text-destructive">*</span></label>
                <select name="tipo_registro" required className="select">
                  <option value="">Seleccione una opción</option>
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
                <label className="text-sm font-medium text-foreground">Área Involucrada <span className="text-destructive">*</span></label>
                <select name="area_involucrada" required className="select">
                  <option value="">Seleccione una opción</option>
                  <option value="PRODUCCION">Producción</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                  <option value="CALIDAD">Calidad</option>
                  <option value="SEGURIDAD">Seguridad e Higiene</option>
                  <option value="LOGISTICA">Logística</option>
                  <option value="COMPRAS">Compras</option>
                  <option value="ADMINISTRACION">Administración</option>
                  <option value="SISTEMAS">Sistemas</option>
                  <option value="RRHH">Recursos Humanos</option>
                  <option value="DIRECCION">Dirección</option>
                  <option value="OTRA">Otra</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Título <span className="text-destructive">*</span></label>
              <input type="text" name="titulo" maxLength={150} required className="input" placeholder="Breve descripción del asunto (máx 150 caract.)" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Descripción <span className="text-destructive">*</span></label>
              <textarea name="descripcion" required className="textarea min-h-[120px]" placeholder="Detalla la situación observada, problema u oportunidad..."></textarea>
            </div>
          </section>

          {/* SECCIÓN: Impacto y Solución */}
          <section className="space-y-5">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
              <TrendingDown className="w-5 h-5 text-primary" /> Impacto y Frecuencia
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Beneficios Esperados (Múltiple elección)</label>
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
                    <input type="checkbox" name="beneficios" value={ben.id} className="rounded border-input text-primary focus:ring-primary" />
                    {ben.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Impacto Estimado <span className="text-destructive">*</span></label>
                <select name="impacto_estimado" required className="select">
                  <option value="">Seleccione una opción</option>
                  <option value="BAJO">Bajo</option>
                  <option value="MEDIO">Medio</option>
                  <option value="ALTO">Alto</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">Frecuencia <span className="text-xs text-muted-foreground font-normal">(Opcional)</span></label>
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
              <label className="text-sm font-medium text-foreground flex items-center gap-1">Propuesta de Solución <span className="text-xs text-muted-foreground font-normal">(Opcional)</span></label>
              <textarea name="propuesta_solucion" className="textarea min-h-[80px]" placeholder="¿Cómo considera que podría resolverse o mejorarse?"></textarea>
            </div>
          </section>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto min-w-[200px] h-12 btn-primary shadow-lg shadow-primary/25 relative overflow-hidden group text-base"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Enviar Registro
                </span>
              )}
              <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
