import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import { acknowledge, applyOutbox, enqueue, loadOutbox, type OutboxEntry } from '@/lib/gym/outbox';
import { removeWorkoutSets, saveWorkoutSets, type WorkoutDetail, type WorkoutSet } from '@/services/workouts';
import { useOutboxStore } from '@/store/outbox-store';

import { useWorkout, workoutKeys } from './use-workouts';

/**
 * Series sin esperar al servidor (RF-F17 – RF-F19).
 *
 * Guardar una serie la pone en la cola local y en pantalla al instante; el envío va por
 * detrás. Si falla, la serie queda "pendiente" y se reintenta sola: cada 10 s, al volver
 * la app al frente y al abrir otra vez la sesión. Si la app se cierra, la cola sigue en el
 * disco y se reenvía en el siguiente arranque.
 */

let enviando = false;
let repetir = false;
let reintento: ReturnType<typeof setTimeout> | null = null;

const idDe = (e: OutboxEntry) => (e.op === 'save' ? e.set.id : e.setId);

/** Manda lo pendiente. Nunca corre dos veces a la vez: lo que llegue mientras, va en otra vuelta. */
export async function flushOutbox(qc: QueryClient): Promise<void> {
  if (enviando) {
    repetir = true;
    return;
  }
  const lote = useOutboxStore.getState().entries;
  if (lote.length === 0) return;
  enviando = true;
  try {
    const guardar = lote.filter((e): e is Extract<OutboxEntry, { op: 'save' }> => e.op === 'save').map((e) => e.set);
    const borrar = lote.filter((e) => e.op === 'remove').map(idDe);
    if (guardar.length > 0) await saveWorkoutSets(guardar);
    if (borrar.length > 0) await removeWorkoutSets(borrar);

    // El servidor ya lo tiene: se escribe en el caché del detalle (para que no parpadee al
    // quitar la capa local) y se retira de la cola lo que no cambió mientras viajaba.
    for (const workoutId of new Set(lote.map((e) => e.workoutId))) {
      qc.setQueryData<WorkoutDetail>(workoutKeys.detail(workoutId), (previo) => (previo ? applyOutbox(previo, lote) : previo));
    }
    const confirmado = new Map(lote.map((e) => [idDe(e), e.at]));
    useOutboxStore.getState().setEntries((actuales) => actuales.filter((e) => confirmado.get(idDe(e)) !== e.at));
    await acknowledge(lote);
    void qc.invalidateQueries({ queryKey: ['workouts', 'history'] });
  } catch {
    if (!reintento) {
      reintento = setTimeout(() => {
        reintento = null;
        void flushOutbox(qc);
      }, 10_000);
    }
  } finally {
    enviando = false;
    if (repetir) {
      repetir = false;
      void flushOutbox(qc);
    }
  }
}

/**
 * Carga la cola del disco una vez por arranque y la manda; también al volver la app al
 * frente. Se monta en Fitness y en la sesión: cualquiera de las dos recupera lo pendiente.
 */
export function useOutboxBootstrap() {
  const qc = useQueryClient();
  const loaded = useOutboxStore((s) => s.loaded);

  useEffect(() => {
    if (loaded) return;
    void loadOutbox().then((entries) => {
      useOutboxStore.getState().markLoaded(entries);
      void flushOutbox(qc);
    });
  }, [loaded, qc]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void flushOutbox(qc);
    });
    return () => sub.remove();
  }, [qc]);
}

/** La sesión tal como la dejó la persona: lo del servidor más lo que todavía no confirma. */
export function useSessionDetail(workoutId: string | undefined) {
  useOutboxBootstrap();
  const query = useWorkout(workoutId);
  const entries = useOutboxStore((s) => s.entries);
  const data = useMemo(() => (query.data ? applyOutbox(query.data, entries) : undefined), [query.data, entries]);
  const pendientes = useMemo(() => new Set(entries.filter((e) => e.workoutId === workoutId).map(idDe)), [entries, workoutId]);
  return { ...query, data, pendientes };
}

export function useSetActions(workoutId: string) {
  const qc = useQueryClient();

  const encolar = useCallback(
    (entry: OutboxEntry) => {
      useOutboxStore.getState().setEntries((actuales) => [...actuales.filter((e) => idDe(e) !== idDe(entry)), entry]);
      // Primero al disco, luego a la red: si la app muere entre las dos, la serie no se pierde.
      void enqueue(entry).then(() => flushOutbox(qc));
    },
    [qc],
  );

  const saveSet = useCallback((set: WorkoutSet) => encolar({ op: 'save', workoutId, set, at: Date.now() }), [encolar, workoutId]);
  const removeSet = useCallback((setId: string) => encolar({ op: 'remove', workoutId, setId, at: Date.now() }), [encolar, workoutId]);

  return { saveSet, removeSet };
}
