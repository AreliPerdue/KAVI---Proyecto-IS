/**
 * Fragmento de imagen (spec 13c, RF-BH20; T317): con la herramienta puesta se arrastra un rectángulo sobre la
 * página y se guarda como imagen, como recortar un pedazo de una revista.
 *
 * - **PDF:** la página se vuelve a dibujar solo en ese pedazo, a buena resolución (no se copia lo que se ve en
 *   pantalla, que puede estar chico o con el tema de dos tonos), en cualquiera de las tres formas de leer.
 * - **EPUB:** el texto se reacomoda y no es una imagen; se recorta la imagen del libro (un dibujo, una foto, un
 *   mapa) que quede bajo el rectángulo. Si no hay ninguna, se avisa `empty` y la app sugiere "Guardar
 *   fragmento" para el texto.
 *
 * Contesta `{type:'clip', page?, rect?, dataUrl, width, height}` (JPEG) o `{type:'clip', error}`. Tras uno
 * bueno se quita sola; mientras está puesta, la página no se mueve (el velo se lleva los toques).
 */

/** El lado mayor de la imagen guardada, en px. */
const LADO_MAX = 1600;
/** Un rectángulo más chico que esto es un toque, no un recorte. */
const MIN_PX = 16;
/** Tope de píxeles de la página dibujada de nuevo (los teléfonos no dan para lienzos enormes). */
const PIXELES_MAX = 12_000_000;

export function crearRecortador(ctx, enviar) {
  let velo = null;
  let marco = null;
  let inicio = null;

  function poner() {
    if (velo) return;
    velo = document.createElement('div');
    velo.className = 'recortando';
    marco = document.createElement('div');
    marco.className = 'marco-recorte';
    velo.append(marco);
    velo.addEventListener('pointerdown', bajar);
    velo.addEventListener('pointermove', mover);
    velo.addEventListener('pointerup', subir);
    velo.addEventListener('pointercancel', soltar);
    document.body.append(velo);
  }

  function quitar() {
    velo?.remove();
    velo = null;
    marco = null;
    inicio = null;
  }

  function caja(e) {
    const left = Math.min(inicio.x, e.clientX);
    const top = Math.min(inicio.y, e.clientY);
    return { left, top, width: Math.abs(e.clientX - inicio.x), height: Math.abs(e.clientY - inicio.y) };
  }

  function bajar(e) {
    e.preventDefault();
    velo.setPointerCapture?.(e.pointerId);
    inicio = { x: e.clientX, y: e.clientY };
    dibujar(e);
    marco.style.display = 'block';
  }

  function mover(e) {
    if (inicio) dibujar(e);
  }

  function dibujar(e) {
    const r = caja(e);
    Object.assign(marco.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  }

  function soltar() {
    inicio = null;
    if (marco) marco.style.display = 'none';
  }

  async function subir(e) {
    if (!inicio) return;
    const r = caja(e);
    soltar();
    if (r.width < MIN_PX || r.height < MIN_PX) return;
    try {
      const hecho = ctx.pdf() ? await dePdf(r) : await deEpub(r);
      if (!hecho) return enviar({ type: 'clip', error: 'empty' });
      quitar();
      enviar({ type: 'clip', ...hecho });
    } catch {
      enviar({ type: 'clip', error: 'failed' });
    }
  }

  // ─── PDF ───────────────────────────────────────────────────────────────────

  /** La página bajo la mayor parte del rectángulo: la de scroll o de lado (`.pagina`) o la hoja del libro real. */
  function paginaBajo(r) {
    let mejor = null;
    for (const el of document.querySelectorAll('.pagina[data-pagina], .hoja-pdf[data-pagina]')) {
      const pr = el.getBoundingClientRect();
      const area = cruce(r, pr);
      if (area && (!mejor || area.width * area.height > mejor.area.width * mejor.area.height)) mejor = { el, pr, area };
    }
    return mejor;
  }

  async function dePdf(r) {
    const bajo = paginaBajo(r);
    if (!bajo) return null;
    const { pr, area } = bajo;
    const n = Number(bajo.el.dataset.pagina);
    const x = (area.left - pr.left) / pr.width;
    const y = (area.top - pr.top) / pr.height;
    const w = area.width / pr.width;
    const h = area.height / pr.height;
    const pagina = await ctx.pdf().doc.getPage(n);
    const base = pagina.getViewport({ scale: 1 });
    const escala = Math.min(LADO_MAX / Math.max(w * base.width, h * base.height), Math.sqrt(PIXELES_MAX / (base.width * base.height)), 6);
    const vista = pagina.getViewport({ scale: escala });
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.max(1, Math.round(w * vista.width));
    lienzo.height = Math.max(1, Math.round(h * vista.height));
    const c = lienzo.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, lienzo.width, lienzo.height);
    // Solo el pedazo: la página se corre para que su esquina quede en el origen del lienzo.
    await pagina.render({ canvasContext: c, canvas: lienzo, viewport: vista, transform: [1, 0, 0, 1, -x * vista.width, -y * vista.height] }).promise;
    return {
      page: n,
      rect: { x: redondo(x), y: redondo(y), w: redondo(w), h: redondo(h) },
      dataUrl: lienzo.toDataURL('image/jpeg', 0.9),
      width: lienzo.width,
      height: lienzo.height,
    };
  }

  // ─── EPUB ──────────────────────────────────────────────────────────────────

  /** Las imágenes del libro a la vista, con su caja en px de la ventana del motor. */
  function imagenes() {
    const lista = [];
    // El libro real pinta copias de las hojas en la página misma.
    for (const hoja of document.querySelectorAll('.hoja-libro')) {
      for (const el of hoja.shadowRoot?.querySelectorAll('img, image') ?? []) lista.push({ el, r: el.getBoundingClientRect() });
    }
    // Scroll y páginas de lado: cada capítulo en su iframe.
    let contenidos = [];
    try {
      contenidos = ctx.epub()?.view?.renderer?.getContents?.() ?? [];
    } catch {
      contenidos = [];
    }
    for (const { doc } of contenidos) {
      const marcoDoc = doc?.defaultView?.frameElement;
      if (!marcoDoc) continue;
      const m = marcoDoc.getBoundingClientRect();
      for (const el of doc.querySelectorAll('img, image')) {
        const q = el.getBoundingClientRect();
        lista.push({ el, r: { left: m.left + q.left, top: m.top + q.top, width: q.width, height: q.height } });
      }
    }
    return lista;
  }

  async function deEpub(r) {
    let mejor = null;
    for (const { el, r: er } of imagenes()) {
      const area = cruce(r, er);
      if (area && (!mejor || area.width * area.height > mejor.area.width * mejor.area.height)) mejor = { el, er, area };
    }
    if (!mejor) return null;
    const fuente = await cargada(mejor.el);
    const nw = fuente.naturalWidth;
    const nh = fuente.naturalHeight;
    if (!nw || !nh) return null;
    // Dónde quedó dibujada la imagen dentro de su caja (contain, cover o estirada).
    const dibujo = cajaDeContenido(mejor.er, nw, nh, ajusteDe(mejor.el));
    const area = cruce(r, dibujo);
    if (!area) return null;
    const sx = ((area.left - dibujo.left) / dibujo.width) * nw;
    const sy = ((area.top - dibujo.top) / dibujo.height) * nh;
    const sw = (area.width / dibujo.width) * nw;
    const sh = (area.height / dibujo.height) * nh;
    const escala = Math.min(1, LADO_MAX / Math.max(sw, sh));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.max(1, Math.round(sw * escala));
    lienzo.height = Math.max(1, Math.round(sh * escala));
    const c = lienzo.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, lienzo.width, lienzo.height);
    c.drawImage(fuente, sx, sy, sw, sh, 0, 0, lienzo.width, lienzo.height);
    return { dataUrl: lienzo.toDataURL('image/jpeg', 0.9), width: lienzo.width, height: lienzo.height };
  }

  return {
    activar(si) {
      if (si) poner();
      else quitar();
    },
    activo: () => !!velo,
    cerrar: quitar,
  };
}

