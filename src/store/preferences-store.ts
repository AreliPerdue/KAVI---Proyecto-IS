import { create } from 'zustand';

import { setTimeFormat, type TimeFormat } from '@/lib/dates';
import { getJson, setJson } from '@/lib/storage';

const PREFS_KEY = 'kavi.preferences';

/** `system` sigue al teléfono; las otras dos lo fijan (NFR-18). */
export type Appearance = 'system' | 'light' | 'dark';

/** KAVI nació en oscuro y se mantiene como punto de partida. */
export const DEFAULT_APPEARANCE: Appearance = 'dark';

/** Reloj de 24 h por omisión, que es lo habitual en es-MX. */
export const DEFAULT_TIME_FORMAT: TimeFormat = '24h';

type Prefs = {
  timeFormat: TimeFormat;
  lastWorkoutTitle: string | null;
  showWorkouts: boolean;
  showBirthdays: boolean;
  /** Falso solo hasta la primera vez que se abre la app. */
  visto: boolean;
  appearance: Appearance;
  selfColor: string | null;
};

type PreferencesState = {
  timeFormat: TimeFormat;
  /**
   * Nombre del último entrenamiento al que se le puso uno. Se propone al crear el
   * siguiente, porque quien entrena suele repetir rutina —"Pierna", "Empuje A"— y
   * volver a escribirlo cada vez es trabajo que la app puede ahorrarse (RF-F7).
   */
  lastWorkoutTitle: string | null;
  /** Pintar los entrenamientos sueltos en el calendario (RF-F10). */
  showWorkouts: boolean;
  /** Pintar mi cumpleaños y el de mis contactos (RF-A10). */
  showBirthdays: boolean;
  /**
   * `false` solo la primera vez que alguien abre la app. Se usa para llevarla a
   * Perfil una vez —donde están el Nobi y el cumpleaños— en lugar de al calendario
   * vacío, que no dice qué hacer a continuación.
   */
  visto: boolean;
  /** Apariencia elegida: seguir al sistema, clara u oscura (NFR-18). */
  appearance: Appearance;
  /**
   * Mi color en el calendario superpuesto (RF-S15). `null` = automático, que es el
   * color de mi Nobi y, si no tengo, el azul. Va en el dispositivo y no en el perfil
   * porque es cómo **yo** me veo: a mis contactos los pinta su propia asignación.
   */
  selfColor: string | null;
  hydrated: boolean;
  setTimeFormat: (formato: TimeFormat) => void;
  setLastWorkoutTitle: (titulo: string | null) => void;
  setShowWorkouts: (mostrar: boolean) => void;
  setShowBirthdays: (mostrar: boolean) => void;
  marcarVisto: () => void;
  setAppearance: (valor: Appearance) => void;
  setSelfColor: (hex: string | null) => void;
  hydrate: () => Promise<void>;
};

/**
 * Lo que ya eligió la persona en esta sesión, para que `hydrate` no lo pise.
 *
 * Leer del disco es asíncrono y en un teléfono tarda lo suficiente para que dé
 * tiempo a tocar un ajuste antes de que la lectura vuelva. Sin esto, `hydrate`
 * aplicaba el valor guardado encima del recién elegido y el cambio se deshacía
 * solo: se veía como que el ajuste «no funciona». En web no se notaba porque
 * `localStorage` responde en el mismo tick.
 */
const elegidoEnEstaSesion = new Set<keyof Prefs>();

/**
 * Preferencias de presentación que no dependen de la cuenta sino del dispositivo.
 *
 * Además de guardar el valor, cada cambio lo propaga a `lib/dates`, que es de
 * donde leen las funciones que formatean horas: así una sola llamada cambia el
 * reloj en el calendario, los recordatorios y el historial de entrenamientos a
 * la vez, sin tener que volver a renderizar nada a mano.
 */
