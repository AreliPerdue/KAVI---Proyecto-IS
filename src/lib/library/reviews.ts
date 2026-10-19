/**
 * Mis reseñas (spec 13d, RF-BF8 – RF-BF10; T295): filtrar y ordenar todas las fichas por cualquier campo de
 * escala, opción o fecha, y los totales de arriba. Sin React.
 *
 * Un campo se reconoce por su **id**, igual en todas las plantillas que lo comparten: las incluidas usan los
 * mismos (`stars`, `genre`…), así "Estrellas ≥ 4" junta la Reseña rápida, el Diario y el Romance.
 */
import { camposDe, valorDe } from '@/lib/library/cards';
import type { CardField, LibraryCard, LibraryCardTemplate } from '@/types/domain';

export type CampoFiltrable = { id: string; type: 'scale' | 'choice' | 'date'; label: string; max: number; options: string[] };

/** Los campos por los que se puede filtrar u ordenar: los de escala, opción y fecha de las plantillas en uso. */
export function camposFiltrables(plantillas: readonly LibraryCardTemplate[], fichas: readonly Pick<LibraryCard, 'template_id'>[]): CampoFiltrable[] {
  const usadas = new Set(fichas.map((f) => f.template_id));
  const porId = new Map<string, CampoFiltrable>();
  for (const p of plantillas) {
    if (!usadas.has(p.id)) continue;
    for (const c of camposDe(p.fields)) {
      if (c.type !== 'scale' && c.type !== 'choice' && c.type !== 'date') continue;
      const previo = porId.get(c.id);
      if (previo && previo.type !== c.type) continue;
      porId.set(c.id, {
        id: c.id,
        type: c.type,
        label: previo?.label ?? c.label,
        max: Math.max(previo?.max ?? 0, c.max === 10 ? 10 : 5),
        options: [...new Set([...(previo?.options ?? []), ...(c.options ?? [])])],
      });
    }
  }
  return [...porId.values()];
}

/** Un filtro: escala de al menos `min`, la opción `opcion`, o fecha del año `anio`. */
export type FiltroDeResena =
  | { campo: string; tipo: 'scale'; min: number }
  | { campo: string; tipo: 'choice'; opcion: string }
  | { campo: string; tipo: 'date'; anio: number };

/** Lo que vale un campo en una ficha, revisado con el campo de su propia plantilla. */
function valorEn(ficha: LibraryCard, campo: string, plantillas: ReadonlyMap<string, readonly CardField[]>) {
  const c = plantillas.get(ficha.template_id)?.find((x) => x.id === campo);
  return c ? valorDe(c, ficha.values[campo]) : null;
}

const camposPorPlantilla = (plantillas: readonly LibraryCardTemplate[]) => new Map(plantillas.map((p) => [p.id, camposDe(p.fields)]));

/** Las fichas que cumplen todos los filtros (RF-BF9). */
export function filtrarResenas(fichas: readonly LibraryCard[], plantillas: readonly LibraryCardTemplate[], filtros: readonly FiltroDeResena[]): LibraryCard[] {
  const campos = camposPorPlantilla(plantillas);
  return fichas.filter((f) =>
    filtros.every((filtro) => {
      const v = valorEn(f, filtro.campo, campos);
      if (filtro.tipo === 'scale') return typeof v === 'number' && v >= filtro.min;
      if (filtro.tipo === 'choice') return Array.isArray(v) && v.includes(filtro.opcion);
      return typeof v === 'string' && Number(v.slice(0, 4)) === filtro.anio;
    }),
  );
}

/** El orden: lo más reciente primero, o por un campo de escala o fecha (lo más alto o lo más nuevo primero). */
export type OrdenDeResenas = { por: 'recent' } | { por: 'field'; campo: string };

export function ordenarResenas(fichas: readonly LibraryCard[], plantillas: readonly LibraryCardTemplate[], orden: OrdenDeResenas): LibraryCard[] {
  const recientes = [...fichas].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  if (orden.por === 'recent') return recientes;
  const campos = camposPorPlantilla(plantillas);
  const clave = (f: LibraryCard) => {
    const v = valorEn(f, orden.campo, campos);
    return typeof v === 'number' ? String(v).padStart(3, '0') : typeof v === 'string' ? v : '';
  };
  // Las que no tienen ese campo van al final; entre iguales, la más reciente primero.
  return recientes.sort((a, b) => {
    const ka = clave(a);
    const kb = clave(b);
    if (!ka || !kb) return ka ? -1 : kb ? 1 : 0;
    return kb.localeCompare(ka);
  });
}

/** Los años que aparecen en un campo de fecha (para "lo que leí en 2026"), del más nuevo al más viejo. */
export function aniosDe(fichas: readonly LibraryCard[], plantillas: readonly LibraryCardTemplate[], campo: string): number[] {
  const campos = camposPorPlantilla(plantillas);
  const anios = new Set<number>();
  for (const f of fichas) {
    const v = valorEn(f, campo, campos);
    if (typeof v === 'string') anios.add(Number(v.slice(0, 4)));
  }
  return [...anios].sort((a, b) => b - a);
}

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Los totales de arriba (RF-BF10): cuántos libros tienen ficha, el promedio de estrellas (una escala de
 * estrellas de 1 a 10 cuenta como la mitad) y el género más elegido.
 */
export function totalesDeResenas(fichas: readonly LibraryCard[], plantillas: readonly LibraryCardTemplate[]): { libros: number; promedio: number | null; genero: string | null } {
  const campos = camposPorPlantilla(plantillas);
  const estrellas: number[] = [];
  const generos = new Map<string, number>();
  for (const f of fichas) {
    const lista = campos.get(f.template_id) ?? [];
    const escala = lista.find((c) => c.id === 'stars' && c.type === 'scale') ?? lista.find((c) => c.type === 'scale' && (c.symbol ?? 'star') === 'star');
    const v = escala ? valorDe(escala, f.values[escala.id]) : null;
    if (typeof v === 'number') estrellas.push(escala?.max === 10 ? v / 2 : v);
    const genero = lista.find((c) => c.type === 'choice' && (c.id === 'genre' || ['genero', 'genre'].includes(sinAcentos(c.label))));
    const g = genero ? valorDe(genero, f.values[genero.id]) : null;
    if (Array.isArray(g)) for (const o of g) generos.set(o, (generos.get(o) ?? 0) + 1);
  }
  const top = [...generos].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return {
    libros: new Set(fichas.map((f) => f.item_id)).size,
    promedio: estrellas.length ? Math.round((estrellas.reduce((s, x) => s + x, 0) / estrellas.length) * 10) / 10 : null,
    genero: top?.[0] ?? null,
  };
}
