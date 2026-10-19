/**
 * Definir una palabra desde el lector (spec 13c, RF-BH8; decisión B4, enmendada el 13 oct 2026). En
 * inglés, **Wiktionary** (su API REST pública, CC BY-SA): tiene las palabras comunes que a la *Free
 * Dictionary API* le faltan ("book" daba 404) y responde rápido; si Wiktionary falla, se intenta con la Free
 * Dictionary API. En español no hay una API libre: el lector ofrece abrir la palabra en el Diccionario de la
 * lengua española (RAE); el diccionario del sistema del iPhone queda para cuando haya un módulo nativo.
 *
 * No toca Supabase ni datos de KAVI: funciona igual en el modo demo.
 */

export type Acepcion = { categoria: string; definicion: string; ejemplo?: string };
export type Definicion = { palabra: string; fonetica?: string; acepciones: Acepcion[]; fuente: 'wiktionary' | 'freedictionary' };
/** Lo que se encontró: la definición en inglés, o si la palabra solo existe en español. */
export type Busqueda = { definicion: Definicion | null; espanol: boolean };

const WIKTIONARY = 'https://en.wiktionary.org/api/rest_v1/page/definition/';
const FREE_DICTIONARY = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const MAX_ACEPCIONES = 6;
/** Pasado esto, el diccionario no respondió. */
const ESPERA_MS = 8000;

/** La dirección de la palabra en el DLE de la RAE. */
export function enlaceRae(palabra: string): string {
  return `https://dle.rae.es/${encodeURIComponent(palabra.toLowerCase())}`;
}

/** Una palabra en inglés en Merriam-Webster: el enlace para quien usa la app en inglés. */
export function enlaceMerriamWebster(palabra: string): string {
  return `https://www.merriam-webster.com/dictionary/${encodeURIComponent(palabra.toLowerCase())}`;
}

/** Una palabra en español traducida al inglés en WordReference: para quien usa la app en inglés. */
export function enlaceWordReference(palabra: string): string {
  return `https://www.wordreference.com/es/en/translation.asp?spen=${encodeURIComponent(palabra.toLowerCase())}`;
}

/**
 * A dónde mandar la palabra fuera de la app, según los idiomas que la persona lee (el de la app y los que marcó
 * en el perfil; RF-BH8, T339) y el de la palabra: una palabra en español va a la RAE si lee español y a
 * WordReference (su traducción) si no; una en inglés, a Merriam-Webster si lee inglés y, si solo lee español,
 * a la RAE como hasta ahora.
 */
export function enlaceExterno(
  palabra: string,
  idiomas: readonly ('es' | 'en')[],
  palabraEspanola: boolean,
): { sitio: 'rae' | 'merriam' | 'wordreference'; url: string } {
  const leeEspanol = idiomas.includes('es');
  if (palabraEspanola) return leeEspanol ? { sitio: 'rae', url: enlaceRae(palabra) } : { sitio: 'wordreference', url: enlaceWordReference(palabra) };
  return idiomas.includes('en') || !leeEspanol ? { sitio: 'merriam', url: enlaceMerriamWebster(palabra) } : { sitio: 'rae', url: enlaceRae(palabra) };
}

/** Los idiomas que la persona lee: el de la app siempre, más los que marcó en el perfil (T339). */
export function idiomasQueLee(idiomaApp: 'es' | 'en', marcados: readonly ('es' | 'en')[]): ('es' | 'en')[] {
  return [...new Set([idiomaApp, ...marcados])];
}

/** Una palabra con letras del español (acentos, ñ, ü) no se busca en el diccionario de inglés. */
export function pareceEspanol(palabra: string): boolean {
  return /[áéíóúñü¿¡]/i.test(palabra);
}

/** Un libro en español (por su idioma, `es`, `es-MX`…): sus palabras van a la RAE. */
export function idiomaEspanol(idioma: string | null | undefined): boolean {
  return !!idioma && /^es(-|$)/i.test(idioma);
}

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

/**
 * Wiktionary manda HTML: se queda solo el texto. Fuera los estilos incrustados y las listas de
 * subacepciones (cada una ya llega como acepción aparte).
 */
