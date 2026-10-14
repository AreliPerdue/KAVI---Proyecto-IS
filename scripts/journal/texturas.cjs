#!/usr/bin/env node
/**
 * Texturas de los materiales del Journal (spec 13i, RF-JC8; T352). Toma las franjas del muestrario de Areli
 * (`~/Desktop/Recortes/Muestrario de texturas.png`, 1536 × 1024), las pasa a gris con luz pareja (media 0.5,
 * para mezclarse con `soft-light` sobre el color elegido) y arma con síntesis por parches (image quilting,
 * Efros & Freeman) sobre un toro una textura que se repite sin costuras por los cuatro lados.
 *
 *   node scripts/journal/texturas.cjs "<muestrario>.png" assets/library/materials [material]
 */
/* global __dirname */
const path = require('path');
const raiz = path.resolve(__dirname, '../..');
const { createRequire } = require('module');
const m = createRequire(createRequire(path.join(raiz, 'package.json')).resolve('pdf-lib'))('@pdf-lib/upng');
const UPNG = m.default || m;
const fs = require('fs');
const { Buffer } = require('buffer');
const [origen, salida] = process.argv.slice(2);
const im = UPNG.decode(fs.readFileSync(origen)); const P = new Uint8Array(UPNG.toRGBA8(im)[0]); const W = im.width;
// giros: 'diagonal' = solo el original y girado 180° (voltear haría espiga); 'tejido' = también voltear y
// girar 90°; 'vetas' = estirado a lo largo de la veta (vertical) para que no se repitan los nudos.
const MATERIALES = {
  leather: { y: [118, 210], giros: 'diagonal', contraste: 0.085 },
  linen: { y: [262, 358], giros: 'tejido', contraste: 0.075 },
  velvet: { y: [410, 506], giros: 'diagonal', contraste: 0.055, luz: 32 },
  wood: { y: [559, 656], giros: 'vetas', contraste: 0.09 },
  fabric: { y: [709, 806], giros: 'tejido', contraste: 0.08 },
  parchment: { y: [860, 958], giros: 'diagonal', contraste: 0.07 },
};
const X = [274, 1154];
function gris(y0, y1) {
  const w = X[1] - X[0], h = y1 - y0, g = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y + y0) * W + x + X[0]) * 4; g[y * w + x] = (P[i] * 0.3 + P[i + 1] * 0.59 + P[i + 2] * 0.11) / 255; }
  return { w, h, g };
}
function desenfocar(img, r) {
  const { w, h, g } = img; const t = new Float32Array(w * h), o = new Float32Array(w * h);
  for (let y = 0; y < h; y++) { let s = 0, n = 0; for (let x = -r; x < w + r; x++) { if (x + r < w && x + r >= 0) { s += g[y * w + x + r]; n++; } if (x - r - 1 >= 0 && x - r - 1 < w) { s -= g[y * w + x - r - 1]; n--; } if (x >= 0 && x < w) t[y * w + x] = s / n; } }
  for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let y = -r; y < h + r; y++) { if (y + r < h && y + r >= 0) { s += t[(y + r) * w + x]; n++; } if (y - r - 1 >= 0 && y - r - 1 < h) { s -= t[(y - r - 1) * w + x]; n--; } if (y >= 0 && y < h) o[y * w + x] = s / n; } }
  return o;
}
/** Luz pareja: quita las sombras grandes (dividir entre la versión borrosa) y deja la media en 0.5. */
function aplanar(img, contraste, radio = 24) {
  const b = desenfocar(img, radio); const g = img.g; let s = 0;
  for (let i = 0; i < g.length; i++) { g[i] = g[i] / Math.max(0.05, b[i]); s += g[i]; }
  const media = s / g.length; let v = 0;
  for (let i = 0; i < g.length; i++) { g[i] -= media; v += g[i] * g[i]; }
  const de = Math.sqrt(v / g.length) || 1;
  for (let i = 0; i < g.length; i++) g[i] = Math.min(1, Math.max(0, 0.5 + (g[i] / de) * contraste));
  return img;
}
function variantes(img, giros) {
  const lista = [img];
  const voltear = (f) => { const { w, h, g } = img; const o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y * w + x] = g[f(x, y, w, h)]; return { w, h, g: o }; };
  lista.push(voltear((x, y, w, h) => (h - 1 - y) * w + (w - 1 - x)));
  if (giros === 'tejido') {
    lista.push(voltear((x, y, w) => y * w + (w - 1 - x)));
    const { w, h, g } = img; const o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[x * h + y] = g[y * w + x]; lista.push({ w: h, h: w, g: o });
  }
  return lista;
}
/** La madera: estirada 3× a lo largo de la veta; los nudos quedan alargados, como en una tabla. */
function estirar(img, k) {
  const { w, h, g } = img; const H = h * k; const o = new Float32Array(w * H);
  for (let y = 0; y < H; y++) { const sy = y / k, y0 = Math.floor(sy), y1 = Math.min(h - 1, y0 + 1), t = sy - y0; for (let x = 0; x < w; x++) o[y * w + x] = g[y0 * w + x] * (1 - t) + g[y1 * w + x] * t; }
  return { w, h: H, g: o };
}
let semilla = 3; const azar = () => ((semilla = (semilla * 9301 + 49297) % 233280) / 233280);
function quilt(fuentes, N, B, O) {
  const Sd = B - O; const out = new Float32Array(N * N); const lleno = new Uint8Array(N * N);
  const cand = []; for (let f = 0; f < fuentes.length; f++) { const s = fuentes[f]; for (let y = 0; y + B <= s.h; y += 2) for (let x = 0; x + B <= s.w; x += 3) cand.push([f, x, y]); }
  const n = N / Sd;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const ox = i * Sd, oy = j * Sd;
    const errs = new Float32Array(cand.length); let min = Infinity;
    for (let c = 0; c < cand.length; c++) {
      const [f, sx, sy] = cand[c]; const s = fuentes[f]; let e = 0, k = 0;
      for (let y = 0; y < B; y += 2) for (let x = 0; x < B; x += 2) {
        const q = ((oy + y) % N) * N + ((ox + x) % N); if (!lleno[q]) continue;
        const d = s.g[(sy + y) * s.w + sx + x] - out[q]; e += d * d; k++;
      }
      errs[c] = k ? e / k : azar(); if (errs[c] < min) min = errs[c];
    }
    const buenos = []; for (let c = 0; c < cand.length; c++) if (errs[c] <= min * 1.1 + 1e-6) buenos.push(c);
    const [f, sx, sy] = cand[buenos[Math.floor(azar() * buenos.length)]]; const s = fuentes[f];
    // Corte de error mínimo: en cada fila, la columna de corte en la orilla izquierda (y derecha si da la vuelta),
    // y en cada columna, la fila de corte arriba (y abajo). Lo que queda del lado de lo ya pintado no se toca.
    const err = (x, y) => { const q = ((oy + y) % N) * N + ((ox + x) % N); const d = s.g[(sy + y) * s.w + sx + x] - out[q]; return d * d; };
    const usar = new Uint8Array(B * B).fill(1);
    const corte = (largo, ancho, e) => { // camino de costo mínimo a lo largo de 'largo', dentro de 'ancho'
      const C = new Float32Array(largo * ancho), D = new Int8Array(largo * ancho);
      for (let a = 0; a < ancho; a++) C[a] = e(0, a);
      for (let l = 1; l < largo; l++) for (let a = 0; a < ancho; a++) { let best = C[(l - 1) * ancho + a], d = 0; if (a > 0 && C[(l - 1) * ancho + a - 1] < best) { best = C[(l - 1) * ancho + a - 1]; d = -1; } if (a < ancho - 1 && C[(l - 1) * ancho + a + 1] < best) { best = C[(l - 1) * ancho + a + 1]; d = 1; } C[l * ancho + a] = best + e(l, a); D[l * ancho + a] = d; }
      let a = 0; for (let k = 1; k < ancho; k++) if (C[(largo - 1) * ancho + k] < C[(largo - 1) * ancho + a]) a = k;
      const camino = new Int32Array(largo); for (let l = largo - 1; l >= 0; l--) { camino[l] = a; a += D[l * ancho + a]; } return camino;
    };
    const izq = lleno[oy * N + ((ox) % N)] || i > 0, arriba = j > 0, der = i === n - 1, abajo = j === n - 1;
    if (i > 0) { const c = corte(B, O, (l, a) => err(a, l)); for (let y = 0; y < B; y++) for (let x = 0; x < c[y]; x++) usar[y * B + x] = 0; }
    if (arriba) { const c = corte(B, O, (l, a) => err(l, a)); for (let x = 0; x < B; x++) for (let y = 0; y < c[x]; y++) usar[y * B + x] = 0; }
    if (der) { const c = corte(B, O, (l, a) => err(B - O + a, l)); for (let y = 0; y < B; y++) for (let x = B - O + c[y] + 1; x < B; x++) usar[y * B + x] = 0; }
    if (abajo) { const c = corte(B, O, (l, a) => err(l, B - O + a)); for (let x = 0; x < B; x++) for (let y = B - O + c[x] + 1; y < B; y++) usar[y * B + x] = 0; }
    for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
      const q = ((oy + y) % N) * N + ((ox + x) % N);
      if (!lleno[q] || usar[y * B + x]) { out[q] = s.g[(sy + y) * s.w + sx + x]; lleno[q] = 1; }
    }
  }
  return out;
}
fs.mkdirSync(salida, { recursive: true });
for (const [nombre, cfg] of Object.entries(MATERIALES)) {
  if (process.argv[4] && process.argv[4] !== nombre) continue;
  semilla = 3; // cada material sale igual aunque se genere solo
  let base = aplanar(gris(cfg.y[0], cfg.y[1]), cfg.contraste, cfg.luz ?? 24);
  if (cfg.giros === 'vetas') base = estirar(base, 3);
  const [N, B, O] = cfg.giros === 'vetas' ? [576, 96, 24] : [528, 66, 18]; // N = (B − O) × n
  const t = quilt(variantes(base, cfg.giros), N, B, O);
  const rgba = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) { const v = Math.round(t[i] * 255); rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = v; rgba[i * 4 + 3] = 255; }
  fs.writeFileSync(salida + '/' + nombre + '.png', Buffer.from(UPNG.encode([rgba.buffer], N, N, 0)));
  console.log(nombre, 'listo');
}
