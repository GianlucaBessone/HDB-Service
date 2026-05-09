import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function GET() {
  const auth = await requireRole('ADMIN', 'SUPERVISOR');
  if (auth instanceof NextResponse) return auth;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        clientId: true,
        client: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireRole('ADMIN');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { email, nombre, apellido, role, clientId } = body;

    if (!email || !nombre || !role) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // 1. Check if user already exists in Prisma
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'El usuario ya existe' }, { status: 400 });
    }

    // 2. Invite user via Supabase Auth (This sends an email to the user)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { 
        data: { nombre, apellido, role },
        // redirectTo: `${new URL(request.url).origin}/auth/callback` // Optional: specify where to redirect after password set
      }
    );

    if (authError) {
      console.error('Supabase Invitation Error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 3. Create user in Prisma with a dummy/empty passwordHash 
    // because they will set their password via Supabase
    const newUser = await prisma.user.create({
      data: {
        id: authData.user.id,
        email,
        passwordHash: 'INVITED_VIA_SUPABASE', // Placeholder
        nombre,
        apellido,
        role,
        clientId: clientId || null,
      }
    });

    return NextResponse.json(newUser);
  } catch (error: any) {
    console.error('Error inviting user:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
