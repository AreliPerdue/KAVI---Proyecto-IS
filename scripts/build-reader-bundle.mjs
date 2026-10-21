/**
 * Empaqueta el motor de lectura de KAVI Library en una sola página para la app (spec 13b, RF-BR3; T285).
 *
 * En el teléfono el motor ya no se carga de la web: viene dentro de la app (`assets/reader/engine.html`),
 * así se lee sin conexión. La página lleva todo adentro: el motor, pdf.js, foliate y StPageFlip en un solo
 * script, y el worker de pdf.js como texto (el motor lo arranca desde un `blob:`). Los archivos de apoyo
 * que pdf.js pide aparte (mapas de caracteres CJK, fuentes estándar) se piden a la web cuando hay red: la
 * app abre la página con la web de KAVI como dirección base.
 *
 * Corre en `postinstall`, después de `vendor-reader.mjs` (necesita `public/reader/vendor/`). El resultado
 * no se sube al repo.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const motor = join(raiz, 'public', 'reader');
const destino = join(raiz, 'assets', 'reader', 'engine.html');

const { outputFiles } = await build({
  entryPoints: [join(motor, 'engine.js')],
  bundle: true,
  format: 'iife',
  write: false,
  minify: true,
  // WebViews de iOS 15 y Android con Chrome reciente.
  target: ['es2020', 'safari15', 'chrome90'],
  // Sin dirección propia, lo relativo se resuelve contra la base que pone la app (la web de KAVI).
  define: { 'import.meta.url': 'globalThis.KAVI_BASE' },
  loader: { '.mjs': 'js' },
  logLevel: 'error',
  plugins: [
    {
      // foliate lo importa para los EPUB de diseño fijo; las WebViews de hoy ya traen hojas de estilo
      // construibles, y en la web tampoco se carga (el navegador no resuelve ese nombre).
      name: 'sin-polyfill',
      setup(b) {
        b.onResolve({ filter: /^construct-style-sheets-polyfill$/ }, () => ({ path: 'vacio', namespace: 'vacio' }));
        b.onLoad({ filter: /.*/, namespace: 'vacio' }, () => ({ contents: '', loader: 'js' }));
      },
    },
  ],
});

/** Que un `</script>` dentro del código no cierre la etiqueta antes de tiempo. */
const seguro = (texto) => texto.replace(/<\/(script)/gi, '<\\/$1');

const html = readFileSync(join(motor, 'engine.html'), 'utf8');
const estilos = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
const worker = readFileSync(join(motor, 'vendor', 'pdfjs', 'pdf.worker.min.mjs'), 'utf8');
// Las letras para leer (T288) van dentro, en base64: sin red también se puede cambiar de letra.
const carpetaLetras = join(motor, 'vendor', 'fonts');
const letras = Object.fromEntries(
  readdirSync(carpetaLetras)
    .filter((f) => f.endsWith('.woff2'))
    .map((f) => [f.replace(/\.woff2$/, ''), readFileSync(join(carpetaLetras, f)).toString('base64')]),
);
// Los stickers incluidos (T290) también, como `data:`: se pegan y se ven sin red.
const carpetaStickers = join(motor, 'stickers');
const stickers = Object.fromEntries(
  readdirSync(carpetaStickers, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(join(carpetaStickers, d.name))
        .filter((f) => f.endsWith('.png'))
        .map((f) => [`${d.name}/${f.replace(/\.png$/, '')}`, `data:image/png;base64,${readFileSync(join(carpetaStickers, d.name, f)).toString('base64')}`]),
    ),
);

// Los assets incluidos del lienzo creativo (T343b), igual: el lienzo sirve sin red.
const carpetaAssets = join(motor, 'lienzo');
const assets = Object.fromEntries(
  readdirSync(carpetaAssets, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(join(carpetaAssets, d.name))
        .filter((f) => f.endsWith('.png'))
        .map((f) => [`${d.name}/${f.replace(/\.png$/, '')}`, `data:image/png;base64,${readFileSync(join(carpetaAssets, d.name, f)).toString('base64')}`]),
    ),
);

const pagina = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="color-scheme" content="dark light" />
<title>KAVI Library</title>
<style>${estilos}</style>
<script>globalThis.KAVI_BASE = document.baseURI; globalThis.KAVI_PDF_WORKER = ${seguro(JSON.stringify(worker))}; globalThis.KAVI_FONTS = ${JSON.stringify(letras)}; globalThis.KAVI_STICKERS = ${JSON.stringify(stickers)}; globalThis.KAVI_ASSETS = ${JSON.stringify(assets)};</script>
</head>
<body>
<script>${seguro(outputFiles[0].text)}</script>
</body>
</html>
`;

mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, pagina);
console.log(`[build-reader-bundle] motor empaquetado en assets/reader/engine.html (${Math.round(pagina.length / 1024)} KB)`);
