import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { pixelesPng } from '@/lib/library/import/dominant-color';
import { base64ToBytes } from '@/lib/library/base64';

/**
 * Cuentagotas (RF-BL21): una muestra chica de la imagen (60 px de ancho) para leer el color del punto
 * que se toca, sin decodificar en JS la imagen completa.
 */
export type Muestra = { ancho: number; alto: number; pixeles: Uint8Array };

const ANCHO_MUESTRA = 60;

export async function muestraDe(uri: string): Promise<Muestra | null> {
  try {
    const imagen = await ImageManipulator.manipulate(uri).resize({ width: ANCHO_MUESTRA }).renderAsync();
    const { base64 } = await imagen.saveAsync({ format: SaveFormat.PNG, base64: true });
    const pixeles = base64 ? pixelesPng(base64ToBytes(base64)) : null;
    return pixeles ? { ancho: imagen.width, alto: imagen.height, pixeles } : null;
  } catch {
    return null;
  }
}

/**
 * El color en un punto (fx, fy de 0 a 1 sobre la imagen), promediando un cuadrito de 3×3 para que un
 * pixel suelto (ruido, borde de letra) no decida. `null` si cae en algo transparente.
 */
export function colorEn(m: Muestra, fx: number, fy: number): string | null {
  const cx = Math.min(m.ancho - 1, Math.max(0, Math.round(fx * (m.ancho - 1))));
  const cy = Math.min(m.alto - 1, Math.max(0, Math.round(fy * (m.alto - 1))));
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = cy - 1; y <= cy + 1; y++) {
    for (let x = cx - 1; x <= cx + 1; x++) {
      if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) continue;
      const o = (y * m.ancho + x) * 4;
      if (m.pixeles[o + 3] < 128) continue;
      r += m.pixeles[o];
      g += m.pixeles[o + 1];
      b += m.pixeles[o + 2];
      n++;
    }
  }
  if (!n) return null;
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}
