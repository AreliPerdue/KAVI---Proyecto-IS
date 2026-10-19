import { Directory, File, Paths } from 'expo-file-system';

import { base64ToBytes } from '@/lib/library/base64';

/**
 * Los stickers propios en el teléfono (spec 13c, RF-BH13; T335): al hacerlos se guarda una copia en los
 * documentos de la app (`stickers/mios/<id>.png`), así se ven y se pegan sin red.
 */
const carpeta = () => new Directory(Paths.document, 'stickers', 'mios');
const archivoDe = (id: string) => new File(carpeta(), `${id}.png`);

export function guardarCopia(id: string, dataUrl: string): void {
  carpeta().create({ intermediates: true, idempotent: true });
  const f = archivoDe(id);
  if (f.exists) f.delete();
  f.create();
  f.write(base64ToBytes(dataUrl.replace(/^data:image\/png;base64,/, '')));
}

/** Baja la imagen (dirección firmada) si no está: para stickers hechos en otro aparato. */
export async function asegurarCopia(id: string, url: string): Promise<void> {
  const f = archivoDe(id);
  if (f.exists && f.size > 0) return;
  carpeta().create({ intermediates: true, idempotent: true });
  await File.downloadFileAsync(url, f);
}

export function uriLocal(id: string): string | null {
  const f = archivoDe(id);
  return f.exists && f.size > 0 ? f.uri : null;
}

/** Como `data:` para el lector, que no puede abrir archivos del teléfono. */
export async function comoDato(id: string): Promise<string | null> {
  const f = archivoDe(id);
  return f.exists ? `data:image/png;base64,${await f.base64()}` : null;
}

export function borrarCopia(id: string): void {
  try {
    const f = archivoDe(id);
    if (f.exists) f.delete();
  } catch {
    // Si no se pudo, se queda: no estorba.
  }
}

/** Al eliminar la cuenta (RF-A12). */
export function borrarCopias(): void {
  try {
    if (carpeta().exists) carpeta().delete();
  } catch {
    // Nada que hacer.
  }
}
