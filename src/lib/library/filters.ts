import { colorDePortada } from './shelf';

import { porNumero } from './series';

import type { LibraryItem, LibraryShelfItem } from '@/types/domain';

/**
 * Buscar, filtrar y ordenar la librería (spec 13a, RF-BL8, RF-BL10, RF-BL18; T280). Sin React: la
 * pantalla solo le pasa lo que eligió la persona.
 */

/**
 * Cómo se ordena (RF-BL8). "Como los acomodé" es el de omisión: en "Todos" usa el lugar de cada pieza
 * y dentro de un librero, el del librero; en los dos se acomoda arrastrando (RF-BL7).
 */
export type OrdenBiblioteca = 'manual' | 'recent' | 'title' | 'author' | 'category' | 'series';
export const ORDENES: readonly OrdenBiblioteca[] = ['manual', 'recent', 'title', 'author', 'category', 'series'];
export const ORDEN_POR_OMISION: OrdenBiblioteca = 'manual';

export function ordenValido(valor: unknown): OrdenBiblioteca {
  return ORDENES.includes(valor as OrdenBiblioteca) ? (valor as OrdenBiblioteca) : ORDEN_POR_OMISION;
}

/** Rango de fechas en que se agregó: los atajos y uno propio. */
export type RangoDeFecha = 'week' | 'month' | 'year' | { desde: string; hasta: string };

export type FiltrosBiblioteca = {
  fecha: RangoDeFecha | null;
  generos: readonly string[];
  autores: readonly string[];
  /** Un color (`#RRGGBB`): aparecen las portadas que se le parecen, no solo las idénticas. */
  color: string | null;
  /** Ids de sagas (RF-BL25). */
  sagas: readonly string[];
};

export const SIN_FILTROS: FiltrosBiblioteca = { fecha: null, generos: [], autores: [], color: null, sagas: [] };

/** Cuántos filtros hay activos: lo que dice el botón de filtros, como en el calendario. */
export function cuantosFiltros(f: FiltrosBiblioteca): number {
  return (f.fecha ? 1 : 0) + f.generos.length + f.autores.length + (f.color ? 1 : 0) + f.sagas.length;
}

/** Sin acentos ni mayúsculas, para buscar y comparar como lo haría una persona. */
export function plegar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

const comparar = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true });

/** Los géneros y autores que hay en la librería, para ofrecerlos como filtros (sin repetir). */
export function opcionesDeFiltro(items: readonly LibraryItem[]): { generos: string[]; autores: string[] } {
  const unicos = (valores: string[]) => {
    const vistos = new Map<string, string>();
    for (const v of valores) if (v.trim() && !vistos.has(plegar(v))) vistos.set(plegar(v), v.trim());
    return [...vistos.values()].sort(comparar);
  };
  return { generos: unicos(items.flatMap((i) => i.genres)), autores: unicos(items.flatMap((i) => i.authors)) };
}

// ─── Color ───────────────────────────────────────────────────────────────────

