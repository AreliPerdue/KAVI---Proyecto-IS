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

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const profileSchema = z.object({ username, displayName });
export type ProfileValues = z.infer<typeof profileSchema>;
