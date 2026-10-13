import { getDocumentAsync } from 'expo-document-picker';

import type { ArchivoElegido } from './types';

import { LIBRARY_LIMITS } from '@/constants/library';
import { t } from '@/i18n';
import { AuthUiError } from '@/lib/auth-errors';

export const TIPOS_LIBRO = ['application/pdf', 'application/epub+zip', '.epub'];

/** Igual que en el teléfono, pero el navegador entrega el `File` directo (RF-BL11). */
export async function elegirLibro(): Promise<ArchivoElegido | null> {
  const resultado = await getDocumentAsync({ type: TIPOS_LIBRO });
  if (resultado.canceled || !resultado.assets[0]) return null;
  const asset = resultado.assets[0];
  if ((asset.size ?? asset.file?.size ?? 0) > LIBRARY_LIMITS.fileBytes) throw new AuthUiError(t().errors.libraryFileTooBig);
  const buffer = asset.file ? await asset.file.arrayBuffer() : await (await fetch(asset.uri)).arrayBuffer();
  return { name: asset.name, mime: asset.mimeType ?? asset.file?.type ?? '', bytes: new Uint8Array(buffer) };
}
