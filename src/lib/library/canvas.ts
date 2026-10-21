import type { AnotacionEnMotor, FormaDeLienzo } from '@/lib/library/reader-protocol';
import { FORMAS_DE_LIENZO } from '@/lib/library/reader-protocol';
import type { LibraryLocator } from '@/types/domain';

/**
 * El lienzo creativo (spec 13h; T351): un recorte de un libro o una página del Journal. Es un documento con su
 * formato (A5, 1 : √2, vertical u horizontal) y sus elementos en orden de capa. Cada elemento guarda su lugar en
 * 0–1 respecto a su página (RF-CC5): se ve idéntico en cualquier pantalla, solo más grande o más chico.
 *
 * El motor del lector lo dibuja como páginas en blanco con lo pegado encima (13h §10): aquí está el paso de un
 * elemento a lo que el motor sabe pintar (`aMotor`) y lo que se le hace a un documento, sin React, para probarlo
 * solo y usarlo igual en Supabase, el demo y la cola sin red.
 */

export const TIPOS_DE_ELEMENTO = ['textbox', 'image', 'sticker', 'shape'] as const;
export type TipoDeElemento = (typeof TIPOS_DE_ELEMENTO)[number];
export type OrientacionDeLienzo = 'portrait' | 'landscape';

export type ElementoDeLienzo = {
  id: string;
  type: TipoDeElemento;
  /** Página del lienzo (1…), y la esquina de arriba a la izquierda y el ancho en 0–1 de ella. */
  page: number;
  x: number;
  y: number;
  w: number;
  /** Alto entre ancho. */
  ar: number;
  /** Giro en grados. */
  rot: number;
  z: number;
  locked: boolean;
  /** Los de un grupo se eligen y se mueven juntos (RF-CC9). */
  group: string | null;
  /**
   * Color (texto, forma) y tamaño de la letra (1 = normal); opacidad (0.1–1), borde (grosor en fracción del ancho de
   * la página y su color) y sombra (RF-CC9, T342).
   */
  style: { color?: string; size?: number; opacity?: number; border?: { width: number; color: string }; shadow?: boolean };
  /** Texto; forma; ruta de la imagen en R2; sticker (`<paquete>/<nombre>`) y su nombre. */
  content: { text?: string; shape?: FormaDeLienzo; path?: string; sticker?: string; label?: string; src?: string };
};

/** `background`: el color de las páginas (RF-CC12, T342); sin él, papel blanco. */
export type DocumentoDeLienzo = { pages: number; background?: string; elements: ElementoDeLienzo[] };

/** Los grosores de borde que se ofrecen, en fracción del ancho de la página. */
export const BORDES = { thin: 0.004, thick: 0.012 } as const;

export const DOCUMENTO_VACIO: DocumentoDeLienzo = { pages: 1, elements: [] };
/** Proporción de la serie ISO A (A4, A5): alto entre ancho de una página vertical. */
export const RAIZ_DE_DOS = Math.SQRT2;
/** Hasta dónde llega un documento (13h §10): más no cabe en la base y no hace falta. */
export const MAX_ELEMENTOS = 400;
export const MAX_PAGINAS = 40;
const MAX_TEXTO = 1000;

const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const entre = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const esColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined);

/**
 * Un elemento que llegó de la base, de la cola o del motor, ya en sus límites; `null` si no sirve. Nada de lo que
 * no se conoce pasa: un documento viejo o roto no rompe el lienzo.
 */
