import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { base64ToBytes } from '@/lib/library/base64';

/** El nombre del archivo de un recorte exportado: su nombre (o "recorte") sin caracteres raros, en PNG. */
export function nombreDeExportacion(titulo: string, porOmision: string): string {
  const base = (titulo.trim() || porOmision)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base || 'kavi'}.png`;
}

/**
 * Lo que se comparte de un recorte exportado (13h, RF-CC25; T342): en la web, la imagen tal cual; en el teléfono, un
 * archivo temporal con ella, que es lo que pide la hoja de compartir.
 */
export function archivoDeExportacion(dataUrl: string, nombre: string): string {
  if (Platform.OS === 'web') return dataUrl;
  const archivo = new File(Paths.cache, nombre);
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(base64ToBytes(dataUrl.replace(/^data:image\/png;base64,/, '')));
  return archivo.uri;
}
