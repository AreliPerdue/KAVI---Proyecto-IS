import { Platform } from 'react-native';

import { AUTH_MESSAGES, AuthUiError, isOfflineError } from '@/lib/auth-errors';
import type { GuardianStatus } from '@/lib/consent';
import { getSupabase } from '@/lib/supabase';
import type { ConsentApi } from '@/services/contracts';
import { toError, traducirDeLaBase, unwrap } from '@/services/supabase/errors';
import { getLanguage, t } from '@/i18n';

/**
 * La función de Vercel que manda el correo (`api/guardian-consent.ts`). En la web publicada es
 * del mismo origen (la CSP solo permite `'self'`); en el teléfono va con la dirección completa.
 * En el servidor local de desarrollo no existe: el envío falla con un mensaje claro.
 */
const SITIO = 'https://kavi-proyecto-is.vercel.app';
const API_CORREO = Platform.OS === 'web' ? '/api/guardian-consent' : `${SITIO}/api/guardian-consent`;

type GuardianRow = { guardian_email: string; status: Exclude<GuardianStatus, 'expired'>; expires_at: string };

export const supabaseConsent: ConsentApi = {
  async getStatus() {
    const db = getSupabase();
    const [consent, solicitudes] = await Promise.all([
      db.from('account_consents').select('birth_date, privacy_version').maybeSingle(),
      db.from('guardian_consents').select('guardian_email, status, expires_at').order('created_at', { ascending: false }).limit(20),
    ]);
    if (consent.error) throw toError(consent.error);
    if (solicitudes.error) throw toError(solicitudes.error);
    const filas = (solicitudes.data ?? []) as GuardianRow[];
    const ultima = filas[0];
    return {
      birthDate: consent.data?.birth_date ?? null,
      privacyVersion: consent.data?.privacy_version ?? null,
      guardianApproved: filas.some((f) => f.status === 'approved'),
      guardian: ultima
        ? {
            email: ultima.guardian_email,
            status: ultima.status === 'pending' && new Date(ultima.expires_at).getTime() < Date.now() ? 'expired' : ultima.status,
            expiresAt: ultima.expires_at,
          }
        : null,
    };
  },

  async accept(birthDate, privacyVersion) {
    const db = getSupabase();
    const { data } = await db.auth.getUser();
    if (!data.user) throw new AuthUiError(t().errors.signInRequired);
    const { error } = await db.from('account_consents').upsert({
      user_id: data.user.id,
      birth_date: birthDate,
      privacy_version: privacyVersion,
      privacy_accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw toError(error);
  },

  async requestGuardianApproval(guardianEmail) {
    const { data } = await getSupabase().auth.getSession();
    const jwt = data.session?.access_token;
    if (!jwt) throw new AuthUiError(t().errors.signInRequired);
    let respuesta: Response;
    try {
      respuesta = await fetch(API_CORREO, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
        // El correo sale en el idioma de la app de quien lo pide (spec 12, RF-I6).
        body: JSON.stringify({ guardianEmail: guardianEmail.trim().toLowerCase(), lang: getLanguage() }),
      });
    } catch (e) {
      throw new AuthUiError(isOfflineError(e) ? AUTH_MESSAGES.offline : t().errors.emailSendFailedConnection, e);
    }
    if (!respuesta.ok) {
      const cuerpo = (await respuesta.json().catch(() => null)) as { error?: string } | null;
      throw new AuthUiError(cuerpo?.error ? traducirDeLaBase(cuerpo.error) : t().errors.emailSendFailedLater);
    }
    return { previewLink: null };
  },

  async guardianRequestInfo(token) {
    const { data, error } = await getSupabase().rpc('guardian_consent_info', { p_token: token });
    if (error) throw toError(error);
    const fila = (data as { minor_name: string; status: GuardianStatus; expires_at: string }[] | null)?.[0];
    return fila ? { minorName: fila.minor_name, status: fila.status, expiresAt: fila.expires_at } : null;
  },

  async decideGuardianRequest(token, approve) {
    const resultado = await getSupabase().rpc('decide_guardian_consent', { p_token: token, p_approve: approve });
    return unwrap(resultado) as GuardianStatus;
  },

  async deleteUnderageAccount() {
    const db = getSupabase();
    const { error } = await db.rpc('delete_my_account');
    if (error) throw new AuthUiError(t().errors.accountDeleteFailed, error);
    await db.auth.signOut({ scope: 'local' });
  },
};
