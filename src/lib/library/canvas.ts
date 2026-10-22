import type { AnotacionEnMotor, FormaDeLienzo } from '@/lib/library/reader-protocol';
import { claveDeDato, DATOS_DE_BIBLIOTECA, type DatoDeBiblioteca } from '@/lib/library/journal-stats';
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

export const TIPOS_DE_ELEMENTO = [
  'textbox',
  'image',
  'sticker',
  'shape',
  'polaroid',
  'quote',
  'rating',
  'book',
  'asset',
  'stat',
  'swatch',
  // T349b: checklist, mood, canción, fecha y lugar, y timeline.
  'checklist',
  'mood',
  'song',
  'date',
  'timeline',
] as const;
export type TipoDeElemento = (typeof TIPOS_DE_ELEMENTO)[number];
export type OrientacionDeLienzo = 'portrait' | 'landscape';

/**
 * Las variantes de la polaroid (RF-CC14; T343), el componente estrella: cuántas fotos lleva y su proporción (alto
 * entre ancho) al pegarla. Cambiar de variante conserva las fotos que quepan.
 */
export const VARIANTES_DE_POLAROID = ['classic', 'mini', 'caption', 'tape', 'double', 'stack', 'film'] as const;
export type VarianteDePolaroid = (typeof VARIANTES_DE_POLAROID)[number];
export const FOTOS_DE_POLAROID: Record<VarianteDePolaroid, number> = { classic: 1, mini: 1, caption: 1, tape: 1, double: 2, stack: 1, film: 3 };
export const PROPORCION_DE_POLAROID: Record<VarianteDePolaroid, number> = { classic: 1.19, mini: 1.6, caption: 1.4, tape: 1.19, double: 0.62, stack: 1.19, film: 2.6 };

/** Cómo se califica en un rating (RF-CC14; T343): estrellas o corazones del 0 al 5 (con medios), o un número del 0 al 10. */
export const ESCALAS_DE_RATING = ['stars', 'hearts', 'number'] as const;
export type EscalaDeRating = (typeof ESCALAS_DE_RATING)[number];
export const PROPORCION_DE_RATING: Record<EscalaDeRating, number> = { stars: 0.2, hearts: 0.2, number: 0.42 };
/** Un dato de la biblioteca (T349): el número grande y lo que es. Una muestra de color: el color y su nombre. */
export const PROPORCION_DE_DATO = 0.6;
export const PROPORCION_DE_MUESTRA = 1.3;

/** Los moods (T349b): una carita y, si se quiere, una palabra. */
export const ANIMOS = ['happy', 'sad', 'angry', 'surprised', 'inLove', 'crying', 'calm', 'scared'] as const;
export type Animo = (typeof ANIMOS)[number];
/** Lo que cabe en una lista (checklist) y en un timeline. */
export const MAX_RENGLONES = 12;
/** La forma con que nace cada módulo nuevo de T349b (alto ÷ ancho). */
export const PROPORCION_NUEVA: Record<'checklist' | 'mood' | 'song' | 'date' | 'timeline', number> = { checklist: 1, mood: 1.2, song: 0.42, date: 0.32, timeline: 1.3 };
export type Renglon = { text: string; done?: boolean };

/**
 * Acabados de lo decorado en una tapa del Journal (13i, RF-JC11 – RF-JC12; T348): impreso (a color, como siempre),
 * hundido, en relieve o recortado. Se guarda solo el que no es impreso.
 */
export const TRATAMIENTOS = ['printed', 'debossed', 'embossed', 'cutout'] as const;
export type Tratamiento = (typeof TRATAMIENTOS)[number];
/** Lo que puede llevar acabado: los motivos (papeles y doodles), las formas y el texto. */
export const CON_TRATAMIENTO: readonly TipoDeElemento[] = ['textbox', 'shape', 'asset'];

/**
 * El color de un acabado, el mismo para cualquier silueta (RF-JC12): hundido oscurece el material y relieve lo aclara
 * —translúcidos, así conservan su textura y toman su tono aunque se cambie el color—; recortado deja ver la hoja de
 * abajo, del color de las páginas (`papel`). Con un color elegido (T366, pedido de Areli), hundido y relieve toman ese
 * color, un poco translúcido para que se siga viendo la textura.
 */
