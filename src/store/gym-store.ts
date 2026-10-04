import { create } from 'zustand';

import { gymratLine } from '@/constants/gymrat';
import type { E1rmFormula } from '@/lib/gym/e1rm';
import { cancelRestEnd, scheduleRestEnd } from '@/lib/notifications';
import { getJson, setJson } from '@/lib/storage';
import type { WeightUnit } from '@/types/domain';

const PREFS_KEY = 'kavi.gym.prefs';
const REST_KEY = 'kavi.gym.rest';

/** Escala de esfuerzo que se captura; la otra se calcula (RF-F47). */
export type EffortScale = 'rir' | 'rpe';
/** Cómo se dirige el Modo Gymrat a la persona (RF-F55). */
export type Trato = 'neutral' | 'rey' | 'reina';

export type GymPrefs = {
  weightUnit: WeightUnit;
  effortScale: EffortScale;
  e1rmFormula: E1rmFormula;
  /** Descanso por omisión al marcar una serie, en segundos. */
  restDefaultSec: number;
  /** Cuánto baja el peso cada `+ drop`. */
  dropPercent: number;
  seriousMode: boolean;
  trato: Trato;
  /** Pitidos de los timers (descanso e intervalos). */
  timerSound: boolean;
};

export const DEFAULT_GYM_PREFS: GymPrefs = {
  weightUnit: 'kg',
  effortScale: 'rir',
  e1rmFormula: 'epley',
  restDefaultSec: 120,
  dropPercent: 20,
  seriousMode: false,
  trato: 'neutral',
  timerSound: true,
};

/**
 * El descanso se guarda como **hora de fin**, no como segundos restantes (RF-F34). Una
 * cuenta regresiva se congela si la app se duerme; la hora de fin no: al volver se resta y
 * da lo correcto, aunque el teléfono haya estado bloqueado o la app cerrada.
 */
export type RestTimer = {
  endsAt: number;
  durationSec: number;
  workoutId: string;
  /** Qué viene después, para el aviso: "Press banca, serie 3". */
  label: string | null;
};

type GymState = GymPrefs & {
  rest: RestTimer | null;
  hydrated: boolean;
  setPref: <K extends keyof GymPrefs>(key: K, value: GymPrefs[K]) => void;
  startRest: (workoutId: string, durationSec: number, label?: string | null) => void;
  /** Suma o resta segundos al descanso en curso (±15 s). */
  adjustRest: (deltaSec: number) => void;
  stopRest: () => void;
  hydrate: () => Promise<void>;
};

const elegido = new Set<keyof GymPrefs>();

function prefsDe(s: GymState): GymPrefs {
  const { weightUnit, effortScale, e1rmFormula, restDefaultSec, dropPercent, seriousMode, trato, timerSound } = s;
  return { weightUnit, effortScale, e1rmFormula, restDefaultSec, dropPercent, seriousMode, trato, timerSound };
}

/** Aviso del sistema al terminar; se reprograma con cada ajuste y se cancela al parar. */
function avisar(rest: RestTimer | null, prefs?: Pick<GymPrefs, 'trato' | 'seriousMode'>): void {
  if (!rest) {
    void cancelRestEnd();
    return;
  }
  // Con humor, el título es la frase del Modo Gymrat (RF-F55); en Modo serio, sobrio.
  const titulo = (prefs && gymratLine('rest_end', prefs.trato, prefs.seriousMode)) ?? 'Se acabó el descanso';
  void scheduleRestEnd(new Date(rest.endsAt), titulo, rest.label ? `Sigue: ${rest.label}` : 'A la siguiente serie.');
}

/** Preferencias del módulo de fitness y el timer de descanso, por dispositivo. */
export const useGymStore = create<GymState>((set, get) => ({
  ...DEFAULT_GYM_PREFS,
  rest: null,
  hydrated: false,

  setPref: (key, value) => {
    elegido.add(key);
    set({ [key]: value } as Partial<GymState>);
    void setJson(PREFS_KEY, prefsDe(get()));
  },

  startRest: (workoutId, durationSec, label = null) => {
    const rest: RestTimer = { endsAt: Date.now() + durationSec * 1000, durationSec, workoutId, label };
    set({ rest });
    void setJson(REST_KEY, rest);
    avisar(rest, get());
  },

  adjustRest: (deltaSec) => {
    const actual = get().rest;
    if (!actual) return;
    const endsAt = Math.max(Date.now(), actual.endsAt + deltaSec * 1000);
    const rest = { ...actual, endsAt, durationSec: Math.max(0, actual.durationSec + deltaSec) };
    set({ rest });
    void setJson(REST_KEY, rest);
    avisar(rest, get());
  },

  stopRest: () => {
    set({ rest: null });
    void setJson(REST_KEY, null);
    avisar(null);
  },

  hydrate: async () => {
    if (get().hydrated) return;
    const [prefs, rest] = await Promise.all([getJson<Partial<GymPrefs>>(PREFS_KEY), getJson<RestTimer>(REST_KEY)]);
    const leidas = { ...DEFAULT_GYM_PREFS, ...(prefs ?? {}) };
    // Lo que se eligió mientras se leía el disco gana: si no, el cambio se deshacía solo.
    for (const k of elegido) (leidas as Record<string, unknown>)[k] = get()[k];
    // Un descanso que terminó mientras la app estaba cerrada ya no se muestra.
    set({ ...leidas, rest: rest && rest.endsAt > Date.now() ? rest : null, hydrated: true });
  },
}));
