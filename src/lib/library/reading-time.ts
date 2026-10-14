import type { LibraryReadingSession } from '@/types/domain';

/**
 * Tiempo de lectura (spec 13b, RF-BR11 – RF-BR13; T318). Sin React: el cronómetro y los resúmenes.
 *
 * El cronómetro cuenta el tiempo entre una señal de vida y la siguiente (pasar página, tocar, el motor
 * avisando que hay actividad). Si entre dos señales pasaron 5 minutos o más, ese hueco no cuenta: la persona
 * dejó el libro abierto sin leer. Pausarlo (segundo plano, pantalla bloqueada, salir) cierra la cuenta hasta
 * ese momento; seguir no suma el tiempo en pausa.
 */

/** Cinco minutos sin tocar nada: se considera que no se está leyendo (RF-BR11). */
export const INACTIVIDAD_MS = 5 * 60 * 1000;
/** Menos de esto es un vistazo: no se guarda (RF-BR12). */
export const SESION_MINIMA_S = 60;
/** Cada cuánto se guarda la sesión mientras dura, por si la app se cierra sin avisar. */
export const GUARDAR_CADA_MS = 60 * 1000;

/** `desde`: la última señal mientras corre; `null` en pausa. */
export type Cronometro = { segundos: number; desde: number | null };

export const CRONOMETRO_EN_CERO: Cronometro = { segundos: 0, desde: null };

/** Una señal de vida en `t` (ms): suma lo que pasó desde la anterior si no fue un hueco largo. */
export function marcar(c: Cronometro, t: number): Cronometro {
  if (c.desde === null) return { ...c, desde: t };
  const hueco = Math.max(0, t - c.desde);
  return { segundos: c.segundos + (hueco < INACTIVIDAD_MS ? hueco / 1000 : 0), desde: t };
}

/** Pausar en `t`: cuenta hasta ahí y se detiene. */
export function pausar(c: Cronometro, t: number): Cronometro {
  return { ...marcar(c, t), desde: null };
}

/** Los segundos leídos hasta `t`, contando lo que va desde la última señal (si no es un hueco largo). */
export function segundosEn(c: Cronometro, t: number): number {
  if (c.desde === null) return c.segundos;
  const hueco = Math.max(0, t - c.desde);
  return c.segundos + (hueco < INACTIVIDAD_MS ? hueco / 1000 : 0);
}

// ─── Resúmenes (RF-BR13) ─────────────────────────────────────────────────────

/** Franjas del día para "a qué horas sueles leer". */
export type Franja = 'madrugada' | 'manana' | 'tarde' | 'noche';
export const FRANJAS: readonly Franja[] = ['manana', 'tarde', 'noche', 'madrugada'];

export function franjaDe(hora: number): Franja {
  if (hora < 6) return 'madrugada';
  if (hora < 12) return 'manana';
  if (hora < 19) return 'tarde';
  return 'noche';
}

export type Resumen = {
  sesiones: number;
  segundos: number;
  /** Promedio por sesión, en segundos (0 sin sesiones). */
  promedio: number;
  /** Días distintos (en la zona del aparato) en que se leyó. */
  dias: number;
  /** Segundos por día de la semana, de lunes (0) a domingo (6). */
  porDia: number[];
  /** Segundos por franja del día. */
  porFranja: Record<Franja, number>;
  /** La franja en que más se lee, si hay sesiones. */
  franjaFavorita: Franja | null;
};

const claveDeDia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** El resumen de unas sesiones: las de un libro o las de toda la biblioteca. Las fechas, en hora local. */
export function resumir(sesiones: readonly Pick<LibraryReadingSession, 'started_at' | 'seconds'>[]): Resumen {
  const porDia = [0, 0, 0, 0, 0, 0, 0];
  const porFranja: Record<Franja, number> = { madrugada: 0, manana: 0, tarde: 0, noche: 0 };
  const dias = new Set<string>();
  let segundos = 0;
  for (const s of sesiones) {
    const inicio = new Date(s.started_at);
    segundos += s.seconds;
    porDia[(inicio.getDay() + 6) % 7] += s.seconds;
    porFranja[franjaDe(inicio.getHours())] += s.seconds;
    dias.add(claveDeDia(inicio));
  }
  const favorita = sesiones.length ? FRANJAS.reduce((a, b) => (porFranja[b] > porFranja[a] ? b : a)) : null;
  return {
    sesiones: sesiones.length,
    segundos,
    promedio: sesiones.length ? segundos / sesiones.length : 0,
    dias: dias.size,
    porDia,
    porFranja,
    franjaFavorita: favorita,
  };
}

/** Horas y minutos de unos segundos, redondeado al minuto: `{ h: 1, min: 5 }`. */
export function horasYMinutos(segundos: number): { h: number; min: number } {
  const minutos = Math.round(Math.max(0, segundos) / 60);
  return { h: Math.floor(minutos / 60), min: minutos % 60 };
}
