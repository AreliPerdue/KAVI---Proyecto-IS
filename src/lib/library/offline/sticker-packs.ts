import { Directory, File, Paths } from 'expo-file-system';

import { urlDeSticker } from '@/lib/library/sticker-packs';
import { getJson, setJson } from '@/lib/storage';
import type { StickerPack } from '@/types/domain';

/**
 * Los packs de stickers guardados en el teléfono (spec 13c, RF-BH13b; T338). Descargar un pack baja sus
 * imágenes a `stickers/<pack>/v<version>/` en los documentos de la app y anota el pack en una lista local, así
 * "Mis stickers" y lo pegado se ven sin red.
 */
const KEY = 'kavi.library.stickerPacks.v1';

const carpetaDe = (packId: string) => new Directory(Paths.document, 'stickers', packId);
const archivoDe = (pack: Pick<StickerPack, 'id' | 'version'>, nombre: string) => new File(carpetaDe(pack.id), `v${pack.version}`, `${nombre}.png`);

export function packsGuardados(): Promise<StickerPack[]> {
  return getJson<StickerPack[]>(KEY).then((l) => l ?? []);
}

/** Baja las imágenes que falten y anota el pack. Si algo falla, lo que quedó a medias se borra. */
export async function guardarPack(pack: StickerPack): Promise<void> {
  const carpeta = new Directory(carpetaDe(pack.id), `v${pack.version}`);
  // Una versión vieja ya no sirve.
  if (carpetaDe(pack.id).exists) for (const x of carpetaDe(pack.id).list()) if (x.uri !== carpeta.uri) x.delete();
  carpeta.create({ intermediates: true, idempotent: true });
  try {
    for (const s of pack.stickers) {
      const f = archivoDe(pack, s.name);
      if (f.exists && f.size > 0) continue;
      await File.downloadFileAsync(urlDeSticker(pack, s.name), f);
    }
  } catch (e) {
    if (carpetaDe(pack.id).exists) carpetaDe(pack.id).delete();
    throw e;
  }
  const lista = (await packsGuardados()).filter((p) => p.id !== pack.id);
  await setJson(KEY, [...lista, pack]);
}

export async function quitarPack(packId: string): Promise<void> {
  try {
    if (carpetaDe(packId).exists) carpetaDe(packId).delete();
  } catch {
    // Si no se pudo, se queda: no estorba.
  }
  await setJson(KEY, (await packsGuardados()).filter((p) => p.id !== packId));
}

/** La imagen guardada de un sticker, si el pack está en el teléfono. */
export function uriLocal(pack: Pick<StickerPack, 'id' | 'version'>, nombre: string): string | null {
  const f = archivoDe(pack, nombre);
  return f.exists && f.size > 0 ? f.uri : null;
}

/** La imagen de un sticker como `data:` para el lector (que no puede abrir archivos del teléfono). */
export async function comoDato(pack: Pick<StickerPack, 'id' | 'version'>, nombre: string): Promise<string | null> {
  const f = archivoDe(pack, nombre);
  if (!f.exists) return null;
  return `data:image/png;base64,${await f.base64()}`;
}

/** Al eliminar la cuenta no queda nada suyo en el dispositivo (RF-A12). */
export async function borrarPacks(): Promise<void> {
  try {
    const raiz = new Directory(Paths.document, 'stickers');
    if (raiz.exists) raiz.delete();
  } catch {
    // Nada que hacer.
  }
  await setJson(KEY, []);
}
