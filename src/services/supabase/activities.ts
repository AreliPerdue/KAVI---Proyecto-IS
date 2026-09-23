import { addDays } from 'date-fns';

import { AuthUiError } from '@/lib/auth-errors';
import { durationMinutes, fromIso, toIso } from '@/lib/dates';
import {
  expandOccurrences,
  horizonEnd,
  parseRRule,
  RECURRENCE_EXTEND_THRESHOLD_DAYS,
  type RecurrenceRule,
  toRRule,
} from '@/lib/recurrence';
import { getSupabase } from '@/lib/supabase';
import type { ActivitiesApi } from '@/services/contracts';
import { toError, unwrap } from '@/services/supabase/errors';
import type { Activity } from '@/types/domain';

/** El nombre del dueño solo hace falta cuando la actividad no es mía (RF-S5, RF-S13). */
const SELECT = '*, owner:profiles!activities_owner_id_fkey(display_name,username)';

type Row = Activity & { owner?: { display_name: string | null; username: string } | null };

function toActivity(row: Row, viewerId: string): Activity {
  const { owner, ...activity } = row;
  if (activity.owner_id === viewerId) return activity;
  return { ...activity, owner_name: owner?.display_name ?? owner?.username ?? 'Contacto' };
}

/**
 * Materializa las instancias de una serie hasta el horizonte de 90 días.
 *
 * plan.md §4 preveía hacerlo con una RPC `generate_recurrences`. Se hace aquí porque
 * `lib/recurrence.ts` ya expande la RRULE y es la lógica que el modo demo lleva usando
 * desde la Fase 3: traducirla a PL/pgSQL duplicaría la regla en dos lenguajes y abriría
 * la puerta a que la recurrencia se comporte distinto según el backend.
 */
async function materialize(parent: Activity, rule: RecurrenceRule, after: Date): Promise<void> {
  const duration = durationMinutes(parent.start_at, parent.end_at);
  const existing = unwrap(
    await getSupabase().from('activities').select('start_at').eq('recurrence_parent_id', parent.id),
  ) as { start_at: string }[];
  const taken = new Set(existing.map((r) => r.start_at));

  const rows = [];
  for (const start of expandOccurrences(rule, parent.start_at, after, horizonEnd())) {
    const startIso = toIso(start);
    if (taken.has(startIso)) continue;
    rows.push({
      owner_id: parent.owner_id,
      title: parent.title,
      description: parent.description,
      theme_id: parent.theme_id,
      dimension: parent.dimension,
      color: parent.color,
      icon: parent.icon,
      all_day: parent.all_day,
      is_gym: parent.is_gym,
      recurrence_rule: null,
      recurrence_parent_id: parent.id,
      start_at: startIso,
      end_at: toIso(new Date(start.getTime() + duration * 60_000)),
    });
  }
  if (rows.length === 0) return;
  const { error } = await getSupabase().from('activities').insert(rows);
  if (error) throw toError(error);
}

async function findRoot(activity: Activity): Promise<Activity> {
  if (!activity.recurrence_parent_id) return activity;
  return unwrap(
    await getSupabase().from('activities').select('*').eq('id', activity.recurrence_parent_id).single(),
  ) as Activity;
}

async function fetchOne(id: string): Promise<Activity> {
  const { data, error } = await getSupabase().from('activities').select('*').eq('id', id).maybeSingle();
  if (error) throw toError(error);
  if (!data) throw new AuthUiError('Esta actividad ya no existe.');
  return data as Activity;
}

/**
 * Guarda quién puede ver el detalle de una actividad recién creada (RF-C14).
 *
 * Solo escribe con visibilidad `selected` y con alguien elegido: en cualquier otro
 * caso no hay nada que guardar, y una actividad nueva tampoco tiene lista previa que
 * limpiar. Al editar sí habrá que sustituirla, y eso vivirá en `update`.
 *
 * `unwrap` no vale aquí: exige datos y un insert sin `select` no devuelve filas.
 */
