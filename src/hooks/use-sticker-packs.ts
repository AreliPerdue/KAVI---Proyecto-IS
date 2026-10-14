import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { isOfflineError } from '@/lib/auth-errors';
import { comoDato, guardarPack, packsGuardados, quitarPack } from '@/lib/library/offline/sticker-packs';
import { ordenarPacks, partesDeSticker, urlDeSticker } from '@/lib/library/sticker-packs';
import { useAuth } from '@/providers';
import { addStickerPack, listMyStickerPacks, listStickerPacks, removeStickerPack } from '@/services/library';
import type { StickerPack } from '@/types/domain';

// Bajo `['library', …]` (como `libraryKeys`), así se limpian con el resto de la librería.
const claves = {
  packs: ['library', 'sticker-packs'] as const,
  mios: (userId: string | null) => ['library', 'sticker-packs', 'mios', userId] as const,
  fuentes: (ids: string) => ['library', 'sticker-packs', 'fuentes', ids] as const,
};

/**
 * El catálogo de la tienda de stickers (spec 13c, RF-BH13b; T338). Sin red, lo que esté guardado en el
 * teléfono (para pintar lo ya descargado); `sinRed` dice que la tienda no se puede ver.
 */
export function useStickerPacks() {
  const { userId } = useAuth();
  return useQuery<{ packs: StickerPack[]; sinRed: boolean }>({
    queryKey: claves.packs,
    queryFn: async () => {
      try {
        return { packs: ordenarPacks(await listStickerPacks()), sinRed: false };
      } catch (e) {
        if (!isOfflineError(e)) throw e;
        return { packs: ordenarPacks(await packsGuardados()), sinRed: true };
      }
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
}

/** Los packs que la persona descargó (ids). Sin red, los guardados en el teléfono. */
export function useMyStickerPacks() {
  const { userId } = useAuth();
  return useQuery<string[]>({
    queryKey: claves.mios(userId),
    queryFn: async () => {
      try {
        return await listMyStickerPacks(userId as string);
      } catch (e) {
        if (!isOfflineError(e)) throw e;
        return (await packsGuardados()).map((p) => p.id);
      }
    },
    enabled: !!userId,
  });
}

/**
 * Descargar un pack: en el teléfono primero se bajan sus imágenes (para verlo sin red) y luego se anota en la
 * cuenta; en la web solo se anota. Quitarlo hace lo contrario. Lo ya pegado no se toca.
 */
export function useStickerPackActions() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const refrescar = () => queryClient.invalidateQueries({ queryKey: claves.mios(userId) });
  const descargar = useMutation({
    mutationFn: async (pack: StickerPack) => {
      await guardarPack(pack);
      await addStickerPack(userId as string, pack.id);
    },
    onSettled: refrescar,
  });
  const quitar = useMutation({
    mutationFn: async (pack: StickerPack) => {
      await removeStickerPack(userId as string, pack.id);
      await quitarPack(pack.id);
    },
    onSettled: refrescar,
  });
  return { descargar, quitar };
}

/**
 * Cómo ve el lector los stickers de la tienda que están pegados en un libro: en la web, su dirección en la nube;
 * en el teléfono, la copia guardada como `data:` (el lector no abre archivos del teléfono), y si aún no está,
 * la dirección. Devuelve id → fuente.
 */
export function useStickerSources(ids: readonly string[], packs: readonly StickerPack[] | undefined): ReadonlyMap<string, string> {
  const clave = [...new Set(ids)].sort().join(',');
  const consulta = useQuery<[string, string][]>({
    queryKey: claves.fuentes(`${clave}|${(packs ?? []).map((p) => `${p.id}@${p.version}`).join(',')}`),
    queryFn: async () => {
      const porId = new Map((packs ?? []).map((p) => [p.id, p]));
      const pares: [string, string][] = [];
      for (const id of clave ? clave.split(',') : []) {
        const partes = partesDeSticker(id);
        const pack = partes && porId.get(partes.pack);
        if (!partes || !pack) continue;
        const local = Platform.OS === 'web' ? null : await comoDato(pack, partes.nombre).catch(() => null);
        pares.push([id, local ?? urlDeSticker(pack, partes.nombre)]);
      }
      return pares;
    },
    enabled: !!clave && !!packs,
    staleTime: Infinity,
  });
  const datos = consulta.data;
  return mapaDe(datos);
}

const VACIO: ReadonlyMap<string, string> = new Map();
const cache = new WeakMap<object, ReadonlyMap<string, string>>();
/** El mismo mapa mientras no cambien los datos (así el lector no recibe todo otra vez). */
function mapaDe(datos: [string, string][] | undefined): ReadonlyMap<string, string> {
  if (!datos) return VACIO;
  let mapa = cache.get(datos);
  if (!mapa) {
    mapa = new Map(datos);
    cache.set(datos, mapa);
  }
  return mapa;
}
