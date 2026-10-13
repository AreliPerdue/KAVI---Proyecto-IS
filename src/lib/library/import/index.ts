import { strFromU8 } from 'fflate';

import { colorDeImagen } from './cover-color';
import { leerEpub } from './epub';
import { leerPdf } from './pdf';
import type { ArchivoElegido, DatosLibro, FormatoLibro } from './types';

import { LIBRARY_LIMITS } from '@/constants/library';
import { t } from '@/i18n';
import { AuthUiError } from '@/lib/auth-errors';

export type { ArchivoElegido, DatosLibro, FormatoLibro } from './types';
export { elegirLibro } from './pick';

/**
 * El formato por el contenido y no por el nombre (RF-BL14): un PDF empieza con `%PDF-` (se busca en
 * el primer KB, como hacen los lectores); un EPUB es un zip cuyo primer archivo, `mimetype`, dice
 * `application/epub+zip`.
 */
export function formatoDe(bytes: Uint8Array): FormatoLibro | null {
  const inicio = strFromU8(bytes.subarray(0, 1024), true);
  if (inicio.includes('%PDF-')) return 'pdf';
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && inicio.slice(30, 58).startsWith('mimetypeapplication/epub+zip')) return 'epub';
  // Algunos EPUB no ponen `mimetype` primero; si es zip y el nombre lo dice, se intenta.
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && inicio.includes('META-INF/')) return 'epub';
  return null;
}

/** El título a partir del nombre del archivo, cuando el archivo no trae uno: "mi_libro-final.pdf" → "mi libro final". */
export function tituloDeNombre(nombre: string): string {
  const base = nombre.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base || nombre;
}

export type LibroLeido = {
  formato: FormatoLibro;
  archivo: ArchivoElegido;
  datos: DatosLibro & { title: string };
  /** Color dominante de la portada (RF-BL13); `null` si no hay imagen. */
  color: string | null;
};

/** Reconoce el formato, revisa candados y saca los datos y el color de portada (RF-BL12 – RF-BL14). */
export async function leerLibro(archivo: ArchivoElegido): Promise<LibroLeido> {
  if (archivo.bytes.length > LIBRARY_LIMITS.fileBytes) throw new AuthUiError(t().errors.libraryFileTooBig);
  const formato = formatoDe(archivo.bytes);
  if (!formato) throw new AuthUiError(t().errors.libraryFormat);
  const datos = formato === 'pdf' ? await leerPdf(archivo.bytes) : leerEpub(archivo.bytes);
  const color = datos.cover ? await colorDeImagen(datos.cover.bytes, datos.cover.mime) : null;
  return { formato, archivo, datos: { ...datos, title: datos.title ?? tituloDeNombre(archivo.name) }, color };
}
