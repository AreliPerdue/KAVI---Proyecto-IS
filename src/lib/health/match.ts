/**
 * Relación entre sesiones de otras apps y de KAVI (spec 11, RF-H6).
 *
 * Una sesión externa que se traslapa al menos la mitad (de la más corta de las dos) con una de
 * KAVI es **la misma**: la de KAVI gana y la externa solo le aporta sus calorías activas, como
 * dato importado. Cada externa se empareja con una sola de KAVI, la de mayor traslape.
 */
export type TimedSession = { id: string; startAt: string; endAt: string };

export type MatchResult<E extends TimedSession> = {
  /** id de la sesión de KAVI → la externa que es la misma. */
  byKavi: Map<string, E>;
  /** Las externas que no coinciden con ninguna de KAVI: se muestran aparte. */
  unmatched: E[];
};

const ms = (iso: string) => new Date(iso).getTime();

export function overlapRatio(a: TimedSession, b: TimedSession): number {
  const inicio = Math.max(ms(a.startAt), ms(b.startAt));
  const fin = Math.min(ms(a.endAt), ms(b.endAt));
  const traslape = Math.max(0, fin - inicio);
  const corta = Math.min(ms(a.endAt) - ms(a.startAt), ms(b.endAt) - ms(b.startAt));
  return corta > 0 ? traslape / corta : 0;
}

export function matchSessions<E extends TimedSession>(kavi: readonly TimedSession[], external: readonly E[]): MatchResult<E> {
  const candidatos: { k: string; e: E; r: number }[] = [];
  for (const k of kavi) for (const e of external) {
    const r = overlapRatio(k, e);
    if (r >= 0.5) candidatos.push({ k: k.id, e, r });
  }
  candidatos.sort((a, b) => b.r - a.r);
  const byKavi = new Map<string, E>();
  const usadas = new Set<string>();
  for (const c of candidatos) {
    if (byKavi.has(c.k) || usadas.has(c.e.id)) continue;
    byKavi.set(c.k, c.e);
    usadas.add(c.e.id);
  }
  return { byKavi, unmatched: external.filter((e) => !usadas.has(e.id)) };
}

/**
 * Inicio y fin de una sesión de KAVI para compararla: con hora de fin, esa; sin ella, la
 * duración anotada; sin nada, una hora (lo típico de una sesión de gym).
 */
export function kaviSpan(w: { id: string; performed_at: string; ended_at?: string | null; duration_minutes?: number | null }): TimedSession {
  const inicio = ms(w.performed_at);
  const fin = w.ended_at ? ms(w.ended_at) : inicio + (w.duration_minutes ?? 60) * 60_000;
  return { id: w.id, startAt: w.performed_at, endAt: new Date(Math.max(fin, inicio + 60_000)).toISOString() };
}
