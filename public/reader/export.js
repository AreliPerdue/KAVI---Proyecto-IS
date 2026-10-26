/**
 * Exportar un recorte como imagen (spec 13h, RF-CC25; T342): la página del lienzo dibujada en un `<canvas>` con lo
 * mismo que se ve —el fondo y cada elemento en su orden de capa, con su lugar, giro, opacidad, borde y sombra— y
 * guardada como PNG. Se dibuja a mano (y no copiando la página) para que salga igual en la web y en el teléfono.
 */
import { fuenteDeSticker } from './annotations.js';
import { CARA, CARITAS, fuenteDeAsset, MARCO_POLAROID, PELICULA, SIMBOLOS, SIN_FOTO } from './modules.js';
import { familiaDeLienzo, letrasListas } from './canvas-fonts.js';

/** Las formas en una caja de 100 × 100, como trazos (las mismas que pinta `annotations.js`). */
const TRAZOS = {
  rect: 'M0 0H100V100H0Z',
  ellipse: 'M50 0A50 50 0 1 1 50 100A50 50 0 1 1 50 0Z',
  heart: 'M50 94C22 74 0 56 0 31 0 14 13 3 28 3c10 0 18 6 22 14C54 9 62 3 72 3c15 0 28 11 28 28 0 25-22 43-50 63z',
  star: 'M50 0L61.8 35.4H99L69 57.3 80.3 92.7 50 70.8 19.7 92.7 31 57.3 1 35.4H38.2Z',
  blob: 'M53 2c21 0 42 13 45 35 4 23-9 47-29 57-21 10-46 4-59-14C-3 62 0 36 12 20 22 7 37 2 53 2z',
};
const FORMA_GRIS = '#BDBDBD';
const LETRA = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
const esColor = (c) => /^#[0-9a-fA-F]{6}$/.test(c ?? '');
const SERIFA = 'Georgia, "Times New Roman", serif';
const TIPOS = ['shape', 'textbox', 'image', 'sticker', 'polaroid', 'quote', 'rating', 'book', 'asset', 'stat', 'swatch', 'checklist', 'mood', 'song', 'date', 'timeline'];
const claroSobre = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 140;
};

