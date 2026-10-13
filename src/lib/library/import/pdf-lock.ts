import { cbc } from '@noble/ciphers/aes.js';
import { md5 } from '@noble/hashes/legacy.js';
import { sha256, sha384, sha512 } from '@noble/hashes/sha2.js';

/**
 * ¿Se abre este PDF sin contraseña? (RF-BL14, RF-BR2)
 *
 * Un PDF cifrado puede tener dos contraseñas: la **de usuario**, que hace falta para abrirlo, y
 * la **de dueño**, que solo limita imprimir o copiar. Muchos PDF de escuela o de editorial traen
 * solo la segunda: la de usuario está vacía y cualquier lector los abre. Rechazar todo PDF cifrado
 * dejaría fuera esos libros, así que se prueba la contraseña vacía con el método del propio
 * estándar (ISO 32000, manejador "Standard", revisiones 2 a 6). Sin descifrar nada más: solo se
 * compara el valor `/U` que guarda el archivo.
 */
export type CandadoPdf = {
  /** `/Filter`: "Standard" es el de contraseña; cualquier otro es DRM de una tienda. */
  filter: string;
  /** `/R` */
  revision: number;
  /** `/Length` en bits (40 por omisión). */
  lengthBits: number;
  o: Uint8Array;
  u: Uint8Array;
  /** `/P`, con signo. */
  p: number;
  /** `/EncryptMetadata` (verdadero por omisión). */
  encryptMetadata: boolean;
  /** Primer elemento de `/ID` del tráiler. */
  id0: Uint8Array;
};

/** Relleno fijo del estándar para completar la contraseña a 32 bytes. */
const RELLENO = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08, 0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f,
  0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

function unir(...partes: Uint8Array[]): Uint8Array {
  const total = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of partes) {
    total.set(p, i);
    i += p.length;
  }
  return total;
}

function iguales(a: Uint8Array, b: Uint8Array, n: number): boolean {
  if (a.length < n || b.length < n) return false;
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** RC4, el cifrado de las revisiones 2 a 4. Corto y sin dependencias. */
function rc4(clave: Uint8Array, datos: Uint8Array): Uint8Array {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  for (let i = 0, j = 0; i < 256; i++) {
    j = (j + s[i] + clave[i % clave.length]) & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
  }
  const salida = new Uint8Array(datos.length);
  for (let k = 0, i = 0, j = 0; k < datos.length; k++) {
    i = (i + 1) & 0xff;
    j = (j + s[i]) & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
    salida[k] = datos[k] ^ s[(s[i] + s[j]) & 0xff];
  }
  return salida;
}

/** Algoritmo 2 del estándar: la clave del archivo a partir de la contraseña (aquí, vacía). */
function claveRc4(c: CandadoPdf): Uint8Array {
  const p = new Uint8Array(4);
  new DataView(p.buffer).setInt32(0, c.p, true);
  const extra = c.revision >= 4 && !c.encryptMetadata ? new Uint8Array([0xff, 0xff, 0xff, 0xff]) : new Uint8Array(0);
  const n = c.revision === 2 ? 5 : Math.max(5, Math.min(16, Math.floor(c.lengthBits / 8)));
  let hash = md5(unir(RELLENO, c.o.subarray(0, 32), p, c.id0, extra));
  if (c.revision >= 3) for (let i = 0; i < 50; i++) hash = md5(hash.subarray(0, n));
  return hash.subarray(0, n);
}

/** Revisiones 2 a 4 (RC4 y AES-128): algoritmos 4 y 5. */
function vacioRc4(c: CandadoPdf): boolean {
  const clave = claveRc4(c);
  if (c.revision === 2) return iguales(rc4(clave, RELLENO), c.u, 32);
  let x = rc4(clave, md5(unir(RELLENO, c.id0)));
  for (let i = 1; i <= 19; i++) x = rc4(clave.map((b) => b ^ i), x);
  return iguales(x, c.u, 16);
}

/** Algoritmo 2.B (revisión 6): SHA-256/384/512 encadenados con AES-128. Con contraseña vacía. */
function hashR6(salt: Uint8Array): Uint8Array {
  let k: Uint8Array = sha256(salt);
  for (let ronda = 0; ; ronda++) {
    const k1 = new Uint8Array(k.length * 64);
    for (let i = 0; i < 64; i++) k1.set(k, i * k.length);
    const e = cbc(k.subarray(0, 16), k.subarray(16, 32), { disablePadding: true }).encrypt(k1);
    let suma = 0;
    for (let i = 0; i < 16; i++) suma += e[i];
    k = suma % 3 === 0 ? sha256(e) : suma % 3 === 1 ? sha384(e) : sha512(e);
    if (ronda >= 63 && e[e.length - 1] <= ronda - 32) break;
  }
  return k.subarray(0, 32);
}

/** Revisiones 5 y 6 (AES-256): el hash de la contraseña vacía con la sal de validación. */
function vacioAes256(c: CandadoPdf): boolean {
  const sal = c.u.subarray(32, 40);
  const hash = c.revision === 5 ? sha256(sal) : hashR6(sal);
  return iguales(hash, c.u, 32);
}

export type ResultadoCandado = 'abre' | 'contrasena' | 'drm';

export function revisarCandado(c: CandadoPdf): ResultadoCandado {
  if (c.filter !== 'Standard') return 'drm';
  if (c.revision >= 2 && c.revision <= 4) return vacioRc4(c) ? 'abre' : 'contrasena';
  if (c.revision === 5 || c.revision === 6) return vacioAes256(c) ? 'abre' : 'contrasena';
  // Una revisión que no existe en el estándar: no hay forma de saber cómo abrirlo.
  return 'drm';
}
