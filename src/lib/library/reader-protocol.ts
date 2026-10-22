import { Platform } from 'react-native';

import { SITIO } from '@/lib/api';
import { localizadorDeTexto, localizadorPegado, TEXTO_MAXIMO_DE_SUBRAYADO } from '@/lib/library/annotations';
import { type HerramientaDeLapiz, type Trazo, trazosValidos } from '@/lib/library/ink';
import type { FormaDeLeer } from '@/lib/library/reading-mode';
import { type LetraDeLectura, tamanoValido } from '@/lib/library/reader-text';
import type { LibraryAnnotationKind, LibraryItem, LibraryLocator } from '@/types/domain';

/**
 * Lo que la app y el motor de lectura se dicen (spec 13b §4, T279). El motor es `public/reader/`:
 * una página web que la app abre en un iframe (web) o en un WebView (teléfono).
 */

/**
 * Dónde vive el motor. En la web, del mismo origen (la CSP no deja enmarcar otro sitio). En el teléfono
 * viene empaquetado en la app (T285) y esta es solo su dirección base: la web publicada, que es también el
 * origen al que R2 le permite leer (CORS del bucket) y de donde pdf.js pide sus archivos de apoyo.
 */
export const URL_MOTOR = Platform.OS === 'web' ? '/reader/engine.html' : `${SITIO}/reader/`;

export type Posicion = { page?: number; cfi?: string; fraction?: number };

/** Lo que el motor necesita de una anotación para pintarla (spec 13c, T286). */
export type AnotacionEnMotor = {
  id: string;
  /** `shape`, `polaroid`, `quote`, `rating` y `book`: solo en el lienzo creativo (13h; T351, T343), no en los libros. */
  kind: LibraryAnnotationKind | 'shape' | 'polaroid' | 'quote' | 'rating' | 'book' | 'asset';
  locator: LibraryLocator;
  z: number;
  locked: boolean;
  content: {
    color?: string;
    text?: string;
    style?: 'highlight' | 'underline' | 'strike';
    /** Cuadro de texto: el tamaño de la letra (1 = normal). */
    size?: number;
    /** Imagen (y sticker de la tienda): la dirección para verla y cuánto está girada (grados). */
    src?: string;
    rot?: number;
    /** Post-it doblado: solo se asoma una esquina (T290). */
    folded?: boolean;
    /** Sticker (T290): cuál de la colección (`<paquete>/<nombre>`) y su nombre, para leerlo en voz alta. */
    sticker?: string;
    label?: string;
    /** Dibujo del lápiz (T291): sus trazos, relativos a su caja. */
    strokes?: Trazo[];
    /** Forma del lienzo creativo (13h, RF-CC14; T351). */
    shape?: FormaDeLienzo;
    /** Grupo del lienzo creativo (RF-CC9): los de un grupo se eligen y se mueven juntos. */
    group?: string;
    /** Polaroid (T343): su variante y la dirección de cada foto ('' = sin foto aún); su pie va en `text`. */
    variant?: string;
    srcs?: string[];
    /** Quote (T343): quién, capítulo y comentario; la cita va en `text`. */
    who?: string;
    chapter?: string;
    note?: string;
    /** Rating (T343): escala y valor. */
    scale?: 'stars' | 'hearts' | 'number';
    value?: number;
    /** Asset del lienzo (T343b): cuál y cómo se recolorea (multiplicar sobre su textura o teñir su trazo). */
    asset?: string;
    mode?: 'textura' | 'trazo';
    /** Libro (T343): título y color de su portada; la imagen va en `src`. */
    title?: string;
    coverColor?: string;
    /** Estilo del lienzo creativo (RF-CC9, T342): opacidad, borde (grosor en fracción de la página) y sombra. */
    opacity?: number;
    border?: { width: number; color: string };
    shadow?: boolean;
    /** De otro miembro del club (13f, T307): su inicial y su color, para su marca en la página. */
    author?: { initial: string; color: string; name: string };
  };
};

