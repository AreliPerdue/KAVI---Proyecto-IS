import { PRIVACY_VERSION } from '@/constants/privacy';
import { AuthUiError } from '@/lib/auth-errors';
import { edadEn, EDAD_MINIMA, MAYORIA_DE_EDAD, type GuardianStatus } from '@/lib/consent';
import type { ConsentApi } from '@/services/contracts';
import { DEMO_USER, delay, demoState, nextId, setCurrentUser } from '@/services/demo/store';

type Aceptacion = { birthDate: string; privacyVersion: string };
type Solicitud = {
  token: string;
  minorId: string;
  email: string;
  status: Exclude<GuardianStatus, 'expired'>;
  createdAt: number;
  expiresAt: string;
};

/** La cuenta demo ya pasó por "Antes de empezar"; las que se creen en la sesión, no. */
const aceptaciones = new Map<string, Aceptacion>([[DEMO_USER.id, { birthDate: '2000-01-01', privacyVersion: PRIVACY_VERSION }]]);
const solicitudes: Solicitud[] = [];

const hoy = () => new Date().toISOString().slice(0, 10);

function yo() {
  const user = demoState.currentUser;
  if (!user) throw new AuthUiError('Necesitas iniciar sesión.');
  return user;
}

function estado(s: Solicitud): GuardianStatus {
  return s.status === 'pending' && new Date(s.expiresAt).getTime() < Date.now() ? 'expired' : s.status;
}

/** Igual que en la base: el demo aplica las mismas reglas que `create_guardian_consent`. */
export const demoConsent: ConsentApi = {
  async getStatus() {
    await delay(100);
    const user = yo();
    const propias = solicitudes.filter((s) => s.minorId === user.id);
    const ultima = propias.at(-1);
    const aceptacion = aceptaciones.get(user.id);
    return {
      birthDate: aceptacion?.birthDate ?? null,
      privacyVersion: aceptacion?.privacyVersion ?? null,
      guardianApproved: propias.some((s) => s.status === 'approved'),
      guardian: ultima ? { email: ultima.email, status: estado(ultima), expiresAt: ultima.expiresAt } : null,
    };
  },

  async accept(birthDate, privacyVersion) {
    await delay();
    aceptaciones.set(yo().id, { birthDate, privacyVersion });
  },

  async requestGuardianApproval(guardianEmail) {
    await delay();
    const user = yo();
    const email = guardianEmail.trim().toLowerCase();
    if (email === user.email) throw new AuthUiError('Escribe el correo de tu madre, padre o tutor, no el tuyo.');
    const nacimiento = aceptaciones.get(user.id)?.birthDate;
    const edad = nacimiento ? edadEn(nacimiento, hoy()) : -1;
    if (edad < EDAD_MINIMA || edad >= MAYORIA_DE_EDAD) {
      throw new AuthUiError('La aprobación de un adulto solo se pide para cuentas de 16 o 17 años.');
    }
    const unDia = Date.now() - 24 * 60 * 60 * 1000;
    if (solicitudes.filter((s) => s.minorId === user.id && s.createdAt > unDia).length >= 5) {
      throw new AuthUiError('Ya enviaste varios correos hoy. Inténtalo mañana.');
    }
    for (const s of solicitudes) if (s.minorId === user.id && s.status === 'pending') s.status = 'replaced';
    const token = nextId('consent');
    solicitudes.push({
      token,
      minorId: user.id,
      email,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    return { previewLink: `/consentimiento?token=${encodeURIComponent(token)}` };
  },

  async guardianRequestInfo(token) {
    await delay(100);
    const s = solicitudes.find((x) => x.token === token);
    if (!s) return null;
    const cuenta = demoState.accounts.find((a) => a.user.id === s.minorId);
    return {
      minorName: cuenta?.profile.display_name ?? cuenta?.profile.username ?? 'Alguien',
      status: estado(s),
      expiresAt: s.expiresAt,
    };
  },

  async decideGuardianRequest(token, approve) {
    await delay();
    const s = solicitudes.find((x) => x.token === token);
    if (!s) throw new AuthUiError('Este enlace no es válido.');
    if (s.status !== 'pending') return s.status;
    if (estado(s) === 'expired') throw new AuthUiError('Este enlace venció. Pide que te envíen uno nuevo desde KAVI.');
    s.status = approve ? 'approved' : 'rejected';
    return s.status;
  },

  async deleteUnderageAccount() {
    await delay();
    const user = yo();
    demoState.accounts = demoState.accounts.filter((a) => a.user.id !== user.id);
    aceptaciones.delete(user.id);
    setCurrentUser(null);
  },
};
