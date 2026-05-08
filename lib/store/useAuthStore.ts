import { create } from 'zustand';
import { UserRole } from '@prisma/client';

interface AuthState {
  userId: string | null;
  email: string | null;
  nombre: string | null;
  role: UserRole | null;
  clientId: string | null;
  isAuthenticated: boolean;
  setUser: (user: { id: string; email: string; nombre: string; role: UserRole; clientId: string | null }) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  nombre: null,
  role: null,
  clientId: null,
  isAuthenticated: false,
  setUser: (user) =>
    set({
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      clientId: user.clientId,
      isAuthenticated: true,
    }),
  clearUser: () =>
    set({
      userId: null,
      email: null,
      nombre: null,
      role: null,
      clientId: null,
      isAuthenticated: false,
    }),
}));
