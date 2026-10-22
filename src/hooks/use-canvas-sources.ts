import { useMemo } from 'react';

import type { FuentesDeMiniatura } from '@/components/library/canvas-preview';
import { stickerPorId } from '@/constants/stickers';
import { useLibraryImageUrls } from '@/hooks/use-annotations';
import { useLibraryItems } from '@/hooks/use-library';
import { useStickerPacks, useStickerSources } from '@/hooks/use-sticker-packs';
import { useReadingSessions } from '@/hooks/use-reading-sessions';
import { useUserStickerImages, useUserStickers, useUserStickerSources } from '@/hooks/use-user-stickers';
import { useLanguage, useT } from '@/i18n';
import { type DatoEscrito, type ElementoDeLienzo, type LibroEnLienzo, rutasDeImagenes } from '@/lib/library/canvas';
import { claveDeDato, type DatoDeBiblioteca, numeroDeDato, valoresDeDatos } from '@/lib/library/journal-stats';
import { colorDePortada, rutaDePortada } from '@/lib/library/shelf';
import { fuenteDeSticker } from '@/lib/library/sticker-packs';

export type FuentesDeLienzo = {
  /** Para las miniaturas que dibuja la app (`CanvasPreview`): los Nobi incluidos van como imagen del paquete. */
  miniatura: FuentesDeMiniatura;
  /** Para el motor (`aMotor`): solo direcciones; los Nobi incluidos los trae el motor. */
  motor: {
    imagenes: ReadonlyMap<string, string>;
    stickers: ReadonlyMap<string, string>;
    libros: ReadonlyMap<string, LibroEnLienzo>;
    datos: ReadonlyMap<string, DatoEscrito>;
    idioma: string;
    assets: ReadonlyMap<string, string>;
  };
};

/**
 * Los datos de la biblioteca que piden unos lienzos (RF-CC22; T349), contados en vivo de los libros y las sesiones de
 * lectura, y escritos en el idioma de la app: "12 · libros terminados · en 2026".
 */
export function useDatosDeBiblioteca(elementos: readonly ElementoDeLienzo[]): ReadonlyMap<string, DatoEscrito> {
  const tx = useT();
  const idioma = useLanguage();
  // Lo que se pide, como texto: así lo de abajo solo se recuenta si cambia lo pedido o los datos.
  const clave = [...new Set(elementos.flatMap((e) => (e.type === 'stat' && e.content.stat ? [claveDeDato(e.content.stat, e.content.year ?? null)] : [])))].sort().join(',');
  const piezas = useLibraryItems().data;
  const sesiones = useReadingSessions().data;
  const textos = tx.library.canvas.stats;
  return useMemo(() => {
    if (!clave) return SIN_DATOS;
    const pedidos = clave.split(',').map((k) => {
      const [dato, anio] = k.split('|');
      return { dato: dato as DatoDeBiblioteca, anio: anio === 'todo' ? null : Number(anio) };
    });
    const valores = valoresDeDatos(pedidos, piezas ?? [], sesiones ?? []);
    return new Map(
      pedidos.map((p) => {
        const k = claveDeDato(p.dato, p.anio);
        const v = valores.get(k) ?? 0;
        return [k, { valor: numeroDeDato(p.dato, v, idioma), etiqueta: textos.label(p.dato, v), periodo: textos.period(p.anio) }] as const;
      }),
    );
  }, [clave, piezas, sesiones, textos, idioma]);
}

const SIN_DATOS: ReadonlyMap<string, DatoEscrito> = new Map();

/**
 * De dónde sale lo que se ve en uno o varios lienzos (Mi libreta, las páginas de un Journal; T342, T347): las imágenes
 * subidas, los stickers (incluidos, de la tienda o propios) y los libros puestos con su título, color y portada.
 * El React Compiler memoriza las listas: las miniaturas no se rehacen si nada cambió.
 */
export function useFuentesDeLienzos(elementos: readonly ElementoDeLienzo[]): FuentesDeLienzo {
  const idioma = useLanguage();
  const piezas = useLibraryItems();
  const claveIdsDeLibros = [...new Set(elementos.flatMap((e) => (e.type === 'book' && e.content.itemId ? [e.content.itemId] : [])))].sort().join('|');
  const idsDeLibros = new Set(claveIdsDeLibros ? claveIdsDeLibros.split('|') : []);
  const librosPuestos = (piezas.data ?? []).filter((p) => idsDeLibros.has(p.id));
  const urls = useLibraryImageUrls([...rutasDeImagenes(elementos), ...librosPuestos.flatMap((p) => (rutaDePortada(p) ? [rutaDePortada(p) as string] : []))]);
  const stickers = elementos.flatMap((e) => (e.type === 'sticker' && e.content.sticker ? [e.content.sticker] : []));
  const claveStickers = [...new Set(stickers)].sort().join('|');
  const packs = useStickerPacks();
  const losPacks = packs.data?.packs;
  const misStickers = useUserStickers();
  const imagenesPropias = useUserStickerImages(misStickers.data);
  const propias = useUserStickerSources(stickers, imagenesPropias);
  const tienda = useStickerSources(
    stickers.filter((s) => !s.startsWith('nobi-pink/')),
    packs.data?.packs,
  );

  const deMotor = new Map<string, string>();
  const deMiniatura = new Map<string, string | number | { uri: string }>();
  for (const s of claveStickers ? claveStickers.split('|') : []) {
    const src = fuenteDeSticker(s, tienda, losPacks, propias);
    if (src) deMotor.set(s, src);
    const incluido = stickerPorId(s);
    const deApp = incluido ? incluido.imagen : src;
    if (deApp) deMiniatura.set(s, deApp as string);
  }
  const datos = useDatosDeBiblioteca(elementos);
  // Las piezas de los packs de papeles (T343c): viven en el mismo bucket que los stickers y se ven igual.
  const assets = useStickerSources(
    elementos.flatMap((e) => (e.type === 'asset' && e.content.asset && !e.content.asset.startsWith('basicos/') ? [e.content.asset] : [])),
    packs.data?.packs,
  );
  const libros = new Map<string, LibroEnLienzo>();
  for (const p of librosPuestos) {
    const ruta = rutaDePortada(p);
    libros.set(p.id, { title: p.title, color: colorDePortada(p), ...(ruta && urls.get(ruta) ? { src: urls.get(ruta) } : {}) });
  }
  return {
    miniatura: { imagenes: urls, stickers: deMiniatura as FuentesDeMiniatura['stickers'], libros, datos, assets },
    motor: { imagenes: urls, stickers: deMotor, libros, datos, idioma, assets },
  };
}