/** Con qué se está anotando: nada (leer y mover lo pegado) o pegar algo donde se toque (T286, T289). */
export type Herramienta = 'postit' | 'textbox' | 'image' | 'sticker' | 'shape' | 'polaroid' | 'quote' | 'rating' | 'book' | 'asset' | null;

/** Las formas del lienzo creativo (13h, RF-CC14; T351), como las dibuja el motor. */
export const FORMAS_DE_LIENZO = ['rect', 'ellipse', 'heart', 'star', 'blob'] as const;
export type FormaDeLienzo = (typeof FORMAS_DE_LIENZO)[number];

/** El fondo de una página del lienzo: un color o el material de una tapa del Journal con su color (T342, T346). */
export type FondoDePagina = string | { color: string; material: 'leather' | 'linen' | 'velvet' | 'wood' | 'fabric' | 'parchment' };

export type MensajeAlMotor =
  | { type: 'open'; format: 'pdf' | 'epub'; url: string; position?: Posicion; mode?: FormaDeLeer }
  /**
   * El libro desde el teléfono (T285): la app lo lee de su copia local y lo manda en pedazos en base64;
   * el motor lo abre al llegar `openEnd`.
   */
  | { type: 'openBegin'; format: 'pdf' | 'epub'; size: number; position?: Posicion; mode?: FormaDeLeer }
  | { type: 'openChunk'; data: string }
  /** El lienzo creativo (13h, RF-CC4; T351): páginas en blanco 1 : √2 que arma el motor. */
  | {
      type: 'openCanvas';
      orientation: 'portrait' | 'landscape';
      pages: number;
      mode?: FormaDeLeer;
      /** Alto ÷ ancho de una hoja de otra forma, con el alto de A5: el lomo de un Journal (T346). */
      aspect?: number;
    }
  /** El color de las páginas del lienzo (RF-CC12; T342); `null`, papel blanco. */
  | {
      type: 'canvasBackground';
      color: FondoDePagina | null;
      /** El fondo de cada página que tenga uno propio (hojear un Journal; T347). */
      pages?: Record<string, FondoDePagina>;
    }
  /** Exportar una página del lienzo como PNG de `width` px (RF-CC25; T342). Contesta `exported`. */
  | { type: 'export'; width?: number; page?: number }
  | { type: 'openEnd' }
  | ({ type: 'goTo' } & Posicion)
  /** Cambiar la forma de leer sin perder el lugar (RF-BR8, T283). */
  | { type: 'mode'; mode: FormaDeLeer }
  /** Los colores de la página y de la letra (tema del lector, RF-BH5). */
  | { type: 'theme'; page: string; text: string }
  /** Pasar una página en páginas de lado: las flechas del teclado de la app, en web (RF-BR7b). */
  | { type: 'turn'; step: 1 | -1 }
  | { type: 'search'; query: string }
  | { type: 'searchStep'; step: 1 | -1 }
  | { type: 'searchClear' }
  | { type: 'cover'; url: string; width?: number }
  /** Hacer un sticker propio (T335): recortar lo transparente y ponerle margen blanco (px para 512). */
  | { type: 'outline'; id: string; src: string; margin: number }
  /** Poner o quitar la herramienta de fragmento de imagen (13c, RF-BH20; T317). */
  | { type: 'clipTool'; on: boolean }
  /** El lápiz (13c, RF-BH11; T291): puesto o no, con qué herramienta, color, grosor (px) y si solo dibuja el lápiz. */
  | { type: 'pen'; on: false }
  | { type: 'pen'; on: true; tool: HerramientaDeLapiz; color: string; size: number; penOnly: boolean }
  /** Deshacer mientras se dibuja: el motor quita el último trazo aún sin guardar o, si no hay, pide `undo`. */
  | { type: 'penUndo' }
  /** Iluminar un momento un pasaje señalado en una sesión en vivo del club (13f, RF-BC13; T309). */
  | { type: 'flash'; locator: LibraryLocator }
  /** Todo lo que se pinta encima de las páginas, ya en orden de capa (13c, RF-BH16; T286). */
  | { type: 'annotations'; items: AnotacionEnMotor[] }
  /**
   * `ar`: la proporción (alto entre ancho) de la imagen o el sticker que se va a pegar; `w`: el ancho de un
   * sticker que vuelve de la charola (conserva su tamaño).
   */
  | { type: 'tool'; tool: Herramienta; ar?: number; w?: number }
  /** Escribir ahí mismo en un post-it o un cuadro de texto (T289). */
  | { type: 'write'; id: string }
  /** La app elige o suelta (al borrar, al cerrar la barra de lo seleccionado). */
  | { type: 'select'; id: string | null; also?: string[] }
  /** Quitar la selección de texto (al subrayar o cerrar la barra). */
  | { type: 'clearSelection' }
  /** Tamaño (%) y letra del texto de un EPUB (RF-BH2, RF-BH3; T288). */
  | { type: 'text'; size: number; font: LetraDeLectura }
  /** Volver a ver la página entera ("Ajustar", RF-BH1). */
  | { type: 'zoom'; level: number }
  /** Cuánto tapan arriba y abajo los controles que van encima del libro: la página se acomoda entre ellos. */
  | { type: 'insets'; top: number; bottom: number };

