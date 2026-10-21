/** El archivo de un recorte exportado (13h, RF-CC25; T342). */
import { nombreDeExportacion } from '@/lib/library/canvas-export';

it('se llama como el recorte, sin acentos ni caracteres raros', () => {
  expect(nombreDeExportacion('Mis quotes favoritas', 'Recorte')).toBe('Mis-quotes-favoritas.png');
  expect(nombreDeExportacion('  Café: ¿qué pasó?  ', 'Recorte')).toBe('Cafe-que-paso.png');
  expect(nombreDeExportacion('', 'Recorte')).toBe('Recorte.png');
  expect(nombreDeExportacion('✨✨', 'Recorte')).toBe('kavi.png');
});
