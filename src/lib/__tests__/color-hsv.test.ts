/** El color del selector del lienzo creativo (13h, RF-CC12; T342): HEX ↔ tono, saturación y brillo. */
import { hexAHsv, hsvAHex, normalizarHex } from '@/lib/color';

it('el HEX se lee con o sin #, corto o largo, y queda en mayúscula', () => {
  expect(normalizarHex('7a1e3a')).toBe('#7A1E3A');
  expect(normalizarHex(' #abc ')).toBe('#AABBCC');
  expect(normalizarHex('rojo')).toBeNull();
  expect(normalizarHex('#12345')).toBeNull();
});

it('ida y vuelta entre HEX y HSV da el mismo color', () => {
  for (const hex of ['#FF0000', '#00FF00', '#0000FF', '#7A1E3A', '#F2C14E', '#FFFFFF', '#000000', '#808080']) expect(hsvAHex(hexAHsv(hex))).toBe(hex);
  expect(hexAHsv('#FF0000')).toEqual({ h: 0, s: 1, v: 1 });
  expect(hsvAHex({ h: 120, s: 1, v: 1 })).toBe('#00FF00');
  expect(hsvAHex({ h: 480, s: 1, v: 1 })).toBe('#00FF00');
});
