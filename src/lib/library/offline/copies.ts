import { Directory, File, Paths } from 'expo-file-system';

import { bytesToBase64 } from '@/lib/library/base64';

/**
 * Los libros guardados en el teléfono (spec 13b, RF-BR3; T285). Lo que se abrió una vez se queda en la
 * carpeta de documentos de la app (`library/<pieza>/<archivo>`), que el sistema no borra solo, y se lee de
 * ahí aunque haya red: así no se vuelve a descargar.
 *
 * El nombre del archivo es el de su ruta en R2: si el libro cambia de archivo (otro PDF de una conversión,
 * L6), la copia vieja ya no coincide y se baja la nueva.
 */

const carpetaRaiz = () => new Directory(Paths.document, 'library');
const carpetaDe = (itemId: string) => new Directory(carpetaRaiz(), itemId);

/** El archivo local de una pieza para una ruta de R2 (`<uid>/<pieza>/rayuela.pdf` → `rayuela.pdf`). */
export function archivoLocal(itemId: string, ruta: string): File {
  return new File(carpetaDe(itemId), ruta.split('/').pop() || 'libro');
}

export function hayCopia(itemId: string, ruta: string): boolean {
  const f = archivoLocal(itemId, ruta);
  return f.exists && f.size > 0;
}

/**
 * La copia del libro, bajándola si no está. `descargar` lo trae de R2 al disco (servicio). Si falla a la
 * mitad, no queda un archivo cortado que luego parezca bueno.
 */
export async function asegurarCopia(itemId: string, ruta: string, descargar: (ruta: string, destino: string) => Promise<void>): Promise<File> {
  const destino = archivoLocal(itemId, ruta);
  if (destino.exists && destino.size > 0) return destino;
  // Lo que hubiera de otro archivo de esta pieza ya no sirve.
  const carpeta = carpetaDe(itemId);
  if (carpeta.exists) carpeta.delete();
  carpeta.create({ intermediates: true });
  try {
    await descargar(ruta, destino.uri);
  } catch (e) {
    if (destino.exists) destino.delete();
    throw e;
  }
  return destino;
}

/** Cuánto pesa cada pedazo que se manda al motor: medio mega (unos 700 KB en base64). */
export const PEDAZO = 512 * 1024;

/**
 * Lee la copia en pedazos para mandarla al motor sin tener el libro entero dos veces en memoria. Entre
 * pedazo y pedazo suelta el hilo para que la pantalla no se trabe.
 */
export async function leerEnPedazos(archivo: File, alPedazo: (base64: string) => void): Promise<number> {
  const total = archivo.size;
  const mano = archivo.open();
  try {
    for (let leido = 0; leido < total; ) {
      const bytes = mano.readBytes(Math.min(PEDAZO, total - leido));
      if (!bytes.length) break;
      leido += bytes.length;
      alPedazo(bytesToBase64(bytes));
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    mano.close();
  }
  return total;
}

/** Al borrar piezas, sus copias se van con ellas. */
export function borrarCopias(itemIds: readonly string[]): void {
  for (const id of itemIds) {
    try {
      const carpeta = carpetaDe(id);
      if (carpeta.exists) carpeta.delete();
    } catch {
      // Si no se pudo, se queda: no estorba y se reemplaza si vuelve a abrirse.
    }
  }
}

/** Al eliminar la cuenta no queda ningún libro en el teléfono (RF-A12). */
export function borrarTodas(): void {
  try {
    const raiz = carpetaRaiz();
    if (raiz.exists) raiz.delete();
  } catch {
    // nada guardado
  }
}
