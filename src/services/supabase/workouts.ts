import { AuthUiError } from '@/lib/auth-errors';
import { uuidv4 } from '@/lib/gym/ids';
import { hasLegacyText } from '@/lib/gym/legacy';
import { ordenarPorUso } from '@/lib/gym/names';
import { getSupabase } from '@/lib/supabase';
import type { ExerciseHistoryEntry, LegacyExercise, WorkoutDetail, WorkoutsApi } from '@/services/contracts';
import { toError, unwrap } from '@/services/supabase/errors';
import type { ExerciseGroup, SetSegment, Workout, WorkoutExercise, WorkoutExerciseDetail, WorkoutSet } from '@/types/domain';

/**
 * Detalle completo: sesión → ejercicios → series → segmentos, más los grupos.
 *
 * Lo borrado (`deleted_at`) se descarta aquí, en el cliente, y no con filtros embebidos de
 * PostgREST: así la regla es una sola línea, idéntica a la del demo, y no depende de cómo
 * PostgREST interprete un filtro a tres niveles de profundidad.
 */
const SELECT_DETALLE =
  '*, activity:activities(title), exercises:workout_exercises(*, workout_sets(*, set_segments(*))), groups:exercise_groups(*)';

/**
 * El historial solo necesita contar ejercicios y sumar su duración (RF-F7). v1 traía
 * **todas** las columnas de **todos** los ejercicios de todas las sesiones para eso.
 */
const SELECT_LISTA = '*, activity:activities(title), exercises:workout_exercises(duration_minutes, deleted_at)';

type Borrable = { deleted_at: string | null };
type SegmentoRow = SetSegment & Borrable;
type SerieRow = Omit<WorkoutSet, 'segments'> & Borrable & { set_segments: SegmentoRow[] };
type EjercicioRow = WorkoutExercise & Borrable & { workout_sets?: SerieRow[] };
type SesionRow = Omit<Workout, 'activity_title' | 'exercise_count' | 'duration_minutes'> &
  Borrable & {
    activity: { title: string } | null;
    exercises: EjercicioRow[];
    groups?: (ExerciseGroup & Borrable)[];
  };

const vivo = (x: Partial<Borrable>) => !x.deleted_at;

/** Quita lo que el dominio no conoce: dueño, marcas de tiempo internas y borrado. */
function sinInternos<T extends object>(row: T): T {
  const { owner_id: _o, created_at: _c, updated_at: _u, deleted_at: _d, ...resto } = row as T & Record<string, unknown>;
  return resto as T;
}

function aSerie(row: SerieRow): WorkoutSet {
  const { set_segments, ...serie } = row;
  return {
    ...sinInternos(serie),
    segments: (set_segments ?? [])
      .filter(vivo)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((g) => sinInternos(g) as SetSegment),
  } as WorkoutSet;
}

function aEjercicio(row: EjercicioRow): WorkoutExerciseDetail {
  const { workout_sets, ...ejercicio } = row;
  const { owner_id: _o, updated_at: _u, deleted_at: _d, ...resto } = ejercicio as EjercicioRow & { owner_id?: string; updated_at?: string };
  return {
    ...resto,
    workout_sets: (workout_sets ?? [])
      .filter(vivo)
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map(aSerie),
  };
}

/** RF-F3 · La duración total se suma de los ejercicios; no hay columna que la guarde. */
function totalMinutes(exercises: { duration_minutes: number | null }[]): number | null {
  const total = exercises.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
  return total > 0 ? total : null;
}

function aSesion(row: SesionRow): Workout {
  const { activity, exercises, groups: _g, deleted_at: _d, ...workout } = row;
  const vivos = exercises.filter(vivo);
  return {
    ...workout,
    activity_title: activity?.title ?? null,
    exercise_count: vivos.length,
    duration_minutes: totalMinutes(vivos),
  };
}

function toDetail(row: SesionRow): WorkoutDetail {
  return {
    ...aSesion(row),
    exercises: row.exercises
      .filter(vivo)
      .sort((a, b) => a.position - b.position)
      .map(aEjercicio),
    groups: (row.groups ?? []).filter(vivo).map((g) => sinInternos(g) as ExerciseGroup),
  };
}

async function fetchDetail(id: string): Promise<WorkoutDetail> {
  const { data, error } = await getSupabase().from('workouts').select(SELECT_DETALLE).eq('id', id).is('deleted_at', null).maybeSingle();
  if (error) throw toError(error);
  if (!data) throw new AuthUiError('Ese entrenamiento ya no existe.');
  return toDetail(data as unknown as SesionRow);
}

/** Posición siguiente dentro del entrenamiento, para no pisar el orden existente. */
async function nextPosition(workoutId: string): Promise<number> {
  const rows = unwrap(
    await getSupabase()
      .from('workout_exercises')
      .select('position')
      .eq('workout_id', workoutId)
      .order('position', { ascending: false })
      .limit(1),
  ) as { position: number }[];
  return rows.length > 0 ? rows[0].position + 1 : 0;
}

const ahora = () => new Date().toISOString();

