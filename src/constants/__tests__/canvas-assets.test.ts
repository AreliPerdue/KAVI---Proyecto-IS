/** El primer pack de assets del lienzo (13h, RF-CC15 – RF-CC17; T343b): cada pieza con su archivo, medida y nombres. */
import { ASSETS_DE_LIENZO, assetPorId, CATEGORIAS_DE_ASSET } from '@/constants/canvas-assets';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';

/* eslint-disable @typescript-eslint/no-require-imports -- como en source-rules: sin tipos de Node en las pruebas */
const { readFileSync } = require('fs') as { readFileSync: (ruta: string) => { readUInt32BE: (i: number) => number } };
const { join } = require('path') as { join: (...partes: string[]) => string };
/* eslint-enable @typescript-eslint/no-require-imports */
declare const __dirname: string;

const RAIZ = join(__dirname, '../../..');
/** Ancho y alto de un PNG, de su encabezado. */
function medida(ruta: string) {
  const b = readFileSync(ruta);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

it('cada asset tiene su PNG y la proporción con que se pega es la de su archivo', () => {
  for (const a of ASSETS_DE_LIENZO) {
    const { w, h } = medida(join(RAIZ, 'public/reader/lienzo', `${a.id}.png`));
    expect(Math.abs(a.ar - h / w)).toBeLessThan(0.002);
  }
});

it('las cuatro categorías tienen piezas; los doodles se tiñen como trazo y lo demás conserva su textura', () => {
  for (const c of CATEGORIAS_DE_ASSET) expect(ASSETS_DE_LIENZO.some((a) => a.categoria === c)).toBe(true);
  for (const a of ASSETS_DE_LIENZO) expect(a.modo).toBe(a.categoria === 'doodle' ? 'trazo' : 'textura');
});

it('cada uno tiene nombre en español y en inglés, y se encuentra por su id', () => {
  for (const a of ASSETS_DE_LIENZO) {
    expect(es.library.canvas.assets.names[a.nombre]).toBeTruthy();
    expect(en.library.canvas.assets.names[a.nombre]).toBeTruthy();
    expect(assetPorId(a.id)).toBe(a);
  }
  expect(assetPorId('basicos/no-existe')).toBeNull();
});
