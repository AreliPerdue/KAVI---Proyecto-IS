import { Platform } from 'react-native';

/** La web publicada de KAVI, donde viven las funciones de `api/` (Vercel). */
export const SITIO = 'https://kavi-proyecto-is.vercel.app';

/**
 * Dirección de una función de `api/`. En la web publicada es del mismo origen (la CSP solo permite
 * `'self'`); en el teléfono va con la dirección completa. En el servidor local de desarrollo no
 * existen: la llamada falla con un mensaje claro.
 */
export function apiUrl(nombre: string): string {
  return Platform.OS === 'web' ? `/api/${nombre}` : `${SITIO}/api/${nombre}`;
}
