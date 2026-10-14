#!/usr/bin/env node
/**
 * Prepara packs de stickers para la tienda en la nube (spec 13c, RF-BH13b; T337).
 *
 * Toma una carpeta con un pack por color (`<origen>/<Color>/Sticker_Nobi_<Cara>_<Color>.png`, como los deja
 * Areli en `~/Desktop/Nobi/stickers`) y deja en `<salida>/<pack>/`:
 * - cada sticker a 400 px y 256 colores (`<cara>.png`, el mismo nombre que en los incluidos: `good-note`…);
 * - `muestra.png`: la "plancha" recortada para la tarjeta de la tienda (stickers acomodados como rompecabezas
 *   sobre el papel del color del pack);
 * y escribe la migración con sus filas del catálogo (`sticker_packs`).
 *
 * Luego se suben con el CLI (las llaves no salen del CLI):
 *   supabase storage cp -r <salida>/<pack> ss:///stickers/<pack> --linked --experimental -j 8
 *
 * Uso (macOS: usa `sips` para reducir; la muestra se dibuja con Chrome por `playwright-core`, que no es
 * dependencia: `PLAYWRIGHT_CORE=/ruta/a/playwright-core/index.mjs` si no se encuentra):
 *   node scripts/stickers/preparar-packs.mjs --origen ~/Desktop/Nobi/stickers --salida /tmp/packs \
 *     --coleccion primer-rebote --nombre-es "Primer Rebote" --nombre-en "First Bounce" --migracion 20261014130000
 */
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(import.meta.url), '../../..');
const requerir = createRequire(createRequire(join(raiz, 'package.json')).resolve('pdf-lib'));
const UPNG = (() => {
  const m = requerir('@pdf-lib/upng');
  return m.default ?? m;
})();

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce((pares, v, i, todo) => (v.startsWith('--') ? [...pares, [v.slice(2), todo[i + 1]]] : pares), []),
);
for (const k of ['origen', 'salida', 'coleccion', 'nombre-es', 'nombre-en', 'migracion']) {
  if (!args[k]) throw new Error(`Falta --${k}`);
}