export type CodigoDeError = 'password' | 'damaged' | 'network' | 'unknown';

export type MensajeDelMotor =
  | { type: 'ready' }
  /** `copiable`: si el libro deja copiar su texto (un PDF puede prohibirlo, RF-BH9). */
  | { type: 'opened'; total: number | null; copiable?: boolean; lang?: string | null }
  /** `pageEnd`: en el libro real con dos páginas, la de la derecha ("pp. 2–3", RF-BR5). */
  /**
   * `screen`/`screens`: con letra grande en un PDF, en qué pantalla de la página se va ("p. 12 · 2/3", T340); la
   * cuenta de páginas no cambia.
   */
  | { type: 'position'; page?: number; pageEnd?: number; total?: number; cfi?: string; fraction: number; screen?: number; screens?: number }
  | { type: 'search'; count: number; index: number; searching?: boolean }
  | { type: 'cover'; dataUrl: string }
  /** El sticker hecho (PNG) con su medida, o que no se pudo. */
  | { type: 'outline'; id: string; dataUrl?: string; width?: number; height?: number; error?: boolean }
  /**
   * El fragmento de imagen recortado (T317): JPEG con su medida y, en PDF, su página y su rectángulo (partes de
   * la página). `empty`: en un EPUB no había imagen bajo el rectángulo.
   */
  | { type: 'clip'; dataUrl: string; width: number; height: number; page?: number; rect?: { x: number; y: number; w: number; h: number } }
  | { type: 'clip'; error: 'empty' | 'failed' }
  /** Un dibujo nuevo del lápiz (T291): dónde va su caja y sus trazos. */
  | { type: 'ink'; locator: LibraryLocator; strokes: Trazo[] }
  /**
   * Los trazos de un dibujo o de un post-it cambiaron: el borrador le quitó (si a un dibujo le quitó todos, llega
   * `remove`; un post-it se queda sin dibujo) o se dibujó dentro del post-it (T291b).
   */
  | { type: 'inkChange'; id: string; strokes: Trazo[] }
  /** El lápiz no tenía nada pendiente: deshacer lo último guardado. */
  | { type: 'undo' }
  /** Toque o clic en el centro de la página: mostrar u ocultar los controles (RF-BR7b). */
  | { type: 'tap' }
  /** Con la herramienta de post-it, el toque en la página: dónde pegarlo (T286). */
  | { type: 'place'; locator: LibraryLocator }
  /** Se tocó algo pegado (o la página, para soltarlo). */
  | { type: 'select'; id: string | null }
  /** Se arrastró algo pegado: su nueva posición. */
  /** `rot`: con dos dedos se gira y se agranda a la vez (T290). */
  | { type: 'move'; id: string; locator: LibraryLocator; rot?: number }
  /** Un grupo del lienzo creativo que se soltó junto (T351): un solo paso para guardar y deshacer. */
  | { type: 'moves'; items: { id: string; locator: LibraryLocator }[] }
  /** La página del lienzo como PNG, o que no se pudo (T342). */
  | { type: 'exported'; dataUrl: string }
  | { type: 'exported'; error: true }
  /** Tocar un post-it doblado lo abre (RF-BH14, T290). */
  | { type: 'fold'; id: string; folded: boolean }
  /** Doble toque en algo pegado: abrirlo para escribir. */
  | { type: 'edit'; id: string }
  /** Supr o Retroceso con algo pegado elegido: quitarlo, como el botón Quitar. */
  | { type: 'remove'; id: string }
  /** Se terminó de escribir directo en un post-it o un cuadro de texto (T289). */
  | { type: 'text'; id: string; text: string }
  /** Se giró una imagen (grados, 0 – 359). */
  | { type: 'rotate'; id: string; rot: number }
  /** Texto seleccionado (RF-BH7): qué dice y dónde está. Vacío, se soltó la selección. */
  | { type: 'selection'; text: string; locator: LibraryLocator | null }
  /** Cuánto está acercado el PDF o el libro real (1 = la página entera). */
  | { type: 'zoom'; level: number }
  /** Hubo actividad (tocar, rueda, teclado, scroll): se está leyendo (tiempo de lectura, RF-BR11). */
  | { type: 'activity' }
  /** En EPUB, el pellizco pidió otro tamaño de letra; la app lo guarda y lo manda de vuelta. */
  | { type: 'textSize'; size: number }
  | { type: 'error'; code: CodigoDeError; message?: string };

