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

const curva = (f, n = 80) => Array.from({ length: n + 1 }, (_, i) => f(i / n));

/** Catmull-Rom: una curva suave que pasa por los puntos, como la mano que dibuja sin levantar la pluma. */
function suave(pts, { cerrado = false, pasos = 20 } = {}) {
  const P = cerrado ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]]; const out = [];
  for (let i = 1; i < P.length - 2; i++) for (let s = 0; s < pasos; s++) { const t = s / pasos, t2 = t * t, t3 = t2 * t;
    out.push([0, 1].map((k) => 0.5 * (2 * P[i][k] + (P[i + 1][k] - P[i - 1][k]) * t + (2 * P[i - 1][k] - 5 * P[i][k] + 4 * P[i + 1][k] - P[i + 2][k]) * t2 + (3 * P[i][k] - P[i - 1][k] - 3 * P[i + 1][k] + P[i + 2][k]) * t3))); }
  out.push(cerrado ? out[0] : pts[pts.length - 1]); return out;
}
const bezier = (a, b, c, d, n = 40) => curva((t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]); }, n);
const cuadratica = (a, c, b, n = 24) => curva((t) => { const u = 1 - t; return [0, 1].map((k) => u * u * a[k] + 2 * u * t * c[k] + t * t * b[k]); }, n);

/** Polígono con las esquinas apenas redondeadas: la pluma no hace picos perfectos. */
function esquinas(pts, radio, cerrado = true) {
  const N = pts.length; const out = [];
  for (let i = 0; i < N; i++) { const p = pts[i];
    if (!cerrado && (i === 0 || i === N - 1)) { out.push(p); continue; }
    const a = pts[(i - 1 + N) % N], b = pts[(i + 1) % N]; const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ra = Math.min(radio, la / 2.2), rb = Math.min(radio, lb / 2.2);
    out.push(...cuadratica([p[0] + (a[0] - p[0]) * ra / la, p[1] + (a[1] - p[1]) * ra / la], p, [p[0] + (b[0] - p[0]) * rb / lb, p[1] + (b[1] - p[1]) * rb / lb], 10)); }
  if (cerrado) out.push(out[0]); return out;
}

/**
 * Pluma de punta fina (T369): el camino se remuestrea cada 1.5 px, ondula apenas con ruido suave —no punto por punto,
 * que se ve rasposo— y cambia de grosor como con presión: entra y sale afilado ('entrada' y 'salida' en anchos de
 * trazo) y engorda o adelgaza un poco a lo largo. Tinta opaca de una sola pasada.
 */
function pluma(ctx, camino, { ancho = 7, semilla = 1, temblor = 1.4, entrada = 2, salida = 4, punta = 0.22, presion = 0.14 } = {}) {
  const pts = [camino[0]], dist = [0]; let L = 0, resto = 0;
  for (let i = 1; i < camino.length; i++) { const [x0, y0] = camino[i - 1], [x1, y1] = camino[i]; const l = Math.hypot(x1 - x0, y1 - y0); if (!l) continue;
    let d = 1.5 - resto; while (d <= l) { pts.push([x0 + ((x1 - x0) * d) / l, y0 + ((y1 - y0) * d) / l]); dist.push(L + d); d += 1.5; } resto = l - (d - 1.5); L += l; }
  pts.push(camino[camino.length - 1]); dist.push(L);
  const n = ruido(semilla); const s = (t) => t * t * (3 - 2 * t); const ent = ancho * entrada, sal = ancho * salida;
  const movidos = pts.map(([x, y], i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1;
    const o = (n(dist[i] / 110, 0.37, 2) - 0.5) * 2.4 * temblor; return [x + (nx / l) * o, y + (ny / l) * o]; });
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#141414'; ctx.globalAlpha = 1;
  for (let i = 1; i < movidos.length; i++) { const d = dist[i]; const p = s(Math.min(1, d / ent)) * s(Math.min(1, Math.max(0, L - d) / sal));
    ctx.lineWidth = ancho * (punta + (1 - punta) * p) * (1 + (n(d / 60, 3.7, 2) - 0.5) * 2.4 * presion);
    ctx.beginPath(); ctx.moveTo(movidos[i - 1][0], movidos[i - 1][1]); ctx.lineTo(movidos[i][0], movidos[i][1]); ctx.stroke(); }
}
const punto = (ctx, x, y, r) => { ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
const ovalo = (cx, cy, rx, ry, { desde = 0, vueltas = 1, giro = 0, n = 90 } = {}) => curva((t) => { const a = desde + t * vueltas * Math.PI * 2; const x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * Math.cos(giro) - y * Math.sin(giro), cy + x * Math.sin(giro) + y * Math.cos(giro)]; }, n);

