import { create } from 'zustand';

import type { OutboxEntry } from '@/lib/gym/outbox';

/**
 * Copia en memoria de la cola local del gym, para que todas las pantallas vean lo mismo
 * y se repinten al cambiar. La verdad está en el disco (`lib/gym/outbox`); esto es su
 * reflejo mientras la app está abierta.
 */
type OutboxState = {
  entries: OutboxEntry[];
  loaded: boolean;
  setEntries: (fn: (previas: OutboxEntry[]) => OutboxEntry[]) => void;
  markLoaded: (entries: OutboxEntry[]) => void;
};

export const useOutboxStore = create<OutboxState>((set) => ({
  entries: [],
  loaded: false,
  setEntries: (fn) => set((s) => ({ entries: fn(s.entries) })),
  markLoaded: (entries) => set((s) => ({ entries: [...entries, ...s.entries.filter((e) => !entries.some((x) => x.at === e.at))], loaded: true })),
}));
