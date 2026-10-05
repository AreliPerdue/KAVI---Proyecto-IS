import { z } from 'zod';

import { type Dictionary, t } from '@/i18n';

/** Mensaje de validación en el idioma activo al momento de validar (spec 12). */
const m = (texto: (d: Dictionary) => string) => ({ error: () => texto(t()) });

export const USERNAME_PATTERN = /^[a-z0-9_]+$/;

const email = z
  .string()
  .trim()
  .min(1, m((d) => d.errors.emailRequired))
  .email(m((d) => d.errors.emailInvalid));

const password = z
  .string()
  .min(1, m((d) => d.errors.passwordRequired))
  .min(8, m((d) => d.errors.passwordShort));

export const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, m((d) => d.errors.usernameShort))
  .max(30, m((d) => d.errors.usernameLong))
  .regex(USERNAME_PATTERN, m((d) => d.errors.usernamePattern));

export const displayName = z
  .string()
  .trim()
  .max(60, m((d) => d.errors.max60));

export const loginSchema = z.object({ email, password });
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({ email, password, username });
export type RegisterValues = z.infer<typeof registerSchema>;

export const OTP_LENGTH = 6;

const confirmPassword = z.string().min(1, m((d) => d.errors.repeatPassword));
const passwordsMatch = {
  check: (v: { password: string; confirmPassword: string }) => v.password === v.confirmPassword,
  options: { error: () => t().errors.passwordsDontMatch, path: ['confirmPassword'] },
};

/** Alta por pasos: nombre → correo → código → contraseña (RF-A8). */
export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, m((d) => d.errors.nameRequired))
      .max(60, m((d) => d.errors.max60)),
    email,
    username,
    code: z
      .string()
      .trim()
      .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), m((d) => d.errors.codeDigits(OTP_LENGTH))),
    password,
    confirmPassword,
  })
  .refine(passwordsMatch.check, passwordsMatch.options);
export type SignUpValues = z.infer<typeof signUpSchema>;

/** Cambio de contraseña desde Perfil: se comprueba la actual (RF-A9). */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, m((d) => d.errors.currentPasswordRequired)),
    password,
    confirmPassword,
  })
  .refine(passwordsMatch.check, passwordsMatch.options);
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/** El perfil solo edita el nombre visible: el username no se usa y el correo es fijo. */
export const profileSchema = z.object({
  displayName: z.string().trim().min(2, m((d) => d.errors.nameRequired)).max(60, m((d) => d.errors.max60)),
  // Se escribe sin la arroba; la interfaz la muestra como prefijo fijo (RF-A9).
  username,
});
export type ProfileValues = z.infer<typeof profileSchema>;