/** Una hoja de ramita: almendra desde 'base' hacia 'angulo', con su vena al centro. */
function hojita(ctx, base, angulo, largo, ancho, semilla, { vena = true, grosor = 6 } = {}) {
  const w = ancho / 2; const lugar = ([u, v]) => [base[0] + u * Math.cos(angulo) - v * Math.sin(angulo), base[1] + u * Math.sin(angulo) + v * Math.cos(angulo)];
  const contorno = [...bezier([0, 0], [largo * 0.25, -w * 1.25], [largo * 0.72, -w * 1.05], [largo, 0]), ...bezier([largo, 0], [largo * 0.7, w * 1.1], [largo * 0.22, w * 1.2], [0, 0]), ...bezier([0, 0], [largo * 0.25, -w * 1.25], [largo * 0.72, -w * 1.05], [largo, 0], 40).slice(0, 4)];
  pluma(ctx, contorno.map(lugar), { ancho: grosor, semilla, temblor: 0.7, entrada: 1.2, salida: 1.5, punta: 0.35 });
  if (vena) pluma(ctx, cuadratica([largo * 0.06, 0], [largo * 0.4, -w * 0.12], [largo * 0.68, -w * 0.05]).map(lugar), { ancho: grosor * 0.55, semilla: semilla + 50, temblor: 0.4, entrada: 1, salida: 3 });
}

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
  // Doodles (T369): pluma con presión y curvas suaves, a partir de los doodles de bullet journal más comunes.
  'destellos': () => doodle(420, 420, (ctx) => { const brillo = (cx, cy, r, ancho, s) => { const rayo = (i) => { const a = -Math.PI / 2 + (i * Math.PI) / 2; const rr = i % 2 ? r * 0.82 : r * 1.12; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; };
      const p = []; for (let i = 0; i < 4; i++) { const m = -Math.PI / 4 + (i * Math.PI) / 2; p.push(...cuadratica(rayo(i), [cx + Math.cos(m) * r * 0.13, cy + Math.sin(m) * r * 0.13], rayo(i + 1))); }
      pluma(ctx, [...p, ...p.slice(1, 5)], { ancho, semilla: s, temblor: 0.6, entrada: 1, salida: 1.5, punta: 0.45 }); };
    brillo(178, 236, 142, 9, 1); brillo(330, 98, 56, 7, 2); brillo(340, 306, 30, 6, 3); punto(ctx, 76, 84, 8); pluma(ctx, ovalo(84, 352, 15, 15, { n: 40, vueltas: 1.08 }), { ancho: 5, semilla: 4, temblor: 0.3, entrada: 1, salida: 1 }); }),
  'flecha-curva': () => doodle(520, 300, (ctx) => { pluma(ctx, suave([[32, 254], [112, 232], [188, 186], [236, 124], [238, 76], [206, 60], [184, 92], [214, 140], [292, 162], [382, 142], [454, 100]]), { ancho: 8, semilla: 5, entrada: 6, salida: 1 });
    const [tx, ty] = [454, 100], a = Math.atan2(100 - 142, 454 - 382) + Math.PI; const ala = (g) => [tx + Math.cos(a + g) * 58, ty + Math.sin(a + g) * 58];
    pluma(ctx, esquinas([ala(-0.52), [tx + 3, ty - 1], ala(0.5)], 5, false), { ancho: 8, semilla: 6, temblor: 0.4, entrada: 1.5, salida: 2, punta: 0.3 }); }),
  'rama': () => doodle(320, 560, (ctx) => { const tallo = suave([[150, 548], [162, 440], [154, 320], [168, 200], [178, 100]]); pluma(ctx, tallo, { ancho: 9, semilla: 7, entrada: 1, salida: 30, punta: 0.35 });
    const en = (f) => tallo[Math.round(f * (tallo.length - 1))];
    [[0.16, 1, 118], [0.3, -1, 112], [0.44, 1, 104], [0.58, -1, 94], [0.71, 1, 82], [0.83, -1, 70]].forEach(([f, lado, largo], i) => hojita(ctx, en(f), -Math.PI / 2 + lado * 0.86, largo, largo * 0.4, 8 + i, { grosor: 6 }));
    hojita(ctx, [178, 102], -Math.PI / 2 + 0.08, 68, 30, 20, { grosor: 6 }); }),
  'lazo': () => doodle(460, 360, (ctx) => { const espejo = (pts) => pts.map(([x, y]) => [460 - x, y]);
    const ojo = [[206, 128], [152, 74], [92, 50], [48, 82], [44, 150], [80, 204], [140, 196], [206, 156]]; const pliegue = [[198, 140], [158, 122], [116, 116]];
    const cola = [...suave([[216, 166], [190, 244], [136, 326]]), [164, 310], [176, 338], ...suave([[176, 338], [208, 262], [228, 170]])];
    pluma(ctx, suave(ojo), { ancho: 8, semilla: 9, entrada: 1.5, salida: 1.5 }); pluma(ctx, suave(espejo(ojo)), { ancho: 8, semilla: 10, entrada: 1.5, salida: 1.5 });
    pluma(ctx, suave(pliegue), { ancho: 5, semilla: 11, entrada: 1, salida: 3 }); pluma(ctx, suave(espejo(pliegue)), { ancho: 5, semilla: 12, entrada: 1, salida: 3 });
    pluma(ctx, cola, { ancho: 7, semilla: 13, temblor: 1, entrada: 1, salida: 1, punta: 0.4 }); pluma(ctx, espejo(cola).map(([x, y]) => [x, y - 4]), { ancho: 7, semilla: 14, temblor: 1, entrada: 1, salida: 1, punta: 0.4 });
    pluma(ctx, ovalo(230, 142, 26, 30, { desde: -1.2, vueltas: 1.06 }), { ancho: 8, semilla: 15, temblor: 0.6, entrada: 1, salida: 1.5 }); }),
  'costura': () => doodle(640, 120, (ctx) => { const base = curva((t) => [26 + t * 588, 60 + Math.sin(t * Math.PI * 2.2) * 12], 600); let largo = 0; const marcas = base.map((p, i) => (i ? (largo += Math.hypot(p[0] - base[i - 1][0], p[1] - base[i - 1][1])) : 0));
    for (let s = 0, k = 0; s < largo - 20; s += 50, k++) { const tramo = base.filter((_, i) => marcas[i] >= s && marcas[i] <= s + 30); if (tramo.length > 2) pluma(ctx, tramo, { ancho: 8.5, semilla: 16 + k, temblor: 0.5, entrada: 1, salida: 1.4, punta: 0.35 }); } }),
  'corazon-a-mano': () => doodle(400, 380, (ctx) => { const giro = -0.07; const lugar = ([x, y]) => [200 + x * Math.cos(giro) - y * Math.sin(giro), 178 + x * Math.sin(giro) + y * Math.cos(giro)];
    pluma(ctx, curva((t) => { const a = 0.05 + t * (Math.PI * 2 + 0.3); return lugar([16 * Math.pow(Math.sin(a), 3) * 10.4, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 10.4]); }, 200), { ancho: 9, semilla: 17, temblor: 1.8, entrada: 1.5, salida: 4 });
    pluma(ctx, curva((t) => { const a = Math.PI * (1.12 + t * 0.36); return lugar([-84 + Math.cos(a) * 44, -66 + Math.sin(a) * 44]); }, 30), { ancho: 6, semilla: 18, temblor: 0.4, entrada: 1, salida: 2 }); }),
  'estrella-a-mano': () => doodle(400, 400, (ctx) => { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 - 0.06 + (i * Math.PI) / 5; const rr = i % 2 ? 74 : 168; pts.push([200 + Math.cos(a) * rr, 220 + Math.sin(a) * rr]); }
    const camino = esquinas(pts, 16); pluma(ctx, [...camino, ...camino.slice(1, 14)], { ancho: 9, semilla: 19, temblor: 1.4, entrada: 1.5, salida: 3 });
    pluma(ctx, [[66, 82], [92, 108]], { ancho: 6, semilla: 20, temblor: 0, entrada: 1, salida: 1.5 }); pluma(ctx, [[108, 46], [120, 80]], { ancho: 6, semilla: 21, temblor: 0, entrada: 1, salida: 1.5 }); pluma(ctx, [[42, 132], [76, 140]], { ancho: 6, semilla: 22, temblor: 0, entrada: 1, salida: 1.5 }); }),
  'circulo-a-mano': () => doodle(520, 380, (ctx) => { pluma(ctx, curva((t) => { const a = -0.4 + t * (Math.PI * 2 + 0.75); const rx = 228 - t * 18, ry = 158 - t * 12, g = -0.05; const x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [262 + x * Math.cos(g) - y * Math.sin(g), 192 + x * Math.sin(g) + y * Math.cos(g)]; }, 220), { ancho: 8, semilla: 23, temblor: 2.6, entrada: 2, salida: 7 }); }),
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
    pluma(ctx, esquinas([[96, 360], [160, 250], [205, 305], [270, 200], [326, 360]], 8, false), { ancho: 5, semilla: 252, temblor: 0.6, entrada: 1.5, salida: 1.5, punta: 0.35 }); pluma(ctx, ovalo(300, 140, 28, 28, { desde: -1, vueltas: 1.06, n: 50 }), { ancho: 5, semilla: 253, temblor: 0.4, entrada: 1, salida: 1.5 }); return c; },
  'esquina-de-foto': () => { const W = 300, H = 300; return recortar(papel(W, H, { semilla: 261, base: 0.86 }), [[18, 18], [W - 18, 18], [18, H - 18]], { borde: 0.1 }); },
  'cinta-corazones': () => cinta(271, patron(40, (ctx, x, y) => corazonito(ctx, x, y))),
  'cinta-estrellas': () => cinta(281, patron(42, (ctx, x, y) => estrellita(ctx, x, y))),
  'cinta-zigzag': () => cinta(291, (ctx, W, H) => { ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 6; for (const y0 of [36, 82]) { ctx.beginPath(); for (let x = 0; x <= W; x += 24) ctx.lineTo(x, y0 + ((x / 24) % 2 ? 12 : -12)); ctx.stroke(); } }),
  'marco-a-mano': () => doodle(560, 420, (ctx) => { const lado = (a, b, s, ancho) => pluma(ctx, suave([a, [(a[0] + b[0]) / 2 + (s % 2 ? 2 : -3), (a[1] + b[1]) / 2 + (s % 2 ? -3 : 2)], b]), { ancho, semilla: s, temblor: 1.2, entrada: 1.2, salida: 2.5, punta: 0.35 });
    lado([18, 38], [540, 30], 301, 7); lado([530, 16], [536, 402], 302, 7); lado([546, 390], [16, 396], 303, 7); lado([32, 408], [28, 20], 304, 7);
    lado([56, 62], [506, 56], 305, 3.6); lado([500, 50], [504, 366], 306, 3.6); lado([510, 360], [52, 364], 307, 3.6); lado([58, 370], [56, 54], 308, 3.6); }),
  'burbuja': () => doodle(520, 420, (ctx) => { const cx = 262, cy = 176, a = 226, b = 148, e = 2 / 2.7; const borde = (g) => { const c = Math.cos(g), s = Math.sin(g); return [cx + a * Math.sign(c) * Math.pow(Math.abs(c), e), cy + b * Math.sign(s) * Math.pow(Math.abs(s), e)]; };
    const g0 = (130 * Math.PI) / 180, g1 = ((360 + 108) * Math.PI) / 180; const cuerpo = curva((t) => borde(g0 + t * (g1 - g0)), 240); const ini = cuerpo[0], fin = cuerpo[cuerpo.length - 1];
    pluma(ctx, [...cuerpo, ...cuadratica(fin, [150, 372], [88, 400]), ...cuadratica([88, 400], [112, 350], ini), ...cuerpo.slice(1, 10)], { ancho: 8, semilla: 311, temblor: 1.8, entrada: 1.5, salida: 2.5 }); }),
  'nube-de-pensamiento': () => doodle(540, 440, (ctx) => { const cx = 282, cy = 188, rx = 186, ry = 122; const angulos = [0, 36, 78, 116, 152, 196, 236, 276, 316, 360].map((g) => ((g - 8) * Math.PI) / 180);
    const en = (g) => [cx + Math.cos(g) * rx, cy + Math.sin(g) * ry]; const contorno = [];
    for (let i = 0; i < angulos.length - 1; i++) { const p = en(angulos[i]), q = en(angulos[i + 1]); const cuerda = Math.hypot(q[0] - p[0], q[1] - p[1]); const m = [(p[0] + q[0]) / 2 - cx, (p[1] + q[1]) / 2 - cy]; const l = Math.hypot(m[0], m[1]); const h = cuerda * 0.5;
      contorno.push(...bezier(p, [p[0] + (m[0] / l) * h, p[1] + (m[1] / l) * h], [q[0] + (m[0] / l) * h, q[1] + (m[1] / l) * h], q, 36)); }
    pluma(ctx, [...contorno, ...contorno.slice(1, 8)], { ancho: 8, semilla: 321, temblor: 1.4, entrada: 1.5, salida: 2.5 });
    pluma(ctx, ovalo(112, 384, 22, 19, { desde: -1, vueltas: 1.06, n: 50 }), { ancho: 6.5, semilla: 322, temblor: 0.5, entrada: 1, salida: 1.5 }); pluma(ctx, ovalo(66, 420, 12, 11, { desde: 0.5, vueltas: 1.08, n: 36 }), { ancho: 5.5, semilla: 323, temblor: 0.3, entrada: 1, salida: 1 }); }),
  'flor': () => doodle(420, 520, (ctx) => { const cx = 210, cy = 172, r0 = 30;
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * Math.PI * 2) / 5 + [0.04, -0.05, 0.03, -0.03, 0.05][i]; const L = [124, 116, 112, 114, 120][i], w = 44;
      const lugar = ([u, v]) => [cx + u * Math.cos(a) - v * Math.sin(a), cy + u * Math.sin(a) + v * Math.cos(a)];
      const petalo = [...bezier([r0, -5], [r0 + (L - r0) * 0.4, -w * 1.05], [L + 2, -w * 0.62], [L, 0]), ...bezier([L, 0], [L - 2, w * 0.62], [r0 + (L - r0) * 0.4, w * 1.05], [r0, 5])];
      pluma(ctx, petalo.map(lugar), { ancho: 7, semilla: 341 + i, temblor: 0.8, entrada: 1.5, salida: 1.5, punta: 0.4 });
      pluma(ctx, [lugar([r0 + 10, 0]), lugar([r0 + (L - r0) * 0.42, 0])], { ancho: 4, semilla: 351 + i, temblor: 0, entrada: 1, salida: 2.5 }); }
    punto(ctx, cx, cy, 22); const tallo = suave([[cx, cy + 26], [206, 300], [214, 400], [204, 506]]); pluma(ctx, tallo, { ancho: 7, semilla: 361, entrada: 1, salida: 14, punta: 0.3 });
    hojita(ctx, tallo[Math.round(tallo.length * 0.55)], -0.55, 96, 38, 362); hojita(ctx, tallo[Math.round(tallo.length * 0.72)], Math.PI + 0.6, 86, 34, 363); }),
  'hoja': () => doodle(320, 520, (ctx) => { const contorno = [...bezier([160, 420], [38, 364], [62, 116], [172, 34], 70), ...bezier([172, 34], [268, 132], [286, 352], [160, 420], 70)];
    pluma(ctx, [...contorno, ...contorno.slice(1, 6)], { ancho: 8, semilla: 371, temblor: 1, entrada: 1.5, salida: 1.5, punta: 0.4 });
    pluma(ctx, suave([[160, 418], [156, 466], [144, 506]]), { ancho: 8, semilla: 372, entrada: 1, salida: 4 }); pluma(ctx, suave([[160, 418], [163, 300], [168, 170], [171, 84]]), { ancho: 5.5, semilla: 373, temblor: 0.6, entrada: 1, salida: 16 });
    [[372, 0.75], [312, 1], [252, 0.98], [192, 0.8], [134, 0.55]].forEach(([y, s], k) => { for (const lado of [-1, 1]) { const yy = y + (lado > 0 ? 22 : 0); const x = 160 + ((420 - yy) / 336) * 11;
      pluma(ctx, bezier([x, yy], [x + lado * 30 * s, yy - 8 * s], [x + lado * 58 * s, yy - 30 * s], [x + lado * 74 * s, yy - 66 * s], 30), { ancho: 4, semilla: 374 + k * 2 + (lado > 0 ? 1 : 0), temblor: 0.4, entrada: 1, salida: 4, punta: 0.15 }); } }); }),
  'subrayado': () => doodle(640, 120, (ctx) => { pluma(ctx, suave([[24, 76], [170, 70], [340, 64], [500, 58], [618, 40]]), { ancho: 12, semilla: 381, temblor: 1.2, entrada: 5, salida: 9, punta: 0.12, presion: 0.2 });
    pluma(ctx, suave([[96, 100], [290, 93], [500, 85]]), { ancho: 6, semilla: 382, temblor: 0.8, entrada: 4, salida: 8, punta: 0.12 }); }),
  'espiral': () => doodle(440, 440, (ctx) => { pluma(ctx, curva((t) => { const a = 0.4 + t * Math.PI * 2 * 3.2; const rr = 6 + Math.pow(t, 0.92) * 194; return [222 + Math.cos(a) * rr, 222 + Math.sin(a) * rr * 0.94]; }, 320), { ancho: 7.5, semilla: 391, temblor: 1.6, entrada: 1, salida: 8, presion: 0.18 }); }),
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
