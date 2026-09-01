/**
 * Cliente Supabase único de KAVI (NFR-5, NFR-7).
 * - Nativo: sesión persistida en expo-secure-store (Keychain / Keystore).
 * - Web: storage por defecto del SDK (localStorage) y detección de sesión en URL
 *   para los enlaces de recuperación de contraseña.
 * Solo `src/services/*` debe importar este módulo (NFR-6).
 */
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

// Expo inyecta EXPO_PUBLIC_* en build; deben leerse con notación de punto.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL y/o EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y completa los valores del proyecto Supabase.',
  );
}

/** Adapter de storage para @supabase/auth-js sobre expo-secure-store. */
const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const isWeb = Platform.OS === 'web';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(isWeb ? {} : { storage: secureStoreAdapter }),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
});

// En nativo, refrescar el token solo mientras la app está en primer plano
// (recomendación oficial de Supabase para React Native).
if (!isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
