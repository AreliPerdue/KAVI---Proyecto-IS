import { unzlibSync } from 'fflate';

/**
 * El color dominante de una portada (RF-BL13), a partir de sus píxeles RGBA ya reducidos a unas
 * decenas de puntos. Se agrupan en cubetas de 16 niveles por canal y gana la más poblada; su color
 * es el promedio de sus píxeles, para no devolver el borde de la cubeta. Lo casi transparente no
 * cuenta.
 */
export function colorDominante(rgba: Uint8Array): string | null {
  const cubetas = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    const [r, g, b] = [rgba[i], rgba[i + 1], rgba[i + 2]];
    const clave = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const c = cubetas.get(clave) ?? { n: 0, r: 0, g: 0, b: 0 };
    c.n++;
    c.r += r;
    c.g += g;
    c.b += b;
    cubetas.set(clave, c);
  }
  let mejor: { n: number; r: number; g: number; b: number } | null = null;
  for (const c of cubetas.values()) if (!mejor || c.n > mejor.n) mejor = c;
  if (!mejor) return null;
  const hex = (v: number) => Math.round(v / (mejor as { n: number }).n).toString(16).padStart(2, '0');
  return `#${hex(mejor.r)}${hex(mejor.g)}${hex(mejor.b)}`.toUpperCase();
}

/**
 * Píxeles RGBA de un PNG de 8 bits por canal (RGB o RGBA, sin entrelazar), que es lo que entrega
 * `expo-image-manipulator`. Basta para la miniatura del color; cualquier otro PNG da `null`.
 */
export function pixelesPng(png: Uint8Array): Uint8Array | null {
  const vista = new DataView(png.buffer, png.byteOffset, png.byteLength);
  if (png.length < 33 || vista.getUint32(0) !== 0x89504e47) return null;
  let ancho = 0;
  let alto = 0;
  let canales = 0;
  const datos: Uint8Array[] = [];
  for (let i = 8; i + 8 <= png.length; ) {
    const largo = vista.getUint32(i);
    const tipo = String.fromCharCode(png[i + 4], png[i + 5], png[i + 6], png[i + 7]);
    const cuerpo = png.subarray(i + 8, i + 8 + largo);
    if (tipo === 'IHDR') {
      ancho = vista.getUint32(i + 8);
      alto = vista.getUint32(i + 12);
      const [profundidad, color, , , entrelazado] = [cuerpo[8], cuerpo[9], cuerpo[10], cuerpo[11], cuerpo[12]];
      if (profundidad !== 8 || entrelazado !== 0 || (color !== 2 && color !== 6)) return null;
      canales = color === 6 ? 4 : 3;
    } else if (tipo === 'IDAT') datos.push(cuerpo);
    else if (tipo === 'IEND') break;
    i += 12 + largo;
  }
  if (!ancho || !alto || !canales) return null;

  const crudo = unzlibSync(unir(datos));
  const fila = ancho * canales;
  const salida = new Uint8Array(ancho * alto * 4);
  let anterior = new Uint8Array(fila);
  for (let y = 0; y < alto; y++) {
    const filtro = crudo[y * (fila + 1)];
    const actual = crudo.slice(y * (fila + 1) + 1, (y + 1) * (fila + 1));
    for (let x = 0; x < fila; x++) {
      const a = x >= canales ? actual[x - canales] : 0;
      const b = anterior[x];
      const c = x >= canales ? anterior[x - canales] : 0;
      const p = a + b - c;
      const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
      const suma = [0, a, b, (a + b) >> 1, paeth][filtro] ?? 0;
      actual[x] = (actual[x] + suma) & 0xff;
    }
    for (let x = 0; x < ancho; x++) {
      const o = (y * ancho + x) * 4;
      salida[o] = actual[x * canales];
      salida[o + 1] = actual[x * canales + 1];
      salida[o + 2] = actual[x * canales + 2];
      salida[o + 3] = canales === 4 ? actual[x * canales + 3] : 255;
    }
    anterior = actual;
  }
  return salida;
}

function unir(partes: Uint8Array[]): Uint8Array {
  const total = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of partes) {
    total.set(p, i);
    i += p.length;
  }
  return total;
}