export function colorDeTratamiento(t: Exclude<Tratamiento, 'printed'>, papel: string, color?: string): string {
  if (t === 'cutout') return papel;
  if (color && /^#[0-9a-fA-F]{6}$/.test(color)) return `${color.toUpperCase()}A6`;
  return t === 'debossed' ? '#0000004D' : '#FFFFFF2E';
}

/**
 * El sentido de un texto (13i; T363), para lomos y tapas: horizontal; vertical de arriba abajo (como los lomos en
 * inglés) o de abajo arriba (como en español); o las letras apiladas una sobre otra. La caja se queda derecha.
 */
export const SENTIDOS = ['horizontal', 'down', 'up', 'stacked'] as const;
export type SentidoDeTexto = (typeof SENTIDOS)[number];
/** Lo más grande que puede ser la letra (8 veces la normal): un título en una portada. */
export const TAMANO_MAXIMO = 8;

/**
 * Cambiar el sentido de un texto: entre horizontal y vertical, la caja se voltea (lo ancho se vuelve alto) sobre su
 * centro, para que el texto quepa igual. `paginaAlto` es el alto de la página entre su ancho.
 */
export function conSentido(doc: DocumentoDeLienzo, id: string, sentido: SentidoDeTexto, paginaAlto: number): DocumentoDeLienzo {
  const e = doc.elements.find((x) => x.id === id);
  if (!e || e.type !== 'textbox') return doc;
  const vertical = (s: SentidoDeTexto | undefined) => !!s && s !== 'horizontal';
  const direction = sentido === 'horizontal' ? undefined : sentido;
  if (vertical(e.style.direction) === vertical(sentido)) return cambiar(doc, id, { style: { direction } });
  const alto = e.w * e.ar;
  const w = Math.min(2, alto);
  const ar = alto > 0 ? e.w / alto : 1;
  const x = e.x + (e.w - w) / 2;
  const y = e.y + (alto - w * ar) / 2 / paginaAlto;
  return cambiar(doc, id, { x, y, w, ar, style: { direction } });
}

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
  style: {
    color?: string;
    size?: number;
    opacity?: number;
    border?: { width: number; color: string };
    shadow?: boolean;
    /** Acabado en una tapa del Journal (T348); sin él, impreso. */
    treatment?: Exclude<Tratamiento, 'printed'>;
    /** Sentido de un texto (T363): vertical o con las letras apiladas; sin él, horizontal. */
    direction?: Exclude<SentidoDeTexto, 'horizontal'>;
  };
  /**
   * Texto; forma; ruta de la imagen en R2; sticker (`<paquete>/<nombre>`) y su nombre. Polaroid: variante, rutas de
   * sus fotos (vacía = sin foto aún) y su pie en `text`. Quote: la cita en `text`, quién la dijo, el capítulo y un
   * comentario. Rating: escala y valor. Libro: la pieza de Library a la que apunta (RF-CC22).
   */
  content: {
    text?: string;
    shape?: FormaDeLienzo;
    path?: string;
    sticker?: string;
    label?: string;
    src?: string;
    variant?: VarianteDePolaroid;
    paths?: string[];
    who?: string;
    chapter?: string;
    note?: string;
    scale?: EscalaDeRating;
    value?: number;
    itemId?: string;
    /** Asset (T343b): cuál (`<pack>/<nombre>`) y cómo se recolorea. */
    asset?: string;
    mode?: 'textura' | 'trazo';
    /** Dato de la biblioteca (RF-CC22; T349): cuál y de qué año (`null`: de siempre). Su valor se lee en vivo. */
    stat?: DatoDeBiblioteca;
    year?: number | null;
    /**
     * T349b. Checklist: su título en `text` y sus renglones con su casilla. Timeline: sus sucesos en orden. Mood: la
     * carita y su palabra en `text`. Canción: título en `text` y artista en `who`. Fecha y lugar: `YYYY-MM-DD` y el
     * lugar.
     */
    items?: Renglon[];
    mood?: Animo;
    date?: string;
    place?: string;
  };
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
      ...(numero(estilo.size) ? { size: entre(estilo.size, 0.5, TAMANO_MAXIMO) } : {}),
      ...(tipo === 'textbox' && SENTIDOS.includes(estilo.direction as SentidoDeTexto) && estilo.direction !== 'horizontal'
        ? { direction: estilo.direction as Exclude<SentidoDeTexto, 'horizontal'> }
        : {}),
      ...(numero(estilo.opacity) && estilo.opacity < 1 ? { opacity: entre(estilo.opacity, 0.1, 1) } : {}),
      ...(bordeValido(estilo.border) ? { border: bordeValido(estilo.border) as { width: number; color: string } } : {}),
      ...(estilo.shadow === true ? { shadow: true } : {}),
      ...(CON_TRATAMIENTO.includes(tipo) && TRATAMIENTOS.includes(estilo.treatment as Tratamiento) && estilo.treatment !== 'printed'
        ? { treatment: estilo.treatment as Exclude<Tratamiento, 'printed'> }
        : {}),
    },
    content: {
      ...(tipo === 'textbox' ? { text: texto(contenido.text, MAX_TEXTO) ?? '' } : {}),
      ...(tipo === 'shape' ? { shape: forma ?? 'rect' } : {}),
      ...(tipo === 'image' && typeof contenido.path === 'string' ? { path: contenido.path.slice(0, 300) } : {}),
      ...(tipo === 'sticker' && typeof contenido.sticker === 'string' ? { sticker: contenido.sticker.slice(0, 120) } : {}),
      ...(tipo === 'sticker' && typeof contenido.label === 'string' ? { label: contenido.label.slice(0, 80) } : {}),
      ...(tipo === 'polaroid' ? polaroidValida(contenido) : {}),
      ...(tipo === 'quote' ? quoteValida(contenido) : {}),
      ...(tipo === 'rating' ? ratingValido(contenido) : {}),
      ...(tipo === 'book' && typeof contenido.itemId === 'string' ? { itemId: contenido.itemId.slice(0, 64) } : {}),
      ...(tipo === 'stat' ? datoValido(contenido) : {}),
      ...(tipo === 'swatch' ? { text: texto(contenido.text, 40) ?? '' } : {}),
      ...(tipo === 'checklist' ? { text: texto(contenido.text, 80) ?? '', items: renglonesValidos(contenido.items, true) } : {}),
      ...(tipo === 'timeline' ? { items: renglonesValidos(contenido.items, false) } : {}),
      ...(tipo === 'mood' ? { mood: ANIMOS.includes(contenido.mood as Animo) ? (contenido.mood as Animo) : 'happy', text: texto(contenido.text, 40) ?? '' } : {}),
      ...(tipo === 'song' ? { text: texto(contenido.text, 80) ?? '', who: texto(contenido.who, 80) ?? '' } : {}),
      ...(tipo === 'date' ? { date: fechaValida(contenido.date), place: texto(contenido.place, 60) ?? '' } : {}),
      ...(tipo === 'asset' && typeof contenido.asset === 'string' ? { asset: contenido.asset.slice(0, 120), mode: contenido.mode === 'trazo' ? ('trazo' as const) : ('textura' as const) } : {}),
      ...(tipo === 'asset' && typeof contenido.label === 'string' ? { label: contenido.label.slice(0, 80) } : {}),
    },
  };
}

