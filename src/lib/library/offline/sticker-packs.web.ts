import type { StickerPack } from '@/types/domain';

/**
 * En la web no se guardan los packs (spec 13c, RF-BH13b; T338): las imágenes salen de la nube con la caché del
 * navegador. Estas funciones existen para que el código común no pregunte por la plataforma.
 */
export async function packsGuardados(): Promise<StickerPack[]> {
  return [];
}

export async function guardarPack(): Promise<void> {}

export async function quitarPack(): Promise<void> {}

export function uriLocal(): string | null {
  return null;
}

export async function comoDato(): Promise<string | null> {
  return null;
}

export async function borrarPacks(): Promise<void> {}
