import type { DocumentoDeLienzo, ElementoDeLienzo, OrientacionDeLienzo } from '@/lib/library/canvas';
import { grosorDeLomo } from '@/lib/library/spines';

/**
 * El Journal como objeto (spec 13i, RF-JC1 – RF-JC9; T345): "the user chooses the object before they decorate the
 * object". Un Journal es una pieza de la librería con su portada: forma A5 (vertical u horizontal), encuadernación,
 * material y su color, contraportada, cantos de las páginas y el color del hilo o del espiral. Aquí, sin React, qué es
 * una portada válida y cuánto mide su lomo.
 */

export const ENCUADERNACIONES = ['hardcover', 'paperback', 'spiral', 'sewn'] as const;
export type Encuadernacion = (typeof ENCUADERNACIONES)[number];

/** Los seis materiales del MVP (RF-JC7): una textura en grises cada uno; el color va encima (RF-JC8). */
export const MATERIALES = ['leather', 'linen', 'velvet', 'wood', 'fabric', 'parchment'] as const;
export type Material = (typeof MATERIALES)[number];

export type PortadaDeJournal = {
  orientation: OrientacionDeLienzo;
  binding: Encuadernacion;
  material: Material;
  /** El color del material (HEX); KAVI no trae paletas (RF-JC9): empieza en un gris neutro. */
  color: string;
  /** La contraportada con material y color propios, o `null` para usar los de la portada (RF-JC9). */
  back: { material: Material; color: string } | null;
  /** El color de los cantos de las páginas; empiezan blancos (RF-JC9). */
  edges: string;
  /** El color del hilo (cosida) o del metal (espiral) (RF-JC4). */
  accent: string;
};

export const COLOR_NEUTRO = '#8C8C8C';
export const CANTO_BLANCO = '#F7F5EF';
export const METAL = '#B9B9B9';

export const PORTADA_POR_OMISION: PortadaDeJournal = {
  orientation: 'portrait',
  binding: 'hardcover',
  material: 'leather',
  color: COLOR_NEUTRO,
  back: null,
  edges: CANTO_BLANCO,
  accent: METAL,
};

/** Cuántas páginas puede tener un Journal y de cuánto en cuánto cambian. */
export const PAGINAS = { min: 20, max: 400, paso: 20, porOmision: 120 } as const;

const esColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const deLista = <T extends string>(lista: readonly T[], v: unknown, porOmision: T): T => (lista.includes(v as T) ? (v as T) : porOmision);

/** La portada tal como debe ser: lo que no se entiende vuelve a lo de omisión; los colores, en mayúscula. */
export function portadaValida(raw: unknown): PortadaDeJournal {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const atras = (p.back && typeof p.back === 'object' ? p.back : null) as Record<string, unknown> | null;
  return {
    orientation: p.orientation === 'landscape' ? 'landscape' : 'portrait',
    binding: deLista(ENCUADERNACIONES, p.binding, PORTADA_POR_OMISION.binding),
    material: deLista(MATERIALES, p.material, PORTADA_POR_OMISION.material),
    color: esColor(p.color) ? p.color.toUpperCase() : COLOR_NEUTRO,
    back: atras && esColor(atras.color) ? { material: deLista(MATERIALES, atras.material, PORTADA_POR_OMISION.material), color: atras.color.toUpperCase() } : null,
    edges: esColor(p.edges) ? p.edges.toUpperCase() : CANTO_BLANCO,
    accent: esColor(p.accent) ? p.accent.toUpperCase() : METAL,
  };
}

export function paginasValidas(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : PAGINAS.porOmision;
  return Math.min(PAGINAS.max, Math.max(PAGINAS.min, Math.round(v / PAGINAS.paso) * PAGINAS.paso));
}

/** El material y el color de la contraportada: los propios o los de la portada. */
export function contraportada(p: PortadaDeJournal): { material: Material; color: string } {
  return p.back ?? { material: p.material, color: p.color };
}

/**
 * El grosor del lomo en el librero (RF-JC5): la misma cuenta que un libro con esas páginas, así un Journal de 240
 * páginas mide como un libro de 240.
 */
export function lomoDeJournal(paginas: number | null | undefined): number {
  return grosorDeLomo(paginasValidas(paginas ?? PAGINAS.porOmision));
}

/** Quien escribe un Journal es su dueña: su nombre visible o, si no tiene, su usuario. */
export function nombreDeAutora(perfil: { display_name: string | null; username: string | null } | null | undefined): string | null {
  return perfil?.display_name?.trim() || perfil?.username?.trim() || null;
}

/**
 * Los Journals sin autor llevan el nombre de su dueña, como un libro lleva el de quien lo escribió. Los que se crean
 * ya lo guardan; esto cubre los hechos antes. Si nada cambia, devuelve la misma lista.
 */
export function conAutora<T extends { kind?: string; authors: string[] }>(piezas: T[], nombre: string | null): T[] {
  if (!nombre || !piezas.some((p) => p.kind === 'journal' && !p.authors.length)) return piezas;
  return piezas.map((p) => (p.kind === 'journal' && !p.authors.length ? { ...p, authors: [nombre] } : p));
}

// ─── Las páginas (13h, RF-CC2; T347) ──────────────────────────────────────────────

/**
 * Las páginas de un Journal son lienzos (`library_canvases`, contexto `journal`) de una página cada uno, en el orden
 * en que se hicieron.
 */
export function paginasEnOrden<T extends { created_at: string; id: string }>(lienzos: readonly T[]): T[] {
  return [...lienzos].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

/** Si aún cabe otra página: un Journal tiene las páginas que se le pusieron (RF-JC5). */
export function cabeOtraPagina(hechas: number, paginas: number | null | undefined): boolean {
  return hechas < paginasValidas(paginas ?? PAGINAS.porOmision);
}

/**
 * El Journal entero para hojearlo en libro real: un solo documento con una página por cada lienzo, cada pieza en la
 * suya y bloqueada (se ve, no se edita), y el color de cada página que tenga uno.
 */
export function paraHojear(lienzos: readonly { doc: DocumentoDeLienzo }[]): { doc: DocumentoDeLienzo; fondos: Record<string, string> } {
  const elements: ElementoDeLienzo[] = [];
  const fondos: Record<string, string> = {};
  lienzos.forEach((l, i) => {
    const pagina = i + 1;
    if (l.doc.background) fondos[String(pagina)] = l.doc.background;
    for (const e of l.doc.elements) if (e.page === 1) elements.push({ ...e, page: pagina, locked: true });
  });
  return { doc: { pages: Math.max(1, lienzos.length), elements }, fondos };
}
