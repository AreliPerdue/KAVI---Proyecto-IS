import { formatBytes, nombreSeguro } from '@/lib/library/files';

it.each([
  ['Rayuela (2ª ed.).pdf', 'Rayuela-2-ed.pdf'],
  ['Cien años/de soledad.EPUB', 'Cien-anos-de-soledad.epub'],
  ['   .pdf', 'archivo.pdf'],
  ['notas', 'notas'],
  ['Mi letra', 'Mi-letra'],
])('%s → %s', (entrada, salida) => {
  expect(nombreSeguro(entrada)).toBe(salida);
});

describe('formatBytes', () => {
  it.each([
    [500, 'es', '0 KB'],
    [850 * 1024, 'es', '850 KB'],
    [3.46 * 1024 * 1024, 'es', '3.5 MB'],
    [500 * 1024 * 1024, 'en', '500 MB'],
  ] as const)('%d bytes → %s', (bytes, lang, texto) => {
    expect(formatBytes(bytes, lang)).toBe(texto);
  });
});