async function guardarVisores(
  activityId: string,
  visibility: Activity['visibility'],
  viewerIds: string[] | undefined,
): Promise<void> {
  if (visibility !== 'selected' || !viewerIds?.length) return;
  const { error } = await getSupabase()
    .from('activity_viewers')
    .insert(viewerIds.map((user_id) => ({ activity_id: activityId, user_id })));
  if (error) throw toError(error);
}

export const supabaseActivities: ActivitiesApi = {
  /** Lectura por rango visible (NFR-1): start_at < to AND end_at > from; la RLS filtra. */
  /**
   * Mi calendario: lo mío y lo que me han compartido explícitamente.
   *
   * El filtro por dueño va aquí a propósito, aunque la RLS ya limite qué filas se
   * pueden leer. Son dos preguntas distintas: la RLS responde «¿puedo leer esto?»
   * y esta consulta responde «¿debe salir en mi calendario?». La política permite
   * leer todas las actividades de quien me comparte su calendario en modo detalles
   * —lo necesita la pantalla de disponibilidad—, así que apoyarse solo en ella
   * metía las actividades de mis contactos en mi inicio sin haberlas pedido, las
   * duplicaba al superponer su calendario y las presentaba como si me hubieran
   * invitado a cada una.
   *
   * Los calendarios de contactos se ven desde la superposición, que va por
   * `get_availability` y respeta el nivel de visibilidad de cada quien.
   */
  async listByRange(userId, fromIso_, toIso_) {
    const compartidas = unwrap(
      await getSupabase()
        .from('activity_shares')
        .select('activity_id')
        .eq('shared_with_id', userId)
        .eq('status', 'accepted'),
    ) as { activity_id: string }[];

    const consulta = getSupabase()
      .from('activities')
      .select(SELECT)
      .lt('start_at', toIso_)
      .gt('end_at', fromIso_);

    // `in.()` con la lista vacía no es sintaxis válida en PostgREST.
    const ids = compartidas.map((s) => s.activity_id);
    const acotada = ids.length
      ? consulta.or(`owner_id.eq.${userId},id.in.(${ids.join(',')})`)
      : consulta.eq('owner_id', userId);

    const rows = unwrap(await acotada.order('start_at')) as Row[];
    return rows.map((r) => toActivity(r, userId));
  },

  async getById(id) {
    const { data, error } = await getSupabase().from('activities').select(SELECT).eq('id', id).maybeSingle();
    if (error) throw toError(error);
    if (!data) throw new AuthUiError('Esta actividad ya no existe.');
    const row = data as Row;
    return toActivity(row, row.owner_id);
  },

  async create(userId, input) {
    // `viewerIds` no es una columna: va a su propia tabla una vez existe la fila.
    const { recurrence, viewerIds, ...fields } = input;
    const created = unwrap(
      await getSupabase()
        .from('activities')
        .insert({
          ...fields,
          owner_id: userId,
          recurrence_rule: recurrence ? toRRule(recurrence) : null,
        })
        .select('*')
        .single(),
    ) as Activity;
    await guardarVisores(created.id, created.visibility, viewerIds);
    if (recurrence) await materialize(created, recurrence, fromIso(created.start_at));
    return created;
  },

  async update(id, patch, scope = 'this') {
    const current = await fetchOne(id);
    const { recurrence, ...fields } = patch;

    if (scope === 'this' || (!current.recurrence_rule && !current.recurrence_parent_id)) {
      const updated = unwrap(
        await getSupabase().from('activities').update(fields).eq('id', id).select('*').single(),
      ) as Activity;
      // Cambiar la actividad puede cambiar quién debe recibir sus recordatorios.
      await getSupabase().rpc('add_reminder_recipients', { p_activity: id });
      return updated;
    }

    // Toda la serie: se edita la madre y se regeneran las instancias desde ésta.
    const root = await findRoot(current);
    const rule = recurrence === undefined ? parseRRule(root.recurrence_rule) : recurrence;
    const shiftMs = fields.start_at ? fromIso(fields.start_at).getTime() - fromIso(current.start_at).getTime() : 0;
    const duration =
      fields.start_at && fields.end_at
        ? durationMinutes(fields.start_at, fields.end_at)
        : durationMinutes(root.start_at, root.end_at);
    const rootStart = new Date(fromIso(root.start_at).getTime() + shiftMs);

    const updatedRoot = unwrap(
      await getSupabase()
        .from('activities')
        .update({
          ...fields,
          start_at: toIso(rootStart),
          end_at: toIso(new Date(rootStart.getTime() + duration * 60_000)),
          recurrence_rule: rule ? toRRule(rule) : null,
        })
        .eq('id', root.id)
        .select('*')
        .single(),
    ) as Activity;

    const { error } = await getSupabase()
      .from('activities')
      .delete()
      .eq('recurrence_parent_id', root.id)
      .gte('start_at', current.start_at);
    if (error) throw toError(error);

    if (rule) {
      const from = new Date(Math.max(fromIso(current.start_at).getTime() - 1, rootStart.getTime()));
      await materialize(updatedRoot, rule, from);
    }
    // La instancia editada pudo desaparecer al regenerar: se devuelve la madre.
    const { data } = await getSupabase().from('activities').select('*').eq('id', id).maybeSingle();
    return (data as Activity | null) ?? updatedRoot;
  },

  async remove(id, scope = 'this') {
    const current = await fetchOne(id);
    const db = getSupabase();

    if (scope === 'series') {
      const root = await findRoot(current);
      // Las instancias posteriores primero: borrar la madre arrastra el resto por FK.
      const { error: childError } = await db
        .from('activities')
        .delete()
        .eq('recurrence_parent_id', root.id)
        .gte('start_at', current.start_at);
      if (childError) throw toError(childError);
      const { error } = await db.from('activities').delete().eq('id', root.id);
      if (error) throw toError(error);
      return;
    }

    if (current.recurrence_rule) {
      /*
       * Borrar solo la madre arrastraría la serie entera por el `on delete cascade`,
       * así que antes se asciende la primera instancia a madre y se le reasignan las
       * demás (mismo criterio que el backend demo).
       */
      const children = unwrap(
        await db
          .from('activities')
          .select('id')
          .eq('recurrence_parent_id', current.id)
          .order('start_at')
          .limit(1),
      ) as { id: string }[];
      const heir = children[0];
      if (heir) {
        const { error: heirError } = await db
          .from('activities')
          .update({ recurrence_rule: current.recurrence_rule, recurrence_parent_id: null })
          .eq('id', heir.id);
        if (heirError) throw toError(heirError);
        const { error: rest } = await db
          .from('activities')
          .update({ recurrence_parent_id: heir.id })
          .eq('recurrence_parent_id', current.id);
        if (rest) throw toError(rest);
      }
    }

    const { error } = await db.from('activities').delete().eq('id', id);
    if (error) throw toError(error);
  },

  /** Si alguna serie está por quedarse sin horizonte, se regenera (plan.md §4). */
  async extendRecurrenceHorizon(userId) {
    const roots = unwrap(
      await getSupabase()
        .from('activities')
        .select('*')
        .eq('owner_id', userId)
        .not('recurrence_rule', 'is', null),
    ) as Activity[];
    if (roots.length === 0) return;

    const threshold = addDays(new Date(), RECURRENCE_EXTEND_THRESHOLD_DAYS);
    for (const root of roots) {
      const rule = parseRRule(root.recurrence_rule);
      if (!rule) continue;
      const last = unwrap(
        await getSupabase()
          .from('activities')
          .select('start_at')
          .eq('recurrence_parent_id', root.id)
          .order('start_at', { ascending: false })
          .limit(1),
      ) as { start_at: string }[];
      const lastStart = last[0]?.start_at ?? root.start_at;
      if (fromIso(lastStart) < threshold) await materialize(root, rule, fromIso(lastStart));
    }
  },
};
