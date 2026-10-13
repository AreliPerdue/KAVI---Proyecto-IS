import * as Clipboard from 'expo-clipboard';
import { getDocumentAsync } from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { t } from '@/i18n';
import { AuthUiError } from '@/lib/auth-errors';

/**
 * De dónde sale una portada propia en el teléfono (RF-BL23). Cada función devuelve la dirección de la
 * imagen elegida, o `null` si la persona cancela o no hay nada.
 */

export const PUEDE_TOMAR_FOTO = true;

export async function desdeGaleria(): Promise<string | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  return r.canceled ? null : (r.assets[0]?.uri ?? null);
}

export async function desdeCamara(): Promise<string | null> {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) throw new AuthUiError(t().library.cover.cameraDenied);
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  return r.canceled ? null : (r.assets[0]?.uri ?? null);
}

export async function desdeArchivo(): Promise<string | null> {
  const r = await getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
  return r.canceled ? null : (r.assets[0]?.uri ?? null);
}

/** Una imagen copiada (de Safari, Fotos, una captura…). */
export async function desdePortapapeles(): Promise<string | null> {
  if (!(await Clipboard.hasImageAsync())) return null;
  const imagen = await Clipboard.getImageAsync({ format: 'jpeg' });
  return imagen?.data ?? null;
}
