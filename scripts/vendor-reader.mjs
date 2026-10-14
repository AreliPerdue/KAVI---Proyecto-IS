/**
 * Copia las librerías del motor de lectura de KAVI Library (spec 13b, T279) a `public/reader/vendor`,
 * de donde las sirve la web (y el WebView del teléfono, que abre la misma página).
 *
 * Corre en `postinstall`: así existen en local y en Vercel sin subir 3 MB de librerías al repo
 * (`public/reader/vendor/` está en `.gitignore`).
 *
 * - pdf.js (`pdfjs-dist`, compilación *legacy* para WebViews no tan nuevos): el lector, su worker, los
 *   mapas de caracteres (CJK), las fuentes estándar y los decodificadores en WASM.
 * - foliate-js: el lector de EPUB (scroll, CFI, búsqueda).
 * - StPageFlip (`page-flip`, MIT): la hoja que se dobla del libro real (13b, RF-BR5; T284).
 * - Las letras incluidas para leer EPUB (13c, RF-BH3; T288), todas OFL de Fontsource: Literata (con serifas),
 *   Atkinson Hyperlegible (sin serifas), OpenDyslexic (para dislexia) y Patrick Hand (manuscrita). Solo el
 *   alfabeto latino (con acentos y ñ), normal y negrita.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(raiz, 'package.json'));
const destino = join(raiz, 'public', 'reader', 'vendor');

// Cada carpeta se ubica por un archivo que el paquete sí exporta (foliate-js no exporta su package.json).
const pdfjs = dirname(require.resolve('pdfjs-dist/package.json'));
const foliate = dirname(require.resolve('foliate-js/view.js'));
const pageFlip = dirname(dirname(dirname(require.resolve('page-flip'))));

rmSync(destino, { recursive: true, force: true });
mkdirSync(join(destino, 'pdfjs'), { recursive: true });

for (const archivo of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
  cpSync(join(pdfjs, 'legacy', 'build', archivo), join(destino, 'pdfjs', archivo));
}
for (const carpeta of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  if (existsSync(join(pdfjs, carpeta))) cpSync(join(pdfjs, carpeta), join(destino, 'pdfjs', carpeta), { recursive: true });
}
// foliate-js: los módulos del lector y sus dependencias (zip, fflate); sin pruebas ni herramientas.
cpSync(foliate, join(destino, 'foliate'), {
  recursive: true,
  // Se filtra por la ruta dentro del paquete: la absoluta ya pasa por `node_modules`.
  filter: (ruta) => !/^(tests|rollup|ui|node_modules)([/\\]|$)|eslint\.config\.js$|rollup\.config\.js$|^reader\.(html|js)$/.test(relative(foliate, ruta)),
});

mkdirSync(join(destino, 'page-flip'), { recursive: true });
cpSync(join(pageFlip, 'dist', 'js', 'page-flip.module.js'), join(destino, 'page-flip', 'page-flip.module.js'));
cpSync(join(pageFlip, 'LICENSE'), join(destino, 'page-flip', 'LICENSE'));

// Letras: con nombres fijos, que son los que pide el motor (`public/reader/text.js`).
const LETRAS = {
  'serif-400': ['@fontsource/literata', 'literata-latin-400-normal.woff2'],
  'serif-700': ['@fontsource/literata', 'literata-latin-700-normal.woff2'],
  'sans-400': ['@fontsource/atkinson-hyperlegible', 'atkinson-hyperlegible-latin-400-normal.woff2'],
  'sans-700': ['@fontsource/atkinson-hyperlegible', 'atkinson-hyperlegible-latin-700-normal.woff2'],
  'dyslexic-400': ['@fontsource/opendyslexic', 'opendyslexic-latin-400-normal.woff2'],
  'dyslexic-700': ['@fontsource/opendyslexic', 'opendyslexic-latin-700-normal.woff2'],
  'hand-400': ['@fontsource/patrick-hand', 'patrick-hand-latin-400-normal.woff2'],
};
mkdirSync(join(destino, 'fonts'), { recursive: true });
for (const [nombre, [paquete, archivo]] of Object.entries(LETRAS)) {
  const carpeta = dirname(require.resolve(`${paquete}/package.json`));
  cpSync(join(carpeta, 'files', archivo), join(destino, 'fonts', `${nombre}.woff2`));
  // La licencia viaja con cada familia (OFL-1.1 pide incluirla).
  cpSync(join(carpeta, 'LICENSE'), join(destino, 'fonts', `${paquete.split('/')[1]}-LICENSE.txt`));
}

console.log('[vendor-reader] pdf.js, foliate-js, page-flip y las letras copiados a public/reader/vendor');