export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  timeFormat: DEFAULT_TIME_FORMAT,
  lastWorkoutTitle: null,
  showWorkouts: true,
  showBirthdays: true,
  visto: false,
  appearance: DEFAULT_APPEARANCE,
  selfColor: null,
  hydrated: false,

  setTimeFormat: (formato) => {
    elegidoEnEstaSesion.add('timeFormat');
    setTimeFormat(formato);
    set({ timeFormat: formato });
    persistir({ ...get(), timeFormat: formato });
  },

  setLastWorkoutTitle: (titulo) => {
    elegidoEnEstaSesion.add('lastWorkoutTitle');
    const limpio = titulo?.trim() || null;
    set({ lastWorkoutTitle: limpio });
    persistir({ ...get(), lastWorkoutTitle: limpio });
  },

  setShowWorkouts: (mostrar) => {
    elegidoEnEstaSesion.add('showWorkouts');
    set({ showWorkouts: mostrar });
    persistir({ ...get(), showWorkouts: mostrar });
  },

  setShowBirthdays: (mostrar) => {
    elegidoEnEstaSesion.add('showBirthdays');
    set({ showBirthdays: mostrar });
    persistir({ ...get(), showBirthdays: mostrar });
  },

  setAppearance: (valor) => {
    elegidoEnEstaSesion.add('appearance');
    set({ appearance: valor });
    persistir({ ...get(), appearance: valor });
  },

  setSelfColor: (hex) => {
    elegidoEnEstaSesion.add('selfColor');
    set({ selfColor: hex });
    persistir({ ...get(), selfColor: hex });
  },

  marcarVisto: () => {
    if (get().visto) return;
    elegidoEnEstaSesion.add('visto');
    set({ visto: true });
    persistir({ ...get(), visto: true });
  },

  hydrate: async () => {
    if (get().hydrated) return;
    const prefs = await getJson<Prefs>(PREFS_KEY);

    /** Lo guardado solo se aplica si nadie lo cambió mientras se leía. */
    const guardado = <K extends keyof Prefs>(clave: K, valor: Prefs[K]): Prefs[K] =>
      elegidoEnEstaSesion.has(clave) ? (get()[clave] as Prefs[K]) : valor;

    const formato = guardado('timeFormat', prefs?.timeFormat ?? DEFAULT_TIME_FORMAT);
    setTimeFormat(formato);
    set({
      timeFormat: formato,
      lastWorkoutTitle: guardado('lastWorkoutTitle', prefs?.lastWorkoutTitle ?? null),
      // Ausentes = activadas: son el comportamiento por defecto y quien ya tenía
      // preferencias guardadas no las vio nunca apagadas.
      showWorkouts: guardado('showWorkouts', prefs?.showWorkouts ?? true),
      showBirthdays: guardado('showBirthdays', prefs?.showBirthdays ?? true),
      visto: guardado('visto', prefs?.visto ?? false),
      appearance: guardado('appearance', prefs?.appearance ?? DEFAULT_APPEARANCE),
      selfColor: guardado('selfColor', prefs?.selfColor ?? null),
      hydrated: true,
    });
    // Lo elegido antes de hidratar se guardo con el resto de valores por omision;
    // ahora que estan los reales, se reescribe el conjunto completo.
    if (elegidoEnEstaSesion.size) persistir(get());
  },
}));

/** Se guarda el conjunto entero: son dos claves y así no pueden desincronizarse. */
function persistir(
  estado: Pick<PreferencesState, 'timeFormat' | 'lastWorkoutTitle' | 'showWorkouts' | 'showBirthdays' | 'visto' | 'appearance' | 'selfColor'>,
): void {
  void setJson(PREFS_KEY, {
    timeFormat: estado.timeFormat,
    lastWorkoutTitle: estado.lastWorkoutTitle,
    showWorkouts: estado.showWorkouts,
    showBirthdays: estado.showBirthdays,
    visto: estado.visto,
    appearance: estado.appearance,
    selfColor: estado.selfColor,
  } satisfies Prefs);
}
