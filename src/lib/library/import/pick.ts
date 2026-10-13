import { getDocumentAsync } from 'expo-document-picker';
import { File } from 'expo-file-system';

import type { ArchivoElegido } from './types';

import { LIBRARY_LIMITS } from '@/constants/library';
import { t } from '@/i18n';
import { AuthUiError } from '@/lib/auth-errors';

/** Tipos que se ofrecen al elegir; el formato real se reconoce después por el contenido. */
export const TIPOS_LIBRO = ['application/pdf', 'application/epub+zip'];

/**
 * Elige un PDF o EPUB y lo lee (RF-BL11). `null` si la persona cancela. El tope de 50 MB se revisa
 * antes de leerlo, para no cargar en memoria un archivo que de todos modos se rechaza (B2).
 */
export async function elegirLibro(): Promise<ArchivoElegido | null> {
  const resultado = await getDocumentAsync({ type: TIPOS_LIBRO, copyToCacheDirectory: true });
  if (resultado.canceled || !resultado.assets[0]) return null;
  const asset = resultado.assets[0];
  if ((asset.size ?? 0) > LIBRARY_LIMITS.fileBytes) throw new AuthUiError(t().errors.libraryFileTooBig);
  const bytes = new Uint8Array(await new File(asset.uri).arrayBuffer());
  return { name: asset.name, mime: asset.mimeType ?? '', bytes };
}
