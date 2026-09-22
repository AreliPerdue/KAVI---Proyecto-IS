/**
 * Cliente de Supabase falso para las pruebas de `services/supabase/*`.
 *
 * Los servicios encadenan el constructor de PostgREST
 * (`from(...).select(...).eq(...).single()`) y terminan leyendo `{ data, error }`.
 * Aqui cada metodo devuelve la misma cadena y el resultado se configura desde la
 * prueba, asi que se puede comprobar tanto la consulta construida como el
 * tratamiento de la respuesta —incluidos los errores de RLS— sin tocar la red.
 *
 * No es un archivo de pruebas: vive en `__tests__` para quedar fuera de la
 * cobertura, igual que el resto del material de apoyo.
 */

export type RespuestaSupabase = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

export type LlamadaRegistrada = [string, ...unknown[]];

const METODOS_CADENA = [
  'select', 'insert', 'update', 'delete', 'upsert',
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'or', 'not', 'like', 'ilike',
  'contains', 'overlaps', 'match', 'filter', 'order', 'limit', 'range', 'returns',
] as const;

/** Respuesta vacía: se congela para que ninguna prueba la mute sin querer. */
const SIN_DATOS: RespuestaSupabase = Object.freeze({ data: null, error: null });

export function fakeSupabase(inicial?: RespuestaSupabase) {
  const llamadas: LlamadaRegistrada[] = [];
  const cola: RespuestaSupabase[] = [];
  let porDefecto = inicial ?? SIN_DATOS;

  const siguiente = (): Promise<RespuestaSupabase> =>
    Promise.resolve(cola.length > 0 ? (cola.shift() as RespuestaSupabase) : porDefecto);

  function cadena() {
    const c: Record<string, unknown> = {};
    for (const m of METODOS_CADENA) {
      c[m] = (...args: unknown[]) => {
        llamadas.push([m, ...args]);
        return c;
      };
    }
    c.single = () => {
      llamadas.push(['single']);
      return siguiente();
    };
    c.maybeSingle = () => {
      llamadas.push(['maybeSingle']);
      return siguiente();
    };
    // Awaitable sin `.single()`: el constructor de PostgREST es un thenable.
    c.then = (ok: (v: RespuestaSupabase) => unknown, fail?: (e: unknown) => unknown) =>
      siguiente().then(ok, fail);
    return c;
  }

  const client = {
    from(tabla: string) {
      llamadas.push(['from', tabla]);
      return cadena();
    },
    rpc(nombre: string, args?: unknown) {
      llamadas.push(['rpc', nombre, args]);
      return cadena();
    },
  };

  return {
    client,
    llamadas,
    /** Respuesta para todas las consultas que no tengan una en cola. */
    responder(r: RespuestaSupabase) {
      porDefecto = r;
    },
    /** Respuestas consecutivas, para servicios que hacen varias consultas. */
    encolar(...rs: RespuestaSupabase[]) {
      cola.push(...rs);
    },
    /** Argumentos de la primera llamada a ese metodo, o undefined. */
    argsDe(metodo: string): unknown[] | undefined {
      return llamadas.find((l) => l[0] === metodo)?.slice(1);
    },
    /** Nombres de metodo en el orden en que se invocaron. */
    get secuencia(): string[] {
      return llamadas.map((l) => l[0]);
    },
  };
}
