import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { libraryKeys } from '@/hooks/use-library';
import { subirPendientes } from '@/hooks/use-library-sync';
import { isOfflineError } from '@/lib/auth-errors';
import { uuidv4 } from '@/lib/gym/ids';
import { encolar, type EntradaDeLibreria, pendientes } from '@/lib/library/offline/outbox';
import { CRONOMETRO_EN_CERO, GUARDAR_CADA_MS, marcar, pausar, SESION_MINIMA_S, segundosEn } from '@/lib/library/reading-time';
import { useAuth } from '@/providers';
import { listReadingSessions } from '@/services/library';
import type { LibraryLocator, LibraryReadingSession, LibraryReadingSessionInput } from '@/types/domain';

const sesionesKey = (userId: string | null) => [...libraryKeys.all, 'sessions', userId] as const;

/** Lo que la cola aún no sube, encima de lo del servidor (por id: gana la versión de la cola). */
function conPendientes(lista: readonly LibraryReadingSession[], entradas: readonly EntradaDeLibreria[], userId: string): LibraryReadingSession[] {
  const porId = new Map(lista.map((s) => [s.id, s]));
  for (const e of entradas) {
    if (e.op !== 'session') continue;
    const previa = porId.get(e.session.id);
    const fecha = new Date(e.at).toISOString();
    porId.set(e.session.id, { owner_id: userId, created_at: previa?.created_at ?? fecha, ...previa, ...e.session, updated_at: fecha });
  }
  return [...porId.values()].sort((a, b) => b.started_at.localeCompare(a.started_at));
}

/**
 * Las sesiones de lectura de la persona (spec 13b, RF-BR12 – RF-BR13; T318), la más nueva primero. Sin red,
 * las que la cola aún no sube.
 */
export function useReadingSessions() {
  const { userId } = useAuth();
  return useQuery<LibraryReadingSession[]>({
    queryKey: sesionesKey(userId),
    queryFn: async () => {
      const id = userId as string;
      try {
        return conPendientes(await listReadingSessions(id), await pendientes(), id);
      } catch (e) {
        if (!isOfflineError(e)) throw e;
        return conPendientes([], await pendientes(), id);
      }
    },
    enabled: !!userId,
  });
}

type Lugar = { locator: LibraryLocator | null; progress: number | null };

/**
 * El cronómetro del lector (RF-BR11): una sesión desde que el libro abre hasta que se sale. Cuenta con
 * `actividad()` (cada señal de que se está leyendo), se pausa en segundo plano y no suma los huecos de 5 min
 * o más. La sesión se guarda cada minuto y al salir (si pasó del minuto), primero en la cola del dispositivo.
 * `segundos` es lo de esta sesión, para mostrarlo en vivo (se refresca cada 15 s).
 */
export function useReadingTimer(itemId: string, abierto: boolean) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const crono = useRef(CRONOMETRO_EN_CERO);
  const sesion = useRef<{ id: string; started_at: string; inicio: Lugar; fin: Lugar } | null>(null);
  // El último lugar conocido: la primera posición llega a veces antes de que la sesión empiece.
  const ultimoLugar = useRef<Lugar>({ locator: null, progress: null });
  const [segundos, setSegundos] = useState(0);
  // Una sesión por lector abierto: su id se decide al entrar (reintentar abrir sigue en la misma).
  const [sesionId] = useState(() => uuidv4());

  const guardar = () => {
    const s = sesion.current;
    if (!s || !userId) return;
    const leidos = Math.floor(segundosEn(crono.current, Date.now()));
    if (leidos < SESION_MINIMA_S) return;
    const entrada: LibraryReadingSessionInput = {
      id: s.id,
      item_id: itemId,
      started_at: s.started_at,
      ended_at: new Date().toISOString(),
      seconds: leidos,
      start_locator: s.inicio.locator,
      end_locator: s.fin.locator,
      start_progress: s.inicio.progress,
      end_progress: s.fin.progress,
    };
    // Se ve al instante en los resúmenes, y sube por la cola (sin red, al volver).
    queryClient.setQueryData<LibraryReadingSession[]>(sesionesKey(userId), (lista = []) =>
      conPendientes(lista, [{ op: 'session', itemId, userId, session: entrada, at: Date.now() }], userId),
    );
    void encolar({ op: 'session', itemId, userId, session: entrada, at: Date.now() }).then(subirPendientes);
  };
  const guardarRef = useRef(guardar);
  useEffect(() => {
    guardarRef.current = guardar;
  });

  // Empieza al abrir el libro y termina al salir del lector.
  useEffect(() => {
    if (!abierto) return;
    sesion.current ??= { id: sesionId, started_at: new Date().toISOString(), inicio: ultimoLugar.current, fin: ultimoLugar.current };
    crono.current = marcar(crono.current, Date.now());
    const enVivo = setInterval(() => setSegundos(segundosEn(crono.current, Date.now())), 15_000);
    const guardando = setInterval(() => guardarRef.current(), GUARDAR_CADA_MS);
    // Segundo plano o pantalla bloqueada: pausa (y se guarda, por si no se vuelve). Al volver, sigue.
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') crono.current = marcar(crono.current, Date.now());
      else {
        crono.current = pausar(crono.current, Date.now());
        guardarRef.current();
      }
    });
    return () => {
      clearInterval(enVivo);
      clearInterval(guardando);
      sub.remove();
      crono.current = pausar(crono.current, Date.now());
      guardarRef.current();
    };
  }, [abierto, itemId, sesionId]);

  return {
    segundos,
    /** Una señal de que se está leyendo: pasar página, tocar, mover algo. */
    actividad: () => {
      crono.current = marcar(crono.current, Date.now());
    },
    /** Dónde va la lectura: la primera vez es de dónde empezó la sesión; la última, a dónde llegó. */
    alMoverse: (lugar: Lugar) => {
      ultimoLugar.current = lugar;
      const s = sesion.current;
      if (!s) return;
      if (!s.inicio.locator) s.inicio = lugar;
      s.fin = lugar;
      crono.current = marcar(crono.current, Date.now());
    },
    /** La sesión de ahora, para no contarla dos veces junto a las guardadas. */
    sesionId,
  };
}