/** Carpeta de Areli → id de color de la app (`src/constants/people-colors.ts`). El rosa viene incluido. */
const COLORES = {
  BabyBlue: 'baby_blue', Orange: 'orange', LimeGreen: 'lime_green', Turquoise: 'turquois', Yellow: 'yellow',
  Lilac: 'lilac', Coral: 'coral', Gray: 'gray', OliveGreen: 'olive_green', White: 'white', Magenta: 'magenta',
  LightPurple: 'light_purple', Red: 'red', Indigo: 'indigo', Blue: 'blue', DeepRed: 'deep_red', Green: 'green',
  NavyBlue: 'navy_blue', Purple: 'purple', Black: 'black', Gold: 'gold', Beige: 'beige', Brown: 'brown', Silver: 'silver',
};
/** El hex de cada color (para el papel de la muestra), leído de la paleta de la app. */
const HEX = Object.fromEntries(
  [...readFileSync(join(raiz, 'src/constants/people-colors.ts'), 'utf8').matchAll(/\{ id: '([a-z_]+)', label: '[^']+', hex: '(#[0-9A-F]{6})' \}/g)].map((m) => [m[1], m[2]]),
);

/** `GoodNote` → `good-note`; `Hidding` → `hiding`; `LoveTearEyed` → `love-tear-eyed` (como los incluidos). */
const cara = (n) => (n === 'Hidding' ? 'hiding' : n.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase());
const medida = (archivo) => {
  const b = readFileSync(archivo);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

function optimizar(origen, destino) {
  const temporal = join(tmpdir(), `sticker-${process.pid}.png`);
  execFileSync('sips', ['-Z', '400', origen, '--out', temporal], { stdio: 'ignore' });
  const img = UPNG.decode(readFileSync(temporal));
  const rgba = UPNG.toRGBA8(img)[0];
  writeFileSync(destino, Buffer.from(UPNG.encode([rgba], img.width, img.height, 256)));
  rmSync(temporal, { force: true });
}

/** El acomodo de rompecabezas: cada sticker cae en el hueco más alto donde cabe (las grandes primero). */
function acomodar(lista, ancho, base) {
  let semilla = 5;
  const azar = () => ((semilla = (semilla * 9301 + 49297) % 233280) / 233280);
  const piezas = [...lista]
    .sort(() => azar() - 0.5)
    .map((p, i) => {
      const w = base * (i < 1 ? 1.45 : [0.78, 0.9, 1, 1, 1.1, 1.18][Math.floor(azar() * 6)]);
      return { ...p, w, h: w * p.ar, rot: Math.round((azar() * 2 - 1) * 11) };
    })
    .sort((a, b) => b.w - a.w);
  const radio = (p, ang) => {
    const rx = p.w * 0.43, ry = p.h * 0.41;
    return (rx * ry) / Math.hypot(ry * Math.cos(ang), rx * Math.sin(ang));
  };
  const puestas = [];
  for (const p of piezas) {
    let mejor = null;
    for (let k = 0; k < 5000; k++) {
      const x = p.w * 0.45 + azar() * (ancho - p.w * 0.9);
      const y = p.h * 0.45 + azar() * 1400;
      if (mejor && y > mejor.y) continue;
      const choca = puestas.some((q) => {
        const ang = Math.atan2(q.y - y, q.x - x);
        return Math.hypot(q.x - x, q.y - y) < radio(p, ang) + radio(q, ang);
      });
      if (!choca) mejor = { x, y };
    }
    puestas.push({ ...p, ...mejor });
  }
  return puestas;
}

async function muestra(carpeta, stickers, hex, destino) {
  // `playwright-core` no es dependencia del proyecto: se usa el que haya (o el que diga PLAYWRIGHT_CORE).
  const { chromium } = await import(process.env.PLAYWRIGHT_CORE ? `file://${process.env.PLAYWRIGHT_CORE}` : 'playwright-core');
  const puestas = acomodar(stickers, 360, 104);
  const papel = (c) => `color-mix(in srgb, ${hex} ${c}%, white)`;
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:transparent">
  <div id="m" style="position:relative;width:390px;height:250px;overflow:hidden;border-radius:18px;
    background:radial-gradient(circle at 1px 1px, rgb(255 255 255 / .6) 1px, transparent 1.4px) 0 0/14px 14px, linear-gradient(160deg, ${papel(18)}, ${papel(30)});
    clip-path:polygon(0 0,100% 0,100% calc(100% - 46px),calc(100% - 46px) 100%,0 100%)">
  <div style="position:absolute;left:16px;top:10px;width:360px">${puestas
    .map((p) => `<img src="file://${carpeta}/${p.name}.png" style="position:absolute;left:${(p.x - p.w / 2).toFixed(1)}px;top:${(p.y - p.h / 2).toFixed(1)}px;width:${p.w.toFixed(1)}px;transform:rotate(${p.rot}deg);filter:drop-shadow(0 2px 3px rgb(0 0 0 / .16))">`)
    .join('')}</div></div>
  <div style="position:absolute;left:344px;top:204px;width:46px;height:46px;clip-path:polygon(0 0,100% 0,0 100%);border-top-left-radius:6px;
    background:linear-gradient(135deg,#fff 0%,${papel(8)} 45%,color-mix(in srgb, ${hex} 26%, #f2f2f2) 100%);filter:drop-shadow(-3px -3px 4px rgb(0 0 0 / .16))"></div>`;
  const pagina = join(tmpdir(), `muestra-${process.pid}.html`);
  writeFileSync(pagina, html);
  const navegador = await chromium.launch({ channel: 'chrome' });
  const p = await navegador.newPage({ viewport: { width: 390, height: 250 }, deviceScaleFactor: 2 });
  await p.goto(`file://${pagina}`);
  await p.waitForTimeout(400);
  const crudo = join(tmpdir(), `muestra-${process.pid}.png`);
  await p.screenshot({ path: crudo, omitBackground: true, clip: { x: 0, y: 0, width: 390, height: 250 } });
  await navegador.close();
  const img = UPNG.decode(readFileSync(crudo));
  writeFileSync(destino, Buffer.from(UPNG.encode([UPNG.toRGBA8(img)[0]], img.width, img.height, 256)));
  rmSync(crudo, { force: true });
  rmSync(pagina, { force: true });
}

const origen = resolve(args.origen.replace(/^~/, process.env.HOME));
const salida = resolve(args.salida);
const filas = [];
let orden = 0;
for (const carpetaColor of Object.keys(COLORES)) {
  const dir = join(origen, carpetaColor);
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) continue;
  const color = COLORES[carpetaColor];
  const pack = `${args.coleccion}-${color.replace(/_/g, '-')}`;
  const destino = join(salida, pack);
  rmSync(destino, { recursive: true, force: true });
  mkdirSync(destino, { recursive: true });
  const stickers = [];
  let bytes = 0;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.png')).sort()) {
    const m = f.match(/^Sticker_Nobi_(.+)_[A-Za-z]+\.png$/);
    if (!m) continue;
    const name = cara(m[1]);
    const archivo = join(destino, `${name}.png`);
    optimizar(join(dir, f), archivo);
    const { w, h } = medida(archivo);
    bytes += statSync(archivo).size;
    stickers.push({ name, ar: Math.round((h / w) * 1000) / 1000 });
  }
  await muestra(destino, stickers, HEX[color], join(destino, 'muestra.png'));
  bytes += statSync(join(destino, 'muestra.png')).size;
  filas.push({ pack, color, stickers, bytes, orden: ++orden });
  console.log(`${pack}: ${stickers.length} stickers, ${Math.round(bytes / 1024)} KB`);
}

const texto = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sql = `-- KAVI Library · Pack de stickers "${args['nombre-es']}" (spec 13c, RF-BH13b; T337). Generado por
-- scripts/stickers/preparar-packs.mjs: las imágenes están en el bucket \`stickers\` (\`<pack>/<nombre>.png\`).
-- Volver a correrla actualiza el catálogo (sube \`version\` si cambian las imágenes).

insert into public.sticker_packs (id, collection, color, name_es, name_en, sort_order, stickers, bytes, version)
values
${filas
  .map((f) => `  (${texto(f.pack)}, ${texto(args.coleccion)}, ${texto(f.color)}, ${texto(args['nombre-es'])}, ${texto(args['nombre-en'])}, ${f.orden}, ${texto(JSON.stringify(f.stickers))}::jsonb, ${f.bytes}, ${Number(args.version ?? 1)})`)
  .join(',\n')}
on conflict (id) do update
  set collection = excluded.collection,
      color = excluded.color,
      name_es = excluded.name_es,
      name_en = excluded.name_en,
      sort_order = excluded.sort_order,
      stickers = excluded.stickers,
      bytes = excluded.bytes,
      version = excluded.version;
`;
const archivoSql = join(raiz, 'supabase/migrations', `${args.migracion}_sticker_packs_${args.coleccion.replace(/-/g, '_')}.sql`);
writeFileSync(archivoSql, sql);
console.log(`catálogo: ${archivoSql} (${filas.length} packs)`);