/** La parte común de dos cajas, o null si no se tocan. */
function cruce(a, b) {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  return right - left >= 1 && bottom - top >= 1 ? { left, top, width: right - left, height: bottom - top } : null;
}

const redondo = (v) => Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000;

/** Cómo se ajusta la imagen a su caja: `contain`, `cover` o `fill` (estirada). */
function ajusteDe(el) {
  if (el.localName === 'image') {
    const par = el.getAttribute('preserveAspectRatio') ?? '';
    return par.startsWith('none') ? 'fill' : par.includes('slice') ? 'cover' : 'contain';
  }
  const fit = el.ownerDocument.defaultView?.getComputedStyle(el).objectFit;
  return fit === 'contain' || fit === 'scale-down' ? 'contain' : fit === 'cover' ? 'cover' : 'fill';
}

function cajaDeContenido(caja, nw, nh, ajuste) {
  if (ajuste === 'fill') return caja;
  const s = ajuste === 'contain' ? Math.min(caja.width / nw, caja.height / nh) : Math.max(caja.width / nw, caja.height / nh);
  const width = nw * s;
  const height = nh * s;
  return { left: caja.left + (caja.width - width) / 2, top: caja.top + (caja.height - height) / 2, width, height };
}

/** La imagen lista para dibujar: un `<img>` ya cargado, o la de un `<image>` de SVG cargada aparte. */
function cargada(el) {
  if (el.localName === 'img' && el.complete && el.naturalWidth) return Promise.resolve(el);
  const crudo = el.localName === 'img' ? el.currentSrc || el.src : (el.href?.baseVal ?? el.getAttribute('href') ?? el.getAttribute('xlink:href'));
  const src = new URL(crudo ?? '', el.ownerDocument.baseURI).href;
  return new Promise((resolver, fallar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = fallar;
    img.src = src;
  });
}
