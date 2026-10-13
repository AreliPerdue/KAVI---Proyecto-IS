import { PDFArray, PDFBool, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, type PDFObject, PDFString } from 'pdf-lib';

import { revisarCandado } from './pdf-lock';
import type { DatosLibro } from './types';

import { t } from '@/i18n';
import { AuthUiError } from '@/lib/auth-errors';

/**
 * Lo que se puede leer de un PDF al importarlo (RF-BL12): título, autor, temas y páginas.
 *
 * La portada de un PDF es su primera página pintada, y pintarla necesita el motor de lectura
 * (pdf.js, T279); hasta entonces el PDF entra con la portada generada.
 */
export async function leerPdf(bytes: Uint8Array): Promise<DatosLibro> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch (e) {
    throw new AuthUiError(t().errors.libraryDamaged, e);
  }

  // Cifrado: solo se acepta si abre sin contraseña (solo restricciones de imprimir o copiar).
  if (doc.isEncrypted) {
    const resultado = revisarCandado(candadoDe(doc));
    if (resultado === 'contrasena') throw new AuthUiError(t().errors.libraryPassword);
    if (resultado === 'drm') throw new AuthUiError(t().errors.libraryDrm);
  }

  let paginas: number | null = null;
  try {
    paginas = doc.getPageCount() || null;
  } catch {
    // Un árbol de páginas roto no impide guardar el libro; el lector lo dirá al abrirlo.
  }

  // Con cifrado, los textos del archivo también lo están: se leerían como basura.
  const texto = (f: () => string | undefined) => (doc.isEncrypted ? undefined : limpio(seguro(f)));
  return {
    title: texto(() => doc.getTitle()),
    authors: separar(texto(() => doc.getAuthor())),
    genres: separar(texto(() => doc.getKeywords())),
    pageCount: paginas,
    cover: null,
  };
}

function seguro(f: () => string | undefined): string | undefined {
  try {
    return f();
  } catch {
    return undefined;
  }
}

/** Sin espacios de sobra; vacío cuenta como que no hay. */
function limpio(texto: string | undefined): string | undefined {
  const t = texto?.replace(/\s+/g, ' ').trim();
  return t || undefined;
}

/** "Ana Pérez; Luis Gómez" → dos autores. La coma no separa: "Cortázar, Julio" es una persona. */
function separar(texto: string | undefined): string[] {
  return (texto ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Lo que pide `revisarCandado`, sacado del diccionario `/Encrypt` y del `/ID` del tráiler. */
function candadoDe(doc: PDFDocument) {
  const contexto = doc.context;
  const dic = contexto.lookup(contexto.trailerInfo.Encrypt);
  if (!(dic instanceof PDFDict)) return { filter: '', revision: 0, lengthBits: 40, o: vacio, u: vacio, p: 0, encryptMetadata: true, id0: vacio };
  const valor = (clave: string) => contexto.lookup(dic.get(PDFName.of(clave)));
  const numero = (clave: string, omision: number) => {
    const v = valor(clave);
    return v instanceof PDFNumber ? v.asNumber() : omision;
  };
  const filtro = valor('Filter');
  const meta = valor('EncryptMetadata');
  const ids = contexto.lookup(contexto.trailerInfo.ID);
  return {
    filter: filtro instanceof PDFName ? filtro.decodeText() : '',
    revision: numero('R', 0),
    lengthBits: numero('Length', 40),
    o: bytesDe(valor('O')),
    u: bytesDe(valor('U')),
    p: numero('P', 0),
    encryptMetadata: !(meta instanceof PDFBool) || meta.asBoolean(),
    id0: ids instanceof PDFArray && ids.size() > 0 ? bytesDe(contexto.lookup(ids.get(0))) : vacio,
  };
}

const vacio = new Uint8Array(0);

function bytesDe(objeto: PDFObject | undefined): Uint8Array {
  if (objeto instanceof PDFHexString || objeto instanceof PDFString) return objeto.asBytes();
  return vacio;
}
