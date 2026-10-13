/** Portada, lomo y contraportada (RF-BL20, RF-BL21; T311): de dónde sale la imagen y el color de cada cara. */
import { colorEn } from '@/lib/library/cover/eyedropper';
import { cambioDeColor, colorDeParte, hexValido, rutaDeParte, tieneImagenPropia } from '@/lib/library/cover/parts';

jest.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: {} }));

const base = {
  id: 'a',
  cover_path: 'u/a/cover.png',
  cover_color: '#1E2761',
  custom_cover_path: null,
  custom_cover_color: null,
  spine_path: null,
  spine_color: null,
  back_cover_path: null,
  back_cover_color: null,
};

describe('partes', () => {
  it('la portada es la propia o la del archivo; el lomo y la contraportada, solo propias', () => {
    expect(rutaDeParte(base, 'front')).toBe('u/a/cover.png');
    expect(rutaDeParte({ ...base, custom_cover_path: 'u/a/cover-custom.jpg' }, 'front')).toBe('u/a/cover-custom.jpg');
    expect(rutaDeParte(base, 'spine')).toBeNull();
    expect(rutaDeParte({ ...base, back_cover_path: 'u/a/back.jpg' }, 'back')).toBe('u/a/back.jpg');
  });

  it('sin color propio, el lomo y la contraportada toman el de la portada', () => {
    expect(colorDeParte(base, 'spine')).toBe('#1E2761');
    expect(colorDeParte({ ...base, custom_cover_path: 'x', custom_cover_color: '#EC4899' }, 'back')).toBe('#EC4899');
    expect(colorDeParte({ ...base, spine_color: '#111111' }, 'spine')).toBe('#111111');
  });

  it('la portada del archivo no cuenta como imagen propia', () => {
    expect(tieneImagenPropia(base, 'front')).toBe(false);
    expect(tieneImagenPropia({ ...base, custom_cover_path: 'x' }, 'front')).toBe(true);
    expect(tieneImagenPropia({ ...base, spine_path: 'x' }, 'spine')).toBe(true);
  });

  it('el color de la portada cambia el de la propia si la hay; el de las otras, el suyo', () => {
    expect(cambioDeColor(base, 'front', '#ABCDEF')).toEqual({ cover_color: '#ABCDEF' });
    expect(cambioDeColor({ ...base, custom_cover_path: 'x' }, 'front', '#ABCDEF')).toEqual({ custom_cover_color: '#ABCDEF' });
    expect(cambioDeColor(base, 'spine', '#ABCDEF')).toEqual({ spine_color: '#ABCDEF' });
    expect(cambioDeColor(base, 'back', '#ABCDEF')).toEqual({ back_cover_color: '#ABCDEF' });
  });

  it('el hex se acepta con o sin #, en minúsculas, y nada más', () => {
    expect(hexValido('1e2761')).toBe('#1E2761');
    expect(hexValido(' #a1B2c3 ')).toBe('#A1B2C3');
    for (const malo of ['', '#123', '#12345G', 'rojo', '#1234567']) expect(hexValido(malo)).toBeNull();
  });
});

describe('cuentagotas', () => {
  // 3×3 pixeles: rojo arriba a la izquierda, azul en el resto; la esquina de abajo a la derecha, transparente.
  const pix = (r: number, g: number, b: number, a = 255) => [r, g, b, a];
  const muestra = (celdas: number[][], ancho: number) => ({ ancho, alto: celdas.length / ancho, pixeles: new Uint8Array(celdas.flat()) });

  it('promedia el cuadrito alrededor del punto', () => {
    const m = muestra([pix(255, 0, 0), pix(0, 0, 255), pix(0, 0, 255), pix(0, 0, 255), pix(0, 0, 255), pix(0, 0, 255), pix(0, 0, 255), pix(0, 0, 255), pix(0, 0, 255)], 3);
    // En la esquina solo cuentan los 4 que caben: 1 rojo y 3 azules.
    expect(colorEn(m, 0, 0)).toBe('#4000BF');
    // En el centro, los 9.
    expect(colorEn(m, 0.5, 0.5)).toBe('#1C00E3');
  });

  it('ignora lo transparente y devuelve null si todo lo es', () => {
    const m = muestra([pix(0, 255, 0), pix(0, 0, 0, 0), pix(0, 0, 0, 0), pix(0, 0, 0, 0)], 2);
    expect(colorEn(m, 0, 0)).toBe('#00FF00');
    expect(colorEn(muestra([pix(9, 9, 9, 0)], 1), 0.5, 0.5)).toBeNull();
  });

  it('un punto fuera de la imagen se ajusta a la orilla', () => {
    const m = muestra([pix(10, 20, 30)], 1);
    expect(colorEn(m, -1, 2)).toBe('#0A141E');
  });
});
