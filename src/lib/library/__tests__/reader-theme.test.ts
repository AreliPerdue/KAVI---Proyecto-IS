/** Tema del lector (RF-BH5): claro, oscuro, sepia o propio, aparte del tema de la app. */
import { COLORES_DE_TEMA, coloresDe, pocoContraste, TEMA_POR_OMISION, temaValido } from '@/lib/library/reader-theme';

it('el oscuro es fondo negro y letra blanca', () => {
  expect(coloresDe({ tema: 'dark', propio: TEMA_POR_OMISION.propio })).toEqual({ pagina: '#000000', letra: '#F2F2F2' });
});

it('el propio usa los colores elegidos', () => {
  expect(coloresDe({ tema: 'custom', propio: { pagina: '#1E2328', letra: '#FFE8B0' } })).toEqual({ pagina: '#1E2328', letra: '#FFE8B0' });
});

it('lo guardado que no sirve vuelve al de omisión, sin perder lo que sí sirve', () => {
  expect(temaValido(null)).toEqual(TEMA_POR_OMISION);
  expect(temaValido({ tema: 'neón' })).toEqual(TEMA_POR_OMISION);
  expect(temaValido({ tema: 'dark', propio: { pagina: 'rojo', letra: '#fff' } })).toEqual({ tema: 'dark', propio: TEMA_POR_OMISION.propio });
  expect(temaValido({ tema: 'custom', propio: { pagina: '1e2328', letra: '#ffe8b0' } })).toEqual({ tema: 'custom', propio: { pagina: '#1E2328', letra: '#FFE8B0' } });
});

it('avisa cuando la letra casi no se distingue de la página', () => {
  for (const colores of Object.values(COLORES_DE_TEMA)) expect(pocoContraste(colores)).toBe(false);
  expect(pocoContraste({ pagina: '#121212', letra: '#3B3B3B' })).toBe(true);
});
