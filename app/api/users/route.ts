import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/utils/supabase/admin';

export const revalidate = 300; // 5 min

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
        },
        plantAccess: {
          select: {
            plantId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    await revalidateTag('users', 'default');
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    await revalidateTag('users', 'default');
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireRole('ADMIN');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { email, nombre, apellido, role, clientId, plantIds, password } = body;

    if (!email || !nombre || !role || !password) {
      await revalidateTag('users', 'default');
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // 1. Check if user already exists in Prisma
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      await revalidateTag('users', 'default');
    return NextResponse.json({ error: 'El usuario ya existe' }, { status: 400 });
    }

    // 2. Create user in Supabase Auth directly with confirmed email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido, role }
    });

    if (authError) {
      console.error('Supabase Create User Error:', authError);
      await revalidateTag('users', 'default');
    return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 3. Create user in Prisma with hashed password and mustChangePassword: true
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        id: authData.user.id,
        email,
        passwordHash,
        nombre,
        apellido,
        role,
        clientId: clientId || null,
        mustChangePassword: true,
        plantAccess: {
          create: (plantIds || []).map((plantId: string) => ({
            plantId
          }))
        }
      }
    });

    await revalidateTag('users', 'default');
    return NextResponse.json(newUser);
  } catch (error: any) {
    console.error('Error creating user:', error);
    await revalidateTag('users', 'default');
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
