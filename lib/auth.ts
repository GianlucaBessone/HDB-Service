import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { hasPermission, Permission } from './rbac';
import { createClient } from '@/utils/supabase/server';
import { prisma } from './prisma';

export type SessionUser = {
  id: string;
  email: string;
  nombre: string;
  role: UserRole;
  clientId: string | null;
};

/**
 * Get the current user from Supabase Auth and map to Prisma User.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: authUser.email },
  });

  if (!user || !user.active) return null;

  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    role: user.role,
    clientId: user.clientId,
  };
}

/**
 * Get the current authenticated session.
 * For compatibility with existing codebase that expects { user: ... }
 */
export async function getSession() {
  const user = await getCurrentUser();
  if (!user) return null;
  return { user };
}

/**
 * Require authentication. Returns 401 if not authenticated.
 */
export async function requireAuth(): Promise<SessionUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  return user;
}

/**
 * Require specific roles. Returns 403 if insufficient permissions.
 */
export async function requireRole(
  ...roles: UserRole[]
): Promise<SessionUser | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;

  if (!roles.includes(result.role)) {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
  }
  return result;
}

/**
 * Require specific permission. Returns 403 if insufficient.
 */
export async function requirePermission(
  permission: Permission
): Promise<SessionUser | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;

  if (!hasPermission(result.role, permission)) {
    return NextResponse.json({ error: 'Permiso denegado' }, { status: 403 });
  }
  return result;
}

/**
 * Check if the current user can access data for a specific client.
 * Client users can only see their own client's data.
 */
export function canAccessClient(user: SessionUser, clientId: string): boolean {
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR' || user.role === 'TECHNICIAN') {
    return true;
  }
  return user.clientId === clientId;
}