export function elementoValido(raw: unknown, paginas = MAX_PAGINAS): ElementoDeLienzo | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.id !== 'string' || !e.id || !TIPOS_DE_ELEMENTO.includes(e.type as TipoDeElemento)) return null;
  const tipo = e.type as TipoDeElemento;
  const estilo = (e.style && typeof e.style === 'object' ? e.style : {}) as Record<string, unknown>;
  const contenido = (e.content && typeof e.content === 'object' ? e.content : {}) as Record<string, unknown>;
  const forma = FORMAS_DE_LIENZO.includes(contenido.shape as FormaDeLienzo) ? (contenido.shape as FormaDeLienzo) : undefined;
  return {
    id: e.id.slice(0, 64),
    type: tipo,
    page: numero(e.page) ? entre(Math.round(e.page), 1, paginas) : 1,
    x: numero(e.x) ? entre(e.x, -0.5, 1.5) : 0.1,
    y: numero(e.y) ? entre(e.y, -0.5, 1.5) : 0.1,
    w: numero(e.w) ? entre(e.w, 0.02, 2) : 0.3,
    ar: numero(e.ar) ? entre(e.ar, 0.05, 20) : 1,
    rot: numero(e.rot) ? ((Math.round(e.rot) % 360) + 360) % 360 : 0,
    z: numero(e.z) ? e.z : 0,
    locked: e.locked === true,
    group: typeof e.group === 'string' && e.group ? e.group.slice(0, 64) : null,
    style: {
      ...(esColor(estilo.color) ? { color: estilo.color } : {}),
      ...(numero(estilo.size) ? { size: entre(estilo.size, 0.5, 3) } : {}),
      ...(numero(estilo.opacity) && estilo.opacity < 1 ? { opacity: entre(estilo.opacity, 0.1, 1) } : {}),
      ...(bordeValido(estilo.border) ? { border: bordeValido(estilo.border) as { width: number; color: string } } : {}),
      ...(estilo.shadow === true ? { shadow: true } : {}),
    },
    content: {
      ...(tipo === 'textbox' ? { text: texto(contenido.text, MAX_TEXTO) ?? '' } : {}),
      ...(tipo === 'shape' ? { shape: forma ?? 'rect' } : {}),
      ...(tipo === 'image' && typeof contenido.path === 'string' ? { path: contenido.path.slice(0, 300) } : {}),
      ...(tipo === 'sticker' && typeof contenido.sticker === 'string' ? { sticker: contenido.sticker.slice(0, 120) } : {}),
      ...(tipo === 'sticker' && typeof contenido.label === 'string' ? { label: contenido.label.slice(0, 80) } : {}),
    },
  };
}

function bordeValido(raw: unknown): { width: number; color: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  return numero(b.width) && b.width > 0 && esColor(b.color) ? { width: entre(b.width, 0.001, 0.05), color: b.color } : null;
}

/** El documento tal como debe ser: páginas en su rango y elementos válidos, sin repetir id, en orden de capa. */
export function documentoValido(raw: unknown): DocumentoDeLienzo {
  if (!raw || typeof raw !== 'object') return DOCUMENTO_VACIO;
  const d = raw as Record<string, unknown>;
  const pages = numero(d.pages) ? entre(Math.round(d.pages), 1, MAX_PAGINAS) : 1;
  const background = esColor(d.background) ? d.background.toUpperCase() : undefined;
  const vistos = new Set<string>();
  const elements = (Array.isArray(d.elements) ? d.elements : [])
    .map((e) => elementoValido(e, pages))
    .filter((e): e is ElementoDeLienzo => !!e && !vistos.has(e.id) && !!vistos.add(e.id))
    .slice(0, MAX_ELEMENTOS)
    .sort((a, b) => a.z - b.z);
  return { pages, ...(background ? { background } : {}), elements };
}

/**
 * Lo que el motor pinta de cada elemento (13h §10): un elemento del lienzo es algo pegado en su página. `fuentes`
 * da la dirección de cada imagen (por su ruta) y de cada sticker de la tienda (por su id).
 */
