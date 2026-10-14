import { Platform } from 'react-native';

import { SITIO } from '@/lib/api';
import { localizadorDeTexto, localizadorPegado, TEXTO_MAXIMO_DE_SUBRAYADO } from '@/lib/library/annotations';
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
  kind: LibraryAnnotationKind;
  locator: LibraryLocator;
  z: number;
  locked: boolean;
  content: {
    color?: string;
    text?: string;
    style?: 'highlight' | 'underline' | 'strike';
    /** Cuadro de texto: el tamaño de la letra (1 = normal). */
    size?: number;
    /** Imagen: la dirección para verla y cuánto está girada (grados). */
    src?: string;
    rot?: number;
  };
};

/** Con qué se está anotando: nada (leer y mover lo pegado) o pegar algo donde se toque (T286, T289). */
export type Herramienta = 'postit' | 'textbox' | 'image' | null;

export type MensajeAlMotor =
  | { type: 'open'; format: 'pdf' | 'epub'; url: string; position?: Posicion; mode?: FormaDeLeer }
  /**
   * El libro desde el teléfono (T285): la app lo lee de su copia local y lo manda en pedazos en base64;
   * el motor lo abre al llegar `openEnd`.
   */
  | { type: 'openBegin'; format: 'pdf' | 'epub'; size: number; position?: Posicion; mode?: FormaDeLeer }
  | { type: 'openChunk'; data: string }
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
  /** Todo lo que se pinta encima de las páginas, ya en orden de capa (13c, RF-BH16; T286). */
  | { type: 'annotations'; items: AnotacionEnMotor[] }
  /** `ar`: la proporción (alto entre ancho) de la imagen que se va a pegar. */
  | { type: 'tool'; tool: Herramienta; ar?: number }
  /** Escribir ahí mismo en un post-it o un cuadro de texto (T289). */
  | { type: 'write'; id: string }
  /** La app elige o suelta (al borrar, al cerrar la barra de lo seleccionado). */
  | { type: 'select'; id: string | null }
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
  | { type: 'position'; page?: number; pageEnd?: number; total?: number; cfi?: string; fraction: number }
  | { type: 'search'; count: number; index: number; searching?: boolean }
  | { type: 'cover'; dataUrl: string }
  /** Toque o clic en el centro de la página: mostrar u ocultar los controles (RF-BR7b). */
  | { type: 'tap' }
  /** Con la herramienta de post-it, el toque en la página: dónde pegarlo (T286). */
  | { type: 'place'; locator: LibraryLocator }
  /** Se tocó algo pegado (o la página, para soltarlo). */
  | { type: 'select'; id: string | null }
  /** Se arrastró algo pegado: su nueva posición. */
  | { type: 'move'; id: string; locator: LibraryLocator }
  /** Doble toque en algo pegado: abrirlo para escribir. */
  | { type: 'edit'; id: string }
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
      return locator && esId(m.id) ? { type: 'move', id: m.id, locator } : null;
    }
    case 'edit':
      return esId(m.id) ? { type: 'edit', id: m.id } : null;
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
    case 'error':
      return { type: 'error', code: CODIGOS.includes(m.code as CodigoDeError) ? (m.code as CodigoDeError) : 'unknown', message: typeof m.message === 'string' ? m.message : undefined };
    default:
      return null;
  }
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
