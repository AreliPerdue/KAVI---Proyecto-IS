import { env } from '@/lib/env';
import type { StickerPack } from '@/types/domain';

/**
 * La tienda de stickers (spec 13c, RF-BH13b; T338), sin React: dónde están las imágenes y cómo se llaman.
 * Un sticker de la tienda se pega con el id `<pack>/<nombre>`, igual que los incluidos (`nobi-pink/<nombre>`).
 */

/** El bucket público de Supabase Storage con los packs. */
const BASE = `${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/stickers`;

/** `?v=`: cuando el pack cambia sus imágenes, la dirección cambia y nadie se queda con las viejas en caché. */
export const urlDeSticker = (pack: Pick<StickerPack, 'id' | 'version'>, nombre: string) => `${BASE}/${pack.id}/${nombre}.png?v=${pack.version}`;
export const urlDeMuestra = (pack: Pick<StickerPack, 'id' | 'version'>) => `${BASE}/${pack.id}/muestra.png?v=${pack.version}`;

export const idDeSticker = (packId: string, nombre: string) => `${packId}/${nombre}`;

/** `primer-rebote-blue/popcorn` → `{ pack: 'primer-rebote-blue', nombre: 'popcorn' }`. */
export function partesDeSticker(id: string): { pack: string; nombre: string } | null {
  const m = /^([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(id);
  return m ? { pack: m[1], nombre: m[2] } : null;
}

/** Cuánto pesa, para la tarjeta: "1.1 MB" o "850 KB". */
export function pesoDe(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Los packs en su orden: por colección y, dentro, por su lugar. */
export function ordenarPacks(packs: readonly StickerPack[]): StickerPack[] {
  return [...packs].sort((a, b) => a.collection.localeCompare(b.collection) || a.sort_order - b.sort_order);
}
