import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { colorDeImagen } from '@/lib/library/import/cover-color';
import { base64ToBytes } from '@/lib/library/base64';
import { t } from '@/i18n';
import { AuthUiError } from '@/lib/auth-errors';

/** Ancho máximo de una portada propia: de sobra para la rejilla a 2x y la vista del libro. */
export const ANCHO_PORTADA = 1200;

export type PortadaLista = {
  /** La imagen ya reducida, en JPEG, lista para subir. */
  jpeg: Uint8Array;
  /** Su color dominante (RF-BL13); `null` si no se pudo calcular. */
  color: string | null;
  /** La misma imagen como `data:` URI, para la vista previa. */
  vistaPrevia: string;
};

/**
 * Deja lista una imagen para portada (RF-BL23): la reduce a `ANCHO_PORTADA` si es más ancha (nunca la
 * agranda), la convierte a JPEG —así sirve igual una foto HEIC del iPhone, un PNG o un WebP— y saca
 * su color. Una imagen que no se puede leer da un mensaje claro.
 */
export async function prepararPortada(uri: string): Promise<PortadaLista> {
  let base64: string | undefined;
  try {
    const original = await ImageManipulator.manipulate(uri).renderAsync();
    const imagen = original.width > ANCHO_PORTADA ? await ImageManipulator.manipulate(uri).resize({ width: ANCHO_PORTADA }).renderAsync() : original;
    base64 = (await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true })).base64;
  } catch (e) {
    throw new AuthUiError(t().library.cover.unreadable, e);
  }
  if (!base64) throw new AuthUiError(t().library.cover.unreadable);
  const jpeg = base64ToBytes(base64);
  return { jpeg, color: await colorDeImagen(jpeg, 'image/jpeg'), vistaPrevia: `data:image/jpeg;base64,${base64}` };
}
