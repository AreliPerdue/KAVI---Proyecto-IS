import { z } from 'zod';

import { THEME_ICON_NAMES, THEME_PALETTE } from '@/constants/icons';

export const themeFormSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre.').max(40, 'Máximo 40 caracteres.'),
  dimension: z.enum(['fisica', 'emocional', 'social', 'intelectual', 'espiritual', 'financiera', 'ocupacional']),
  color: z.enum(THEME_PALETTE),
  icon: z.enum(THEME_ICON_NAMES as [string, ...string[]]),
});

export type ThemeFormValues = z.infer<typeof themeFormSchema>;
