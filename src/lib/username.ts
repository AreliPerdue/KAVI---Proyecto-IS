/**
 * Username automático a partir del correo (RF-A8).
 *
 * El alta por pasos no lo pide: el identificador único de la cuenta es el correo y el
 * username solo sirve para que te encuentren tus contactos (RF-S1), así que se propone
 * uno y se puede cambiar después desde Perfil (RF-A9).
 */
import { USERNAME_PATTERN } from '@/lib/schemas/auth';

const MIN_LENGTH = 3;
const MAX_LENGTH = 30;
const FALLBACK = 'usuario';

/** Base válida derivada del correo: minúsculas, sin acentos y solo `[a-z0-9_]`. */
export function suggestUsername(email: string): string {
  const local = email.split('@')[0] ?? '';
  const base = local
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_LENGTH);
  const candidate = base.length >= MIN_LENGTH ? base : `${base}${FALLBACK}`.slice(0, MAX_LENGTH);
  return USERNAME_PATTERN.test(candidate) ? candidate : FALLBACK;
}

/**
 * Primer username libre a partir del correo, probando sufijos numéricos.
 * `isAvailable` decide contra el backend activo.
 */
export async function availableUsername(
  email: string,
  isAvailable: (username: string) => Promise<boolean>,
  maxAttempts = 20,
): Promise<string> {
  const base = suggestUsername(email);
  if (await isAvailable(base)) return base;
  for (let i = 2; i <= maxAttempts; i += 1) {
    const suffix = String(i);
    const candidate = `${base.slice(0, MAX_LENGTH - suffix.length)}${suffix}`;
    if (await isAvailable(candidate)) return candidate;
  }
  // Último recurso: sufijo aleatorio, mucho menos probable de chocar.
  return `${base.slice(0, MAX_LENGTH - 5)}${Math.floor(1000 + Math.random() * 9000)}`;
}