export function aMotor(doc: DocumentoDeLienzo, fuentes: { imagenes?: ReadonlyMap<string, string>; stickers?: ReadonlyMap<string, string> } = {}): AnotacionEnMotor[] {
  return doc.elements.map((e) => {
    const locator: LibraryLocator = { page: e.page, x: e.x, y: e.y, w: e.w, ar: e.ar };
    const comun = {
      ...(e.rot ? { rot: e.rot } : {}),
      ...(e.group ? { group: e.group } : {}),
      ...(e.style.opacity ? { opacity: e.style.opacity } : {}),
      ...(e.style.border ? { border: e.style.border } : {}),
      ...(e.style.shadow ? { shadow: true } : {}),
    };
    const content: AnotacionEnMotor['content'] =
      e.type === 'textbox'
        ? { text: e.content.text ?? '', ...(e.style.color ? { color: e.style.color } : {}), ...(e.style.size ? { size: e.style.size } : {}), ...comun }
        : e.type === 'shape'
          ? { shape: e.content.shape ?? 'rect', ...(e.style.color ? { color: e.style.color } : {}), ...comun }
          : e.type === 'image'
            ? { ...(e.content.path && fuentes.imagenes?.get(e.content.path) ? { src: fuentes.imagenes.get(e.content.path) } : {}), ...comun }
            : {
                sticker: e.content.sticker,
                label: e.content.label,
                ...(e.content.sticker && fuentes.stickers?.get(e.content.sticker) ? { src: fuentes.stickers.get(e.content.sticker) } : {}),
                ...comun,
              };
    return { id: e.id, kind: e.type, locator, z: e.z, locked: e.locked, content };
  });
}

// ─── Lo que se le hace a un documento ─────────────────────────────────────────────

const conElementos = (doc: DocumentoDeLienzo, elements: ElementoDeLienzo[]): DocumentoDeLienzo => ({ ...doc, elements: [...elements].sort((a, b) => a.z - b.z) });
const tope = (doc: DocumentoDeLienzo) => doc.elements.reduce((m, e) => Math.max(m, e.z), 0);
const fondo = (doc: DocumentoDeLienzo) => doc.elements.reduce((m, e) => Math.min(m, e.z), 0);

/** Agrega un elemento hasta arriba. */
export function agregar(doc: DocumentoDeLienzo, e: Omit<ElementoDeLienzo, 'z'>): DocumentoDeLienzo {
  if (doc.elements.length >= MAX_ELEMENTOS) return doc;
  const nuevo = elementoValido({ ...e, z: tope(doc) + 1 }, doc.pages);
  return nuevo ? conElementos(doc, [...doc.elements.filter((x) => x.id !== nuevo.id), nuevo]) : doc;
}

/** Cambia un elemento (lo que no se pasa, se queda). Lo bloqueado no se mueve ni cambia de tamaño. */
export function cambiar(doc: DocumentoDeLienzo, id: string, cambio: Partial<Omit<ElementoDeLienzo, 'id' | 'type'>>): DocumentoDeLienzo {
  return conElementos(
    doc,
    doc.elements.map((e) => {
      if (e.id !== id) return e;
      const lugar = e.locked && cambio.locked !== false ? { page: e.page, x: e.x, y: e.y, w: e.w, ar: e.ar, rot: e.rot } : {};
      // En `style`, una clave con `undefined` se quita (sin borde, sin sombra, opacidad entera).
      return elementoValido({ ...e, ...cambio, ...lugar, style: { ...e.style, ...cambio.style }, content: { ...e.content, ...cambio.content } }, doc.pages) ?? e;
    }),
  );
}

/** Lo que dice el motor al soltar algo: su nuevo lugar (y giro). */
export function mover(doc: DocumentoDeLienzo, id: string, locator: LibraryLocator, rot?: number): DocumentoDeLienzo {
  return cambiar(doc, id, {
    ...(numero(locator.page) ? { page: locator.page } : {}),
    ...(numero(locator.x) ? { x: locator.x } : {}),
    ...(numero(locator.y) ? { y: locator.y } : {}),
    ...(numero(locator.w) ? { w: locator.w } : {}),
    ...(numero(locator.ar) ? { ar: locator.ar } : {}),
    ...(numero(rot) ? { rot } : {}),
  });
}

/** Los ids que van juntos: los pedidos y, de cada uno, todo su grupo. */
export function conSuGrupo(doc: DocumentoDeLienzo, ids: readonly string[]): string[] {
  const grupos = new Set(doc.elements.filter((e) => ids.includes(e.id) && e.group).map((e) => e.group));
  return doc.elements.filter((e) => ids.includes(e.id) || (e.group && grupos.has(e.group))).map((e) => e.id);
}

