import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getSession, onAuthStateChange } from '@/services/auth';
import type { AuthUser } from '@/types/domain';

/**
 * Estado de autenticación de toda la app (RF-A4, RF-A5): restaura la sesión
 * persistida al arrancar y se mantiene sincronizado con el backend activo.
 */
export type AuthState = {
  user: AuthUser | null;
  userId: string | null;
  /** true mientras se restaura la sesión persistida al arrancar. */
  isLoading: boolean;
  /**
   * true entre verificar el código del alta y fijar la contraseña (RF-A8).
   * Verificar el OTP ya abre sesión, así que sin esta bandera el guard entraría
   * a la app y la persona nunca vería el último paso.
   */
  signUpPending: boolean;
  setSignUpPending: (pending: boolean) => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signUpPending, setSignUpPending] = useState(false);

  useEffect(() => {
    let active = true;

    getSession()
      .then((restored) => {
        if (active) setUser(restored);
      })
      .catch(() => {
        // Sin sesión válida (o sin red): la app arranca en login.
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const unsubscribe = onAuthStateChange((next) => {
      if (active) setUser(next);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, userId: user?.id ?? null, isLoading, signUpPending, setSignUpPending }),
    [user, isLoading, signUpPending],
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
