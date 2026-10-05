import { z } from 'zod';
import { t } from '@/i18n';

const recurrenceSchema = z
  .object({
    freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
    byDay: z.array(z.number().int().min(0).max(6)),
    until: z.string().nullable(),
  })
  .nullable();

export const activityFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { error: () => t().calendar.titleRequired })
      .max(120, { error: () => t().calendar.max120 }),
    description: z.string().trim().max(2000, { error: () => t().calendar.max2000 }),
    /** 'yyyy-MM-dd' local */
    dayKey: z.string(),
    /** minutos desde medianoche */
    startMinutes: z.number().int().min(0).max(1439),
    endMinutes: z.number().int().min(0).max(1440),
    allDay: z.boolean(),
    isGym: z.boolean(),
    /** Quién ve el título. El nivel del calendario sigue siendo el techo (RF-C14). */
    visibility: z.enum(['default', 'selected', 'private']),
    /** Con 'selected', quiénes pueden ver el detalle. */
    viewerIds: z.array(z.string()),
    themeId: z.string().nullable(),
    recurrence: recurrenceSchema,
    reminderOffsets: z.array(z.number().int().min(0)),
  })
  .refine((v) => v.visibility !== 'selected' || v.viewerIds.length > 0, {
    error: () => t().calendar.pickSomeone,
    path: ['viewerIds'],
  })
  .refine((v) => v.allDay || v.endMinutes > v.startMinutes, {
    error: () => t().calendar.endAfterStart,
    path: ['endMinutes'],
  });

export type ActivityFormValues = z.infer<typeof activityFormSchema>;
