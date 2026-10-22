#!/usr/bin/env node
/**
 * El primer pack de assets del lienzo creativo (spec 13h, RF-CC15; T343b): papeles, notas, cintas y doodles en grises,
 * sin fondo y recolorables. Se dibujan con canvas en Chrome (Playwright), con semilla fija: correr el script otra vez
 * da los mismos archivos. Dirección visual (13h §5): papel realista con fibras y orillas orgánicas, línea delicada,
 * nada de cómic.
 *
 *   node scripts/library/assets-lienzo.mjs [carpeta de salida] [hoja de revisión.png] [--pack papeleria]
 *
 * Salida: `public/reader/lienzo/basicos/<nombre>.png` (por omisión) y, si se pide, una hoja con todos en gris y con
 * tres colores de ejemplo, para revisarlos de un vistazo. Necesita `playwright-core` (o `PLAYWRIGHT_CORE=<ruta>`).
 *
 * `--pack papeleria` (T343c): el segundo pack, el primero de la tienda en la nube (periódico, perforado, clip, kraft,
 * sobre, sello, esquina de foto, cintas de corazones, estrellas y zigzag, marco, burbuja, nube, flor, hoja, subrayado y
 * espiral). Ese no va en la app: se sube al bucket `stickers` con su migración.
 */
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// UPNG (viene con pdf-lib): los PNG se guardan con paleta de 256 tonos, la mitad de peso y sin bandas a la vista.
const desdeRaiz = createRequire(join(raiz, 'package.json'));
const upng = createRequire(desdeRaiz.resolve('pdf-lib'))('@pdf-lib/upng');
const UPNG = upng.default ?? upng;
const comprimir = (png) => {
  const im = UPNG.decode(png);
  return Buffer.from(UPNG.encode([UPNG.toRGBA8(im)[0]], im.width, im.height, 256));
};
const posicionales = process.argv.slice(2).filter((a, i, todos) => !a.startsWith('--') && todos[i - 1] !== '--pack');
const iPack = process.argv.indexOf('--pack');
const pack = iPack > 0 ? process.argv[iPack + 1] : 'basicos';
const salida = resolve(posicionales[0] ?? join(raiz, 'public/reader/lienzo/basicos'));
const hoja = posicionales[1] ? resolve(posicionales[1]) : null;

