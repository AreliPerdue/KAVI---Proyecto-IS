import { t } from '@/i18n';

/**
 * Mensajes de error de Supabase Auth y de red, en el idioma activo (RF-A3, spec 12). Son
 * getters: el texto se toma al momento del error, así sale en el idioma que se está usando.
 */
export const AUTH_MESSAGES = {
  get invalidCredentials() {
    return t().errors.invalidCredentials;
  },
  get offline() {
    return t().errors.offline;
  },
  get emailTaken() {
    return t().errors.emailTaken;
  },
  get usernameTaken() {
    return t().errors.usernameTaken;
  },
  get emailNotConfirmed() {
    return t().errors.emailNotConfirmed;
  },
  get tooManyRequests() {
    return t().errors.tooManyRequests;
  },
  get invalidCode() {
    return t().errors.invalidCode;
  },
  get expiredCode() {
    return t().errors.expiredCode;
  },
  get samePassword() {
    return t().errors.samePassword;
  },
  get generic() {
    return t().errors.generic;
  },
};

export function isOfflineError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /network request failed|failed to fetch|load failed|fetch failed|networkerror/i.test(
    message,
  );
}

export function toAuthMessage(error: unknown): string {
  if (isOfflineError(error)) return AUTH_MESSAGES.offline;
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid login credentials|invalid_credentials/i.test(message)) {
    return AUTH_MESSAGES.invalidCredentials;
  }
  if (/already registered|already been registered|user_already_exists/i.test(message)) {
    return AUTH_MESSAGES.emailTaken;
  }
  if (/profiles_username_key|username.*already|duplicate key/i.test(message)) {
    return AUTH_MESSAGES.usernameTaken;
  }
  if (/email not confirmed|email_not_confirmed/i.test(message)) {
    return AUTH_MESSAGES.emailNotConfirmed;
  }
  if (/rate limit|too many requests|over_request_rate_limit/i.test(message)) {
    return AUTH_MESSAGES.tooManyRequests;
  }
  if (/token has expired|otp_expired/i.test(message)) return AUTH_MESSAGES.expiredCode;
  if (/invalid token|token not found|otp_disabled|invalid_otp/i.test(message)) return AUTH_MESSAGES.invalidCode;
  if (/should be different from the old password|same_password/i.test(message)) return AUTH_MESSAGES.samePassword;
  return AUTH_MESSAGES.generic;
}

/** Error listo para mostrar en UI. */
export class AuthUiError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'AuthUiError';
  }
}
