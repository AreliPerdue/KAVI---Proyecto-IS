import { nombreSeguro } from '@/lib/library/files';

it.each([
  ['Rayuela (2ª ed.).pdf', 'Rayuela-2-ed.pdf'],
  ['Cien años/de soledad.EPUB', 'Cien-anos-de-soledad.epub'],
  ['   .pdf', 'archivo.pdf'],
  ['notas', 'notas'],
  ['Mi letra', 'Mi-letra'],
])('%s → %s', (entrada, salida) => {
  expect(nombreSeguro(entrada)).toBe(salida);
});