/** Lo que corre dentro de Chrome: cada pieza es una función que dibuja en un canvas y devuelve su PNG. */
const GENERADOR = String.raw`
const rnd = (semilla) => () => { semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** Ruido de valor suave en 2D, con octavas. */
function ruido(semilla) {
  const r = rnd(semilla); const T = 256; const tabla = Array.from({ length: T * T }, r);
  const v = (x, y) => tabla[((y % T) + T) % T * T + ((x % T) + T) % T];
  const s = (t) => t * t * (3 - 2 * t);
  const base = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = s(x - xi), yf = s(y - yi);
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; };
  return (x, y, octavas = 4) => { let suma = 0, amp = 1, frec = 1, total = 0; for (let o = 0; o < octavas; o++) { suma += base(x * frec, y * frec) * amp; total += amp; amp *= 0.5; frec *= 2; } return suma / total; };
}

function lienzo(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/**
 * Papel: tono casi blanco con fibras (ruido estirado), grano fino y, si se pide, pliegues de arrugado. Devuelve un canvas
 * opaco en grises; la forma se recorta después.
 */
function papel(w, h, { semilla = 1, arrugado = 0, fibras = 1, base = 0.95 } = {}) {
  const c = lienzo(w, h); const ctx = c.getContext('2d'); const img = ctx.createImageData(w, h);
  const n1 = ruido(semilla), n2 = ruido(semilla + 7), n3 = ruido(semilla + 13);
  const r = rnd(semilla + 3);
  // Arrugado: muchos pliegues cortos que se desvanecen en sus puntas, más un relieve suave de bultos.
  const pliegues = Array.from({ length: Math.round(arrugado * 46) }, () => ({ a: r() * Math.PI, x: r() * w, y: r() * h, k: 0.4 + r() * 0.9, largo: 90 + r() * 260 }));
  const bultos = ruido(semilla + 29);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let l = base;
    l += (n1(x / 90, y / 90, 4) - 0.5) * 0.05;
    l += (n2(x / 3.5, y / 22, 2) - 0.5) * 0.045 * fibras;
    l += (n3(x * 0.9, y * 0.9, 1) - 0.5) * 0.03;
    if (arrugado) l += (bultos(x / 70, y / 70, 3) - 0.5) * 0.11 * arrugado;
    for (const p of pliegues) {
      const d = (x - p.x) * Math.sin(p.a) - (y - p.y) * Math.cos(p.a);
      const t = (x - p.x) * Math.cos(p.a) + (y - p.y) * Math.sin(p.a);
      const ancho = 18 * p.k;
      if (Math.abs(d) < ancho && Math.abs(t) < p.largo / 2) {
        const punta = 1 - Math.pow(Math.abs(t) / (p.largo / 2), 2);
        l += (d > 0 ? -1 : 1) * 0.08 * p.k * Math.pow(1 - Math.abs(d) / ancho, 2) * punta * arrugado;
      }
    }
    const g = Math.max(0, Math.min(255, Math.round(l * 255))); const i = (y * w + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = g; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Una orilla rasgada entre dos puntos: el camino se mueve con ruido grande y se deshilacha con ruido fino. */
function orilla(r, n, x0, y0, x1, y1, fuerza, puntos) {
  const salida = []; const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy); const nx = -dy / len, ny = dx / len;
  const fase = r() * 100;
  for (let i = 0; i <= puntos; i++) { const t = i / puntos; const d = ((n(fase + t * 6, 0, 3) - 0.5) * 2 * fuerza + (r() - 0.5) * fuerza * 0.35) * Math.sin(Math.PI * Math.min(1, t * 8, (1 - t) * 8) / 2 + 0.0001);
    salida.push([x0 + dx * t + nx * d, y0 + dy * t + ny * d]); }
  return salida;
}

/** Recorta un canvas con un polígono y le pone una orilla un poco más oscura y una sombra de contacto suave. */
function recortar(fuente, poligono, { borde = 0.06, sombra = true } = {}) {
  const w = fuente.width, h = fuente.height; const c = lienzo(w, h); const ctx = c.getContext('2d');
  const camino = new Path2D(); poligono.forEach(([x, y], i) => (i ? camino.lineTo(x, y) : camino.moveTo(x, y))); camino.closePath();
  if (sombra) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; ctx.fillStyle = '#fff'; ctx.fill(camino); ctx.restore(); }
  ctx.save(); ctx.clip(camino); ctx.drawImage(fuente, 0, 0);
  ctx.strokeStyle = 'rgba(0,0,0,' + borde + ')'; ctx.lineWidth = 3; ctx.stroke(camino); ctx.restore();
  return c;
}

const rect = (m, w, h) => [[m, m], [w - m, m], [w - m, h - m], [m, h - m]];

function rasgado(w, h, semilla, fuerza = 12) {
  const r = rnd(semilla), n = ruido(semilla + 99); const m = 18;
  return [...orilla(r, n, m, m, w - m, m, fuerza, 120), ...orilla(r, n, w - m, m, w - m, h - m, fuerza, 120).slice(1), ...orilla(r, n, w - m, h - m, m, h - m, fuerza, 120).slice(1), ...orilla(r, n, m, h - m, m, m, fuerza, 120).slice(1, -1)];
}

function lineas(ctx, w, h, { arriba, paso, color = 'rgba(0,0,0,0.16)', ancho = 1.6, desde = 0, hasta = w }) {
  ctx.strokeStyle = color; ctx.lineWidth = ancho; for (let y = arriba; y < h - 20; y += paso) { ctx.beginPath(); ctx.moveTo(desde, y); ctx.lineTo(hasta, y); ctx.stroke(); }
}

/** Trazo a mano: el camino se mueve un poco y se repasa dos veces, como con pluma fina. */
function aMano(ctx, puntos, { ancho = 5, semilla = 1, temblor = 2.2, pasadas = 2 } = {}) {
  const r = rnd(semilla); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#141414';
  for (let p = 0; p < pasadas; p++) { ctx.lineWidth = ancho * (p ? 0.55 : 1); ctx.globalAlpha = p ? 0.55 : 1; ctx.beginPath();
    puntos.forEach(([x, y], i) => { const jx = x + (r() - 0.5) * temblor, jy = y + (r() - 0.5) * temblor; i ? ctx.lineTo(jx, jy) : ctx.moveTo(jx, jy); }); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
const curva = (f, n = 80) => Array.from({ length: n + 1 }, (_, i) => f(i / n));

const PIEZAS = {
  'papel-rasgado': () => recortar(papel(620, 760, { semilla: 11 }), rasgado(620, 760, 12, 14)),
  'papel-arrugado': () => recortar(papel(620, 720, { semilla: 21, arrugado: 1 }), rasgado(620, 720, 22, 6)),
  'hoja-de-libreta': () => { const p = papel(600, 780, { semilla: 31 }); const ctx = p.getContext('2d'); lineas(ctx, 600, 780, { arriba: 110, paso: 34 });
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(96, 18); ctx.lineTo(96, 762); ctx.stroke();
    const c = recortar(p, rect(18, 600, 780)); const k = c.getContext('2d'); k.globalCompositeOperation = 'destination-out'; for (let y = 120; y < 760; y += 150) { k.beginPath(); k.arc(48, y, 13, 0, Math.PI * 2); k.fill(); } return c; },
  'papel-cuadriculado': () => { const p = papel(640, 640, { semilla: 41 }); const ctx = p.getContext('2d'); ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 1.4;
    for (let v = 18; v < 640; v += 28) { ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, 640); ctx.moveTo(0, v); ctx.lineTo(640, v); ctx.stroke(); } return recortar(p, rasgado(640, 640, 42, 5)); },
  'papel-punteado': () => { const p = papel(620, 620, { semilla: 51 }); const ctx = p.getContext('2d'); ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let y = 40; y < 600; y += 26) for (let x = 40; x < 600; x += 26) { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill(); } return recortar(p, rect(18, 620, 620)); },
  'papel-esquina-doblada': () => { const W = 600, H = 600, d = 120; const c = recortar(papel(W, H, { semilla: 61 }), [[18, 18], [W - 18 - d, 18], [W - 18, 18 + d], [W - 18, H - 18], [18, H - 18]]);
    const ctx = c.getContext('2d'); const doblez = new Path2D(); doblez.moveTo(W - 18 - d, 18); doblez.lineTo(W - 18 - d, 18 + d); doblez.lineTo(W - 18, 18 + d); doblez.closePath();
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = -3; ctx.shadowOffsetY = 4; const g = ctx.createLinearGradient(W - 18 - d, 18, W - 18 - d / 2, 18 + d / 2); g.addColorStop(0, '#dadada'); g.addColorStop(1, '#f2f2f2'); ctx.fillStyle = g; ctx.fill(doblez); ctx.restore(); return c; },
  'papel-con-fibras': () => recortar(papel(620, 700, { semilla: 71, fibras: 2.6, base: 0.93 }), rasgado(620, 700, 72, 9)),
  'tira-rasgada': () => { const r = rnd(81), n = ruido(181); const W = 700, H = 170; return recortar(papel(W, H, { semilla: 82 }), [...orilla(r, n, 14, 30, W - 14, 30, 9, 140), ...orilla(r, n, W - 14, H - 30, 14, H - 30, 9, 140)]); },
  'memo': () => { const W = 560, H = 600; const p = papel(W, H, { semilla: 91 }); const ctx = p.getContext('2d'); ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, 0, W, 104);
    lineas(ctx, W, H, { arriba: 160, paso: 40, desde: 50, hasta: W - 50 }); return recortar(p, rect(18, W, H)); },
  'ticket': () => { const W = 700, H = 300, m = 18; const p = papel(W, H, { semilla: 101 }); const ctx = p.getContext('2d');
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.setLineDash([10, 9]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W - 190, m + 14); ctx.lineTo(W - 190, H - m - 14); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 2; ctx.strokeRect(m + 22, m + 22, W - 190 - m - 44, H - 2 * m - 44);
    const c = recortar(p, rect(m, W, H)); const k = c.getContext('2d'); k.globalCompositeOperation = 'destination-out'; for (let y = m + 20; y < H - m; y += 34) { k.beginPath(); k.arc(m, y, 10, 0, Math.PI * 2); k.arc(W - m, y, 10, 0, Math.PI * 2); k.fill(); } return c; },
  'etiqueta': () => { const W = 420, H = 640; const c = recortar(papel(W, H, { semilla: 111, base: 0.93 }), [[110, 18], [W - 110, 18], [W - 18, 120], [W - 18, H - 18], [18, H - 18], [18, 120]]);
    const k = c.getContext('2d'); k.save(); k.globalCompositeOperation = 'destination-out'; k.beginPath(); k.arc(W / 2, 100, 20, 0, Math.PI * 2); k.fill(); k.restore();
    k.strokeStyle = 'rgba(0,0,0,0.25)'; k.lineWidth = 3; k.beginPath(); k.arc(W / 2, 100, 27, 0, Math.PI * 2); k.stroke(); return c; },
  'marcapaginas': () => { const W = 220, H = 760; return recortar(papel(W, H, { semilla: 121 }), [[18, 18], [W - 18, 18], [W - 18, H - 18], [W / 2, H - 90], [18, H - 18]]); },
  'cinta-lisa': () => cinta(131, () => {}),
  'cinta-rayas': () => cinta(141, (ctx, W, H) => { ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = -H; x < W + H; x += 34) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 16, 0); ctx.lineTo(x + 16 - H, H); ctx.lineTo(x - H, H); ctx.fill(); } }),
  'cinta-puntos': () => cinta(151, (ctx, W, H) => { ctx.fillStyle = 'rgba(0,0,0,0.16)'; for (let y = 22, f = 0; y < H; y += 26, f++) for (let x = 20 + (f % 2) * 14; x < W; x += 28) { ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill(); } }),
  'cinta-cuadros': () => cinta(161, (ctx, W, H) => { ctx.fillStyle = 'rgba(0,0,0,0.09)'; for (let x = 0; x < W; x += 36) ctx.fillRect(x, 0, 18, H); for (let y = 0; y < H; y += 36) ctx.fillRect(0, y, W, 18); }),
  'destellos': () => doodle(420, 420, (ctx) => { const estrella = (cx, cy, rr, s) => aMano(ctx, [[cx, cy - rr], [cx + rr * 0.16, cy - rr * 0.16], [cx + rr, cy], [cx + rr * 0.16, cy + rr * 0.16], [cx, cy + rr], [cx - rr * 0.16, cy + rr * 0.16], [cx - rr, cy], [cx - rr * 0.16, cy - rr * 0.16], [cx, cy - rr]], { ancho: 5, semilla: s, temblor: 1.4 });
    estrella(170, 190, 120, 1); estrella(320, 110, 52, 2); estrella(318, 300, 36, 3); }),
  'flecha-curva': () => doodle(520, 300, (ctx) => { const pts = curva((t) => [40 + t * 420, 220 - Math.sin(t * Math.PI) * 150 + t * 20]); aMano(ctx, pts, { ancho: 6, semilla: 4 });
    aMano(ctx, [[400, 190], [462, 242], [392, 262]], { ancho: 6, semilla: 5 }); }),
  'rama': () => doodle(320, 560, (ctx) => { aMano(ctx, curva((t) => [160 + Math.sin(t * 3) * 18, 530 - t * 500]), { ancho: 5, semilla: 6 });
    for (let i = 0; i < 6; i++) { const t = 0.15 + i * 0.14, y = 530 - t * 500, x = 160 + Math.sin(t * 3) * 18, lado = i % 2 ? 1 : -1;
      aMano(ctx, curva((u) => [x + lado * u * 95, y - u * 60 - Math.sin(u * Math.PI) * 26], 30), { ancho: 4, semilla: 10 + i });
      aMano(ctx, curva((u) => [x + lado * u * 95, y - u * 60 + Math.sin(u * Math.PI) * 18], 30), { ancho: 4, semilla: 20 + i }); } }),
  'lazo': () => doodle(460, 360, (ctx) => { const cx = 230, cy = 150; aMano(ctx, curva((t) => { const a = t * Math.PI * 2; return [cx - 90 - Math.cos(a) * 80, cy - Math.sin(a) * 55 + Math.sin(a * 2) * 10]; }), { ancho: 5, semilla: 7 });
    aMano(ctx, curva((t) => { const a = t * Math.PI * 2; return [cx + 90 + Math.cos(a) * 80, cy - Math.sin(a) * 55 + Math.sin(a * 2) * 10]; }), { ancho: 5, semilla: 8 });
    aMano(ctx, curva((t) => [cx - 10 - t * 70, cy + 10 + t * 180 + Math.sin(t * 5) * 8], 40), { ancho: 5, semilla: 9 }); aMano(ctx, curva((t) => [cx + 10 + t * 70, cy + 10 + t * 180 - Math.sin(t * 5) * 8], 40), { ancho: 5, semilla: 10 });
    ctx.beginPath(); ctx.fillStyle = '#141414'; ctx.ellipse(cx, cy, 18, 22, 0, 0, Math.PI * 2); ctx.fill(); }),
  'costura': () => doodle(640, 120, (ctx) => { ctx.setLineDash([26, 16]); aMano(ctx, curva((t) => [24 + t * 592, 60 + Math.sin(t * 9) * 3], 60), { ancho: 5, semilla: 11, temblor: 0.8, pasadas: 1 }); ctx.setLineDash([]); }),
  'corazon-a-mano': () => doodle(400, 380, (ctx) => { aMano(ctx, curva((t) => { const a = t * Math.PI * 2 * 1.06; const x = 16 * Math.pow(Math.sin(a), 3); const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); return [200 + x * 10.5, 180 - y * 10.5]; }, 140), { ancho: 6, semilla: 12, temblor: 2.6 }); }),
  'estrella-a-mano': () => doodle(400, 400, (ctx) => { const pts = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? 72 : 170; pts.push([200 + Math.cos(a) * rr, 212 + Math.sin(a) * rr]); } aMano(ctx, pts, { ancho: 6, semilla: 13, temblor: 3 }); }),
  'circulo-a-mano': () => doodle(520, 380, (ctx) => { aMano(ctx, curva((t) => { const a = -0.3 + t * Math.PI * 2.15; return [260 + Math.cos(a) * (220 - t * 14), 190 + Math.sin(a) * (150 - t * 10)]; }, 160), { ancho: 6, semilla: 14, temblor: 2 }); }),
};

/** Cinta washi: tira translúcida con las puntas rasgadas en zigzag y su dibujo. */
function cinta(semilla, dibujo) {
  const W = 620, H = 130; const p = papel(W, H, { semilla, base: 0.88, fibras: 0.6 }); dibujo(p.getContext('2d'), W, H);
  const r = rnd(semilla + 1); const zig = (x0, lado) => Array.from({ length: 9 }, (_, i) => [x0 + lado * (i % 2 ? 10 + r() * 6 : r() * 4), 6 + (i * (H - 12)) / 8]);
  const c = recortar(p, [...zig(14, 1), ...zig(W - 14, -1).reverse()], { borde: 0.03, sombra: false });
  const k = c.getContext('2d'); const final = lienzo(W, H); const f = final.getContext('2d'); f.globalAlpha = 0.86; f.drawImage(c, 0, 0); return final;
}

function doodle(w, h, dibujo) { const c = lienzo(w, h); dibujo(c.getContext('2d')); return c; }

/** Un patrón repetido sobre una cinta: una figura en cada lugar de una rejilla escalonada. */
const patron = (paso, figura) => (ctx, W, H) => { ctx.fillStyle = 'rgba(0,0,0,0.15)'; for (let y = 24, f = 0; y < H; y += paso, f++) for (let x = 22 + (f % 2) * (paso / 2); x < W; x += paso) figura(ctx, x, y); };
const corazonito = (ctx, x, y, r = 10) => { ctx.beginPath(); ctx.moveTo(x, y + r * 0.9); ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.4); ctx.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); ctx.fill(); };
const estrellita = (ctx, x, y, r = 11) => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };

/** El segundo pack (T343c): "Papelería", para la tienda en la nube. */
const PAPELERIA = {
  'papel-periodico': () => { const W = 620, H = 760; const p = papel(W, H, { semilla: 201, base: 0.9 }); const ctx = p.getContext('2d'); const r = rnd(202);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(40, 44, W - 80, 26); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(40, 84, W - 80, 4);
    for (let col = 0; col < 3; col++) { const x0 = 40 + col * ((W - 80) / 3) + 6, ancho = (W - 80) / 3 - 18; for (let y = 108; y < H - 50; y += 15) { if (r() < 0.07) continue; ctx.fillStyle = 'rgba(0,0,0,' + (0.18 + r() * 0.08) + ')'; ctx.fillRect(x0, y, ancho * (y % 120 < 15 ? 0.6 : 0.82 + r() * 0.18), 6); } }
    return recortar(p, rasgado(W, H, 203, 10)); },
  'papel-perforado': () => { const W = 600, H = 780; const p = papel(W, H, { semilla: 211 }); const ctx = p.getContext('2d'); lineas(ctx, W, H, { arriba: 110, paso: 34, desde: 70 });
    const c = recortar(p, [...orilla(rnd(212), ruido(213), 18, H - 18, 18, 18, 5, 160), [W - 18, 18], [W - 18, H - 18]]); const k = c.getContext('2d'); k.globalCompositeOperation = 'destination-out';
    for (let y = 60; y < H - 40; y += 66) { k.beginPath(); k.arc(44, y, 11, 0, Math.PI * 2); k.fill(); } k.globalCompositeOperation = 'source-over'; return c; },
  'papel-con-clip': () => { const W = 560, H = 700; const c = recortar(papel(W, H, { semilla: 221 }), rect(18, W, H)); const ctx = c.getContext('2d'); ctx.strokeStyle = '#5a5a5a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    const clip = new Path2D('M410 140 V40 a26 26 0 0 1 52 0 V170 a40 40 0 0 1 -80 0 V60'); ctx.save(); ctx.translate(0, -8); ctx.stroke(clip); ctx.restore(); return c; },
  'papel-kraft': () => recortar(papel(620, 720, { semilla: 231, fibras: 3.2, base: 0.8 }), rasgado(620, 720, 232, 11)),
  'sobre': () => { const W = 700, H = 460; const c = recortar(papel(W, H, { semilla: 241 }), rect(18, W, H)); const ctx = c.getContext('2d'); ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(20, 22); ctx.lineTo(W / 2, H * 0.58); ctx.lineTo(W - 20, 22); ctx.stroke(); ctx.beginPath(); ctx.moveTo(20, H - 22); ctx.lineTo(W * 0.4, H * 0.5); ctx.moveTo(W - 20, H - 22); ctx.lineTo(W * 0.6, H * 0.5); ctx.stroke(); return c; },
  'sello-postal': () => { const W = 420, H = 500, m = 22, d = 16; const pts = []; const lado = (x0, y0, x1, y1) => { const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / d); for (let i = 0; i < n; i++) { const t = i / n, t2 = (i + 0.5) / n; const nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny); pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t], [x0 + (x1 - x0) * t2 + (nx / l) * 7, y0 + (y1 - y0) * t2 + (ny / l) * 7]); } };
    lado(m, m, W - m, m); lado(W - m, m, W - m, H - m); lado(W - m, H - m, m, H - m); lado(m, H - m, m, m); const c = recortar(papel(W, H, { semilla: 251 }), pts); const ctx = c.getContext('2d'); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3; ctx.strokeRect(58, 58, W - 116, H - 116);
    aMano(ctx, [[96, 360], [160, 250], [205, 305], [270, 200], [326, 360]], { ancho: 4, semilla: 252, temblor: 1.4 }); aMano(ctx, curva((t) => [300 + Math.cos(t * Math.PI * 2) * 28, 140 + Math.sin(t * Math.PI * 2) * 28], 40), { ancho: 4, semilla: 253 }); return c; },
  'esquina-de-foto': () => { const W = 300, H = 300; return recortar(papel(W, H, { semilla: 261, base: 0.86 }), [[18, 18], [W - 18, 18], [18, H - 18]], { borde: 0.1 }); },
  'cinta-corazones': () => cinta(271, patron(40, (ctx, x, y) => corazonito(ctx, x, y))),
  'cinta-estrellas': () => cinta(281, patron(42, (ctx, x, y) => estrellita(ctx, x, y))),
  'cinta-zigzag': () => cinta(291, (ctx, W, H) => { ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 6; for (const y0 of [36, 82]) { ctx.beginPath(); for (let x = 0; x <= W; x += 24) ctx.lineTo(x, y0 + ((x / 24) % 2 ? 12 : -12)); ctx.stroke(); } }),
  'marco-a-mano': () => doodle(560, 420, (ctx) => { aMano(ctx, [[30, 34], [530, 26], [536, 392], [26, 398], [30, 34], [60, 30]], { ancho: 5, semilla: 301, temblor: 3 }); }),
  'burbuja': () => doodle(520, 420, (ctx) => { aMano(ctx, [...curva((t) => { const a = Math.PI * 0.62 + t * Math.PI * 1.86; return [260 + Math.cos(a) * 230, 170 + Math.sin(a) * 140]; }, 120), [150, 300], [110, 400], [212, 312]], { ancho: 5, semilla: 311, temblor: 2 }); }),
  'nube-de-pensamiento': () => doodle(540, 440, (ctx) => { const bultos = [[150, 150, 80], [260, 110, 95], [380, 150, 85], [400, 250, 70], [270, 280, 90], [140, 250, 75]]; for (const [i, [x, y, r]] of bultos.entries()) aMano(ctx, curva((t) => [x + Math.cos(t * Math.PI * 2) * r, y + Math.sin(t * Math.PI * 2) * r * 0.8], 60), { ancho: 5, semilla: 321 + i, temblor: 1.6 });
    ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.ellipse(270, 195, 190, 110, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    for (const [x, y, r] of [[120, 360, 24], [80, 405, 13]]) aMano(ctx, curva((t) => [x + Math.cos(t * Math.PI * 2) * r, y + Math.sin(t * Math.PI * 2) * r], 30), { ancho: 4, semilla: 330 + r }); }),
  'flor': () => doodle(420, 520, (ctx) => { for (let i = 0; i < 5; i++) { const a = (i * Math.PI * 2) / 5 - Math.PI / 2; const c = [210 + Math.cos(a) * 92, 190 + Math.sin(a) * 92];
      // Cada pétalo: un óvalo que nace afuera del botón, a lo largo de su dirección.
      aMano(ctx, curva((t) => { const b = t * Math.PI * 2; const u = Math.cos(b) * 62, v = Math.sin(b) * 34; return [c[0] + u * Math.cos(a) - v * Math.sin(a), c[1] + u * Math.sin(a) + v * Math.cos(a)]; }, 50), { ancho: 5, semilla: 341 + i, temblor: 1.6 }); }
    aMano(ctx, curva((t) => [210 + Math.cos(t * Math.PI * 2) * 26, 190 + Math.sin(t * Math.PI * 2) * 26], 30), { ancho: 5, semilla: 347 }); aMano(ctx, curva((t) => [210 + Math.sin(t * 2) * 10, 216 + t * 290]), { ancho: 5, semilla: 348 }); }),
  'hoja': () => doodle(320, 520, (ctx) => { aMano(ctx, [...curva((t) => [160 + Math.sin(t * Math.PI) * 120, 40 + t * 400], 50), ...curva((t) => [160 - Math.sin((1 - t) * Math.PI) * 120, 440 - t * 400], 50)], { ancho: 5, semilla: 351, temblor: 1.8 });
    aMano(ctx, curva((t) => [160, 60 + t * 440]), { ancho: 4, semilla: 352 }); for (let i = 1; i < 5; i++) { const y = 80 + i * 70; aMano(ctx, [[160, y + 30], [160 + 70, y]], { ancho: 3, semilla: 353 + i }); aMano(ctx, [[160, y + 30], [160 - 70, y]], { ancho: 3, semilla: 363 + i }); } }),
  'subrayado': () => doodle(640, 120, (ctx) => { aMano(ctx, curva((t) => [24 + t * 592, 60 + Math.sin(t * Math.PI * 7) * 18], 140), { ancho: 6, semilla: 371, temblor: 1.2 }); }),
  'espiral': () => doodle(440, 440, (ctx) => { aMano(ctx, curva((t) => { const a = t * Math.PI * 7; const rr = 8 + t * 190; return [220 + Math.cos(a) * rr, 220 + Math.sin(a) * rr]; }, 220), { ancho: 5, semilla: 381, temblor: 1.5 }); }),
};

/** Pasa a gris (por si algo quedó con color) y deja la pieza a lo más de 'max' px de lado. */
function final(c, max) {
  const k = Math.min(1, max / Math.max(c.width, c.height)); const out = lienzo(Math.round(c.width * k), Math.round(c.height * k)); const ctx = out.getContext('2d');
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(c, 0, 0, out.width, out.height);
  const img = ctx.getImageData(0, 0, out.width, out.height); for (let i = 0; i < img.data.length; i += 4) { const g = Math.round(img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11); img.data[i] = img.data[i + 1] = img.data[i + 2] = g; }
  ctx.putImageData(img, 0, 0); return out;
}

window.generar = (pack) => Object.fromEntries(Object.entries(pack === 'papeleria' ? PAPELERIA : PIEZAS).map(([nombre, f]) => { const c = final(f(), nombre.startsWith('cinta') || nombre === 'costura' || nombre === 'tira-rasgada' || nombre === 'subrayado' ? 640 : 560); return [nombre, { png: c.toDataURL('image/png'), w: c.width, h: c.height }]; }));

/** Hoja de revisión: cada pieza en gris y recoloreada como lo hará la app (multiplicar o trazo). */
window.hoja = async (piezas, modos) => {
  const colores = [null, '#7A1E3A', '#2E7D32', '#F2C14E']; const lado = 190, pad = 16; const nombres = Object.keys(piezas);
  const c = lienzo(pad + (lado + pad) * colores.length + 220, pad + (lado + pad) * nombres.length); const ctx = c.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = '15px -apple-system, sans-serif'; ctx.fillStyle = '#333';
  for (const [fila, nombre] of nombres.entries()) {
    const img = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = piezas[nombre].png; });
    const k = Math.min((lado - 10) / img.width, (lado - 10) / img.height); const [w, h] = [img.width * k, img.height * k]; const y = pad + fila * (lado + pad);
    ctx.fillStyle = '#333'; ctx.fillText(nombre, 10, y + lado / 2);
    for (const [col, color] of colores.entries()) {
      const x = 220 + pad + col * (lado + pad); ctx.fillStyle = '#ececec'; ctx.fillRect(x, y, lado, lado);
      const t = lienzo(w, h); const tc = t.getContext('2d');
      if (color) { tc.fillStyle = color; tc.fillRect(0, 0, w, h); tc.globalCompositeOperation = 'destination-in'; tc.drawImage(img, 0, 0, w, h); if (modos[nombre] === 'textura') { tc.globalCompositeOperation = 'multiply'; tc.drawImage(img, 0, 0, w, h); } }
      else tc.drawImage(img, 0, 0, w, h);
      ctx.drawImage(t, x + (lado - w) / 2, y + (lado - h) / 2);
    }
  }
  return c.toDataURL('image/png');
};
`;

