import { elegibleDe, type StickerElegible } from '@/components/library/sticker-sheet';
import { useStickerPacks } from '@/hooks/use-sticker-packs';
import { useUserStickerImages, useUserStickers } from '@/hooks/use-user-stickers';

/**
 * De un id de sticker (`<pack>/<nombre>` o `mios/<id>`) a su imagen y proporción, fuera del lector: los
 * incluidos, los de la tienda y los propios (para decorar las fichas, spec 13d RF-BF3).
 */
export function useStickerElegible(): (id: string) => StickerElegible | null {
  const packs = useStickerPacks();
  const mios = useUserStickers();
  const imagenes = useUserStickerImages(mios.data);
  const lista = packs.data?.packs;
  const propios = { stickers: mios.data ?? [], imagenes };
  return (id: string) => elegibleDe(id, lista, propios);
}
