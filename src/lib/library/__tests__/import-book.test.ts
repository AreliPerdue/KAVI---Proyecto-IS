/** Leer un libro elegido (RF-BL12 – RF-BL14, T278): formato por contenido, título y color. */
import { epub, pngDeColor } from './epub-fixture';
import { PDFS } from './pdf-fixtures';

import { es } from '@/i18n/es';
import { base64ToBytes } from '@/lib/library/base64';
import { formatoDe, leerLibro, tituloDeNombre } from '@/lib/library/import';

jest.mock('@/lib/library/import/cover-color', () => ({ colorDeImagen: jest.fn(async () => '#1E2761') }));

const pdf = base64ToBytes(PDFS.plain);
const conPortada = epub({
  metadata: '<dc:title>Ficciones</dc:title>',
  manifest: '<item id="c" href="c.png" media-type="image/png" properties="cover-image"/>',
  extra: { 'OEBPS/c.png': pngDeColor(2, 3, [30, 39, 97]) },
});

it('reconoce el formato por el contenido y no por el nombre', () => {
  expect(formatoDe(pdf)).toBe('pdf');
  expect(formatoDe(conPortada)).toBe('epub');
  expect(formatoDe(new TextEncoder().encode('texto plano'))).toBeNull();
});

it('el título sale del nombre del archivo cuando no trae uno', () => {
  expect(tituloDeNombre('mi_libro-final.pdf')).toBe('mi libro final');
  expect(tituloDeNombre('.pdf')).toBe('.pdf');
});

it('un PDF con nombre engañoso se lee como PDF, sin portada ni color', async () => {
  const libro = await leerLibro({ name: 'rayuela.epub', mime: 'application/epub+zip', bytes: pdf });
  expect(libro.formato).toBe('pdf');
  expect(libro.datos.title).toBe('Rayuela');
  expect(libro.color).toBeNull();
});

it('un EPUB con portada trae su color dominante', async () => {
  const libro = await leerLibro({ name: 'x.epub', mime: '', bytes: conPortada });
  expect(libro.formato).toBe('epub');
  expect(libro.color).toBe('#1E2761');
  expect(libro.datos.cover?.mime).toBe('image/png');
});

it('sin título en el archivo, usa el nombre', async () => {
  const libro = await leerLibro({ name: 'apuntes_de_calculo.epub', mime: '', bytes: epub() });
  expect(libro.datos.title).toBe('apuntes de calculo');
});

it('rechaza lo que no es PDF ni EPUB y lo que pasa de 50 MB', async () => {
  await expect(leerLibro({ name: 'notas.txt', mime: 'text/plain', bytes: new TextEncoder().encode('hola') })).rejects.toThrow(es.errors.libraryFormat);
  await expect(leerLibro({ name: 'grande.pdf', mime: '', bytes: new Uint8Array(50 * 1024 * 1024 + 1) })).rejects.toThrow(es.errors.libraryFileTooBig);
});