export function quitar(doc: DocumentoDeLienzo, ids: readonly string[]): DocumentoDeLienzo {
  const fuera = new Set(conSuGrupo(doc, ids));
  return conElementos(doc, doc.elements.filter((e) => !fuera.has(e.id)));
}

/** Traer al frente o mandar atrás, conservando el orden entre los que se mueven. */
export function capa(doc: DocumentoDeLienzo, ids: readonly string[], hacia: 'front' | 'back'): DocumentoDeLienzo {
  const mueven = new Set(conSuGrupo(doc, ids));
  const orden = doc.elements.filter((e) => mueven.has(e.id));
  const base = hacia === 'front' ? tope(doc) + 1 : fondo(doc) - orden.length;
  const nuevos = new Map(orden.map((e, i) => [e.id, base + i]));
  return conElementos(doc, doc.elements.map((e) => (nuevos.has(e.id) ? { ...e, z: nuevos.get(e.id) as number } : e)));
}

export function bloquear(doc: DocumentoDeLienzo, ids: readonly string[], locked: boolean): DocumentoDeLienzo {
  const cuales = new Set(conSuGrupo(doc, ids));
  return conElementos(doc, doc.elements.map((e) => (cuales.has(e.id) ? { ...e, locked } : e)));
}

/** Copias un poco corridas, arriba de todo; un grupo duplicado es otro grupo. `nuevoId` da los ids nuevos. */
export function duplicar(doc: DocumentoDeLienzo, ids: readonly string[], nuevoId: () => string): { doc: DocumentoDeLienzo; ids: string[] } {
  const originales = doc.elements.filter((e) => conSuGrupo(doc, ids).includes(e.id));
  if (!originales.length || doc.elements.length + originales.length > MAX_ELEMENTOS) return { doc, ids: [] };
  const grupos = new Map<string, string>();
  let z = tope(doc);
  const copias = originales.map((e) => {
    const group = e.group ? (grupos.get(e.group) ?? grupos.set(e.group, nuevoId()).get(e.group) ?? null) : null;
    return { ...e, id: nuevoId(), x: e.x + 0.03, y: e.y + 0.03, z: ++z, locked: false, group };
  });
  return { doc: conElementos(doc, [...doc.elements, ...copias]), ids: copias.map((c) => c.id) };
}

/** Junta varios en un grupo (RF-CC9); con menos de dos no hay grupo. */
export function agrupar(doc: DocumentoDeLienzo, ids: readonly string[], grupo: string): DocumentoDeLienzo {
  const cuales = new Set(conSuGrupo(doc, ids));
  if (cuales.size < 2) return doc;
  return conElementos(doc, doc.elements.map((e) => (cuales.has(e.id) ? { ...e, group: grupo } : e)));
}

export function desagrupar(doc: DocumentoDeLienzo, ids: readonly string[]): DocumentoDeLienzo {
  const cuales = new Set(conSuGrupo(doc, ids));
  return conElementos(doc, doc.elements.map((e) => (cuales.has(e.id) ? { ...e, group: null } : e)));
}

/** El tamaño de una página del lienzo en pantalla, para un ancho dado: la proporción nunca cambia (RF-CC4). */
export function proporcionDePagina(orientacion: OrientacionDeLienzo): number {
  return orientacion === 'landscape' ? 1 / RAIZ_DE_DOS : RAIZ_DE_DOS;
}

/** El color de las páginas (RF-CC12); `null` vuelve al papel blanco. */
export function conFondo(doc: DocumentoDeLienzo, color: string | null): DocumentoDeLienzo {
  const { background: _antes, ...resto } = doc;
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? { ...resto, background: color.toUpperCase() } : resto;
}

/** Cambia el estilo de varios a la vez (con su grupo), como lo hace el panel de estilo. */
export function conEstilo(doc: DocumentoDeLienzo, ids: readonly string[], estilo: Partial<ElementoDeLienzo['style']>): DocumentoDeLienzo {
  return conSuGrupo(doc, ids).reduce((d, id) => cambiar(d, id, { style: estilo }), doc);
}
