import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/utils/supabase/admin';
import bcrypt from 'bcryptjs';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('ADMIN');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, apellido, role, clientId, password, active, plantIds } = body;
    
    // Prevent self-deactivation
    if (id === auth.id) {
      if (active === false) {
        await revalidateTag('users', 'default');
    return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta' }, { status: 400 });
      }
    }

    // 1. Get current user from Prisma
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      await revalidateTag('users', 'default');
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // 2. Update Prisma User
    const updateData: any = {
      nombre,
      apellido,
      role,
      clientId: clientId || null,
      active
    };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
      updateData.mustChangePassword = true;
    }

    // Handle plant access sync
    if (plantIds !== undefined) {
      updateData.plantAccess = {
        deleteMany: {},
        create: (plantIds || []).map((plantId: string) => ({
          plantId
        }))
      };
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });

    // 3. Sync with Supabase Auth
    let supabaseUserId: string | null = null;

    if (isUUID(id)) {
      supabaseUserId = id;
    } else {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError) {
        const found = users.find((u: any) => u.email === existingUser.email);
        if (found) supabaseUserId = found.id;
      }
    }

    if (supabaseUserId) {
      const supabaseUpdate: any = {
        user_metadata: { nombre, apellido, role }
      };

      if (password) {
        supabaseUpdate.password = password;
      }

      await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, supabaseUpdate);
    }

    await revalidateTag('users', 'default');
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    await revalidateTag('users', 'default');
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('ADMIN');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    // Prevent self-deletion
    if (id === auth.id) {
      await revalidateTag('users', 'default');
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (existingUser) {
      let supabaseUserId: string | null = null;
      
      if (isUUID(id)) {
        supabaseUserId = id;
      } else {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const found = users?.find((u: any) => u.email === existingUser.email);
        if (found) supabaseUserId = found.id;
      }

      if (supabaseUserId) {
        await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
      }
    }

    await prisma.user.delete({
      where: { id }
    });

    await revalidateTag('users', 'default');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    await revalidateTag('users', 'default');
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
