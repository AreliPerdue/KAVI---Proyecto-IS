/**
 * UUID v4 generado en el dispositivo (RF-F16), sin dependencias.
 *
 * No necesita ser criptográfico: el id de una serie no es un secreto, lo que protege los
 * datos es la RLS. Lo único que se le pide es no chocar, y 122 bits aleatorios bastan
 * incluso con `Math.random`. Si la plataforma ofrece `crypto`, se usa.
 */
export function uuidv4(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  if (typeof c?.getRandomValues === 'function') c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  return format(b);
}

/**
 * UUID **determinista** a partir de un texto: el mismo texto da siempre el mismo id.
 *
 * Es lo que hace idempotente la conversión de v1 (RF-F62): la serie 2 del ejercicio X
 * tiene siempre el mismo id, así que convertir dos veces es un `upsert` y no un duplicado,
 * aunque la primera vez se haya cortado a la mitad.
 */
export function uuidFrom(seed: string): string {
  const b = new Uint8Array(16);
  for (let k = 0; k < 4; k++) {
    const h = fnv1a(`${k}:${seed}`);
    b[k * 4] = h >>> 24;
    b[k * 4 + 1] = (h >>> 16) & 0xff;
    b[k * 4 + 2] = (h >>> 8) & 0xff;
    b[k * 4 + 3] = h & 0xff;
  }
  return format(b);
}

function format(b: Uint8Array): string {
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
