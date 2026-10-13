import { getDocumentAsync } from 'expo-document-picker';

/**
 * De dónde sale una portada propia en la web (RF-BL23). Además de elegir un archivo, en la web se
 * arrastra o se pega con ⌘V / Ctrl+V: eso lo atiende la hoja, que escucha esos eventos.
 */

/** En la web no hay cámara: se elige un archivo, que en el teléfono ya ofrece la cámara. */
export const PUEDE_TOMAR_FOTO = false;

export async function desdeArchivo(): Promise<string | null> {
  const r = await getDocumentAsync({ type: 'image/*' });
  return r.canceled ? null : (r.assets[0]?.uri ?? null);
}

/** En la web la galería es el mismo selector de archivos. */
export const desdeGaleria = desdeArchivo;

export async function desdeCamara(): Promise<string | null> {
  return null;
}

/** El botón "Pegar": lee una imagen del portapapeles si el navegador lo permite. */
export async function desdePortapapeles(): Promise<string | null> {
  const portapapeles = (navigator as Navigator & { clipboard?: { read?: () => Promise<ClipboardItem[]> } }).clipboard;
  if (!portapapeles?.read) return null;
  for (const elemento of await portapapeles.read()) {
    const tipo = elemento.types.find((t) => t.startsWith('image/'));
    if (tipo) return URL.createObjectURL(await elemento.getType(tipo));
  }
  return null;
}
