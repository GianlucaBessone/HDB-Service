'use client';

import { useState } from 'react';
import { Lock, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForcePasswordChangeModal() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cambiar la contraseña');
      }

      toast.success('Contraseña actualizada correctamente');
      window.location.reload(); // Reload to clear the modal and update session
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay z-[100]">
      <div className="modal-content max-w-md">
        <div className="p-8 text-center border-b border-border bg-muted/30">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Actualizar contraseña</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Por seguridad, debes cambiar tu contraseña temporal antes de continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold flex items-center gap-2">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="input pr-10 h-12"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold flex items-center gap-2">
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="input pr-10 h-12"
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-2xs text-muted-foreground leading-relaxed">
              Usa una combinación de letras, números y símbolos para una mayor seguridad. 
              No compartas tu contraseña con nadie.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 btn-primary flex items-center justify-center gap-2 text-base font-bold"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Guardar y Continuar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
