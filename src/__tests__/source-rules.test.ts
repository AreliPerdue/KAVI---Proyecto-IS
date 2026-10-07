/**
 * Reglas del código que no se ven en una pantalla sola: se revisan leyendo los archivos.
 */
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';

// `fs` y `path` solo existen al correr en Jest (Node). El proyecto no trae los tipos de Node a
// propósito (ver `constants/__tests__/exercise-seed.test.ts`), así que se declaran aquí.
/* eslint-disable @typescript-eslint/no-require-imports */
const { readdirSync, readFileSync, statSync } = require('fs') as {
  readdirSync: (ruta: string) => string[];
  readFileSync: (ruta: string, codificacion: 'utf8') => string;
  statSync: (ruta: string) => { isDirectory: () => boolean };
};
const { join } = require('path') as { join: (...partes: string[]) => string };
/* eslint-enable @typescript-eslint/no-require-imports */
declare const __dirname: string;

const SRC = join(__dirname, '..');

function archivos(dir: string, filtro: (p: string) => boolean): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return nombre === '__tests__' ? [] : archivos(ruta, filtro);
    return filtro(ruta) ? [ruta] : [];
  });
}

describe('horas (formato de 12 horas en toda la app)', () => {
  it('ninguna pantalla ni componente arma una hora visible con .slice(0, 5)', () => {
    const culpables = archivos(join(SRC, 'components'), (p) => p.endsWith('.tsx'))
      .concat(archivos(join(SRC, 'app'), (p) => p.endsWith('.tsx')))
      .filter((p) => /due_time\??\.slice\(0,\s*5\)|start_time\??\.slice\(0,\s*5\)/.test(readFileSync(p, 'utf8')));
    expect(culpables).toEqual([]);
  });
});

describe('estimaciones (RF-F65)', () => {
  it('los textos de valores calculados dicen "≈" o "estimado" en los dos idiomas', () => {
    expect(es.fitness.exercise.estimateLine('100 kg', '5 oct')).toMatch(/^≈ .*estimado/);
    expect(en.fitness.exercise.estimateLine('100 kg', 'Oct 5')).toMatch(/^≈ .*estimated/);
    expect(es.fitness.exercise.estimateChart).toMatch(/estimado/);
    expect(en.fitness.exercise.estimateChart).toMatch(/[Ee]stimated/);
    expect(es.fitness.sheets.estimatedMax('Epley')).toMatch(/estimado/);
    expect(en.fitness.sheets.estimatedMax('Epley')).toMatch(/[Ee]stimated/);
  });
});
