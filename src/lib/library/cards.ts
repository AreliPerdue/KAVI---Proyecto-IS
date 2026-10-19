/**
 * Fichas de calificación (spec 13d; L4). Lo que no depende de React: las plantillas incluidas, los campos y su
 * revisión, el aspecto de la tarjeta y cuántas fichas llenas usan cada plantilla. Decisión de Areli (19 oct
 * 2026): la ficha es una tarjeta aparte, no un módulo del lienzo (13h §11).
 */
import { COLORES_DE_ANOTACION } from '@/lib/library/annotations';
import type { CardField, CardFieldType, CardPlacement, LibraryCard, LibraryCardTemplate } from '@/types/domain';

export const TIPOS_DE_CAMPO: readonly CardFieldType[] = ['scale', 'choice', 'text', 'date', 'boolean'];

/** Los símbolos de una escala (RF-BF2): estrellas, corazones, chiles (llamas), calaveras… */
export type SimboloDeEscala = 'star' | 'heart' | 'flame' | 'skull' | 'droplet' | 'sparkles' | 'coffee' | 'zap';
export const SIMBOLOS: readonly SimboloDeEscala[] = ['star', 'heart', 'flame', 'skull', 'droplet', 'sparkles', 'coffee', 'zap'];

export const MAX_CAMPOS = 20;
export const MAX_ETIQUETA = 60;
export const MAX_OPCIONES = 30;
export const MAX_OPCION = 40;
export const MAX_NOMBRE = 80;
export const MAX_STICKERS = 3;

// ─── Aspecto (RF-BF3) ──────────────────────────────────────────────────────────

export type FondoDeFicha = 'plain' | 'paper' | 'lines' | 'grid' | 'dots';
export const FONDOS: readonly FondoDeFicha[] = ['plain', 'paper', 'lines', 'grid', 'dots'];
/** Letras de la tarjeta: las del sistema (sin instalar nada) y una manuscrita. */
export type LetraDeFicha = 'system' | 'serif' | 'mono' | 'hand';
export const LETRAS_DE_FICHA: readonly LetraDeFicha[] = ['system', 'serif', 'mono', 'hand'];
export type EsquinaDeSticker = 'tl' | 'tr' | 'bl' | 'br';
export const ESQUINAS: readonly EsquinaDeSticker[] = ['tl', 'tr', 'bl', 'br'];
export type TamanoDeSticker = 's' | 'm' | 'l';
export const TAMANOS_DE_STICKER: readonly TamanoDeSticker[] = ['s', 'm', 'l'];
/** Ancho del sticker, en parte del ancho de la tarjeta. */
export const ANCHO_DE_STICKER: Record<TamanoDeSticker, number> = { s: 0.14, m: 0.2, l: 0.28 };

/** Un sticker decorativo (de la spec 13c) en una esquina de la tarjeta, un poco ladeado. */
export type StickerDeFicha = { sticker: string; corner: EsquinaDeSticker; size: TamanoDeSticker; rot: number };

export type AspectoDeFicha = { color: string; background: FondoDeFicha; font: LetraDeFicha; stickers: StickerDeFicha[] };

export const ASPECTO_POR_OMISION: AspectoDeFicha = { color: '#F1D35D', background: 'paper', font: 'system', stickers: [] };

const HEX = /^#[0-9a-fA-F]{6}$/;

