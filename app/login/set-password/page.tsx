'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import toast from 'react-hot-toast';

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sesión no encontrada o expirada');
        router.push('/login');
      }
    }
    checkSession();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast.error(error.message || 'Error al establecer la contraseña');
        setIsLoading(false);
      } else {
        toast.success('¡Contraseña establecida con éxito!');
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (err) {
      toast.error('Error de conexión');
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout>
        <div className="animate-fade-in">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <h1 className="mt-4 text-2xl font-semibold">Contraseña establecida</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Redirigiendo al panel…</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Establecer contraseña</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Creá una contraseña segura para tu cuenta.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="new-password" className="label">Nueva contraseña</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input h-11 pl-10 sm:h-10"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-password" className="label">Confirmar contraseña</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input h-11 pl-10 sm:h-10"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary h-11 w-full sm:h-10">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar contraseña'}
        </button>
      </form>
    </AuthLayout>
  );
}