const CODIGOS: readonly CodigoDeError[] = ['password', 'damaged', 'network', 'unknown'];
const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const esId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;

/**
 * Lee un mensaje del motor. Lo que no tenga la forma esperada se ignora: el motor es nuestro, pero
 * en web el canal es `postMessage` y no hay que confiar en nada que llegue por ahí.
 */
export function leerMensaje(crudo: unknown): MensajeDelMotor | null {
  let m: Record<string, unknown>;
  try {
    m = (typeof crudo === 'string' ? JSON.parse(crudo) : crudo) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!m || typeof m !== 'object') return null;
  switch (m.type) {
    case 'ready':
      return { type: 'ready' };
    case 'opened':
      return {
        type: 'opened',
        total: numero(m.total) ? m.total : null,
        copiable: m.copiable !== false,
        ...(typeof m.lang === 'string' && /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(m.lang) ? { lang: m.lang } : {}),
      };
    case 'position':
      if (!numero(m.fraction)) return null;
      return {
        type: 'position',
        fraction: Math.min(Math.max(m.fraction, 0), 1),
        page: numero(m.page) ? m.page : undefined,
        ...(numero(m.pageEnd) && numero(m.page) && m.pageEnd > m.page ? { pageEnd: m.pageEnd } : {}),
        total: numero(m.total) ? m.total : undefined,
        cfi: typeof m.cfi === 'string' ? m.cfi : undefined,
        ...(numero(m.screen) && numero(m.screens) && m.screens > 1 && m.screen >= 1 && m.screen <= m.screens
          ? { screen: Math.round(m.screen), screens: Math.round(m.screens) }
          : {}),
      };
    case 'search':
      return numero(m.count) && numero(m.index) ? { type: 'search', count: m.count, index: m.index, searching: m.searching === true } : null;
    case 'tap':
      return { type: 'tap' };
    case 'activity':
      return { type: 'activity' };
    case 'place': {
      const locator = localizadorPegado(m.locator);
      return locator ? { type: 'place', locator } : null;
    }
    case 'select':
      return m.id === null || esId(m.id) ? { type: 'select', id: m.id } : null;
    case 'move': {
      const locator = localizadorPegado(m.locator);
      if (!locator || !esId(m.id)) return null;
      return { type: 'move', id: m.id, locator, ...(numero(m.rot) ? { rot: ((Math.round(m.rot) % 360) + 360) % 360 } : {}) };
    }
    case 'exported':
      if (m.error === true) return { type: 'exported', error: true };
      return typeof m.dataUrl === 'string' && m.dataUrl.startsWith('data:image/png') ? { type: 'exported', dataUrl: m.dataUrl } : null;
    case 'moves': {
      const items = (Array.isArray(m.items) ? m.items : []).slice(0, 400).flatMap((x: { id?: unknown; locator?: unknown }) => {
        const locator = localizadorPegado(x?.locator);
        return locator && esId(x?.id) ? [{ id: x.id as string, locator }] : [];
      });
      return items.length ? { type: 'moves', items } : null;
    }
    case 'fold':
      return esId(m.id) && typeof m.folded === 'boolean' ? { type: 'fold', id: m.id, folded: m.folded } : null;
    case 'edit':
      return esId(m.id) ? { type: 'edit', id: m.id } : null;
    case 'remove':
      return esId(m.id) ? { type: 'remove', id: m.id } : null;
    case 'text':
      return esId(m.id) && typeof m.text === 'string' ? { type: 'text', id: m.id, text: m.text.slice(0, 1000) } : null;
    case 'rotate':
      return esId(m.id) && numero(m.rot) ? { type: 'rotate', id: m.id, rot: ((Math.round(m.rot) % 360) + 360) % 360 } : null;
    case 'zoom':
      return numero(m.level) ? { type: 'zoom', level: Math.min(4, Math.max(1, m.level)) } : null;
    case 'textSize':
      return numero(m.size) ? { type: 'textSize', size: tamanoValido(m.size) } : null;
    case 'selection': {
      // Los renglones del PDF llegan con saltos: se guarda como se lee, con espacios sencillos.
      const texto = typeof m.text === 'string' ? m.text.replace(/\s+/g, ' ').trim().slice(0, TEXTO_MAXIMO_DE_SUBRAYADO) : '';
      if (!texto) return { type: 'selection', text: '', locator: null };
      const locator = localizadorDeTexto(m.locator);
      return locator ? { type: 'selection', text: texto, locator } : null;
    }
    case 'cover':
      return typeof m.dataUrl === 'string' && m.dataUrl.startsWith('data:image/') ? { type: 'cover', dataUrl: m.dataUrl } : null;
    case 'outline':
      if (typeof m.id !== 'string' || m.id.length > 64) return null;
      if (m.error === true) return { type: 'outline', id: m.id, error: true };
      return typeof m.dataUrl === 'string' && m.dataUrl.startsWith('data:image/png;base64,') && m.dataUrl.length < 4_000_000 && numero(m.width) && numero(m.height)
        ? { type: 'outline', id: m.id, dataUrl: m.dataUrl, width: m.width, height: m.height }
        : null;
    case 'clip': {
      if (m.error === 'empty' || m.error === 'failed') return { type: 'clip', error: m.error };
      if (typeof m.dataUrl !== 'string' || !m.dataUrl.startsWith('data:image/jpeg;base64,') || m.dataUrl.length >= 4_000_000) return null;
      if (!numero(m.width) || !numero(m.height) || m.width < 1 || m.height < 1) return null;
      const r = m.rect as Record<string, unknown> | undefined;
      const parte = (v: unknown) => numero(v) && v >= 0 && v <= 1;
      const rect = r && typeof r === 'object' && parte(r.x) && parte(r.y) && parte(r.w) && parte(r.h) ? { x: r.x as number, y: r.y as number, w: r.w as number, h: r.h as number } : undefined;
      const page = numero(m.page) && Number.isInteger(m.page) && m.page >= 1 ? m.page : undefined;
      return { type: 'clip', dataUrl: m.dataUrl, width: m.width, height: m.height, ...(page ? { page } : {}), ...(rect ? { rect } : {}) };
    }
    case 'ink': {
      const locator = localizadorDeDibujo(m.locator);
      const strokes = trazosValidos(m.strokes);
      return locator && strokes?.length ? { type: 'ink', locator, strokes } : null;
    }
    case 'undo':
      return { type: 'undo' };
    case 'inkChange': {
      const strokes = trazosValidos(m.strokes);
      return esId(m.id) && strokes ? { type: 'inkChange', id: m.id, strokes } : null;
    }
    case 'error':
      return { type: 'error', code: CODIGOS.includes(m.code as CodigoDeError) ? (m.code as CodigoDeError) : 'unknown', message: typeof m.message === 'string' ? m.message : undefined };
    default:
      return null;
  }
}