export function aspectoDe(look: unknown): AspectoDeFicha {
  const v = (look && typeof look === 'object' ? look : {}) as Record<string, unknown>;
  const stickers = Array.isArray(v.stickers) ? v.stickers : [];
  return {
    color: typeof v.color === 'string' && HEX.test(v.color) ? v.color.toUpperCase() : ASPECTO_POR_OMISION.color,
    background: FONDOS.includes(v.background as FondoDeFicha) ? (v.background as FondoDeFicha) : ASPECTO_POR_OMISION.background,
    font: LETRAS_DE_FICHA.includes(v.font as LetraDeFicha) ? (v.font as LetraDeFicha) : ASPECTO_POR_OMISION.font,
    stickers: stickers
      .flatMap((s): StickerDeFicha[] => {
        const x = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
        if (typeof x.sticker !== 'string' || !x.sticker || x.sticker.length > 120) return [];
        return [
          {
            sticker: x.sticker,
            corner: ESQUINAS.includes(x.corner as EsquinaDeSticker) ? (x.corner as EsquinaDeSticker) : 'tr',
            size: TAMANOS_DE_STICKER.includes(x.size as TamanoDeSticker) ? (x.size as TamanoDeSticker) : 'm',
            rot: typeof x.rot === 'number' && Number.isFinite(x.rot) ? Math.max(-20, Math.min(20, Math.round(x.rot))) : 0,
          },
        ];
      })
      .slice(0, MAX_STICKERS),
  };
}

/** Un ladeo para un sticker nuevo: que no queden todos derechos. */
export const ladeoNuevo = (i: number) => [-10, 8, -6][i % 3];

// ─── Campos (RF-BF2) ───────────────────────────────────────────────────────────

/** Un campo nuevo de un tipo, con lo de omisión de ese tipo. */
export function campoNuevo(type: CardFieldType, id: string, label: string): CardField {
  if (type === 'scale') return { id, type, label, max: 5, symbol: 'star' };
  if (type === 'choice') return { id, type, label, options: [], multiple: false };
  if (type === 'text') return { id, type, label, long: false };
  return { id, type, label };
}

/** Los campos guardados, revisados y recortados a los topes. Lo que no tenga forma se quita. */
export function camposDe(valor: unknown): CardField[] {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set<string>();
  const campos: CardField[] = [];
  for (const c of valor) {
    const x = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
    if (typeof x.id !== 'string' || !x.id || x.id.length > 64 || vistos.has(x.id)) continue;
    if (!TIPOS_DE_CAMPO.includes(x.type as CardFieldType)) continue;
    vistos.add(x.id);
    const label = typeof x.label === 'string' ? x.label.trim().slice(0, MAX_ETIQUETA) : '';
    const base = campoNuevo(x.type as CardFieldType, x.id, label);
    if (base.type === 'scale') {
      base.max = x.max === 10 ? 10 : 5;
      base.symbol = SIMBOLOS.includes(x.symbol as SimboloDeEscala) ? (x.symbol as string) : 'star';
    } else if (base.type === 'choice') {
      const opciones = Array.isArray(x.options) ? x.options : [];
      base.options = [...new Set(opciones.filter((o): o is string => typeof o === 'string').map((o) => o.trim().slice(0, MAX_OPCION)).filter(Boolean))].slice(0, MAX_OPCIONES);
      base.multiple = x.multiple === true;
    } else if (base.type === 'text') {
      base.long = x.long === true;
    }
    campos.push(base);
    if (campos.length >= MAX_CAMPOS) break;
  }
  return campos;
}

/** Qué le falta a un diseño para guardarse: nombre, al menos un campo y cada campo con su etiqueta. */
export function problemaDeDiseno(nombre: string, campos: readonly CardField[]): 'name' | 'noFields' | 'label' | 'options' | null {
  if (!nombre.trim()) return 'name';
  if (!campos.length) return 'noFields';
  if (campos.some((c) => !c.label.trim())) return 'label';
  if (campos.some((c) => c.type === 'choice' && !(c.options ?? []).length)) return 'options';
  return null;
}

/** Mover un campo de un lugar a otro (arrastrar, Subir, Bajar). */
export function moverCampo(campos: readonly CardField[], de: number, a: number): CardField[] {
  const lista = [...campos];
  if (de < 0 || de >= lista.length || a < 0 || a >= lista.length) return lista;
  const [c] = lista.splice(de, 1);
  lista.splice(a, 0, c);
  return lista;
}

// ─── Plantillas incluidas (RF-BF1) ─────────────────────────────────────────────