/** Una imagen recortada para llenar su hueco (`cover`), o el gris de "aún sin foto". */
function llenar(ctx, img, x, y, w, h) {
  if (!img) {
    ctx.fillStyle = SIN_FOTO;
    ctx.fillRect(x, y, w, h);
    return;
  }
  const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const [sw, sh] = [w / k, h / k];
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

function sombra(ctx, u, fuerza = 0.12) {
  ctx.shadowColor = `rgba(0,0,0,${fuerza})`;
  ctx.shadowOffsetY = 0.4 * u;
  ctx.shadowBlur = 1.5 * u;
}

/** Texto en renglones dentro de un ancho, centrado o a la izquierda; devuelve hasta dónde llegó. */
function parrafo(ctx, texto, x, y, ancho, alto, linea, centrado = false) {
  let fin = y;
  renglones(ctx, texto, ancho).forEach((r, n) => {
    const ry = y + n * linea;
    if (ry + linea > y + alto + 0.5) return;
    ctx.fillText(r, centrado ? x + ancho / 2 : x, ry);
    fin = ry + linea;
  });
  return fin;
}

/** Medidas de cada polaroid, en centésimas del ancho (las mismas que `modules.js`). */
const VARIANTES = {
  classic: { margen: 6, proporcion: 1, pie: 7 },
  mini: { margen: 6, proporcion: 1.33, pie: 7 },
  caption: { margen: 6, proporcion: 1, pie: 9 },
  tape: { margen: 6, proporcion: 1, pie: 7 },
  stack: { margen: 6, proporcion: 1, pie: 7 },
  double: { margen: 3.5, proporcion: 1, pie: 4.2 },
};

/** Los módulos del lienzo (T343), dibujados en su caja de `w` × `h` con el origen en su esquina. */
const MODULOS_DE_EXPORTACION = {
  polaroid(ctx, c, w, h, imgs) {
    const u = w / 100;
    const variante = c.variant ?? 'classic';
    if (variante === 'film') {
      ctx.fillStyle = esColor(c.color) ? c.color : PELICULA;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let y = 3 * u; y < h; y += 10 * u) for (const x of [4.5 * u, w - 9.5 * u]) ctx.fillRect(x, y, 5 * u, Math.min(4 * u, h - y));
      const ancho = w - 28 * u;
      const alto = ancho * 0.78;
      const hueco = (h - 14 * u - 3 * alto) / 2;
      for (let i = 0; i < 3; i++) llenar(ctx, imgs[i], 14 * u, 7 * u + i * (alto + hueco), ancho, alto);
      return;
    }
    const v = VARIANTES[variante] ?? VARIANTES.classic;
    const papel = esColor(c.color) ? c.color : MARCO_POLAROID;
    if (variante === 'stack') {
      for (const giro of [-6, 4]) {
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate((giro * Math.PI) / 180);
        sombra(ctx, u, 0.18);
        ctx.fillStyle = papel;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }
    ctx.save();
    sombra(ctx, u);
    ctx.fillStyle = papel;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    const m = v.margen * u;
    const cuantas = variante === 'double' ? 2 : 1;
    const ancho = (w - 2 * m - (cuantas - 1) * m) / cuantas;
    const alto = ancho * v.proporcion;
    for (let i = 0; i < cuantas; i++) llenar(ctx, imgs[i], m + i * (ancho + m), m, ancho, alto);
    if (c.text) {
      const tam = v.pie * u;
      ctx.font = `italic ${tam}px ${LETRA}`;
      ctx.fillStyle = claroSobre(papel) ? '#F2F2F2' : '#1A1A1A';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      const lineas = renglones(ctx, c.text, w - 2 * m);
      const zona = h - (m + alto);
      const inicio = m + alto + Math.max(0, (zona - lineas.length * tam * 1.2) / 2);
      parrafo(ctx, c.text, m, inicio, w - 2 * m, zona, tam * 1.2, true);
      ctx.textAlign = 'left';
    }
    if (variante === 'tape') {
      ctx.save();
      ctx.translate(50 * u, u);
      ctx.rotate((-4 * Math.PI) / 180);
      ctx.fillStyle = 'rgba(214,210,200,0.7)';
      ctx.fillRect(-20 * u, -6 * u, 40 * u, 12 * u);
      ctx.restore();
    }
  },

  quote(ctx, c, w, h) {
    const u = w / 100;
    const s = Number.isFinite(c.size) ? Math.min(3, Math.max(0.5, c.size)) : 1;
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.fillStyle = esColor(c.color) ? c.color : '#1A1A1A';
    ctx.textBaseline = 'top';
    const [px, ancho] = [6 * u, w - 12 * u];
    let y = 5 * u;
    ctx.globalAlpha *= 0.85;
    ctx.font = `700 ${22 * s * u}px ${SERIFA}`;
    ctx.fillText('“', px, y - 4 * s * u);
    ctx.globalAlpha /= 0.85;
    y += 11 * s * u + 2.5 * u;
    ctx.font = `italic ${7.5 * s * u}px ${SERIFA}`;
    y = parrafo(ctx, c.text ?? '', px, y, ancho, h - y, 7.5 * s * u * 1.35) + 2.5 * u;
    const quien = [c.who, c.chapter].filter(Boolean).join(', ');
    if (quien) {
      ctx.font = `600 ${5 * s * u}px ${LETRA}`;
      y = parrafo(ctx, `— ${quien}`, px, y, ancho, h - y, 5 * s * u * 1.3) + 2.5 * u;
    }
    if (c.note) {
      ctx.globalAlpha *= 0.7;
      ctx.font = `${4.5 * s * u}px ${LETRA}`;
      parrafo(ctx, c.note, px, y, ancho, h - y, 4.5 * s * u * 1.35);
    }
  },

  // ─── T349b ──────────────────────────────────────────────────────────────────
  checklist(ctx, c, w, h) {
    const u = w / 100;
    const color = esColor(c.color) ? c.color : '#1A1A1A';
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.textBaseline = 'top';
    let y = 5 * u;
    if (c.text) {
      ctx.font = `700 ${8.5 * u}px ${LETRA}`;
      y = parrafo(ctx, c.text, 6 * u, y, w - 12 * u, h - y, 10.2 * u) + 3 * u;
    }
    ctx.font = `${7 * u}px ${LETRA}`;
    for (const r of (Array.isArray(c.items) ? c.items : []).slice(0, 12)) {
      if (y > h) break;
      ctx.lineWidth = 0.6 * u;
      ctx.strokeRect(6 * u, y + u, 6.5 * u, 6.5 * u);
      if (r.done) {
        ctx.beginPath();
        ctx.moveTo(7.5 * u, y + 4.5 * u);
        ctx.lineTo(9 * u, y + 6 * u);
        ctx.lineTo(11.5 * u, y + 2.5 * u);
        ctx.stroke();
      }
      ctx.save();
      if (r.done) ctx.globalAlpha *= 0.6;
      const fin = parrafo(ctx, r.text ?? '', 15.5 * u, y, w - 21.5 * u, h - y, 9.1 * u);
      ctx.restore();
      y = Math.max(fin, y + 9.1 * u) + 3 * u;
    }
  },

  mood(ctx, c, w, h) {
    const color = esColor(c.color) ? c.color : '#1A1A1A';
    const carita = CARITAS[c.mood] ?? CARITAS.happy;
    const k = w / 100;
    ctx.save();
    ctx.scale(k, k);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(new Path2D(CARA));
    ctx.stroke(new Path2D(carita.trazo));
    if (carita.relleno) ctx.fill(new Path2D(carita.relleno));
    ctx.restore();
    if (c.text) {
      ctx.fillStyle = color;
      ctx.textBaseline = 'top';
      ctx.font = `600 ${11 * k}px ${LETRA}`;
      parrafo(ctx, c.text, 0, w + 3 * k, w, Math.max(0, h - w - 3 * k), 12.1 * k, true);
    }
  },

  song(ctx, c, w, h) {
    const u = w / 100;
    const color = esColor(c.color) ? c.color : '#1A1A1A';
    ctx.save();
    sombra(ctx, u, 0.18);
    ctx.fillStyle = MARCO_POLAROID;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 4 * u);
    ctx.fill();
    ctx.restore();
    const alto = 14 * u + 2 * u + 1.2 * u + 2 * u + 9 * u;
    let y = (h - alto) / 2;
    ctx.fillStyle = SIN_FOTO;
    ctx.fillRect(5 * u, y, 14 * u, 14 * u);
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.font = `700 ${6.5 * u}px ${LETRA}`;
    ctx.fillText(c.text ?? '', 23 * u, y + 1.5 * u, w - 28 * u);
    ctx.save();
    ctx.globalAlpha *= 0.7;
    ctx.font = `${5 * u}px ${LETRA}`;
    ctx.fillText(c.who ?? '', 23 * u, y + 8.5 * u, w - 28 * u);
    ctx.restore();
    y += 16 * u;
    ctx.save();
    ctx.globalAlpha *= 0.25;
    ctx.fillRect(5 * u, y, w - 10 * u, 1.2 * u);
    ctx.restore();
    ctx.fillRect(5 * u, y, (w - 10 * u) * 0.38, 1.2 * u);
    y += 3.2 * u;
    const centro = w / 2;
    ctx.beginPath();
    ctx.moveTo(centro - 3 * u, y);
    ctx.lineTo(centro + 4 * u, y + 4.5 * u);
    ctx.lineTo(centro - 3 * u, y + 9 * u);
    ctx.fill();
  },

  date(ctx, c, w, h) {
    const u = w / 100;
    const color = esColor(c.color) ? c.color : '#1A1A1A';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 0.6 * u;
    ctx.setLineDash([2 * u, 1.5 * u]);
    ctx.strokeRect(0.3 * u, 0.3 * u, w - 0.6 * u, h - 0.6 * u);
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${9 * u}px ${LETRA}`;
    const conLugar = !!c.note;
    ctx.fillText((c.title ?? '').toUpperCase(), w / 2, conLugar ? h / 2 - 4 * u : h / 2, w - 8 * u);
    if (conLugar) {
      ctx.globalAlpha *= 0.8;
      ctx.font = `${6 * u}px ${LETRA}`;
      ctx.fillText(c.note, w / 2, h / 2 + 5 * u, w - 8 * u);
    }
    ctx.textAlign = 'left';
  },

  timeline(ctx, c, w, h) {
    const u = w / 100;
    const color = esColor(c.color) ? c.color : '#1A1A1A';
    const items = (Array.isArray(c.items) ? c.items : []).slice(0, 12);
    ctx.fillStyle = color;
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.fillRect(6 * u, 4 * u, 0.8 * u, h - 8 * u);
    ctx.restore();
    const paso = (h - 8 * u) / Math.max(1, items.length);
    ctx.textBaseline = 'top';
    ctx.font = `${6.5 * u}px ${LETRA}`;
    items.forEach((r, i) => {
      const y = 4 * u + paso * i + paso / 2 - 4 * u;
      ctx.beginPath();
      ctx.arc(6.4 * u, y + 3.9 * u, 2.5 * u, 0, Math.PI * 2);
      ctx.fill();
      parrafo(ctx, r.text ?? '', 12 * u, y, w - 16 * u, paso, 8.45 * u);
    });
  },

  stat(ctx, c, w, h) {
    const u = w / 100;
    ctx.fillStyle = esColor(c.color) ? c.color : '#1A1A1A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const lineas = [
      [c.title ?? '', `700 ${26 * u}px ${LETRA}`, 26 * u, 1],
      [c.text ?? '', `600 ${8 * u}px ${LETRA}`, 9.6 * u, 1],
      [c.note ?? '', `${6 * u}px ${LETRA}`, 7.2 * u, 0.7],
    ].filter(([t]) => t);
    const alto = lineas.reduce((t, l) => t + l[2], 0) + (lineas.length - 1) * 1.5 * u;
    let y = (h - alto) / 2;
    for (const [texto, letra, tam, alfa] of lineas) {
      ctx.save();
      ctx.globalAlpha *= alfa;
      ctx.font = letra;
      ctx.fillText(texto, w / 2, y, w);
      ctx.restore();
      y += tam + 1.5 * u;
    }
    ctx.textAlign = 'left';
  },

  swatch(ctx, c, w, h) {
    const u = w / 100;
    const color = esColor(c.color) ? c.color.slice(0, 7) : '#C9C2B8';
    ctx.save();
    sombra(ctx, u, 0.18);
    ctx.fillStyle = MARCO_POLAROID;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    const banda = (c.text ? 9 * 1.15 + 1 : 0) * u + 7 * 1.1 * u;
    ctx.fillStyle = color;
    ctx.fillRect(5 * u, 5 * u, w - 10 * u, h - 14 * u - banda);
    ctx.fillStyle = '#1A1A1A';
    ctx.textBaseline = 'top';
    let y = h - 5 * u - banda;
    if (c.text) {
      ctx.font = `700 ${9 * u}px ${LETRA}`;
      ctx.fillText(c.text, 5 * u, y, w - 10 * u);
      y += 9 * 1.15 * u + u;
    }
    ctx.globalAlpha *= 0.7;
    ctx.font = `600 ${7 * u}px ${LETRA}`;
    ctx.fillText(color.toUpperCase(), 5 * u, y, w - 10 * u);
  },

  rating(ctx, c, w, h) {
    const u = w / 100;
    const color = esColor(c.color) ? c.color : '#1A1A1A';
    const valor = Number.isFinite(c.value) ? c.value : 0;
    ctx.fillStyle = color;
    if (c.scale === 'number') {
      ctx.textBaseline = 'alphabetic';
      ctx.font = `700 ${34 * u}px ${LETRA}`;
      const grande = String(valor);
      ctx.font = `700 ${34 * u}px ${LETRA}`;
      const a1 = ctx.measureText(grande).width;
      ctx.font = `600 ${14 * u}px ${LETRA}`;
      const a2 = ctx.measureText('/10').width;
      const x = (w - a1 - 2 * u - a2) / 2;
      const base = h / 2 + 12 * u;
      ctx.font = `700 ${34 * u}px ${LETRA}`;
      ctx.fillText(grande, x, base);
      ctx.globalAlpha *= 0.7;
      ctx.font = `600 ${14 * u}px ${LETRA}`;
      ctx.fillText('/10', x + a1 + 2 * u, base);
      return;
    }
    const trazo = new Path2D(SIMBOLOS[c.scale === 'hearts' ? 'hearts' : 'stars']);
    const lado = 18 * u;
    for (let i = 0; i < 5; i++) {
      const x = (i * (w - lado)) / 4;
      const y = (h - lado) / 2;
      const forma = new Path2D();
      forma.addPath(trazo, new DOMMatrix().translate(x, y).scale(lado / 100));
      ctx.strokeStyle = color;
      ctx.lineWidth = lado * 0.05;
      ctx.stroke(forma);
      const lleno = Math.min(1, Math.max(0, valor - i));
      if (lleno > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, lado * lleno, lado);
        ctx.clip();
        ctx.fill(forma);
        ctx.restore();
      }
    }
  },

  /** Un asset con su color: el color recortado con su forma y, si es de textura, el gris multiplicando encima. */
  asset(ctx, c, w, h, imgs) {
    const img = imgs[0];
    if (!img) return;
    if (!esColor(c.color)) {
      ctx.drawImage(img, 0, 0, w, h);
      return;
    }
    const capa = document.createElement('canvas');
    capa.width = Math.max(1, Math.round(w));
    capa.height = Math.max(1, Math.round(h));
    const k = capa.getContext('2d');
    k.fillStyle = c.color;
    k.fillRect(0, 0, capa.width, capa.height);
    k.globalCompositeOperation = 'destination-in';
    k.drawImage(img, 0, 0, capa.width, capa.height);
    if (c.mode !== 'trazo') {
      k.globalCompositeOperation = 'multiply';
      k.drawImage(img, 0, 0, capa.width, capa.height);
      // Multiplicar también oscurece lo transparente: se vuelve a recortar con la forma.
      k.globalCompositeOperation = 'destination-in';
      k.drawImage(img, 0, 0, capa.width, capa.height);
    }
    ctx.drawImage(capa, 0, 0, w, h);
  },

  book(ctx, c, w, h, imgs) {
    const u = w / 100;
    const color = esColor(c.coverColor) ? c.coverColor : '#DCD3C8';
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowOffsetY = 0.8 * u;
    ctx.shadowBlur = 2.4 * u;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 1.5 * u);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 1.5 * u);
    ctx.clip();
    if (imgs[0]) llenar(ctx, imgs[0], 0, 0, w, h);
    else {
      ctx.fillStyle = claroSobre(color) ? '#F2F2F2' : '#1A1A1A';
      ctx.font = `700 ${11 * u}px ${LETRA}`;
      ctx.textBaseline = 'top';
      parrafo(ctx, c.title ?? '', 8 * u, 10 * u, w - 16 * u, h - 20 * u, 11 * u * 1.2);
    }
    ctx.restore();
  },
};

function cargar(src) {
  return new Promise((listo, mal) => {
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => listo(img);
    img.onerror = () => mal(new Error('imagen'));
    img.src = src;
  });
}

/** Renglones de un texto que caben en `ancho`, respetando los saltos que escribió la persona. */
function renglones(ctx, texto, ancho) {
  const salida = [];
  for (const parrafo of texto.split('\n')) {
    let linea = '';
    for (const palabra of parrafo.split(/(\s+)/)) {
      const prueba = linea + palabra;
      if (linea && ctx.measureText(prueba).width > ancho) {
        salida.push(linea.trimEnd());
        linea = palabra.trimStart();
      } else linea = prueba;
    }
    salida.push(linea);
  }
  return salida;
}

/**
 * La página `pagina` del lienzo como PNG (data URL), de `ancho` px. `proporcion`: alto entre ancho de la página;
 * `items`: lo pegado (en el formato del motor); `fondo`: el color de la página o `null`.
 */
export async function exportarPagina({ items, pagina = 1, ancho = 1600, proporcion, fondo }) {
  const W = Math.round(Math.min(Math.max(ancho, 200), 4000));
  const H = Math.round(W * proporcion);
  const lienzo = document.createElement('canvas');
  lienzo.width = W;
  lienzo.height = H;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  if (esColor(fondo)) {
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, W, H);
  }

  const lista = [...items].filter((a) => a.locator?.page === pagina && TIPOS.includes(a.kind)).sort((a, b) => a.z - b.z);
  // Las letras de los textos (T375) listas antes de dibujar: si no, el canvas usa la del sistema.
  await letrasListas(lista.filter((a) => a.kind === 'textbox').map((a) => a.content?.font));
  // Las imágenes primero, todas juntas: así el dibujo sale en su orden aunque una tarde más. Una polaroid trae varias.
  const imagenes = await Promise.all(
    lista.map((a) => {
      const srcs =
        a.kind === 'polaroid'
          ? (a.content?.srcs ?? [])
          : [
              a.kind === 'image' || a.kind === 'book'
                ? a.content?.src
                : a.kind === 'sticker'
                  ? a.content?.src || fuenteDeSticker(a.content?.sticker)
                  : a.kind === 'asset'
                    ? a.content?.src || fuenteDeAsset(a.content?.asset)
                    : null,
            ];
      return Promise.all(srcs.map((src) => (src ? cargar(src).catch(() => null) : null)));
    }),
  );

  lista.forEach((a, i) => {
    if (MODULOS_DE_EXPORTACION[a.kind]) {
      const w = a.locator.w * W;
      const h = w * (Number.isFinite(a.locator.ar) ? a.locator.ar : 1);
      ctx.save();
      ctx.translate(a.locator.x * W + w / 2, a.locator.y * H + h / 2);
      if (a.content?.rot) ctx.rotate((a.content.rot * Math.PI) / 180);
      ctx.translate(-w / 2, -h / 2);
      if (Number.isFinite(a.content?.opacity) && a.content.opacity < 1) ctx.globalAlpha = Math.max(0.1, a.content.opacity);
      MODULOS_DE_EXPORTACION[a.kind](ctx, a.content ?? {}, w, h, imagenes[i]);
      ctx.restore();
      return;
    }
    const c = a.content ?? {};
    const w = a.locator.w * W;
    const h = w * (Number.isFinite(a.locator.ar) ? a.locator.ar : 1);
    const x = a.locator.x * W;
    const y = a.locator.y * H;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    if (c.rot) ctx.rotate((c.rot * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2);
    if (Number.isFinite(c.opacity) && c.opacity < 1) ctx.globalAlpha = Math.max(0.1, c.opacity);
    if (c.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowOffsetY = 0.005 * W;
      ctx.shadowBlur = 0.009 * W;
    }
    const borde = c.border && esColor(c.border.color) && Number.isFinite(c.border.width) ? { color: c.border.color, ancho: Math.min(0.05, c.border.width) * W } : null;

    if (a.kind === 'shape') {
      const trazo = new Path2D();
      trazo.addPath(new Path2D(TRAZOS[c.shape] ?? TRAZOS.rect), new DOMMatrix().scale(w / 100, h / 100));
      ctx.fillStyle = esColor(c.color) ? c.color : FORMA_GRIS;
      ctx.fill(trazo);
      if (borde) {
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = borde.color;
        ctx.lineWidth = borde.ancho;
        ctx.stroke(trazo);
      }
    } else if (a.kind === 'textbox') {
      const tamano = 0.021 * W * (Number.isFinite(c.size) ? c.size : 1);
      ctx.font = `${tamano}px ${c.font ? familiaDeLienzo(c.font) : LETRA}`;
      ctx.fillStyle = esColor(c.color) ? c.color : '#1A1A1A';
      ctx.textBaseline = 'top';
      const [px, py] = [0.35 * tamano, 0.25 * tamano];
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      renglones(ctx, c.text ?? '', Math.max(1, w - 2 * px)).forEach((linea, n) => ctx.fillText(linea, px, py + n * tamano * 1.35 + tamano * 0.175));
      if (borde) {
        ctx.strokeStyle = borde.color;
        ctx.lineWidth = borde.ancho * 2;
        ctx.strokeRect(0, 0, w, h);
      }
    } else {
      const img = imagenes[i][0];
      if (img) {
        if (a.kind === 'sticker') ctx.drawImage(img, 0, 0, w, h);
        else {
          // Una imagen se ve entera en su caja (`contain`).
          const k = Math.min(w / img.naturalWidth, h / img.naturalHeight);
          const [iw, ih] = [img.naturalWidth * k, img.naturalHeight * k];
          ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
        }
      }
      if (borde) {
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = borde.color;
        ctx.lineWidth = borde.ancho;
        ctx.strokeRect(borde.ancho / 2, borde.ancho / 2, w - borde.ancho, h - borde.ancho);
      }
    }
    ctx.restore();
  });
  return lienzo.toDataURL('image/png');
}
