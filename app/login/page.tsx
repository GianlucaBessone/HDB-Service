'use client';

import { useState, useEffect } from 'react';
import { createClient, isSupabaseConfigured } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import toast from 'react-hot-toast';

export default function LoginScreen() {
  const router = useRouter();
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isConfigured) return;

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          router.push('/');
        } else {
          await supabase.auth.signOut();
        }
      } else {
        await supabase.auth.signOut();
      }
    }
    checkSession();
  }, [supabase, router, isConfigured]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      toast.error('Configura las variables de Supabase en tu archivo .env.local para continuar.');
      return;
    }
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message || 'Error al iniciar sesión');
        setIsLoading(false);
      } else {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (res.ok) {
          const sessionData = await res.json();
          if (sessionData?.user) {
            toast.success('Sesión iniciada');
            router.push('/');
            router.refresh();
          } else {
            toast.error('Usuario inactivo o no autorizado');
            await supabase.auth.signOut();
            setIsLoading(false);
          }
        } else {
          toast.error('Error al verificar sesión');
          await supabase.auth.signOut();
          setIsLoading(false);
        }
      }
    } catch (err) {
      toast.error('Error de conexión');
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Iniciar sesión</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ingresá con el usuario provisto por tu administrador.
        </p>
      </div>

      {!isConfigured && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0 space-y-1.5">
            <p className="font-semibold text-foreground">Configuración de Supabase requerida</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Creá un archivo <code className="rounded bg-muted px-1 py-0.5">.env.local</code> con las credenciales:
            </p>
            <pre className="overflow-x-auto rounded-md border border-border bg-card p-2 text-2xs text-foreground">
NEXT_PUBLIC_SUPABASE_URL=&quot;https://[id].supabase.co&quot;{'\n'}NEXT_PUBLIC_SUPABASE_ANON_KEY=&quot;[clave-anon]&quot;
            </pre>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="label">Correo electrónico</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input h-11 pl-10 sm:h-10"
              placeholder="usuario@empresa.com"
              required
              autoComplete="email"
              inputMode="email"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="label">Contraseña</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input h-11 pl-10 pr-11 sm:h-10"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary h-11 w-full sm:h-10">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ingresar'}
        </button>
      </form>

      <p className="mt-8 text-xs text-muted-foreground">
        ¿Problemas para ingresar? Contactá al administrador de tu empresa.
      </p>
    </AuthLayout>
  );
}