/** Los textos de las plantillas incluidas, en el idioma de la app (se guardan así y luego se editan). */
export type TextosDePlantillas = {
  quick: string;
  journal: string;
  romance: string;
  stars: string;
  rating: string;
  notes: string;
  genre: string;
  genres: string[];
  started: string;
  finished: string;
  quote: string;
  spice: string;
  tropes: string;
  tropeList: string[];
  favoriteCharacter: string;
};

/**
 * "Reseña rápida" (estrellas del 1 al 5, calificación del 1 al 10 y notas, como KAVI Reader), "Diario de
 * lectura" (estrellas, género, fechas, frase favorita y notas) y "Romance" (estrellas, picante, tropes y
 * personaje favorito). Los ids de sus campos son fijos.
 */
export function plantillasIncluidas(t: TextosDePlantillas): Pick<LibraryCardTemplate, 'name' | 'fields' | 'look'>[] {
  const color = (id: string) => COLORES_DE_ANOTACION.find((c) => c.id === id)?.hex ?? ASPECTO_POR_OMISION.color;
  return [
    {
      name: t.quick,
      fields: [
        { id: 'stars', type: 'scale', label: t.stars, max: 5, symbol: 'star' },
        { id: 'rating', type: 'scale', label: t.rating, max: 10, symbol: 'sparkles' },
        { id: 'notes', type: 'text', label: t.notes, long: true },
      ],
      look: { color: color('yellow'), background: 'paper', font: 'system', stickers: [] },
    },
    {
      name: t.journal,
      fields: [
        { id: 'stars', type: 'scale', label: t.stars, max: 5, symbol: 'star' },
        { id: 'genre', type: 'choice', label: t.genre, options: t.genres, multiple: false },
        { id: 'started', type: 'date', label: t.started },
        { id: 'finished', type: 'date', label: t.finished },
        { id: 'quote', type: 'text', label: t.quote, long: true },
        { id: 'notes', type: 'text', label: t.notes, long: true },
      ],
      look: { color: color('baby_blue'), background: 'lines', font: 'serif', stickers: [] },
    },
    {
      name: t.romance,
      fields: [
        { id: 'stars', type: 'scale', label: t.stars, max: 5, symbol: 'heart' },
        { id: 'spice', type: 'scale', label: t.spice, max: 5, symbol: 'flame' },
        { id: 'tropes', type: 'choice', label: t.tropes, options: t.tropeList, multiple: true },
        { id: 'character', type: 'text', label: t.favoriteCharacter, long: false },
      ],
      look: { color: color('pink'), background: 'dots', font: 'hand', stickers: [] },
    },
  ];
}

// ─── Fichas llenas ─────────────────────────────────────────────────────────────

/** Cuántas fichas llenas usa cada plantilla. */
export function fichasPorPlantilla(fichas: readonly Pick<LibraryCard, 'template_id'>[]): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const f of fichas) cuenta.set(f.template_id, (cuenta.get(f.template_id) ?? 0) + 1);
  return cuenta;
}