/** El lugar de un dibujo: como lo pegado, pero su caja puede ser muy larga y delgada (una raya). */
function localizadorDeDibujo(crudo: unknown): LibraryLocator | null {
  const base = localizadorPegado(crudo);
  if (!base) return null;
  const ar = (crudo as Record<string, unknown>).ar;
  return typeof ar === 'number' && Number.isFinite(ar) && ar >= 0.005 && ar <= 200 ? { ...base, ar } : base;
}

/** Dónde abrir una pieza (RF-BL17): donde se quedó. En EPUB manda el CFI; en PDF, la página. */
export function posicionGuardada(item: Pick<LibraryItem, 'kind' | 'last_position' | 'progress'>): Posicion | undefined {
  const p = item.last_position;
  if (item.kind === 'epub') {
    if (p?.cfi) return { cfi: p.cfi };
    return item.progress > 0 ? { fraction: item.progress } : undefined;
  }
  return p?.page ? { page: p.page } : undefined;
}

/**
 * Lo que se guarda de una posición (RF-BR9). En PDF, la página y página/total; en EPUB, el CFI y la
 * fracción del motor. Al final del libro cuenta como terminado (100 %), que es cuando se ofrece la
 * ficha (RF-BF6): foliate rara vez llega a 1 exacto en la última pantalla.
 */