async function crearSesion(userId: string, input: Parameters<WorkoutsApi['create']>[1]): Promise<WorkoutDetail> {
  const created = unwrap(
    await getSupabase()
      .from('workouts')
      .insert({ ...input, owner_id: userId })
      .select('id')
      .single(),
  ) as { id: string };
  return fetchDetail(created.id);
}

/**
 * Filas completas para el `upsert`. Se mandan **todas** las columnas a propósito: con un
 * arreglo, supabase-js pone en null las que falten, y una serie guardada sin `notes`
 * borraría la nota. El dueño no viaja: lo pone el trigger desde el padre.
 */
function filaSerie(s: WorkoutSet) {
  const { segments: _s, ...serie } = s;
  return { ...serie, deleted_at: null };
}

function filaSegmento(g: SetSegment) {
  return { ...g, deleted_at: null };
}

async function guardarSeries(input: readonly WorkoutSet[]): Promise<void> {
  if (input.length === 0) return;
  const db = getSupabase();

  const series = await db.from('workout_sets').upsert(input.map(filaSerie), { onConflict: 'id' });
  if (series.error) throw toError(series.error);

  const todos = input.flatMap((s) => s.segments);
  if (todos.length > 0) {
    const segs = await db.from('set_segments').upsert(todos.map(filaSegmento), { onConflict: 'id' });
    if (segs.error) throw toError(segs.error);
  }

  // Lo que ya no viene se borra (suave): así se quita un drop o una mini-serie.
  let viejos = db
    .from('set_segments')
    .update({ deleted_at: ahora() })
    .in('set_id', input.map((s) => s.id))
    .is('deleted_at', null);
  if (todos.length > 0) viejos = viejos.not('id', 'in', `(${todos.map((g) => g.id).join(',')})`);
  const limpieza = await viejos;
  if (limpieza.error) throw toError(limpieza.error);
}