/** Las plantillas que se ofrecen: las vigentes (no las guardadas para fichas viejas, RF-BF5), en orden de creación. */
export function plantillasVigentes(plantillas: readonly LibraryCardTemplate[]): LibraryCardTemplate[] {
  return plantillas.filter((p) => !p.archived).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Si un diseño cambió (nombre, campos o aspecto) respecto al guardado. */
export function cambioDeDiseno(antes: Pick<LibraryCardTemplate, 'name' | 'fields' | 'look'>, despues: Pick<LibraryCardTemplate, 'name' | 'fields' | 'look'>): boolean {
  return antes.name.trim() !== despues.name.trim() || JSON.stringify(camposDe(antes.fields)) !== JSON.stringify(camposDe(despues.fields)) || JSON.stringify(aspectoDe(antes.look)) !== JSON.stringify(aspectoDe(despues.look));
}

// ─── Llenar una ficha (RF-BF4, RF-BF6, RF-BF7; T294) ───────────────────────────

export const LUGARES: readonly CardPlacement[] = ['front', 'first_page', 'last_page', 'back'];
/** Se ve al abrir el libro (portada, primera página) o al terminarlo (última página, contraportada). */
export const alInicio = (lugar: CardPlacement) => lugar === 'front' || lugar === 'first_page';
export const alFinal = (lugar: CardPlacement) => lugar === 'back' || lugar === 'last_page';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_TEXTO_CORTO = 120;
export const MAX_TEXTO_LARGO = 2000;

/** El valor de un campo, revisado; `null` si está vacío o no tiene forma. */
export function valorDe(campo: CardField, crudo: unknown): number | string | string[] | boolean | null {
  if (campo.type === 'scale') {
    const max = campo.max === 10 ? 10 : 5;
    return typeof crudo === 'number' && Number.isFinite(crudo) && crudo >= 1 ? Math.min(max, Math.round(crudo)) : null;
  }
  if (campo.type === 'choice') {
    const lista = (Array.isArray(crudo) ? crudo : typeof crudo === 'string' ? [crudo] : []).filter((o): o is string => typeof o === 'string' && !!o.trim());
    const unicas = [...new Set(lista.map((o) => o.trim().slice(0, MAX_OPCION)))];
    const elegidas = campo.multiple ? unicas : unicas.slice(0, 1);
    return elegidas.length ? elegidas : null;
  }
  if (campo.type === 'text') {
    const texto = typeof crudo === 'string' ? crudo.trim().slice(0, campo.long ? MAX_TEXTO_LARGO : MAX_TEXTO_CORTO) : '';
    return texto || null;
  }
  if (campo.type === 'date') return typeof crudo === 'string' && FECHA.test(crudo) ? crudo : null;
  return typeof crudo === 'boolean' ? crudo : null;
}

/**
 * Lo que se guarda: cada campo revisado (los vacíos no se guardan) y, sin tocar, los valores de campos que ya
 * no están en el diseño, que se conservan ocultos hasta que se borren a propósito (RF-BF5).
 */
export function valoresParaGuardar(campos: readonly CardField[], valores: Record<string, unknown>): Record<string, unknown> {
  const ids = new Set(campos.map((c) => c.id));
  const resultado: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(valores)) if (!ids.has(k)) resultado[k] = v;
  for (const c of campos) {
    const v = valorDe(c, valores[c.id]);
    if (v !== null) resultado[c.id] = v;
  }
  return resultado;
}

/** Los valores guardados de campos que ya no están en el diseño (RF-BF5). */
export function valoresOcultos(campos: readonly CardField[], valores: Record<string, unknown>): { id: string; valor: unknown }[] {
  const ids = new Set(campos.map((c) => c.id));
  return Object.entries(valores)
    .filter(([k, v]) => !ids.has(k) && v !== null && v !== '' && !(Array.isArray(v) && !v.length))
    .map(([id, valor]) => ({ id, valor }));
}

/** Un valor oculto como texto, para reconocerlo antes de borrarlo. */
export function textoDeValor(valor: unknown, t: { yes: string; no: string }): string {
  if (Array.isArray(valor)) return valor.join(', ');
  if (typeof valor === 'boolean') return valor ? t.yes : t.no;
  return String(valor);
}

/** Si la ficha tiene algo escrito o elegido. */
export function fichaConAlgo(campos: readonly CardField[], valores: Record<string, unknown>): boolean {
  return campos.some((c) => valorDe(c, valores[c.id]) !== null);
}

/** Las plantillas que se le pueden agregar a un libro: las vigentes que aún no tiene (una por plantilla, RF-BF7). */
export function plantillasParaAgregar(plantillas: readonly LibraryCardTemplate[], fichasDelLibro: readonly Pick<LibraryCard, 'template_id'>[]): LibraryCardTemplate[] {
  const usadas = new Set(fichasDelLibro.map((f) => f.template_id));
  return plantillasVigentes(plantillas).filter((p) => !usadas.has(p.id));
}
