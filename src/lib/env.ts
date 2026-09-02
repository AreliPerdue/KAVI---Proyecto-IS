/**
 * Variables de entorno (Expo las inyecta en build; leer siempre con notación de punto).
 * Modo demo: sin backend, datos en memoria. Se activa con EXPO_PUBLIC_DEMO_MODE=true
 * o automáticamente si faltan las credenciales de Supabase.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const demoFlag = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
/** Solo para desarrollo/capturas: arranca con la cuenta demo ya autenticada. */
const demoAutologin = process.env.EXPO_PUBLIC_DEMO_AUTOLOGIN === 'true';
/** Solo desarrollo/capturas: ruta inicial tras el autologin (p. ej. /shared). */
const demoStartPath = process.env.EXPO_PUBLIC_DEMO_START ?? '';

const hasCredentials =
  supabaseUrl.startsWith('http') && !supabaseUrl.includes('TU-PROYECTO') && supabaseAnonKey.length > 20;

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  isDemoMode: demoFlag || !hasCredentials,
  demoAutologin,
  demoStartPath,
} as const;