export function sinHtml(html: string): string {
  let limpio = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  for (let antes = ''; antes !== limpio; ) {
    antes = limpio;
    limpio = limpio.replace(/<(ol|ul|dl)\b[^>]*>(?:(?!<(?:ol|ul|dl)\b)[\s\S])*?<\/\1>/gi, '');
  }
  return limpio
    .replace(/<[^>]*>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (ENTIDADES[e]) return ENTIDADES[e];
      if (e.startsWith('#x')) return String.fromCodePoint(parseInt(e.slice(2), 16));
      if (e.startsWith('#')) return String.fromCodePoint(Number(e.slice(1)));
      return m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** `fetch` con tope de espera, que también se corta si quien pidió ya no quiere la respuesta. */
async function pedir(url: string, signal?: AbortSignal): Promise<Response> {
  const tiempo = new AbortController();
  const reloj = setTimeout(() => tiempo.abort(), ESPERA_MS);
  signal?.addEventListener('abort', () => tiempo.abort());
  try {
    return await fetch(url, { signal: tiempo.signal });
  } finally {
    clearTimeout(reloj);
  }
}

type EntradaWiktionary = {
  partOfSpeech?: string;
  definitions?: { definition?: string; examples?: string[] }[];
};

async function wiktionary(palabra: string, signal?: AbortSignal): Promise<Busqueda> {
  // Wiktionary distingue mayúsculas: primero como viene en minúsculas y, si no está, como se escribió.
  const candidatos = [...new Set([palabra.toLowerCase(), palabra])];
  for (const p of candidatos) {
    const respuesta = await pedir(WIKTIONARY + encodeURIComponent(p), signal);
    if (respuesta.status === 404) continue;
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const porIdioma = (await respuesta.json()) as Record<string, EntradaWiktionary[]>;
    const acepciones: Acepcion[] = [];
    // Los símbolos (códigos ISO y así) no son lo que se busca al leer.
    for (const e of (porIdioma.en ?? []).filter((x) => !/^symbol$/i.test(x.partOfSpeech ?? ''))) {
      for (const d of e.definitions ?? []) {
        const definicion = sinHtml(d.definition ?? '');
        if (!definicion || acepciones.length >= MAX_ACEPCIONES) continue;
        const ejemplo = d.examples?.[0] ? sinHtml(d.examples[0]) : '';
        acepciones.push({ categoria: (e.partOfSpeech ?? '').toLowerCase(), definicion, ...(ejemplo ? { ejemplo } : {}) });
      }
    }
    if (acepciones.length) return { definicion: { palabra: p, acepciones, fuente: 'wiktionary' }, espanol: false };
    // Sin entrada en inglés pero sí en español: es una palabra del español.
    return { definicion: null, espanol: (porIdioma.es?.length ?? 0) > 0 };
  }
  return { definicion: null, espanol: false };
}

type EntradaFree = {
  word?: string;
  phonetic?: string;
  meanings?: { partOfSpeech?: string; definitions?: { definition?: string; example?: string }[] }[];
};

async function freeDictionary(palabra: string, signal?: AbortSignal): Promise<Definicion | null> {
  const respuesta = await pedir(FREE_DICTIONARY + encodeURIComponent(palabra.toLowerCase()), signal);
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  const entradas = (await respuesta.json()) as EntradaFree[];
  if (!Array.isArray(entradas) || entradas.length === 0) return null;
  const acepciones: Acepcion[] = [];
  for (const e of entradas) {
    for (const m of e.meanings ?? []) {
      for (const d of m.definitions ?? []) {
        if (!d.definition || acepciones.length >= MAX_ACEPCIONES) continue;
        acepciones.push({ categoria: m.partOfSpeech ?? '', definicion: d.definition, ...(d.example ? { ejemplo: d.example } : {}) });
      }
    }
  }
  if (!acepciones.length) return null;
  return { palabra: entradas[0].word ?? palabra, ...(entradas[0].phonetic ? { fonetica: entradas[0].phonetic } : {}), acepciones, fuente: 'freedictionary' };
}

/**
 * La definición en inglés. Primero Wiktionary; si no responde (red, servidor), la Free Dictionary API. Si
 * ninguno responde, el error se lanza para que el lector lo diga.
 */
export async function definirEnIngles(palabra: string, signal?: AbortSignal): Promise<Busqueda> {
  try {
    return await wiktionary(palabra, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    const definicion = await freeDictionary(palabra, signal);
    return { definicion, espanol: false };
  }
}
