import { z } from 'zod';

export const USERNAME_PATTERN = /^[a-z0-9_]+$/;

const email = z
  .string()
  .trim()
  .min(1, 'Escribe tu correo.')
  .email('Escribe un correo válido.');

const password = z
  .string()
  .min(1, 'Escribe tu contraseña.')
  .min(8, 'La contraseña debe tener al menos 8 caracteres.');

export const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'El username debe tener al menos 3 caracteres.')
  .max(30, 'El username debe tener máximo 30 caracteres.')
  .regex(USERNAME_PATTERN, 'Solo letras minúsculas, números y guion bajo.');

export const displayName = z
  .string()
  .trim()
  .max(60, 'Máximo 60 caracteres.');

export const loginSchema = z.object({ email, password });
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({ email, password, username });
export type RegisterValues = z.infer<typeof registerSchema>;

export const OTP_LENGTH = 6;

const confirmPassword = z.string().min(1, 'Repite la contraseña.');
const passwordsMatch = {
  check: (v: { password: string; confirmPassword: string }) => v.password === v.confirmPassword,
  options: { message: 'Las contraseñas no coinciden.', path: ['confirmPassword'] },
};

/** Alta por pasos: nombre → correo → código → contraseña (RF-A8). */
export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'Escribe tu nombre.')
      .max(60, 'Máximo 60 caracteres.'),
    email,
    username,
    code: z
      .string()
      .trim()
      .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `El código son ${OTP_LENGTH} dígitos.`),
    password,
    confirmPassword,
  })
  .refine(passwordsMatch.check, passwordsMatch.options);
export type SignUpValues = z.infer<typeof signUpSchema>;

/** Cambio de contraseña desde Perfil: se comprueba la actual (RF-A9). */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Escribe tu contraseña actual.'),
    password,
    confirmPassword,
  })
  .refine(passwordsMatch.check, passwordsMatch.options);
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/** El perfil solo edita el nombre visible: el username no se usa y el correo es fijo. */
export const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Escribe tu nombre.').max(60, 'Máximo 60 caracteres.'),
  // Se escribe sin la arroba; la interfaz la muestra como prefijo fijo (RF-A9).
  username,
});
export type ProfileValues = z.infer<typeof profileSchema>;
