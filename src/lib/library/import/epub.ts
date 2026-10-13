import { strFromU8, unzipSync } from 'fflate';

import type { DatosLibro } from './types';

import { t } from '@/i18n';
import { AuthUiError } from '@/lib/auth-errors';

/**
 * Lo que se puede leer de un EPUB al importarlo (RF-BL12): título, autores, temas y la imagen de
 * portada. Un EPUB es un zip; su ficha vive en el paquete OPF que señala `META-INF/container.xml`.
 *
 * El XML se lee con expresiones regulares y no con un parser: Hermes no trae `DOMParser`, el OPF
 * es chico y de forma conocida, y solo se buscan unas cuantas etiquetas.
 */
export function leerEpub(bytes: Uint8Array): DatosLibro {
  let meta: Record<string, Uint8Array>;
  try {
    // Primera pasada: solo lo de META-INF y el OPF, sin descomprimir capítulos ni imágenes.
    meta = unzipSync(bytes, { filter: (f) => f.name.startsWith('META-INF/') || f.name.endsWith('.opf') });
  } catch (e) {
    throw new AuthUiError(t().errors.libraryDamaged, e);
  }

  if (tieneDrm(meta)) throw new AuthUiError(t().errors.libraryDrm);

  const container = meta['META-INF/container.xml'];
  const rutaOpf = container ? atributo(strFromU8(container), 'rootfile', 'full-path') : undefined;
  const opfBytes = rutaOpf ? meta[rutaOpf] : undefined;
  if (!rutaOpf || !opfBytes) throw new AuthUiError(t().errors.libraryDamaged);
  const opf = strFromU8(opfBytes);

  return {
    title: textos(opf, 'title')[0],
    authors: textos(opf, 'creator'),
    genres: textos(opf, 'subject'),
    pageCount: null,
    cover: portada(bytes, opf, rutaOpf),
  };
}

/**
 * DRM de tienda: Adobe (`rights.xml`), Apple (`sinf.xml`) o recursos cifrados en `encryption.xml`.
 * Ese archivo también lo usan EPUB libres para **ofuscar fuentes**, que no impide leer: solo cuenta
 * como candado si cifra algo con otro algoritmo.
 */
function tieneDrm(meta: Record<string, Uint8Array>): boolean {
  if (meta['META-INF/rights.xml'] || meta['META-INF/sinf.xml']) return true;
  const cifrado = meta['META-INF/encryption.xml'];
  if (!cifrado) return false;
  const algoritmos = [...strFromU8(cifrado).matchAll(/EncryptionMethod[^>]*Algorithm\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const deFuentes = ['http://www.idpf.org/2008/embedding', 'http://ns.adobe.com/pdf/enc#RC'];
  return algoritmos.some((a) => !deFuentes.includes(a));
}

/** La imagen de portada: EPUB 3 (`properties="cover-image"`), EPUB 2 (`<meta name="cover">`) o, si no, una imagen llamada "cover". */
function portada(bytes: Uint8Array, opf: string, rutaOpf: string): DatosLibro['cover'] {
  const items = [...opf.matchAll(/<(?:\w+:)?item\b[^>]*>/g)].map((m) => ({
    id: valor(m[0], 'id'),
    href: valor(m[0], 'href'),
    tipo: valor(m[0], 'media-type') ?? '',
    propiedades: valor(m[0], 'properties') ?? '',
  }));
  const imagenes = items.filter((i) => i.href && i.tipo.startsWith('image/'));
  const idEpub2 = [...opf.matchAll(/<(?:\w+:)?meta\b[^>]*>/g)].map((m) => m[0]).find((m) => valor(m, 'name') === 'cover');
  const elegida =
    imagenes.find((i) => i.propiedades.split(/\s+/).includes('cover-image')) ??
    imagenes.find((i) => idEpub2 && i.id === valor(idEpub2, 'content')) ??
    imagenes.find((i) => /cover/i.test(`${i.id} ${i.href}`));
  if (!elegida?.href) return null;

  const ruta = resolver(rutaOpf, decodeURIComponent(elegida.href));
  try {
    const archivo = unzipSync(bytes, { filter: (f) => f.name === ruta })[ruta];
    if (!archivo?.length) return null;
    const ext = elegida.tipo === 'image/png' ? 'png' : elegida.tipo === 'image/webp' ? 'webp' : elegida.tipo === 'image/gif' ? 'gif' : 'jpg';
    return { bytes: archivo, mime: elegida.tipo, ext };
  } catch {
    return null;
  }
}

/** Ruta dentro del zip de un `href` relativo al OPF ("OEBPS/content.opf" + "../img/c.jpg"). */
function resolver(rutaOpf: string, href: string): string {
  const partes = rutaOpf.split('/').slice(0, -1);
  for (const p of href.split('/')) {
    if (p === '..') partes.pop();
    else if (p !== '.') partes.push(p);
  }
  return partes.join('/');
}

/** El valor de un atributo dentro de una etiqueta ya recortada. */
function valor(etiqueta: string, nombre: string): string | undefined {
  const m = new RegExp(`\\s${nombre}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(etiqueta);
  return m ? entidades(m[1] ?? m[2]) : undefined;
}

function atributo(xml: string, etiqueta: string, nombre: string): string | undefined {
  const m = new RegExp(`<(?:\\w+:)?${etiqueta}\\b[^>]*>`).exec(xml);
  return m ? valor(m[0], nombre) : undefined;
}

/** El texto de cada `<dc:nombre>` (con o sin prefijo), limpio y sin repetidos. */
function textos(opf: string, nombre: string): string[] {
  const vistos = new Set<string>();
  for (const m of opf.matchAll(new RegExp(`<(?:\\w+:)?${nombre}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${nombre}>`, 'g'))) {
    const texto = entidades(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (texto) vistos.add(texto);
  }
  return [...vistos];
}

function entidades(texto: string): string {
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
