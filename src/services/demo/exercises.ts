import { AuthUiError } from '@/lib/auth-errors';
import { systemExercises } from '@/lib/gym/catalog';
import { uuidv4 } from '@/lib/gym/ids';
import type { ExercisesApi } from '@/services/contracts';
import { delay } from '@/services/demo/store';
import type { Exercise, ExercisePrefs } from '@/types/domain';

/**
 * El catálogo del sistema sale del mismo archivo que la migración de Supabase, con los
 * mismos ids (derivados del slug). Lo personalizado y las preferencias viven en memoria,
 * como el resto del demo, y se reinician al recargar.
 */
const sistema = systemExercises();
const propios: Exercise[] = [];
const prefs = new Map<string, Map<string, ExercisePrefs>>();

const copia = (e: Exercise): Exercise => ({
  ...e,
  aliases: [...e.aliases],
  primary_muscles: [...e.primary_muscles],
  secondary_muscles: [...e.secondary_muscles],
  equipment: [...e.equipment],
});

function prefsDe(userId: string): Map<string, ExercisePrefs> {
  let m = prefs.get(userId);
  if (!m) {
    m = new Map();
    prefs.set(userId, m);
  }
  return m;
}

export const demoExercises: ExercisesApi = {
  async list(userId) {
    await delay(60);
    return [...sistema, ...propios.filter((e) => e.created_by === userId)].map(copia);
  },

  async createCustom(userId, input) {
    await delay(60);
    const nombre = input.name_es.trim();
    if (!nombre) throw new AuthUiError('Escribe el nombre del ejercicio.');
    const id = uuidv4();
    const nuevo: Exercise = {
      id,
      slug: `custom-${id}`,
      name_es: nombre,
      name_en: null,
      aliases: [],
      family: null,
      primary_muscles: input.primary_muscles ?? [],
      secondary_muscles: [],
      equipment: input.equipment ?? [],
      movement_pattern: null,
      mechanic: null,
      laterality: null,
      tracking_type: input.tracking_type ?? 'weight_reps',
      created_by: userId,
      archived_at: null,
    };
    propios.push(nuevo);
    return copia(nuevo);
  },

  async updateCustom(id, patch) {
    await delay(60);
    const e = propios.find((x) => x.id === id);
    if (!e) throw new AuthUiError('Ese ejercicio no es tuyo o ya no existe.');
    const { archived, name_es, ...resto } = patch;
    Object.assign(e, resto);
    if (name_es !== undefined && name_es.trim()) e.name_es = name_es.trim();
    if (archived !== undefined) e.archived_at = archived ? new Date().toISOString() : null;
    return copia(e);
  },

  async listPrefs(userId) {
    await delay(30);
    return [...prefsDe(userId).values()].map((p) => ({ ...p }));
  },

  async savePrefs(userId, exerciseId, patch) {
    await delay(20);
    const m = prefsDe(userId);
    const previo = m.get(exerciseId) ?? { exercise_id: exerciseId, is_favorite: false, sticky_note: null, last_used_at: null };
    m.set(exerciseId, { ...previo, ...patch, exercise_id: exerciseId });
  },
};
