/** Colores con nombre del selector (13h, RF-CC12; T365). */
import { COLORES_BASICOS, COLORES_DE_OFFICE, coloresDePortadas } from '@/constants/color-palettes';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';

it('cada básico y cada color de Office tiene su nombre en los dos idiomas y un HEX válido', () => {
  for (const c of [...COLORES_BASICOS, ...COLORES_DE_OFFICE]) {
    expect(c.hex).toMatch(/^#[0-9A-F]{6}$/);
    expect(es.library.canvas.color.names[c.clave]).toBeTruthy();
    expect(en.library.canvas.color.names[c.clave]).toBeTruthy();
  }
  expect(COLORES_DE_OFFICE).toHaveLength(20);
});

it('de las portadas: un color por portada, con los títulos que lo comparten', () => {
  expect(
    coloresDePortadas([
      { title: 'A Court of Thorns and Roses', color: '#c0392b' },
      { title: 'Rayuela', color: '#2E7D32' },
      { title: 'ACOTAR 2', color: '#C0392B' },
      { title: 'Rota', color: 'rojo' },
    ]),
  ).toEqual([
    { hex: '#C0392B', nombre: 'A Court of Thorns and Roses · ACOTAR 2' },
    { hex: '#2E7D32', nombre: 'Rayuela' },
  ]);
});
