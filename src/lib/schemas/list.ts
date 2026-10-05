import { z } from 'zod';

import { THEME_ICON_NAMES } from '@/constants/icons';
import { PEOPLE_COLORS_DISPLAY } from '@/constants/people-colors';

/**
 * Los colores de una lista salen de la paleta de personas, la misma de los Nobis
 * (spec 10, §Colores). KAVI ya tiene dos capas de color con significado —las 7
 * dimensiones y las personas— y una tercera paleta libre las volvería ruido.
 */
export const LIST_COLORS = PEOPLE_COLORS_DISPLAY.map((c) => c.hex);
/** Los mismos, con su nombre, en el orden de los menús. */
export const LIST_COLOR_OPTIONS = PEOPLE_COLORS_DISPLAY;

export const listFormSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre.').max(40, 'Máximo 40 caracteres.'),
  color: z.string().refine((v) => LIST_COLORS.includes(v), 'Elige un color de la paleta.'),
  icon: z.enum(THEME_ICON_NAMES as [string, ...string[]]),
});

export type ListFormValues = z.infer<typeof listFormSchema>;
