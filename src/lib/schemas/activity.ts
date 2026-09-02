import { z } from 'zod';

const recurrenceSchema = z
  .object({
    freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
    byDay: z.array(z.number().int().min(0).max(6)),
    until: z.string().nullable(),
  })
  .nullable();

export const activityFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Escribe un título.').max(120, 'Máximo 120 caracteres.'),
    description: z.string().trim().max(2000, 'Máximo 2000 caracteres.'),
    /** 'yyyy-MM-dd' local */
    dayKey: z.string(),
    /** minutos desde medianoche */
    startMinutes: z.number().int().min(0).max(1439),
    endMinutes: z.number().int().min(0).max(1440),
    allDay: z.boolean(),
    isGym: z.boolean(),
    themeId: z.string().nullable(),
    recurrence: recurrenceSchema,
    reminderOffsets: z.array(z.number().int().min(0)),
  })
  .refine((v) => v.allDay || v.endMinutes > v.startMinutes, {
    message: 'La hora de fin debe ser posterior a la de inicio.',
    path: ['endMinutes'],
  });

export type ActivityFormValues = z.infer<typeof activityFormSchema>;
