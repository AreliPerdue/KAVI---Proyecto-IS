/** Importar un PDF (RF-BL12, RF-BL14, T278): datos del archivo y candados. */
import { PDFDocument } from 'pdf-lib';

import { PDFS } from './pdf-fixtures';

import { es } from '@/i18n/es';
import { base64ToBytes } from '@/lib/library/base64';
import { leerPdf } from '@/lib/library/import/pdf';

const pdf = (nombre: keyof typeof PDFS) => base64ToBytes(PDFS[nombre]);

it('lee título, autor y páginas de un PDF normal', async () => {
  expect(await leerPdf(pdf('plain'))).toEqual({ title: 'Rayuela', authors: ['Julio Cortázar'], genres: [], pageCount: 3, cover: null });
});

it('separa varios autores por punto y coma, pero no por coma', async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.setAuthor('Cortázar, Julio; Borges, Jorge Luis');
  doc.setKeywords(['Novela']);
  const datos = await leerPdf(await doc.save());
  expect(datos.authors).toEqual(['Cortázar, Julio', 'Borges, Jorge Luis']);
  expect(datos.genres).toEqual(['Novela']);
  expect(datos.title).toBeUndefined();
});

describe.each(['RC4-40', 'RC4-128', 'AES-128', 'AES-256-R5', 'AES-256'] as const)('cifrado %s', (cifrado) => {
  it('con solo contraseña de dueño se acepta, con sus páginas', async () => {
    const datos = await leerPdf(pdf(`owner-${cifrado}`));
    expect(datos.pageCount).toBe(3);
    // Los textos van cifrados: mejor nada que basura; el título sale del nombre del archivo.
    expect(datos.title).toBeUndefined();
  });

  it('si pide contraseña para abrirse, se rechaza y dice por qué', async () => {
    await expect(leerPdf(pdf(`user-${cifrado}`))).rejects.toThrow(es.errors.libraryPassword);
  });
});

it('un archivo que no es PDF se rechaza como dañado', async () => {
  await expect(leerPdf(new TextEncoder().encode('hola, no soy un PDF'))).rejects.toThrow(es.errors.libraryDamaged);
});

it('base64ToBytes acepta el prefijo data: y saltos de línea', () => {
  expect([...base64ToBytes('data:text/plain;base64,aG9s\nYQ==')]).toEqual([...new TextEncoder().encode('hola')]);
});
