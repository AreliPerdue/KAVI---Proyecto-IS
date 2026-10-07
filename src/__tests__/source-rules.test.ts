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

/**
 * Ningún texto de interfaz suelto en JSX (spec 12, RF-I8): todo sale de `src/i18n`. Se buscan
 * los hijos de texto de una etiqueta —en su propia línea o en la misma— que, quitando las
 * expresiones `{…}`, todavía tengan letras. La marca "KAVI" es la única excepción.
 */
describe('textos de interfaz (RF-I8)', () => {
  const PERMITIDOS = new Set(['KAVI']);
  const conLetras = (texto: string) => {
    const sinExpresiones = texto.replace(/\{[^{}]*\}/g, '').trim();
    return /\p{L}{2,}/u.test(sinExpresiones) && !PERMITIDOS.has(sinExpresiones) ? sinExpresiones : null;
  };

  it('ninguna pantalla ni componente escribe texto fuera del diccionario', () => {
    const culpables: string[] = [];
    const tsx = archivos(join(SRC, 'components'), (p) => p.endsWith('.tsx')).concat(archivos(join(SRC, 'app'), (p) => p.endsWith('.tsx')));
    for (const ruta of tsx) {
      const lineas = readFileSync(ruta, 'utf8').split('\n');
      lineas.forEach((linea, i) => {
        const s = linea.trim();
        // Texto en su propia línea, entre una etiqueta que abre y otra que cierra.
        const entreEtiquetas = i > 0 && /[^=]>$/.test(lineas[i - 1].trimEnd()) && (lineas[i + 1] ?? '').trim().startsWith('</') && !/^[{<}/*)]/.test(s);
        const suelto = entreEtiquetas ? conLetras(s) : null;
        if (suelto) culpables.push(`${ruta.slice(SRC.length)}:${i + 1} ${suelto}`);
        // En la misma línea: >Texto</
        for (const m of linea.matchAll(/>([^<>]*)<\//g)) {
          const t = conLetras(m[1]);
          if (t && !/=>/.test(m[1])) culpables.push(`${ruta.slice(SRC.length)}:${i + 1} ${t}`);
        }
      });
    }
    expect(culpables).toEqual([]);
  });
});

/**
 * La variante `micro` (11 px) es la única excepción al mínimo de 12 px de `kavi-design` §2 y
 * nació para la rejilla del calendario. Hoy también la usan las tablas densas del gym, el
 * progreso y las fechas de los renglones de Listas; esta prueba fija ese conjunto para que no
 * siga creciendo sin decidirlo: un archivo nuevo con `micro` la hace fallar.
 */
describe('variante micro (kavi-design §2)', () => {
  const PERMITIDOS = [
    '/components/calendar/month-view.tsx',
    '/components/calendar/agenda-view.tsx',
    '/components/calendar/activity-block.tsx',
    '/components/lists/day-items-strip.tsx',
    // Fuera del calendario, pendientes de decidir (ver reports/pruebas-pendientes.md):
    '/app/(app)/progress.tsx',
    '/app/(app)/list/[id].tsx',
    '/components/fitness/progress-chart.tsx',
    '/components/fitness/exercise-block.tsx',
    '/components/fitness/activity-view.tsx',
  ];

  it('solo la usan los archivos permitidos', () => {
    const usan = archivos(join(SRC, 'components'), (p) => p.endsWith('.tsx'))
      .concat(archivos(join(SRC, 'app'), (p) => p.endsWith('.tsx')))
      .filter((p) => /variant=\{?["'][^"']*\bmicro\b|'micro'/.test(readFileSync(p, 'utf8')))
      .map((p) => p.slice(SRC.length));
    expect(usan.filter((p) => !PERMITIDOS.includes(p))).toEqual([]);
  });
});
