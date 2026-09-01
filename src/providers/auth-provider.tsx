import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getSession, onAuthStateChange } from '@/services/auth';

/**
 * Estado de autenticación de toda la app (RF-A4, RF-A5): restaura la sesión
 * persistida al arrancar y se mantiene sincronizado con Supabase Auth
 * (auto-refresh incluido, configurado en lib/supabase.ts).
 */
export type AuthState = {
  session: Session | null;
  /** true mientras se restaura la sesión persistida al arrancar. */
  isLoading: boolean;
  userId: string | null;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getSession()
      .then((restored) => {
        if (active) setSession(restored);
      })
      .catch(() => {
        // Sin sesión válida (o sin red): la app arranca en login.
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const unsubscribe = onAuthStateChange((next) => {
      if (active) setSession(next);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({ session, isLoading, userId: session?.user.id ?? null }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return ctx;
}