export function cambioDePosicion(m: Extract<MensajeDelMotor, { type: 'position' }>): { last_position: LibraryLocator; progress: number } {
  if (m.cfi) return { last_position: { cfi: m.cfi }, progress: m.fraction >= 0.995 ? 1 : redondear(m.fraction) };
  const pagina = m.page ?? 1;
  const total = m.total ?? pagina;
  return { last_position: { page: pagina }, progress: total > 0 ? redondear(pagina / total) : 0 };
}

/** La base guarda el avance con cuatro decimales (`numeric(5,4)`). */
function redondear(x: number): number {
  return Math.round(Math.min(Math.max(x, 0), 1) * 10000) / 10000;
}

/**
 * Mensajes que esperan a que el motor diga `ready`. El WebView tarda en cargar la página y lo que se
 * mande antes se pierde; aquí se guarda y se manda en orden en cuanto está listo.
 */
export class ColaDelMotor {
  private listo = false;
  private pendientes: MensajeAlMotor[] = [];

  constructor(private readonly mandar: (texto: string) => void) {}

  enviar(m: MensajeAlMotor): void {
    if (this.listo) this.mandar(JSON.stringify(m));
    else this.pendientes.push(m);
  }

  /** El motor (re)cargó: se manda lo pendiente. Si se recarga, vuelve a quedar listo. */
  marcarListo(): void {
    this.listo = true;
    const pendientes = this.pendientes;
    this.pendientes = [];
    for (const m of pendientes) this.mandar(JSON.stringify(m));
  }

  /** La página se va a recargar: lo que llegue ahora espera al próximo `ready`. */
  reiniciar(): void {
    this.listo = false;
  }
}