function aLab(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const lineal = [0, 2, 4].map((i) => {
    const c = Number.parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const [r, g, b] = lineal;
  const xyz = [(r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, r * 0.2126 + g * 0.7152 + b * 0.0722, (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = xyz.map(f);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * Qué tan distintos se ven dos colores (ΔE en el espacio Lab, que sigue a cómo los percibe el ojo).
 * Debajo de 2 casi no se distinguen; un azul marino y un azul cielo andan por 40.
 */
export function distanciaDeColor(a: string, b: string): number {
  const [l1, a1, b1] = aLab(a);
  const [l2, a2, b2] = aLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** Cuánto se puede alejar una portada del color elegido y seguir contando como "de ese color". */
export const UMBRAL_DE_COLOR = 30;

// ─── Fechas ──────────────────────────────────────────────────────────────────

/** Desde y hasta (incluidos) de un rango, en milisegundos y en la zona del dispositivo. */
export function limitesDe(rango: RangoDeFecha, hoy: Date = new Date()): [number, number] {
  const finDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999).getTime();
  const haceDias = (n: number) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - n).getTime();
  if (rango === 'week') return [haceDias(6), finDeHoy];
  if (rango === 'month') return [haceDias(29), finDeHoy];
  if (rango === 'year') return [new Date(hoy.getFullYear(), 0, 1).getTime(), finDeHoy];
  const [y1, m1, d1] = rango.desde.split('-').map(Number);
  const [y2, m2, d2] = rango.hasta.split('-').map(Number);
  return [new Date(y1, m1 - 1, d1).getTime(), new Date(y2, m2 - 1, d2, 23, 59, 59, 999).getTime()];
}

// ─── Todo junto ──────────────────────────────────────────────────────────────

export type Consulta = {
  busqueda: string;
  orden: OrdenBiblioteca;
  filtros: FiltrosBiblioteca;
  /** El librero elegido; `null` es "Todos". */
  libreroId: string | null;
  /** A qué libreros pertenece cada pieza y en qué orden (RF-BL6, RF-BL7). */
  enLibreros: readonly LibraryShelfItem[];
  /** Nombre de cada saga, para ordenar por saga (RF-BL25). */
  nombresDeSagas?: ReadonlyMap<string, string>;
  hoy?: Date;
};

/**
 * Las piezas que se ven y en qué orden. Primero el librero, luego la búsqueda (todas las palabras,
 * en título, autor, categoría o género, RF-BL18), luego los filtros (todos a la vez, RF-BL10) y al
 * final el orden (RF-BL8); empates, por título.
 */
export function piezasVisibles(items: readonly LibraryItem[], c: Consulta): LibraryItem[] {
  const ordenEnLibrero = new Map<string, number>();
  if (c.libreroId) for (const s of c.enLibreros) if (s.shelf_id === c.libreroId) ordenEnLibrero.set(s.item_id, Number(s.sort_order));

  let lista = c.libreroId ? items.filter((i) => ordenEnLibrero.has(i.id)) : [...items];

  const palabras = plegar(c.busqueda).split(/\s+/).filter(Boolean);
  if (palabras.length) {
    lista = lista.filter((i) => {
      const texto = plegar([i.title, ...i.authors, i.category ?? '', ...i.genres].join(' '));
      return palabras.every((p) => texto.includes(p));
    });
  }

  const { fecha, generos, autores, color } = c.filtros;
  if (fecha) {
    const [desde, hasta] = limitesDe(fecha, c.hoy);
    lista = lista.filter((i) => {
      const t = new Date(i.created_at).getTime();
      return t >= desde && t <= hasta;
    });
  }
  if (generos.length) {
    const buscados = generos.map(plegar);
    lista = lista.filter((i) => i.genres.some((g) => buscados.includes(plegar(g))));
  }
  if (autores.length) {
    const buscados = autores.map(plegar);
    lista = lista.filter((i) => i.authors.some((a) => buscados.includes(plegar(a))));
  }
  if (color) lista = lista.filter((i) => distanciaDeColor(colorDePortada(i), color) <= UMBRAL_DE_COLOR);
  if (c.filtros.sagas.length) lista = lista.filter((i) => !!i.series_id && c.filtros.sagas.includes(i.series_id));

  const porTitulo = (a: LibraryItem, b: LibraryItem) => comparar(a.title, b.title);
  const vacioAlFinal = (a: string | undefined | null, b: string | undefined | null) => (a ? (b ? comparar(a, b) : -1) : b ? 1 : 0);
  return lista.sort((a, b) => {
    switch (c.orden) {
      case 'title':
        return porTitulo(a, b);
      case 'author':
        return vacioAlFinal(a.authors[0], b.authors[0]) || porTitulo(a, b);
      case 'category':
        return vacioAlFinal(a.category, b.category) || porTitulo(a, b);
      case 'series': {
        // Por nombre de saga y dentro de ella por número; los que no tienen saga, al final por título.
        const sa = a.series_id ? c.nombresDeSagas?.get(a.series_id) : undefined;
        const sb = b.series_id ? c.nombresDeSagas?.get(b.series_id) : undefined;
        return vacioAlFinal(sa, sb) || (sa && sa === sb ? porNumero(a, b) : 0) || porTitulo(a, b);
      }
      case 'manual':
        return c.libreroId
          ? (ordenEnLibrero.get(a.id) ?? 0) - (ordenEnLibrero.get(b.id) ?? 0)
          : Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || b.created_at.localeCompare(a.created_at);
      default:
        return b.created_at.localeCompare(a.created_at) || porTitulo(a, b);
    }
  });
}

/**
 * El orden que le toca a una pieza movida: el punto medio entre sus nuevos vecinos (como en Listas),
 * así solo se escribe una fila. Al principio o al final se separa 1024 del vecino. No se divide entre
 * dos: el lugar de las piezas en "Todos" es negativo (menos el instante en que se crearon) y la mitad
 * de un negativo queda **después**, no antes.
 */
export function ordenEntre(antes: number | undefined, despues: number | undefined): number {
  if (antes !== undefined && despues !== undefined) return (antes + despues) / 2;
  if (antes !== undefined) return antes + 1024;
  if (despues !== undefined) return despues - 1024;
  return 1024;
}
