import { type DocumentoDeLienzo, type ElementoDeLienzo, type OrientacionDeLienzo, RAIZ_DE_DOS } from '@/lib/library/canvas';
import { grosorDeLomo, LOMO_ALTO_IGUAL } from '@/lib/library/spines';

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
  /**
   * Las guardas (T367, pedido de Areli): el papel o la tela que forra el interior de las tapas. Al leerlo, se ven
   * después de la portada y antes de la contraportada: así se sabe que se está dentro del libro.
   */
  endpaper: { material: Material; color: string };
};

export const COLOR_NEUTRO = '#8C8C8C';
export const CANTO_BLANCO = '#F7F5EF';
export const METAL = '#B9B9B9';
/** Las guardas empiezan como papel color crema (pergamino). */
export const GUARDA_POR_OMISION = { material: 'parchment' as Material, color: '#EDE3CF' };

export const PORTADA_POR_OMISION: PortadaDeJournal = {
  orientation: 'portrait',
  binding: 'hardcover',
  material: 'leather',
  color: COLOR_NEUTRO,
  back: null,
  edges: CANTO_BLANCO,
  accent: METAL,
  endpaper: GUARDA_POR_OMISION,
};

/** Cuántas páginas puede tener un Journal y de cuánto en cuánto cambian. */
export const PAGINAS = { min: 20, max: 400, paso: 20, porOmision: 120 } as const;

const esColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const deLista = <T extends string>(lista: readonly T[], v: unknown, porOmision: T): T => (lista.includes(v as T) ? (v as T) : porOmision);

/** La portada tal como debe ser: lo que no se entiende vuelve a lo de omisión; los colores, en mayúscula. */
export function portadaValida(raw: unknown): PortadaDeJournal {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const atras = (p.back && typeof p.back === 'object' ? p.back : null) as Record<string, unknown> | null;
  const guarda = (p.endpaper && typeof p.endpaper === 'object' ? p.endpaper : {}) as Record<string, unknown>;
  return {
    orientation: p.orientation === 'landscape' ? 'landscape' : 'portrait',
    binding: deLista(ENCUADERNACIONES, p.binding, PORTADA_POR_OMISION.binding),
    material: deLista(MATERIALES, p.material, PORTADA_POR_OMISION.material),
    color: esColor(p.color) ? p.color.toUpperCase() : COLOR_NEUTRO,
    back: atras && esColor(atras.color) ? { material: deLista(MATERIALES, atras.material, PORTADA_POR_OMISION.material), color: atras.color.toUpperCase() } : null,
    edges: esColor(p.edges) ? p.edges.toUpperCase() : CANTO_BLANCO,
    accent: esColor(p.accent) ? p.accent.toUpperCase() : METAL,
    endpaper: {
      material: deLista(MATERIALES, guarda.material, GUARDA_POR_OMISION.material),
      color: esColor(guarda.color) ? guarda.color.toUpperCase() : GUARDA_POR_OMISION.color,
    },
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
 * en que se hicieron. Sus tapas (contexto `cover`) no son páginas.
 */
export function paginasEnOrden<T extends { created_at: string; id: string; context?: string }>(lienzos: readonly T[]): T[] {
  return lienzos.filter((l) => l.context !== 'cover').sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

/** Si aún cabe otra página: un Journal tiene las páginas que se le pusieron (RF-JC5). */
export function cabeOtraPagina(hechas: number, paginas: number | null | undefined): boolean {
  return hechas < paginasValidas(paginas ?? PAGINAS.porOmision);
}

/** El fondo de una tapa en el motor: su material con su color (13i, RF-JC8). */
export type FondoDeTapa = { color: string; material: Material };

/**
 * El Journal entero para hojearlo en libro real: un solo documento con una página por cada lienzo, cada pieza en la
 * suya y bloqueada (se ve, no se edita), y el color de cada página que tenga uno. Con su `portada` (T346), abre y
 * cierra con sus tapas: la portada y la contraportada con su material y lo que tengan decorado; y por dentro, sus
 * guardas (T367), como un libro: portada · guarda · páginas · (una hoja en blanco si son impares, para que la
 * contraportada cierre sola en libro real) · guarda · contraportada. `primeraPagina`: la hoja de la página 1.
 */
export function paraHojear(
  lienzos: readonly { doc: DocumentoDeLienzo }[],
  tapas?: { portada: PortadaDeJournal; front?: { doc: DocumentoDeLienzo }; back?: { doc: DocumentoDeLienzo } },
): { doc: DocumentoDeLienzo; fondos: Record<string, string | FondoDeTapa>; primeraPagina: number } {
  const elements: ElementoDeLienzo[] = [];
  const fondos: Record<string, string | FondoDeTapa> = {};
  const poner = (doc: DocumentoDeLienzo | undefined, pagina: number) => {
    for (const e of doc?.elements ?? []) if (e.page === 1) elements.push({ ...e, page: pagina, locked: true });
  };
  // Con tapas: la portada y su guarda van antes de la página 1.
  const antes = tapas ? 2 : 0;
  if (tapas) {
    fondos['1'] = fondoDeCara(tapas.portada, 'front');
    poner(tapas.front?.doc, 1);
    fondos['2'] = tapas.portada.endpaper;
  }
  lienzos.forEach((l, i) => {
    const pagina = antes + i + 1;
    if (l.doc.background) fondos[String(pagina)] = l.doc.background;
    poner(l.doc, pagina);
  });
  let pages = Math.max(1, antes + lienzos.length);
  if (tapas) {
    const enBlanco = lienzos.length % 2 === 1 ? 1 : 0;
    const guarda = antes + lienzos.length + enBlanco + 1;
    pages = guarda + 1;
    fondos[String(guarda)] = tapas.portada.endpaper;
    fondos[String(pages)] = fondoDeCara(tapas.portada, 'back');
    poner(tapas.back?.doc, pages);
  }
  return { doc: { pages, elements }, fondos, primeraPagina: antes + 1 };
}

// ─── Las tapas (13i, RF-JC10; T346) ───────────────────────────────────────────────

export const CARAS = ['front', 'spine', 'back'] as const;
export type Cara = (typeof CARAS)[number];

/** La tapa decorada de cada cara (lienzos con contexto `cover`); la que no se ha decorado no está. */
export function tapasDe<T extends { context?: string; face?: string | null }>(lienzos: readonly T[]): Partial<Record<Cara, T>> {
  const tapas: Partial<Record<Cara, T>> = {};
  for (const l of lienzos) if (l.context === 'cover' && CARAS.includes(l.face as Cara)) tapas[l.face as Cara] = l;
  return tapas;
}

/**
 * Alto ÷ ancho de una cara: la portada y la contraportada son A5 (vertical u horizontal); el lomo es alto y angosto,
 * con la proporción del lomo en el librero, que engorda con las páginas (RF-JC5).
 */
export function proporcionDeCara(orientacion: OrientacionDeLienzo, cara: Cara, paginas: number | null | undefined): number {
  if (cara === 'spine') return LOMO_ALTO_IGUAL / lomoDeJournal(paginas);
  return orientacion === 'landscape' ? 1 / RAIZ_DE_DOS : RAIZ_DE_DOS;
}

/** El material y el color sobre el que se decora una cara: la contraportada puede tener los suyos (RF-JC9). */
export function fondoDeCara(portada: PortadaDeJournal, cara: Cara): FondoDeTapa {
  return cara === 'back' ? contraportada(portada) : { material: portada.material, color: portada.color };
}
