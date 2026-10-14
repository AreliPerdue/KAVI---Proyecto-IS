/** Los stickers incluidos (spec 13c, RF-BH13; T290): cada uno con su imagen, su nombre y su proporción. */
import { STICKERS, stickerPorId } from '@/constants/stickers';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';

// `fs` solo existe al correr en Jest (Node); el proyecto no trae los tipos de Node a propósito.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  readdirSync: (ruta: string) => string[];
  readFileSync: (ruta: string) => { readUInt32BE: (i: number) => number };
  statSync: (ruta: string) => { isDirectory: () => boolean };
};
declare const __dirname: string;
const join = (...partes: string[]) => partes.join('/');

const CARPETA = `${__dirname}/../../../public/reader/stickers`;

/** Ancho y alto de un PNG, de su cabecera. */
function medidas(archivo: string) {
  const b = fs.readFileSync(archivo);
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
}

it('cada sticker tiene su imagen y cada imagen está en el catálogo (lo que el motor empaqueta)', () => {
  const paquetes = fs.readdirSync(CARPETA).filter((n) => fs.statSync(join(CARPETA, n)).isDirectory());
  const archivos = paquetes.flatMap((p) => fs.readdirSync(join(CARPETA, p)).map((f) => `${p}/${f.replace(/\.png$/, '')}`));
  expect([...archivos].sort()).toEqual(STICKERS.map((s) => s.id).sort());
});

it('los ids no se repiten y tienen la forma que el motor acepta', () => {
  expect(new Set(STICKERS.map((s) => s.id)).size).toBe(STICKERS.length);
  for (const s of STICKERS) expect(s.id).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+$/);
});

it('la proporción del catálogo es la de la imagen: se pega sin deformarse', () => {
  for (const s of STICKERS) {
    const { ancho, alto } = medidas(join(CARPETA, `${s.id}.png`));
    expect(Math.abs(s.ar - alto / ancho)).toBeLessThan(0.01);
    // Ligeros para ir dentro del motor del teléfono.
    expect(Math.max(ancho, alto)).toBeLessThanOrEqual(400);
  }
});

it('cada uno tiene nombre en español y en inglés', () => {
  for (const s of STICKERS) {
    expect(es.library.stickers.names[s.nombre]).toBeTruthy();
    expect(en.library.stickers.names[s.nombre]).toBeTruthy();
  }
});

it('stickerPorId: solo los que existen', () => {
  expect(stickerPorId('nobi-pink/popcorn')?.nombre).toBe('popcorn');
  expect(stickerPorId('nobi-pink/no-existe')).toBeNull();
  expect(stickerPorId(42)).toBeNull();
});
