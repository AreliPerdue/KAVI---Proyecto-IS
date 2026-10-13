import { Platform } from 'react-native';

import { SITIO } from '@/lib/api';
import type { FormaDeLeer } from '@/lib/library/reading-mode';
import type { LibraryItem, LibraryLocator } from '@/types/domain';

/**
 * Lo que la app y el motor de lectura se dicen (spec 13b §4, T279). El motor es `public/reader/`:
 * una página web que la app abre en un iframe (web) o en un WebView (teléfono).
 */

/**
 * Dónde vive el motor. En la web, del mismo origen (la CSP no deja enmarcar otro sitio); en el
 * teléfono, la web publicada, que es también el origen al que R2 le permite leer (CORS del bucket).
 */
export const URL_MOTOR = Platform.OS === 'web' ? '/reader/engine.html' : `${SITIO}/reader/engine.html`;

export type Posicion = { page?: number; cfi?: string; fraction?: number };

export type MensajeAlMotor =
  | { type: 'open'; format: 'pdf' | 'epub'; url: string; position?: Posicion; mode?: FormaDeLeer }
  | ({ type: 'goTo' } & Posicion)
  /** Cambiar la forma de leer sin perder el lugar (RF-BR8, T283). */
  | { type: 'mode'; mode: FormaDeLeer }
  /** Pasar una página en páginas de lado: las flechas del teclado de la app, en web (RF-BR7b). */
  | { type: 'turn'; step: 1 | -1 }
  | { type: 'search'; query: string }
  | { type: 'searchStep'; step: 1 | -1 }
  | { type: 'searchClear' }
  | { type: 'cover'; url: string; width?: number };

export type CodigoDeError = 'password' | 'damaged' | 'network' | 'unknown';

export type MensajeDelMotor =
  | { type: 'ready' }
  | { type: 'opened'; total: number | null }
  | { type: 'position'; page?: number; total?: number; cfi?: string; fraction: number }
  | { type: 'search'; count: number; index: number; searching?: boolean }
  | { type: 'cover'; dataUrl: string }
  /** Toque o clic en el centro de la página: mostrar u ocultar los controles (RF-BR7b). */
  | { type: 'tap' }
  | { type: 'error'; code: CodigoDeError; message?: string };

const CODIGOS: readonly CodigoDeError[] = ['password', 'damaged', 'network', 'unknown'];
const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

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
      return { type: 'opened', total: numero(m.total) ? m.total : null };
    case 'position':
      if (!numero(m.fraction)) return null;
      return {
        type: 'position',
        fraction: Math.min(Math.max(m.fraction, 0), 1),
        page: numero(m.page) ? m.page : undefined,
        total: numero(m.total) ? m.total : undefined,
        cfi: typeof m.cfi === 'string' ? m.cfi : undefined,
      };
    case 'search':
      return numero(m.count) && numero(m.index) ? { type: 'search', count: m.count, index: m.index, searching: m.searching === true } : null;
    case 'tap':
      return { type: 'tap' };
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