export const supabaseWorkouts: WorkoutsApi = {
  /** Historial cronológico descendente (RF-F7), sin lo borrado ni lo descartado. */
  async list(userId) {
    const rows = unwrap(
      await getSupabase()
        .from('workouts')
        .select(SELECT_LISTA)
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .neq('status', 'discarded')
        .order('performed_at', { ascending: false }),
    ) as unknown as SesionRow[];
    return rows.map(aSesion);
  },

  getById: fetchDetail,

  /** Un entrenamiento por actividad como mucho (RF-F1). */
  async getByActivity(activityId, userId) {
    const { data, error } = await getSupabase()
      .from('workouts')
      .select(SELECT_DETALLE)
      .eq('activity_id', activityId)
      .eq('owner_id', userId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw toError(error);
    return data ? toDetail(data as unknown as SesionRow) : null;
  },

  create: crearSesion,

  async update(id, patch) {
    // Descartar suelta la actividad, igual que borrar: con la relación 1:1, una actividad
    // atada a una sesión descartada ya no podría registrar otra.
    const cambios = patch.status === 'discarded' ? { ...patch, activity_id: null } : patch;
    const row = unwrap(
      await getSupabase().from('workouts').update(cambios).eq('id', id).select('*').single(),
    ) as Workout & Borrable;
    const { deleted_at: _d, ...workout } = row;
    return workout;
  },

  /**
   * Borrado suave (RF-F16). Suelta la actividad: el `unique` de `activity_id` sigue en
   * pie aunque la fila ya no se vea, y sin esto la actividad no podría tener otro
   * entrenamiento.
   */
  async remove(id) {
    const { error } = await getSupabase().from('workouts').update({ deleted_at: ahora(), activity_id: null }).eq('id', id);
    if (error) throw toError(error);
  },

  async addExercise(workoutId, input) {
    const { position, ...fields } = input;
    const row = unwrap(
      await getSupabase()
        .from('workout_exercises')
        .insert({ ...fields, workout_id: workoutId, position: position ?? (await nextPosition(workoutId)) })
        .select('*')
        .single(),
    ) as EjercicioRow;
    const { workout_sets: _s, ...ejercicio } = aEjercicio(row);
    return ejercicio;
  },

  async updateExercise(id, patch) {
    const row = unwrap(
      await getSupabase().from('workout_exercises').update(patch).eq('id', id).select('*').single(),
    ) as EjercicioRow;
    const { workout_sets: _s, ...ejercicio } = aEjercicio(row);
    return ejercicio;
  },

  async removeExercise(id) {
    const { error } = await getSupabase().from('workout_exercises').update({ deleted_at: ahora() }).eq('id', id);
    if (error) throw toError(error);
  },

  async restoreExercise(id) {
    const { error } = await getSupabase().from('workout_exercises').update({ deleted_at: null }).eq('id', id);
    if (error) throw toError(error);
  },

  saveSets: guardarSeries,

  async removeSets(ids) {
    if (ids.length === 0) return;
    const { error } = await getSupabase().from('workout_sets').update({ deleted_at: ahora() }).in('id', [...ids]);
    if (error) throw toError(error);
  },

  async listLegacyExercises(userId) {
    const rows = unwrap(
      await getSupabase()
        .from('workout_exercises')
        .select('*, workouts!inner(performed_at, deleted_at)')
        .eq('owner_id', userId)
        .is('legacy_converted_at', null)
        .is('deleted_at', null)
        .is('workouts.deleted_at', null),
    ) as unknown as (EjercicioRow & { workouts: { performed_at: string } })[];
    return rows
      .filter(hasLegacyText)
      .map(({ workouts, ...row }): LegacyExercise => {
        const { workout_sets: _s, ...ejercicio } = aEjercicio(row);
        return { ...ejercicio, performed_at: workouts.performed_at };
      });
  },

  async markLegacyConverted(ids) {
    if (ids.length === 0) return;
    const { error } = await getSupabase().from('workout_exercises').update({ legacy_converted_at: ahora() }).in('id', [...ids]);
    if (error) throw toError(error);
  },

  /**
   * Historial de un ejercicio (RF-F26). Por catálogo si está ligado; si no, por el nombre
   * exacto (sin distinguir mayúsculas) entre los que tampoco están ligados.
   *
   * PostgREST no ordena filas padre por una columna de la tabla unida, así que se ordena
   * por la creación del ejercicio —que sigue a la de la sesión— y luego, ya en el cliente,
   * por la fecha real de la sesión.
   */
  async exerciseHistory(userId, ref, limit = 60) {
    let q = getSupabase()
      .from('workout_exercises')
      .select('id, workout_id, workouts!inner(performed_at, bodyweight_kg, deleted_at, status), workout_sets(*, set_segments(*))')
      .eq('owner_id', userId)
      .is('deleted_at', null)
      .is('workouts.deleted_at', null)
      .neq('workouts.status', 'discarded');
    q = ref.exerciseId
      ? q.eq('exercise_id', ref.exerciseId)
      : q.is('exercise_id', null).ilike('name', ref.name.trim().replace(/[\\%_]/g, (c) => `\\${c}`));
    const rows = unwrap(await q.order('id', { ascending: false }).limit(limit)) as unknown as {
      id: string;
      workout_id: string;
      workouts: { performed_at: string; bodyweight_kg: number | null };
      workout_sets: SerieRow[];
    }[];
    return rows
      .map((r): ExerciseHistoryEntry => ({
        workout_id: r.workout_id,
        workout_exercise_id: r.id,
        performed_at: r.workouts.performed_at,
        bodyweight_kg: r.workouts.bodyweight_kg,
        sets: (r.workout_sets ?? []).filter(vivo).sort((a, b) => Number(a.sort_order) - Number(b.sort_order)).map(aSerie),
      }))
      .sort((a, b) => b.performed_at.localeCompare(a.performed_at));
  },

  /** Autocompletado con lo que esta persona ya escribió antes, del más usado al menos (RF-F4). */
  async exerciseNames(userId) {
    const rows = unwrap(
      await getSupabase()
        .from('workout_exercises')
        .select('name')
        .eq('owner_id', userId)
        .is('deleted_at', null),
    ) as { name: string }[];
    return ordenarPorUso(rows.map((r) => r.name));
  },

  /**
   * RF-F8 · Repetir un entrenamiento. Viaja el nombre de la sesión (v1 lo perdía). Con
   * `keepValues` viajan también las series, como pendientes: son el plan de hoy, no algo
   * que ya se hizo. Las notas nunca se copian: pertenecen a la sesión que las escribió.
   */
  async duplicate(userId, workoutId, target) {
    const source = await fetchDetail(workoutId);
    const created = unwrap(
      await getSupabase()
        .from('workouts')
        .insert({
          owner_id: userId,
          activity_id: target.activityId,
          title: source.title,
          performed_at: target.performedAt,
          notes: null,
        })
        .select('id')
        .single(),
    ) as { id: string };

    if (source.exercises.length === 0) return fetchDetail(created.id);

    // Los ids nuevos se generan aquí para emparejar cada ejercicio con sus series sin
    // depender del orden en que la base devuelva las filas.
    const idNuevo = new Map(source.exercises.map((e) => [e.id, uuidv4()]));
    const { error } = await getSupabase()
        .from('workout_exercises')
        .insert(
          source.exercises.map((e) => ({
            id: idNuevo.get(e.id),
            workout_id: created.id,
            position: e.position,
            name: e.name,
            sets: target.keepValues ? e.sets : null,
            reps: target.keepValues ? e.reps : null,
            weight: target.keepValues ? e.weight : null,
            duration_minutes: target.keepValues ? e.duration_minutes : null,
            notes: null,
            exercise_id: e.exercise_id ?? null,
            legacy_converted_at: e.legacy_converted_at ?? null,
          })),
        );
    if (error) throw toError(error);

    if (target.keepValues) {
      const copias: WorkoutSet[] = source.exercises.flatMap((e) =>
        e.workout_sets.map((s) => {
          const setId = uuidv4();
          return {
            ...s,
            id: setId,
            workout_exercise_id: idNuevo.get(e.id) as string,
            completed_at: null,
            notes: null,
            from_legacy: false,
            segments: s.segments.map((g) => ({ ...g, id: uuidv4(), set_id: setId, notes: null })),
          };
        }),
      );
      await guardarSeries(copias);
    }
    return fetchDetail(created.id);
  },
};
