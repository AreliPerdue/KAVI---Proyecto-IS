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

console.log('[vendor-reader] pdf.js y foliate-js copiados a public/reader/vendor');
