/**
 * Los datos de la biblioteca que se ponen en un recorte o una página del Journal (spec 13h, RF-CC22; T349): el Journal
 * no los copia, los lee de lo que ya hay —los libros y su avance, y las sesiones de lectura (13b RF-BR11 – BR13)—, así
 * que siempre están al día. Aquí, sin React, cómo se cuentan.
 */

export const DATOS_DE_BIBLIOTECA = ['booksFinished', 'pagesRead', 'hoursRead'] as const;
export type DatoDeBiblioteca = (typeof DATOS_DE_BIBLIOTECA)[number];

type Pieza = { id: string; kind: string; progress: number; page_count: number | null };
type Sesion = { item_id: string; ended_at: string; seconds: number; start_progress: number | null; end_progress: number | null };

/** Un libro está terminado al llegar al final (como en la librería). */
const TERMINADO = 0.99;

/** La clave con la que se busca el valor de un dato de un año (o de siempre, `null`). */
export const claveDeDato = (dato: DatoDeBiblioteca, anio: number | null) => `${dato}|${anio ?? 'todo'}`;

const delAnio = (fecha: string, anio: number | null) => anio === null || new Date(fecha).getFullYear() === anio;

/**
 * Cuánto da un dato:
 * - **Libros terminados:** los que llegaron al final. En un año, los que terminaron ese año: su última sesión es de
 *   ese año (un libro terminado sin sesiones solo cuenta en "siempre").
 * - **Páginas leídas:** lo que avanzó cada sesión por las páginas de su libro.
 * - **Horas leídas:** el tiempo de las sesiones.
 * Los Journals no son libros: no cuentan.
 */
export function valorDeDato(dato: DatoDeBiblioteca, anio: number | null, piezas: readonly Pieza[], sesiones: readonly Sesion[]): number {
  const libros = new Map(piezas.filter((p) => p.kind !== 'journal').map((p) => [p.id, p]));
  const enElAnio = sesiones.filter((s) => libros.has(s.item_id) && delAnio(s.ended_at, anio));
  if (dato === 'hoursRead') return enElAnio.reduce((t, s) => t + Math.max(0, s.seconds), 0) / 3600;
  if (dato === 'pagesRead') {
    return Math.round(
      enElAnio.reduce((t, s) => {
        const paginas = libros.get(s.item_id)?.page_count ?? 0;
        const avance = (s.end_progress ?? 0) - (s.start_progress ?? 0);
        return t + Math.max(0, avance) * paginas;
      }, 0),
    );
  }
  const ultima = new Map<string, string>();
  for (const s of sesiones) if (s.ended_at > (ultima.get(s.item_id) ?? '')) ultima.set(s.item_id, s.ended_at);
  return [...libros.values()].filter((p) => {
    if (p.progress < TERMINADO) return false;
    if (anio === null) return true;
    const fin = ultima.get(p.id);
    return !!fin && delAnio(fin, anio);
  }).length;
}

/** Todos los valores que piden unos datos (`[dato, año]`), por su clave. */
export function valoresDeDatos(
  pedidos: readonly { dato: DatoDeBiblioteca; anio: number | null }[],
  piezas: readonly Pieza[],
  sesiones: readonly Sesion[],
): Map<string, number> {
  const valores = new Map<string, number>();
  for (const { dato, anio } of pedidos) {
    const clave = claveDeDato(dato, anio);
    if (!valores.has(clave)) valores.set(clave, valorDeDato(dato, anio, piezas, sesiones));
  }
  return valores;
}

/** El número como se lee: las horas con un decimal si son pocas; lo demás, entero con separador de miles. */
export function numeroDeDato(dato: DatoDeBiblioteca, valor: number, idioma: string): string {
  // Español de México: punto decimal y coma de miles ("1.8", "12,345").
  const formato = new Intl.NumberFormat(idioma === 'es' ? 'es-MX' : idioma, { maximumFractionDigits: dato === 'hoursRead' && valor < 10 ? 1 : 0 });
  return formato.format(valor);
}
