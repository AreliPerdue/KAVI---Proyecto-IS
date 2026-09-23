import { create } from 'zustand';

import { setTimeFormat, type TimeFormat } from '@/lib/dates';
import { getJson, setJson } from '@/lib/storage';

const PREFS_KEY = 'kavi.preferences';

/** Reloj de 24 h por omisión, que es lo habitual en es-MX. */
export const DEFAULT_TIME_FORMAT: TimeFormat = '24h';

type Prefs = { timeFormat: TimeFormat };

type PreferencesState = {
  timeFormat: TimeFormat;
  hydrated: boolean;
  setTimeFormat: (formato: TimeFormat) => void;
  hydrate: () => Promise<void>;
};

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
  hydrated: false,

  setTimeFormat: (formato) => {
    setTimeFormat(formato);
    set({ timeFormat: formato });
    void setJson(PREFS_KEY, { timeFormat: formato } satisfies Prefs);
  },

  hydrate: async () => {
    if (get().hydrated) return;
    const prefs = await getJson<Prefs>(PREFS_KEY);
    const formato = prefs?.timeFormat ?? DEFAULT_TIME_FORMAT;
    setTimeFormat(formato);
    set({ timeFormat: formato, hydrated: true });
  },
}));
