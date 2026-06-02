'use server';

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

// A temporary supabase client just to verify credentials without setting cookies
const getAuthClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
};

export async function submitSugerencia(formData: FormData) {
  try {
    const presentacion = formData.get('presentacion') as 'ANONIMA' | 'IDENTIFICADA';
    
    let usuario_id = null;
    
    if (presentacion === 'IDENTIFICADA') {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      
      if (!email || !password) {
        return { success: false, error: 'Email y contraseña son requeridos para presentación identificada.' };
      }
      
      const authClient = getAuthClient();
      const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError || !authData.user) {
        return { success: false, error: 'Credenciales inválidas.' };
      }
      
      // Buscar el usuario en Prisma
      const user = await prisma.user.findUnique({
        where: { email },
      });
      
      if (!user) {
        return { success: false, error: 'Usuario no encontrado en la base de datos.' };
      }
      
      usuario_id = user.id;
    }

    const sugerencia = await prisma.sugerencia.create({
      data: {
        tipo_registro: formData.get('tipo_registro') as any,
        titulo: formData.get('titulo') as string,
        descripcion: formData.get('descripcion') as string,
        area_involucrada: formData.get('area_involucrada') as any,
        beneficios: formData.getAll('beneficios') as string[],
        impacto_estimado: formData.get('impacto_estimado') as any,
        propuesta_solucion: formData.get('propuesta_solucion') as string || null,
        frecuencia_problema: (formData.get('frecuencia_problema') as any) || null,
        presentacion,
        usuario_id,
        estado: 'PENDIENTE',
        // archivos_adjuntos: handled separately or in next phase, leaving empty array for now
        archivos_adjuntos: [],
      },
    });

    return { success: true, sugerenciaId: sugerencia.id };
  } catch (error: any) {
    console.error('Error submitting sugerencia:', error);
    return { success: false, error: 'Ocurrió un error al enviar el formulario.' };
  }
}
