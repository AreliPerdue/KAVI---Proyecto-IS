import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { colorDominante, pixelesPng } from './dominant-color';

import { base64ToBytes, bytesToBase64 } from '@/lib/library/base64';

/**
 * Color dominante de una imagen de portada (RF-BL13). La imagen se reduce a 24 px de ancho con el
 * manipulador de Expo (nativo en el teléfono, `canvas` en web) y se lee como PNG; con eso alcanza
 * para el color y no se decodifica en JS una portada de varios megapíxeles. Si algo falla, `null`:
 * la pieza se guarda igual y usa el color generado.
 */
export async function colorDeImagen(bytes: Uint8Array, mime: string): Promise<string | null> {
  try {
    const imagen = await ImageManipulator.manipulate(`data:${mime};base64,${bytesToBase64(bytes)}`)
      .resize({ width: 24 })
      .renderAsync();
    const { base64 } = await imagen.saveAsync({ format: SaveFormat.PNG, base64: true });
    const pixeles = base64 ? pixelesPng(base64ToBytes(base64)) : null;
    return pixeles ? colorDominante(pixeles) : null;
  } catch {
    return null;
  }
}
