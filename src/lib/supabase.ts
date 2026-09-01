/**
 * Cliente Supabase único de KAVI (NFR-5, NFR-7), creado de forma perezosa.
 * - Nativo: sesión persistida en expo-secure-store (Keychain / Keystore).
 * - Web: storage por defecto del SDK y detección de sesión en URL.
 * Solo `src/services/supabase/*` debe importar este módulo (NFR-6).
 * En modo demo (lib/env.ts) nunca se instancia.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { env } from '@/lib/env';

let client: SupabaseClient | null = null;

/** Carga expo-secure-store solo cuando hace falta (evita fallar si el binario nativo es viejo). */
function createSecureStoreAdapter() {
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
  return {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
}

export function getSupabase(): SupabaseClient {
  if (env.isDemoMode) {
    throw new Error('Modo demo activo: no hay backend configurado (revisa .env).');
  }
  if (client) return client;

  const isWeb = Platform.OS === 'web';
  client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      ...(isWeb ? {} : { storage: createSecureStoreAdapter() }),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: isWeb,
    },
  });

  if (!isWeb) {
    const created = client;
    AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void created.auth.startAutoRefresh();
      } else {
        void created.auth.stopAutoRefresh();
      }
    });
  }
  return client;
}
