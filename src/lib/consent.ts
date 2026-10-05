/**
 * Edad mínima y consentimiento (spec 03, RF-A13). Lógica pura: qué le toca ver a la cuenta
 * según su fecha de nacimiento, la versión del aviso que aceptó y la respuesta del adulto.
 */

/** Edad mínima para usar KAVI. */
export const EDAD_MINIMA = 16;
/** Mayoría de edad en México: desde aquí ya no hace falta un adulto. */
export const MAYORIA_DE_EDAD = 18;

/** Estado de la solicitud al adulto, como lo ve la app ('expired' se calcula, no se guarda). */
export type GuardianStatus = 'pending' | 'approved' | 'rejected' | 'replaced' | 'expired';

export type GuardianRequest = {
  email: string;
  status: GuardianStatus;
  expiresAt: string;
};

export type ConsentStatus = {
  /** `yyyy-MM-dd`, o `null` si la cuenta nunca pasó por "Antes de empezar". */
  birthDate: string | null;
  privacyVersion: string | null;
  /** La solicitud más reciente al adulto, si hay. */
  guardian: GuardianRequest | null;
  /** Hubo alguna aprobación, aunque después se haya pedido otra. */
  guardianApproved: boolean;
};

export type ConsentGate =
  | { kind: 'aceptar' }
  | { kind: 'menor-de-16' }
  | { kind: 'adulto-responsable'; request: GuardianRequest | null }
  | { kind: 'listo' };

/** Años cumplidos el día `hoy` por quien nació en `nacimiento` (ambos `yyyy-MM-dd`). */
export function edadEn(nacimiento: string, hoy: string): number {
  const [ay, am, ad] = nacimiento.split('-').map(Number);
  const [hy, hm, hd] = hoy.split('-').map(Number);
  const cumplio = hm > am || (hm === am && hd >= ad);
  return hy - ay - (cumplio ? 0 : 1);
}

/** Qué pantalla toca: la app solo se abre con `listo`. */
export function consentGate(status: ConsentStatus, versionVigente: string, hoy: string): ConsentGate {
  if (!status.birthDate || status.privacyVersion !== versionVigente) return { kind: 'aceptar' };
  const edad = edadEn(status.birthDate, hoy);
  if (edad < EDAD_MINIMA) return { kind: 'menor-de-16' };
  if (edad < MAYORIA_DE_EDAD && !status.guardianApproved) {
    return { kind: 'adulto-responsable', request: status.guardian };
  }
  return { kind: 'listo' };
}
