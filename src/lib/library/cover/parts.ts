import { colorDePortada, rutaDePortada } from '@/lib/library/shelf';
import type { LibraryItem } from '@/types/domain';

/**
 * Las tres caras de un libro (spec 13a, RF-BL20 – RF-BL21; T311): portada, lomo y contraportada. Cada
 * una puede tener imagen propia y color; sin imagen, el lomo y la contraportada toman el color de la
 * portada. Sin React.
 */
export type ParteDeTapa = 'front' | 'spine' | 'back';
export const PARTES: readonly ParteDeTapa[] = ['front', 'spine', 'back'];

type Columnas = { ruta: 'custom_cover_path' | 'spine_path' | 'back_cover_path'; color: 'custom_cover_color' | 'spine_color' | 'back_cover_color'; archivo: string };

/** Dónde se guarda la imagen propia de cada parte y con qué nombre de archivo en R2. */
export const COLUMNAS_DE_PARTE: Record<ParteDeTapa, Columnas> = {
  front: { ruta: 'custom_cover_path', color: 'custom_cover_color', archivo: 'cover-custom.jpg' },
  spine: { ruta: 'spine_path', color: 'spine_color', archivo: 'spine.jpg' },
  back: { ruta: 'back_cover_path', color: 'back_cover_color', archivo: 'back.jpg' },
};

type Pieza = Pick<LibraryItem, 'id' | 'cover_path' | 'cover_color'> &
  Partial<Pick<LibraryItem, 'custom_cover_path' | 'custom_cover_color' | 'spine_path' | 'spine_color' | 'back_cover_path' | 'back_cover_color'>>;

/** La imagen que se ve de cada parte: la portada propia o la del archivo; el lomo y la contraportada, solo propias. */
export function rutaDeParte(item: Pieza, parte: ParteDeTapa): string | null {
  if (parte === 'front') return rutaDePortada(item);
  return item[COLUMNAS_DE_PARTE[parte].ruta] ?? null;
}

/** El color de cada parte; el lomo y la contraportada sin color propio toman el de la portada. */
export function colorDeParte(item: Pieza, parte: ParteDeTapa): string {
  if (parte === 'front') return colorDePortada(item);
  return item[COLUMNAS_DE_PARTE[parte].color] ?? colorDePortada(item);
}

/** ¿Tiene imagen propia que se pueda quitar? (La portada del archivo no se quita: se vuelve a ella.) */
export function tieneImagenPropia(item: Pieza, parte: ParteDeTapa): boolean {
  return !!item[COLUMNAS_DE_PARTE[parte].ruta];
}

/**
 * Qué cambiar al elegir un color con el cuentagotas o a mano (RF-BL21). La portada cambia el color de la
 * propia si la hay y si no el de la del archivo; las otras dos, el suyo.
 */
export function cambioDeColor(item: Pieza, parte: ParteDeTapa, hex: string): Partial<LibraryItem> {
  if (parte === 'front') return item.custom_cover_path ? { custom_cover_color: hex } : { cover_color: hex };
  return { [COLUMNAS_DE_PARTE[parte].color]: hex };
}

/** "#1e2761", "1E2761" → "#1E2761"; lo que no sea un color de 6 cifras → `null`. */
export function hexValido(texto: string): string | null {
  const limpio = texto.trim().replace(/^#/, '');
  return /^[0-9A-Fa-f]{6}$/.test(limpio) ? `#${limpio.toUpperCase()}` : null;
}