function polaroidValida(c: Record<string, unknown>) {
  const variant = VARIANTES_DE_POLAROID.includes(c.variant as VarianteDePolaroid) ? (c.variant as VarianteDePolaroid) : 'classic';
  const rutas = Array.isArray(c.paths) ? c.paths.map((r) => (typeof r === 'string' ? r.slice(0, 300) : '')) : [];
  const paths = Array.from({ length: FOTOS_DE_POLAROID[variant] }, (_, i) => rutas[i] ?? '');
  return { variant, paths, text: texto(c.text, 80) ?? '' };
}

function quoteValida(c: Record<string, unknown>) {
  return { text: texto(c.text, 600) ?? '', who: texto(c.who, 80) ?? '', chapter: texto(c.chapter, 40) ?? '', note: texto(c.note, 300) ?? '' };
}

/** Los renglones de una lista o un timeline: texto (hasta 120) y, en una lista, si ya se marcó. */
function renglonesValidos(raw: unknown, conCasilla: boolean): Renglon[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_RENGLONES).flatMap((r) => {
    if (!r || typeof r !== 'object') return [];
    const x = r as Record<string, unknown>;
    const text = texto(x.text, 120) ?? '';
    return [conCasilla ? { text, done: x.done === true } : { text }];
  });
}

/** Una fecha `YYYY-MM-DD` que existe; si no, vacía (la hoja pone la de hoy al agregarla). */
export function fechaValida(v: unknown): string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? '' : v;
}

/** Una fecha `YYYY-MM-DD` como se lee en el idioma de la app ("22 oct 2026"). */
export function fechaLegible(iso: string, idioma = 'es'): string {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat(idioma === 'es' ? 'es-MX' : idioma, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d).replace('.', '');
}

function datoValido(c: Record<string, unknown>) {
  const stat = DATOS_DE_BIBLIOTECA.includes(c.stat as DatoDeBiblioteca) ? (c.stat as DatoDeBiblioteca) : 'booksFinished';
  const year = numero(c.year) && c.year >= 1900 && c.year <= 3000 ? Math.round(c.year) : null;
  return { stat, year };
}

