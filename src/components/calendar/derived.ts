import { fromDayKey, fromIso, setTimeOfDay, startOfDay, toIso } from '@/lib/dates';
import type { Activity, Contact, KaviList, ListItem, Profile, Workout } from '@/types/domain';
import type { RutinaDelDia } from '@/lib/list-runs';
import { getLanguage, type Language, t } from '@/i18n';

export const WORKOUT_PREFIX = 'workout-';
export const BIRTHDAY_PREFIX = 'birthday-';
export const LIST_ITEM_PREFIX = 'listitem-';
/** Una rutina en uno de sus días (RF-L26). El id es `listrutina-<lista>@<día>`. */
export const LIST_ROUTINE_PREFIX = 'listrutina-';

/**
 * Iconos de las capas derivadas. Van nombrados y exportados porque nadie los elige a
 * mano: si el nombre no esta en el catalogo, `ThemeIcon` cae a una etiqueta generica
 * sin avisar. Hay una prueba que lo comprueba.
 */
export const WORKOUT_ICON = 'dumbbell';
export const BIRTHDAY_ICON = 'cake';
export const LIST_ITEM_ICON = 'circle-check';

/** Un bloque derivado no existe como fila: no se puede editar ni compartir. */
export function isDerivedActivity(activity: Pick<Activity, 'id'>): boolean {
  return (
    activity.id.startsWith(WORKOUT_PREFIX) ||
    activity.id.startsWith(BIRTHDAY_PREFIX) ||
    activity.id.startsWith(LIST_ITEM_PREFIX) ||
    activity.id.startsWith(LIST_ROUTINE_PREFIX)
  );
}

/**
 * Viene de Lists —un pendiente con fecha o una rutina— y no del calendario. Es lo que
 * decide que el chip lleve el círculo con la palomita en vez de la hora, y lo que deja
 * pasar el filtro "solo listas".
 */
export function isListDerived(activity: Pick<Activity, 'id'>): boolean {
  return activity.id.startsWith(LIST_ITEM_PREFIX) || activity.id.startsWith(LIST_ROUTINE_PREFIX);
}

/** La lista detrás del chip de una rutina, para abrirla al tocarlo. */
export function routineListIdOf(activity: Pick<Activity, 'id'>): string | null {
  if (!activity.id.startsWith(LIST_ROUTINE_PREFIX)) return null;
  return activity.id.slice(LIST_ROUTINE_PREFIX.length).split('@')[0] ?? null;
}

/** El id del elemento de lista detrás de un bloque derivado, para poder abrirlo. */
export function listItemIdOf(activity: Pick<Activity, 'id'>): string | null {
  return activity.id.startsWith(LIST_ITEM_PREFIX) ? activity.id.slice(LIST_ITEM_PREFIX.length) : null;
}

const base = (id: string, ownerId: string) => ({
  id,
  owner_id: ownerId,
  description: null,
  theme_id: null,
  recurrence_rule: null,
  recurrence_parent_id: null,
  is_gym: false,
  visibility: 'default' as const,
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
export function workoutsToActivities(workouts: readonly Workout[], lang: Language = getLanguage()): Activity[] {
  return workouts
    .filter((w) => w.activity_id === null)
    .map((w) => {
      const inicio = fromIso(w.performed_at);
      const minutos = w.duration_minutes ?? 60;
      return {
        ...base(`${WORKOUT_PREFIX}${w.id}`, w.owner_id),
        title: w.title || t(lang).calendar.workoutFallback,
        dimension: 'fisica' as const,
        color: null,
        icon: WORKOUT_ICON,
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
  lang: Language = getLanguage(),
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
        title: t(lang).calendar.birthdayOf(nombreDe(persona)),
        dimension: 'social' as const,
        color: null,
        icon: BIRTHDAY_ICON,
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

/**
 * Pendientes de listas con fecha, como bloques derivados del calendario (RF-L12).
 *
 * **Solo para la vista mensual y la agenda**, que no tienen rejilla de horas. En las de
 * horas seguiría valiendo la regla del módulo: un pendiente ocupa un día, no un rato, y
 * colocarlo entre las horas lo haría leerse como una cita. Ahí vive en la franja de arriba.
 *
 * Van como `all_day` a propósito: así el chip del mes no intenta pintar una hora, y en su
 * lugar se dibuja el círculo con la palomita, que es lo que dice de un vistazo que eso no
 * es una cita sino algo por hacer.
 */
export function listItemsToActivities(
  items: readonly ListItem[],
  lists: readonly KaviList[],
): Activity[] {
  const porId = new Map(lists.map((l) => [l.id, l]));
  return items
    .filter((i) => i.due_date !== null)
    .map((item) => {
      const lista = porId.get(item.list_id);
      const dia = fromDayKey(item.due_date as string);
      return {
        ...base(`${LIST_ITEM_PREFIX}${item.id}`, lista?.owner_id ?? item.created_by),
        title: item.title,
        dimension: null,
        color: lista?.color ?? null,
        icon: LIST_ITEM_ICON,
        start_at: toIso(startOfDay(dia)),
        end_at: toIso(setTimeOfDay(dia, 1440)),
        all_day: true,
        created_at: item.created_at,
        updated_at: item.updated_at,
      } as Activity;
    });
}

/**
 * Rutinas como bloques del mes y la agenda (RF-L26).
 *
 * Una sola pieza por rutina y día, no una por elemento: una rutina de ocho pasos llenaría
 * la celda, y además mentiría, porque los elementos no tienen día propio —el día es de la
 * vuelta—. El avance va en el título porque el chip no tiene otro sitio donde decirlo.
 */
export function routinesToActivities(rutinas: readonly RutinaDelDia[]): Activity[] {
  return rutinas.map(({ list, day, hechos, total }) => {
    const dia = fromDayKey(day);
    return {
      ...base(`${LIST_ROUTINE_PREFIX}${list.id}@${day}`, list.owner_id),
      title: total > 0 ? `${list.name} ${hechos}/${total}` : list.name,
      dimension: null,
      color: list.color,
      icon: LIST_ITEM_ICON,
      start_at: toIso(startOfDay(dia)),
      end_at: toIso(setTimeOfDay(dia, 1440)),
      all_day: true,
      created_at: list.created_at,
      updated_at: list.updated_at,
    } as Activity;
  });
}
