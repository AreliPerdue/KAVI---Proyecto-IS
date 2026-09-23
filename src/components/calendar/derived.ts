import { fromIso, setTimeOfDay, startOfDay, toIso } from '@/lib/dates';
import type { Activity, Contact, Profile, Workout } from '@/types/domain';

export const WORKOUT_PREFIX = 'workout-';
export const BIRTHDAY_PREFIX = 'birthday-';

/** Un bloque derivado no existe como fila: no se puede editar ni compartir. */
export function isDerivedActivity(activity: Pick<Activity, 'id'>): boolean {
  return activity.id.startsWith(WORKOUT_PREFIX) || activity.id.startsWith(BIRTHDAY_PREFIX);
}

const base = (id: string, ownerId: string) => ({
  id,
  owner_id: ownerId,
  description: null,
  theme_id: null,
  recurrence_rule: null,
  recurrence_parent_id: null,
  is_gym: false,
  is_private: false,
});

/**
 * Entrenamientos sueltos como bloques del calendario (RF-F10).
 *
 * Solo los que **no** tienen actividad: los que sí la tienen ya se ven a través de
 * ella, y pintarlos otra vez los duplicaría.
 *
 * Se derivan en lugar de crear actividades de verdad porque son una vista, no un
 * hecho nuevo: así se pueden ocultar con un interruptor sin borrar nada, y los
 * entrenamientos registrados antes de existir esta función aparecen igual.
 */
export function workoutsToActivities(workouts: readonly Workout[]): Activity[] {
  return workouts
    .filter((w) => w.activity_id === null)
    .map((w) => {
      const inicio = fromIso(w.performed_at);
      const minutos = w.duration_minutes ?? 60;
      return {
        ...base(`${WORKOUT_PREFIX}${w.id}`, w.owner_id),
        title: w.title || 'Entrenamiento',
        dimension: 'fisica' as const,
        color: null,
        icon: 'dumbbell',
        start_at: w.performed_at,
        end_at: toIso(new Date(inicio.getTime() + minutos * 60_000)),
        all_day: false,
        is_gym: true,
        created_at: w.created_at,
        updated_at: w.created_at,
      } as Activity;
    });
}

/** Alguien cuyo cumpleaños puede aparecer en mi calendario. */
type Cumpleañero = Pick<Profile, 'id' | 'display_name' | 'username' | 'birthday'>;

function nombreDe(p: Cumpleañero): string {
  return p.display_name?.split(' ')[0] ?? p.username;
}

/**
 * Cumpleaños dentro del rango visible (RF-A10).
 *
 * La fecha guardada lleva año, así que lo que se busca es el **día y el mes**: el
 * cumpleaños se repite cada año, y el rango del calendario puede cruzar el cambio de
 * año. Por eso se prueba con el año de cada extremo del rango en lugar de calcular
 * una única fecha.
 */
export function birthdaysToActivities(
  personas: readonly Cumpleañero[],
  from: Date,
  to: Date,
): Activity[] {
  const salida: Activity[] = [];
  const años = new Set([from.getFullYear(), to.getFullYear()]);

  for (const persona of personas) {
    if (!persona.birthday) continue;
    const [, mes, dia] = persona.birthday.split('-').map(Number);
    if (!mes || !dia) continue;

    for (const año of años) {
      const fecha = new Date(año, mes - 1, dia);
      if (fecha.getMonth() !== mes - 1) continue; // 29 de febrero en año no bisiesto
      if (fecha < startOfDay(from) || fecha >= to) continue;

      salida.push({
        ...base(`${BIRTHDAY_PREFIX}${persona.id}-${año}`, persona.id),
        title: `Cumpleaños de ${nombreDe(persona)}`,
        dimension: 'social' as const,
        color: null,
        icon: 'cake',
        start_at: toIso(startOfDay(fecha)),
        end_at: toIso(setTimeOfDay(fecha, 1440)),
        all_day: true,
        created_at: toIso(fecha),
        updated_at: toIso(fecha),
      } as Activity);
    }
  }
  return salida;
}

/** Mi perfil y el de mis contactos aceptados, que son quienes tienen cumpleaños visible. */
export function cumpleañerosDe(yo: Cumpleañero | undefined, contactos: readonly Contact[]): Cumpleañero[] {
  const lista: Cumpleañero[] = yo ? [yo] : [];
  for (const c of contactos) if (c.kind === 'accepted') lista.push(c.profile);
  return lista;
}

/** El día del año en que cae un cumpleaños, para mostrarlo en el perfil. */
export function esHoyCumpleaños(birthday: string | null | undefined, hoy = new Date()): boolean {
  if (!birthday) return false;
  const [, mes, dia] = birthday.split('-').map(Number);
  return hoy.getMonth() === mes - 1 && hoy.getDate() === dia;
}
