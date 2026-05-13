'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    // Supabase client automatically handles access_token in the fragment (#)
    // We just need to check if we have a session now
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session) {
        // If we have a session, we redirect to set-password
        router.push('/login/set-password');
      } else {
        // If no session, maybe it's the server-side flow with token_hash in query params
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        
        if (token_hash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });
          
          if (!verifyError) {
            router.push('/login/set-password');
            return;
          }
        }
        
        // If everything fails, go to login
        router.push('/login?error=confirmation-failed');
      }
    };

    checkSession();
  }, [supabase, router, searchParams]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Confirmando acceso...</p>
      </div>
    </div>
  );
}
