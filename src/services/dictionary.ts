/**
 * Definir una palabra desde el lector (spec 13c, RF-BH8; decisión B4: mixto y gratis). En inglés, la
 * *Free Dictionary API* (pública, sin llave). En español no hay una API libre: el lector ofrece abrir la
 * palabra en el Diccionario de la lengua española (RAE); el diccionario del sistema del iPhone queda para
 * cuando haya un módulo nativo.
 *
 * No toca Supabase ni datos de KAVI: funciona igual en el modo demo.
 */

export type Acepcion = { categoria: string; definicion: string; ejemplo?: string };
export type Definicion = { palabra: string; fonetica?: string; acepciones: Acepcion[] };

const API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const MAX_ACEPCIONES = 6;
/** El diccionario a veces tarda mucho: pasado esto, se dice que no respondió. */
const ESPERA_MS = 8000;

/** La dirección de la palabra en el DLE de la RAE. */
export function enlaceRae(palabra: string): string {
  return `https://dle.rae.es/${encodeURIComponent(palabra.toLowerCase())}`;
}

/** Una palabra con letras del español (acentos, ñ, ü) no se busca en el diccionario de inglés. */
export function pareceEspanol(palabra: string): boolean {
  return /[áéíóúñü¿¡]/i.test(palabra);
}

type Entrada = {
  word?: string;
  phonetic?: string;
  meanings?: { partOfSpeech?: string; definitions?: { definition?: string; example?: string }[] }[];
};

/**
 * La definición en inglés, o `null` si el diccionario no la tiene (404). Un error de red se lanza, para que
 * el lector diga que no hubo conexión.
 */
export async function definirEnIngles(palabra: string, signal?: AbortSignal): Promise<Definicion | null> {
  const tiempo = new AbortController();
  const reloj = setTimeout(() => tiempo.abort(), ESPERA_MS);
  signal?.addEventListener('abort', () => tiempo.abort());
  let respuesta: Response;
  try {
    respuesta = await fetch(API + encodeURIComponent(palabra.toLowerCase()), { signal: tiempo.signal });
  } finally {
    clearTimeout(reloj);
  }
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  const entradas = (await respuesta.json()) as Entrada[];
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
  return { palabra: entradas[0].word ?? palabra, ...(entradas[0].phonetic ? { fonetica: entradas[0].phonetic } : {}), acepciones };
}
