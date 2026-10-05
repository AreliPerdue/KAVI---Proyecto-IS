import { z } from 'zod';

import { THEME_ICON_NAMES, THEME_PALETTE } from '@/constants/icons';
import { t } from '@/i18n';

export const themeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: () => t().themes.editor.nameRequired })
    .max(40, { error: () => t().themes.editor.max40 }),
  dimension: z.enum(['fisica', 'emocional', 'social', 'intelectual', 'espiritual', 'financiera', 'ocupacional']),
  color: z.enum(THEME_PALETTE),
  icon: z.enum(THEME_ICON_NAMES as [string, ...string[]]),
});

export type ThemeFormValues = z.infer<typeof themeFormSchema>;
