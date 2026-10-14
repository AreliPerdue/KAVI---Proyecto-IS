/** Letra y tamaño al leer un EPUB (spec 13c, RF-BH2 – RF-BH3; T288). */
import { otroTamano, TAMANO_MAX, TAMANO_MIN, tamanoValido, TEXTO_POR_OMISION, textoValido } from '@/lib/library/reader-text';

it('el tamaño va en pasos de 10 % entre el mínimo y el máximo', () => {
  expect(tamanoValido(113)).toBe(110);
  expect(tamanoValido(10)).toBe(TAMANO_MIN);
  expect(tamanoValido(999)).toBe(TAMANO_MAX);
  expect(tamanoValido('120')).toBe(100);
  expect(tamanoValido(Number.NaN)).toBe(100);
});

it('un paso más grande o más chico, sin salirse', () => {
  expect(otroTamano(100, 1)).toBe(110);
  expect(otroTamano(100, -1)).toBe(90);
  expect(otroTamano(TAMANO_MAX, 1)).toBe(TAMANO_MAX);
  expect(otroTamano(TAMANO_MIN, -1)).toBe(TAMANO_MIN);
});

it('lo guardado que no sirve vuelve al de omisión', () => {
  expect(textoValido(null)).toEqual(TEXTO_POR_OMISION);
  expect(textoValido({ tamano: 140, letra: 'dyslexic' })).toEqual({ tamano: 140, letra: 'dyslexic' });
  expect(textoValido({ tamano: 140, letra: 'comic-sans' })).toEqual({ tamano: 140, letra: 'original' });
});
