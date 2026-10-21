import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { LIBRARY_URL_SECONDS } from '@/constants/library';
import { base64ToBytes } from '@/lib/library/base64';
import { asegurarCopia, borrarCopia, comoDato, guardarCopia, uriLocal } from '@/lib/library/offline/user-stickers';
import { useAuth } from '@/providers';
import { createUserSticker, libraryFileUrl, listUserStickers, removeUserSticker } from '@/services/library';
import { PREFIJO_PROPIO } from '@/lib/library/sticker-packs';
import type { LibraryAnnotation, UserSticker } from '@/types/domain';

/** El prefijo de un sticker propio en una anotación: `mios/<id>` (T335); vive en `lib` para el lienzo (T351). */
export { PREFIJO_PROPIO };
export const idPropio = (id: string) => `${PREFIJO_PROPIO}${id}`;

const claves = {
  mios: (userId: string | null) => ['library', 'user-stickers', userId] as const,
  url: (path: string) => ['library', 'url', path] as const,
  dato: (ids: string) => ['library', 'user-stickers', 'datos', ids] as const,
};

/** Los stickers propios (spec 13c, RF-BH13; T335), el más nuevo primero. */
export function useUserStickers() {
  const { userId } = useAuth();
  return useQuery<UserSticker[]>({ queryKey: claves.mios(userId), queryFn: () => listUserStickers(userId as string), enabled: !!userId });
}

/** Guardar un sticker ya hecho (el PNG que dio el motor): sube, guarda su fila y deja una copia en el teléfono. */
export function useCreateUserSticker() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dataUrl, ar, margin }: { id: string; dataUrl: string; ar: number; margin: number }) => {
      const png = base64ToBytes(dataUrl.replace(/^data:image\/png;base64,/, ''));
      const fila = await createUserSticker(userId as string, { id, ar, margin }, png);
      guardarCopia(id, dataUrl);
      return fila;
    },
    onSuccess: (fila) => queryClient.setQueryData<UserSticker[]>(claves.mios(userId), (lista = []) => [fila, ...lista.filter((s) => s.id !== fila.id)]),
  });
}

export function useRemoveUserSticker() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await removeUserSticker(userId as string, id);
      borrarCopia(id);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: claves.mios(userId) }),
  });
}

/**
 * Cómo se ve cada sticker propio: en el teléfono, su copia (y si se hizo en otro aparato, se baja una vez); en la
 * web, su dirección firmada, renovada antes de que caduque. Devuelve id → dirección, para miniaturas.
 */
export function useUserStickerImages(stickers: readonly UserSticker[] | undefined): ReadonlyMap<string, string> {
  const lista = stickers ?? [];
  const urls = useQueries({
    queries: lista.map((s) => ({
      queryKey: claves.url(s.path),
      queryFn: async () => {
        const url = await libraryFileUrl(s.path);
        if (Platform.OS !== 'web') await asegurarCopia(s.id, url).catch(() => undefined);
        return url;
      },
      staleTime: (LIBRARY_URL_SECONDS - 300) * 1000,
      gcTime: (LIBRARY_URL_SECONDS - 300) * 1000,
      retry: 1,
    })),
  });
  const clave = JSON.stringify(lista.flatMap((s, i) => {
    const local = uriLocal(s.id);
    const url = urls[i]?.data;
    return local || url ? [[s.id, local ?? url]] : [];
  }));
  return useMemo(() => new Map(JSON.parse(clave) as [string, string][]), [clave]);
}

/**
 * Lo que recibe el lector para los stickers propios pegados en un libro: en el teléfono, la copia como `data:`
 * (el lector no abre archivos del teléfono); si no hay copia, o en la web, la dirección firmada.
 */
export function useUserStickerSources(ids: readonly string[], imagenes: ReadonlyMap<string, string>): ReadonlyMap<string, string> {
  const propios = [...new Set(ids.filter((x) => x.startsWith(PREFIJO_PROPIO)).map((x) => x.slice(PREFIJO_PROPIO.length)))].sort();
  const clave = propios.join(',');
  const datos = useQuery<[string, string][]>({
    queryKey: claves.dato(`${clave}|${propios.map((id) => (imagenes.has(id) ? 1 : 0)).join('')}`),
    queryFn: async () => {
      const pares: [string, string][] = [];
      for (const id of propios) {
        const dato = Platform.OS === 'web' ? null : await comoDato(id).catch(() => null);
        const src = dato ?? imagenes.get(id);
        if (src) pares.push([idPropio(id), src]);
      }
      return pares;
    },
    enabled: propios.length > 0,
    staleTime: Infinity,
  });
  const json = JSON.stringify(datos.data ?? []);
  return useMemo(() => new Map(JSON.parse(json) as [string, string][]), [json]);
}

/**
 * Los stickers propios que pegaron otros miembros de un club (13f, T307): su imagen vive en la carpeta de quien
 * los hizo; la función de archivos la deja ver a quien ve la anotación. Devuelve `mios/<id>` → dirección.
 */
export function useStickersDeOtros(anotaciones: readonly Pick<LibraryAnnotation, 'kind' | 'owner_id' | 'content' | 'removed'>[] | undefined, yo: string | null): ReadonlyMap<string, string> {
  const ajenos = new Map<string, string>();
  for (const a of anotaciones ?? []) {
    const id = a.kind === 'sticker' && !a.removed && typeof a.content.sticker === 'string' ? a.content.sticker : null;
    if (id?.startsWith(PREFIJO_PROPIO) && a.owner_id && a.owner_id !== yo) ajenos.set(id, `${a.owner_id}/stickers/${id.slice(PREFIJO_PROPIO.length)}.png`);
  }
  const pares = [...ajenos].sort();
  const urls = useQueries({
    queries: pares.map(([, ruta]) => ({
      queryKey: claves.url(ruta),
      queryFn: () => libraryFileUrl(ruta),
      staleTime: (LIBRARY_URL_SECONDS - 300) * 1000,
      gcTime: (LIBRARY_URL_SECONDS - 300) * 1000,
      retry: 1,
    })),
  });
  const clave = JSON.stringify(pares.flatMap(([id], i) => (urls[i]?.data ? [[id, urls[i].data]] : [])));
  return useMemo(() => new Map(JSON.parse(clave) as [string, string][]), [clave]);
}