const { chromium } = await import(process.env.PLAYWRIGHT_CORE ? `file://${process.env.PLAYWRIGHT_CORE}` : 'playwright-core');
const navegador = await chromium.launch({ channel: 'chrome', headless: true });
const pagina = await navegador.newPage();
await pagina.setContent(`<!doctype html><html><body><script>${GENERADOR}</script></body></html>`);
const piezas = await pagina.evaluate((p) => window.generar(p), pack);
mkdirSync(salida, { recursive: true });
for (const [nombre, { png, w, h }] of Object.entries(piezas)) {
  writeFileSync(join(salida, `${nombre}.png`), comprimir(Buffer.from(png.split(',')[1], 'base64')));
  console.log(`${nombre}: ${w} × ${h}, proporción ${(h / w).toFixed(3)}`);
}
if (hoja) {
  const modos = Object.fromEntries(Object.keys(piezas).map((n) => [n, /^(destellos|flecha|rama|lazo|costura|.*-a-mano|burbuja|nube-de-pensamiento|flor|hoja|subrayado|espiral)$/.test(n) ? 'trazo' : 'textura']));
  const png = await pagina.evaluate(([p, m]) => window.hoja(p, m), [piezas, modos]);
  writeFileSync(hoja, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`hoja de revisión: ${hoja}`);
}
await navegador.close();