function ratingValido(c: Record<string, unknown>) {
  const scale = ESCALAS_DE_RATING.includes(c.scale as EscalaDeRating) ? (c.scale as EscalaDeRating) : 'stars';
  const max = scale === 'number' ? 10 : 5;
  const paso = scale === 'number' ? 1 : 0.5;
  const value = numero(c.value) ? entre(Math.round(c.value / paso) * paso, 0, max) : 0;
  return { scale, value };
}

/** Los archivos de imagen de unos elementos, por su id: el de cada imagen y el de cada foto de una polaroid (T343). */
export function archivosDeImagenes(elementos: readonly ElementoDeLienzo[]): string[] {
  const id = (ruta: string) => ruta.split('/').pop()?.replace(/\.jpg$/, '') ?? '';
  return elementos.flatMap((e) => (e.type === 'image' ? [e.id] : e.type === 'polaroid' ? (e.content.paths ?? []).filter(Boolean).map(id) : [])).filter(Boolean);
}

/** Todas las rutas de imágenes de unos elementos, para pedir sus direcciones. */
export function rutasDeImagenes(elementos: readonly ElementoDeLienzo[]): string[] {
  return elementos.flatMap((e) => (e.type === 'image' && e.content.path ? [e.content.path] : e.type === 'polaroid' ? (e.content.paths ?? []).filter(Boolean) : []));
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
export type LibroEnLienzo = { title: string; src?: string; color: string };

export function aMotor(
  doc: DocumentoDeLienzo,
  fuentes: {
    imagenes?: ReadonlyMap<string, string>;
    stickers?: ReadonlyMap<string, string>;
    libros?: ReadonlyMap<string, LibroEnLienzo>;
    /** Los datos de la biblioteca ya contados y escritos, por su clave (T349). */
    datos?: ReadonlyMap<string, DatoEscrito>;
    /** El idioma de la app, para escribir las fechas (T349b). */
    idioma?: string;
    /** Las piezas de los packs de papeles de la tienda (T343c): id → dirección (o su copia guardada). */
    assets?: ReadonlyMap<string, string>;
  } = {},
  /** El color de las páginas del Journal, que se ve por lo recortado de una tapa (T348). */
  papel = '#F7F5EF',
): AnotacionEnMotor[] {
  return doc.elements.map((original) => {
    // Con acabado (T348): el color del acabado en vez del suyo, sin sombra propia (el acabado trae la suya) y, si es
    // un asset, solo su silueta.
    const t = original.style.treatment;
    const e: ElementoDeLienzo = t
      ? {
          ...original,
          style: { ...original.style, color: colorDeTratamiento(t, papel, original.style.color), shadow: undefined },
          content: original.type === 'asset' ? { ...original.content, mode: 'trazo' } : original.content,
        }
      : original;
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
        ? {
            text: e.content.text ?? '',
            ...(e.style.color ? { color: e.style.color } : {}),
            ...(e.style.size ? { size: e.style.size } : {}),
            ...(e.style.direction ? { direction: e.style.direction } : {}),
            ...comun,
          }
        : e.type === 'shape'
          ? { shape: e.content.shape ?? 'rect', ...(e.style.color ? { color: e.style.color } : {}), ...comun }
          : e.type === 'image'
            ? { ...(e.content.path && fuentes.imagenes?.get(e.content.path) ? { src: fuentes.imagenes.get(e.content.path) } : {}), ...comun }
            : e.type === 'polaroid'
              ? {
                  variant: e.content.variant ?? 'classic',
                  srcs: (e.content.paths ?? []).map((r) => (r ? (fuentes.imagenes?.get(r) ?? '') : '')),
                  text: e.content.text ?? '',
                  ...(e.style.color ? { color: e.style.color } : {}),
                  ...comun,
                }
              : e.type === 'quote'
                ? {
                    text: e.content.text ?? '',
                    who: e.content.who ?? '',
                    chapter: e.content.chapter ?? '',
                    note: e.content.note ?? '',
                    ...(e.style.color ? { color: e.style.color } : {}),
                    ...(e.style.size ? { size: e.style.size } : {}),
                    ...comun,
                  }
                : e.type === 'rating'
                  ? { scale: e.content.scale ?? 'stars', value: e.content.value ?? 0, ...(e.style.color ? { color: e.style.color } : {}), ...comun }
                  : e.type === 'stat'
                    ? { ...datoParaMotor(fuentes.datos?.get(claveDeDato(e.content.stat ?? 'booksFinished', e.content.year ?? null))), ...(e.style.color ? { color: e.style.color } : {}), ...comun }
                  : e.type === 'swatch'
                    ? { text: e.content.text ?? '', color: e.style.color ?? MUESTRA_SIN_COLOR, ...comun }
                  : e.type === 'checklist'
                    ? { text: e.content.text ?? '', items: e.content.items ?? [], ...(e.style.color ? { color: e.style.color } : {}), ...comun }
                  : e.type === 'timeline'
                    ? { items: e.content.items ?? [], ...(e.style.color ? { color: e.style.color } : {}), ...comun }
                  : e.type === 'mood'
                    ? { mood: e.content.mood ?? 'happy', text: e.content.text ?? '', ...(e.style.color ? { color: e.style.color } : {}), ...comun }
                  : e.type === 'song'
                    ? { text: e.content.text ?? '', who: e.content.who ?? '', ...(e.style.color ? { color: e.style.color } : {}), ...comun }
                  : e.type === 'date'
                    ? { title: fechaLegible(e.content.date ?? '', fuentes.idioma), note: e.content.place ?? '', ...(e.style.color ? { color: e.style.color } : {}), ...comun }
                  : e.type === 'book'
                    ? libroParaMotor(e.content.itemId ? fuentes.libros?.get(e.content.itemId) : undefined, comun)
                    : e.type === 'asset'
                      ? {
                          asset: e.content.asset,
                          label: e.content.label,
                          mode: e.content.mode ?? 'textura',
                          ...(e.content.asset && fuentes.assets?.get(e.content.asset) ? { src: fuentes.assets.get(e.content.asset) } : {}),
                          ...(e.style.color ? { color: e.style.color } : {}),
                          ...comun,
                        }
                      : {
                sticker: e.content.sticker,
                label: e.content.label,
                ...(e.content.sticker && fuentes.stickers?.get(e.content.sticker) ? { src: fuentes.stickers.get(e.content.sticker) } : {}),
                ...comun,
              };
    return { id: e.id, kind: e.type, locator, z: e.z, locked: e.locked, content: t ? { ...content, treatment: t } : content };
  });
}

/** Un dato de la biblioteca listo para verse (T349): el número, qué es y de cuándo. */
export type DatoEscrito = { valor: string; etiqueta: string; periodo: string };
/** Una muestra de color recién puesta, antes de elegirle uno. */
export const MUESTRA_SIN_COLOR = '#C9C2B8';

function datoParaMotor(d: DatoEscrito | undefined): AnotacionEnMotor['content'] {
  return { title: d?.valor ?? '—', text: d?.etiqueta ?? '', note: d?.periodo ?? '' };
}

/** Un libro del lienzo: su portada (o su color y título si no tiene, o si ya no existe). */
function libroParaMotor(libro: LibroEnLienzo | undefined, comun: AnotacionEnMotor['content']): AnotacionEnMotor['content'] {
  return { title: libro?.title ?? '', coverColor: libro?.color ?? '#8C8C8C', ...(libro?.src ? { src: libro.src } : {}), ...comun };
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

// ─── Colores de la página (T368) ──────────────────────────────────────────────────

/**
 * Los colores de una página, por su papel (T368, pedido de Areli: plantillas que se puedan personalizar): el **papel**
 * (el fondo), la **tinta** (los textos y los módulos que se leen) y el **acento** (papeles, cintas, doodles y formas).
 * Las muestras de color, las fotos y los libros se quedan como están.
 */
export type ColoresDePagina = { papel?: string | null; tinta?: string; acento?: string };
const CON_TINTA: readonly TipoDeElemento[] = ['textbox', 'quote', 'checklist', 'timeline', 'date', 'stat', 'mood', 'song', 'rating'];
const CON_ACENTO: readonly TipoDeElemento[] = ['asset', 'shape'];

/** Una página con esos colores: lo que no se da, no cambia. */
export function conColores(doc: DocumentoDeLienzo, colores: ColoresDePagina): DocumentoDeLienzo {
  const conPapel = colores.papel === undefined ? doc : conFondo(doc, colores.papel);
  return {
    ...conPapel,
    elements: conPapel.elements.map((e) => {
      const color = CON_TINTA.includes(e.type) ? colores.tinta : CON_ACENTO.includes(e.type) ? colores.acento : undefined;
      return color && esColor(color) ? { ...e, style: { ...e.style, color: color.toUpperCase() } } : e;
    }),
  };
}

/** Los colores que tiene una página ahora, para empezar a elegir desde ahí (el primero de cada papel). */
export function coloresDe(doc: DocumentoDeLienzo): { papel: string | null; tinta: string | null; acento: string | null } {
  const primero = (tipos: readonly TipoDeElemento[]) => doc.elements.find((e) => tipos.includes(e.type) && e.style.color)?.style.color ?? null;
  return { papel: doc.background ?? null, tinta: primero(CON_TINTA), acento: primero(CON_ACENTO) };
}
