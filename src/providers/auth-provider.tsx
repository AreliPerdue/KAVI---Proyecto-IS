import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Estado de autenticación expuesto a toda la app (RF-A4, RF-A5).
 * Esqueleto (T006): la suscripción real a la sesión de Supabase se
 * implementa en T012 a través de `services/auth.ts`.
 */
export type AuthState = {
  session: Session | null;
  /** true mientras se restaura la sesión persistida al arrancar. */
  isLoading: boolean;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session] = useState<Session | null>(null);
  const [isLoading] = useState(false);

  const value = useMemo<AuthState>(() => ({ session, isLoading }), [session, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return ctx;
}
