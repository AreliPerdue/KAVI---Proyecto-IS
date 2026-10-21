/**
 * Exportar un recorte como imagen (spec 13h, RF-CC25; T342): la página del lienzo dibujada en un `<canvas>` con lo
 * mismo que se ve —el fondo y cada elemento en su orden de capa, con su lugar, giro, opacidad, borde y sombra— y
 * guardada como PNG. Se dibuja a mano (y no copiando la página) para que salga igual en la web y en el teléfono.
 */
import { fuenteDeSticker } from './annotations.js';

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

  const lista = [...items].filter((a) => a.locator?.page === pagina && ['shape', 'textbox', 'image', 'sticker'].includes(a.kind)).sort((a, b) => a.z - b.z);
  // Las imágenes primero, todas juntas: así el dibujo sale en su orden aunque una tarde más.
  const imagenes = await Promise.all(
    lista.map((a) => {
      const src = a.kind === 'image' ? a.content?.src : a.kind === 'sticker' ? a.content?.src || fuenteDeSticker(a.content?.sticker) : null;
      return src ? cargar(src).catch(() => null) : null;
    }),
  );

  lista.forEach((a, i) => {
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
      ctx.font = `${tamano}px ${LETRA}`;
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
      const img = imagenes[i];
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
