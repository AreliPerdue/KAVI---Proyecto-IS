const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VALOR = new Map([...ALFABETO].map((c, i) => [c, i]));

/**
 * Base64 → bytes, en las tres plataformas (Hermes no siempre trae `atob`). Ignora lo que no sea
 * del alfabeto —saltos de línea, el `=` final— y acepta un prefijo `data:…;base64,`.
 */
export function base64ToBytes(texto: string): Uint8Array {
  const limpio = texto.replace(/^data:[^,]*,/, '');
  const salida: number[] = [];
  let acumulado = 0;
  let bits = 0;
  for (const c of limpio) {
    const v = VALOR.get(c);
    if (v === undefined) continue;
    acumulado = (acumulado << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      salida.push((acumulado >> bits) & 0xff);
    }
  }
  return Uint8Array.from(salida);
}

/** Bytes → base64, para pasar una imagen como `data:` URI. */
export function bytesToBase64(bytes: Uint8Array): string {
  let salida = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    salida += ALFABETO[(n >> 18) & 63] + ALFABETO[(n >> 12) & 63];
    salida += b === undefined ? '=' : ALFABETO[(n >> 6) & 63];
    salida += c === undefined ? '=' : ALFABETO[n & 63];
  }
  return salida;
}
