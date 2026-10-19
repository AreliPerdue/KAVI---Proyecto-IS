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

export type ImagenLista = { jpeg: Uint8Array; ancho: number; alto: number; vistaPrevia: string };

/**
 * Deja lista una imagen para pegarla sobre la página (13c, RF-BH12; T289): como la portada, reducida a
 * `ANCHO_PORTADA` y en JPEG, y con su tamaño para saber su proporción.
 */
export async function prepararImagenPegada(uri: string): Promise<ImagenLista> {
  let guardada: { base64?: string; width: number; height: number };
  try {
    const original = await ImageManipulator.manipulate(uri).renderAsync();
    const imagen = original.width > ANCHO_PORTADA ? await ImageManipulator.manipulate(uri).resize({ width: ANCHO_PORTADA }).renderAsync() : original;
    guardada = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.82, base64: true });
  } catch (e) {
    throw new AuthUiError(t().library.cover.unreadable, e);
  }
  if (!guardada.base64 || !guardada.width || !guardada.height) throw new AuthUiError(t().library.cover.unreadable);
  return { jpeg: base64ToBytes(guardada.base64), ancho: guardada.width, alto: guardada.height, vistaPrevia: `data:image/jpeg;base64,${guardada.base64}` };
}

/** El lado mayor de la imagen con que se hace un sticker propio (T335). */
export const LADO_STICKER = 512;

/**
 * Deja lista una imagen para hacerla sticker (13c, RF-BH13; T335): a lo más `LADO_STICKER` por su lado mayor y
 * en PNG, para no perder lo transparente. El motor del lector le pone el margen.
 */
export async function prepararSticker(uri: string): Promise<{ dataUrl: string; ancho: number; alto: number }> {
  let guardada: { base64?: string; width: number; height: number };
  try {
    const original = await ImageManipulator.manipulate(uri).renderAsync();
    const mayor = Math.max(original.width, original.height);
    const imagen =
      mayor > LADO_STICKER
        ? await ImageManipulator.manipulate(uri)
            .resize(original.width >= original.height ? { width: LADO_STICKER } : { height: LADO_STICKER })
            .renderAsync()
        : original;
    guardada = await imagen.saveAsync({ format: SaveFormat.PNG, base64: true });
  } catch (e) {
    throw new AuthUiError(t().library.cover.unreadable, e);
  }
  if (!guardada.base64 || !guardada.width || !guardada.height) throw new AuthUiError(t().library.cover.unreadable);
  return { dataUrl: `data:image/png;base64,${guardada.base64}`, ancho: guardada.width, alto: guardada.height };
}
