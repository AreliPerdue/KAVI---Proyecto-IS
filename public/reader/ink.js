/**
 * Lápiz y dedo (spec 13c, RF-BH11; T291): pluma, marcador, lápiz de color y borrador sobre la página.
 *
 * Se dibuja en el motor (decisión de Areli del 19 oct 2026, en lugar de Skia): así lo dibujado vive en la
 * página y acompaña al scroll, al zoom y a las páginas de lado, en PDF y EPUB, y en la web igual que en el
 * teléfono. La presión y la inclinación del Apple Pencil (y de los lápices de Android o de tableta) llegan
 * con los Pointer Events; con el dedo o el mouse el trazo es de grosor fijo.
 *
 * - **Un dibujo** junta los trazos hechos seguidos: se guarda tras una pausa (`PAUSA_MS`), al moverse en el
 *   libro, al cambiar de página del PDF o al dejar el lápiz. Es una anotación `ink` con una caja como lo
 *   pegado (en PDF, en su página; en EPUB, junto a su renglón) y sus trazos relativos a esa caja: cada uno
 *   `{ t, c, s, p }` con la herramienta, el color, el grosor (parte del ancho de la caja) y sus puntos
 *   `[x, y, w, …]` (x e y en anchos de la caja; w, cuánto engruesa la presión).
 * - **El borrador** quita trazos enteros al pasar por encima; cada pasada es un paso de deshacer.
 * - **Solo lápiz:** dibuja solo el lápiz; el dedo sigue moviendo la página. Sin él, el dedo (o el mouse)
 *   también dibuja y la página no se mueve con el dedo mientras el lápiz está puesto.
 *
 * App → motor: `pen` (`{ on, tool, color, size, penOnly }`) y `penUndo`. Motor → app: `ink` (un dibujo nuevo),
 * `inkChange` (le quedaron menos trazos), `remove` (se borró entero) y `undo` (deshacer lo ya guardado).
 */

export const TRAZOS = ['pen', 'marker', 'pencil'];
/** Cuánto se espera otro trazo antes de guardar el dibujo. */
const PAUSA_MS = 1200;
/** Tope de puntos de un dibujo: uno más largo se guarda y sigue en otro. */
const MAX_PUNTOS = 4000;
/** Lo transparente de cada herramienta: el marcador deja ver el texto. */
const ALFA = { pen: 1, marker: 0.38, pencil: 0.82 };

const r4 = (v) => Math.round(v * 10000) / 10000;
const r2 = (v) => Math.round(v * 100) / 100;

/**
 * Cuánto engruesa el trazo en este punto: con lápiz, la presión (y en el lápiz de color, la inclinación, como
 * al sombrear); con el dedo o el mouse, nada.
 */
function grosorDe(e, herramienta) {
  if (e.pointerType !== 'pen' || herramienta === 'marker') return 1;
  const presion = e.pressure > 0 ? e.pressure : 0.5;
  let w = 0.35 + presion * 1.3;
  if (herramienta === 'pencil') {
    const tilt = Math.min(1, Math.hypot(e.tiltX || 0, e.tiltY || 0) / 60);
    w *= 1 + tilt * 1.5;
  }
  return w;
}

// ─── Pintar ──────────────────────────────────────────────────────────────────

let auxiliar = null;

/**
 * Un trazo en un lienzo. `escala`: px del lienzo por unidad de los puntos; `[dx, dy]`: dónde cae el origen.
 * Lo transparente se pinta primero opaco en un lienzo aparte, así no se oscurece donde el trazo se cruza.
 */
function pintarTrazo(c, t, escala, dx = 0, dy = 0) {
  const p = t.p;
  if (!Array.isArray(p) || p.length < 3) return;
  const alfa = ALFA[t.t] ?? 1;
  let destino = c;
  if (alfa < 1) {
    auxiliar ??= document.createElement('canvas');
    if (auxiliar.width !== c.canvas.width || auxiliar.height !== c.canvas.height) {
      auxiliar.width = c.canvas.width;
      auxiliar.height = c.canvas.height;
    }
    destino = auxiliar.getContext('2d');
    destino.clearRect(0, 0, auxiliar.width, auxiliar.height);
  }
  destino.strokeStyle = t.c;
  destino.fillStyle = t.c;
  destino.lineCap = 'round';
  destino.lineJoin = 'round';
  const base = Math.max(0.5, t.s * escala);
  const x = (i) => dx + p[i] * escala;
  const y = (i) => dy + p[i + 1] * escala;
  if (p.length === 3) {
    destino.beginPath();
    destino.arc(x(0), y(0), (base * p[2]) / 2, 0, Math.PI * 2);
    destino.fill();
  } else if (t.t === 'marker') {
    // De grosor parejo: un solo camino suavizado por los puntos medios.
    destino.lineWidth = base;
    destino.beginPath();
    destino.moveTo(x(0), y(0));
    for (let i = 3; i < p.length - 3; i += 3) destino.quadraticCurveTo(x(i), y(i), (x(i) + x(i + 3)) / 2, (y(i) + y(i + 3)) / 2);
    destino.lineTo(x(p.length - 3), y(p.length - 3));
    destino.stroke();
  } else {
    // Con presión: cada tramo con su grosor.
    for (let i = 0; i < p.length - 3; i += 3) {
      destino.lineWidth = (base * (p[i + 2] + p[i + 5])) / 2;
      destino.beginPath();
      destino.moveTo(x(i), y(i));
      destino.lineTo(x(i + 3), y(i + 3));
      destino.stroke();
    }
  }
  if (alfa < 1) {
    c.save();
    c.globalAlpha = alfa;
    c.drawImage(auxiliar, 0, 0);
    c.restore();
  }
}

/** Todos los trazos de un dibujo en su lienzo, que mide `ancho` × `alto` px en pantalla. */
export function pintarTrazos(lienzo, trazos, ancho, alto) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = Math.max(1, Math.round(ancho * dpr));
  const h = Math.max(1, Math.round(alto * dpr));
  if (lienzo.width !== w) lienzo.width = w;
  if (lienzo.height !== h) lienzo.height = h;
  const c = lienzo.getContext('2d');
  c.clearRect(0, 0, w, h);
  for (const t of Array.isArray(trazos) ? trazos : []) pintarTrazo(c, t, w);
}

/** Si un punto (en unidades del dibujo) pasa por un trazo, con un margen `radio`. */
function toca(t, x, y, radio) {
  const p = t.p ?? [];
  const margen = radio + (t.s ?? 0) / 2;
  if (p.length === 3) return Math.hypot(p[0] - x, p[1] - y) <= margen;
  for (let i = 0; i < p.length - 3; i += 3) {
    const ax = p[i];
    const ay = p[i + 1];
    const bx = p[i + 3];
    const by = p[i + 4];
    const largo = (bx - ax) ** 2 + (by - ay) ** 2;
    const k = largo ? Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / largo)) : 0;
    if (Math.hypot(ax + k * (bx - ax) - x, ay + k * (by - ay) - y) <= margen * Math.max(1, p[i + 2])) return true;
  }
  return false;
}

// ─── Dibujar ─────────────────────────────────────────────────────────────────

/**
 * `ctx`: `forma()`, `pdf()`, `epub()`; y de la capa de anotaciones, `lugarDeDibujo(caja, pagina)` (la caja en
 * px de la ventana → `{ locator, caja }` o null), `provisional(item)` (pintarlo ya, antes de que vuelva de la
 * app), `dibujosVisibles()` (`[{ el, a }]`) y `cambiarTrazos(id, trazos)` (repintar uno con menos trazos).
 */
export function crearLapiz(ctx, enviar) {
  let modo = null; // { tool, color, size, penOnly }
  let trazo = null; // el que se está haciendo: { pointerId, t, c, px, pts: [x, y, w, …] en px de la ventana, borrador }
  let pendientes = []; // trazos terminados que aún no se guardan
  let paginaPendiente = null; // en PDF, la página del primer trazo pendiente
  let espera = null;
  let vivo = null; // el lienzo encima de todo donde se ve lo que se dibuja
  let lapizAbajo = false;
  let cuadro = null;
  const borrados = new Map(); // id → trazos que le quedan, mientras se borra
  const enganchadas = new WeakSet();

  const activo = () => !!modo && ctx.forma() !== 'book';
  /** Si este puntero dibuja: el lápiz siempre; el dedo y el mouse, si no es "solo lápiz". */
  const dibuja = (tipo) => tipo === 'pen' || !modo.penOnly;

  function lienzoVivo() {
    if (vivo?.isConnected) return vivo;
    vivo = document.createElement('canvas');
    vivo.id = 'trazo-vivo';
    document.body.append(vivo);
    return vivo;
  }

  function redibujarVivo() {
    cuadro = null;
    const lienzo = lienzoVivo();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    if (lienzo.width !== w) lienzo.width = w;
    if (lienzo.height !== h) lienzo.height = h;
    const c = lienzo.getContext('2d');
    c.clearRect(0, 0, w, h);
    for (const t of trazo && !trazo.borrador ? [...pendientes, trazo] : pendientes) pintarTrazo(c, { t: t.t, c: t.c, s: t.px, p: t.pts }, dpr);
  }
  const pedirCuadro = () => {
    cuadro ??= requestAnimationFrame(redibujarVivo);
  };

  /** Dónde está el puntero en la ventana del motor (los capítulos del EPUB viven en un iframe). */
  function enVentana(e) {
    const ventana = e.view ?? e.target?.ownerDocument?.defaultView;
    const marco = ventana && ventana !== window ? ventana.frameElement : null;
    const m = marco ? marco.getBoundingClientRect() : { left: 0, top: 0 };
    return { x: e.clientX + m.left, y: e.clientY + m.top };
  }

  function paginaPdfEn(x, y) {
    return document.elementsFromPoint(x, y).find((el) => el.matches?.('.pagina[data-pagina]')) ?? null;
  }

  function alBajar(e) {
    if (!activo() || !dibuja(e.pointerType)) return;
    if (!e.isPrimary || trazo) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    const { x, y } = enVentana(e);
    // En PDF se dibuja sobre una página; en EPUB, sobre el área del libro.
    const pagina = ctx.pdf() ? paginaPdfEn(x, y) : null;
    if (ctx.pdf() && !pagina) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.pointerType === 'pen') lapizAbajo = true;
    try {
      e.target.setPointerCapture?.(e.pointerId);
    } catch {
      // algunos elementos de foliate no dejan capturar; los movimientos llegan igual a su documento
    }
    clearTimeout(espera);
    if (modo.tool === 'eraser') {
      trazo = { pointerId: e.pointerId, borrador: true };
      borrarEn(x, y);
      return;
    }
    if (pagina && paginaPendiente && pagina !== paginaPendiente) guardar();
    if (pagina) paginaPendiente = pagina;
    trazo = { pointerId: e.pointerId, t: modo.tool, c: modo.color, px: modo.size, pts: [r2(x), r2(y), r2(grosorDe(e, modo.tool))] };
    pedirCuadro();
  }

  function alMover(e) {
    if (!trazo || e.pointerId !== trazo.pointerId) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const eventos = e.getCoalescedEvents?.() ?? [];
    for (const ev of eventos.length ? eventos : [e]) {
      const { x, y } = enVentana(ev);
      if (trazo.borrador) {
        borrarEn(x, y);
        continue;
      }
      const n = trazo.pts.length;
      // Un punto cada px y medio basta; más solo pesa.
      if (Math.hypot(x - trazo.pts[n - 3], y - trazo.pts[n - 2]) < 1.5) continue;
      trazo.pts.push(r2(x), r2(y), r2(grosorDe(ev, trazo.t)));
    }
    if (!trazo.borrador) pedirCuadro();
  }

  function alSoltar(e) {
    if (e.pointerType === 'pen') lapizAbajo = false;
    if (!trazo || e.pointerId !== trazo.pointerId) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const hecho = trazo;
    trazo = null;
    if (hecho.borrador) {
      terminarDeBorrar();
      return;
    }
    pendientes.push(hecho);
    pedirCuadro();
    if (pendientes.length >= 300 || pendientes.reduce((n, t) => n + t.pts.length / 3, 0) >= MAX_PUNTOS) guardar();
    else espera = setTimeout(guardar, PAUSA_MS);
  }

  /** El dedo no mueve la página mientras dibuja (ni el lápiz, que en iOS también desplaza). */
  function alTocar(e) {
    if (!activo()) return;
    const deLapiz = lapizAbajo || [...(e.touches ?? [])].some((t) => t.touchType === 'stylus');
    if (trazo || deLapiz || !modo.penOnly) {
      if (e.cancelable) e.preventDefault();
      e.stopImmediatePropagation();
    }
  }

  /** Escuchar en una ventana (la del motor o la de un capítulo del EPUB) antes que todo lo demás. */
  function enganchar(ventana) {
    if (!ventana || enganchadas.has(ventana)) return;
    enganchadas.add(ventana);
    const opciones = { capture: true, passive: false };
    ventana.addEventListener('pointerdown', alBajar, opciones);
    ventana.addEventListener('pointermove', alMover, opciones);
    ventana.addEventListener('pointerup', alSoltar, opciones);
    ventana.addEventListener('pointercancel', alSoltar, opciones);
    ventana.addEventListener('touchstart', alTocar, opciones);
    ventana.addEventListener('touchmove', alTocar, opciones);
    ventana.addEventListener('touchend', () => (lapizAbajo = false), { capture: true });
    // Sin el menú de mantener presionado ni la lupa de iOS mientras se dibuja.
    ventana.addEventListener('contextmenu', (e) => activo() && e.preventDefault(), { capture: true });
  }
  enganchar(window);

  /** Guardar lo dibujado seguido como un dibujo. */
  function guardar() {
    clearTimeout(espera);
    espera = null;
    const trazos = pendientes;
    const pagina = paginaPendiente;
    pendientes = [];
    paginaPendiente = null;
    pedirCuadro();
    if (!trazos.length) return;
    let izq = Infinity;
    let arr = Infinity;
    let der = -Infinity;
    let aba = -Infinity;
    for (const t of trazos) {
      let mas = 1;
      for (let i = 2; i < t.pts.length; i += 3) mas = Math.max(mas, t.pts[i]);
      const margen = (t.px * mas) / 2 + 2;
      for (let i = 0; i < t.pts.length; i += 3) {
        izq = Math.min(izq, t.pts[i] - margen);
        der = Math.max(der, t.pts[i] + margen);
        arr = Math.min(arr, t.pts[i + 1] - margen);
        aba = Math.max(aba, t.pts[i + 1] + margen);
      }
    }
    const lugar = ctx.lugarDeDibujo({ left: izq, top: arr, width: der - izq, height: aba - arr }, pagina);
    if (!lugar) return;
    const { locator, caja } = lugar;
    const strokes = trazos.map((t) => ({
      t: t.t,
      c: t.c,
      s: r4(t.px / caja.width),
      p: t.pts.map((v, i) => (i % 3 === 0 ? r4((v - caja.left) / caja.width) : i % 3 === 1 ? r4((v - caja.top) / caja.width) : v)),
    }));
    ctx.provisional({ kind: 'ink', locator, content: { strokes } });
    enviar({ type: 'ink', locator, strokes });
  }

  /** El borrador en un punto de la ventana: quita lo que toque, guardado o pendiente. */
  function borrarEn(x, y) {
    const radio = modo.size / 2;
    const antes = pendientes.length;
    pendientes = pendientes.filter((t) => !toca({ s: t.px, p: t.pts }, x, y, radio));
    if (pendientes.length !== antes) pedirCuadro();
    for (const { el, a } of ctx.dibujosVisibles()) {
      const r = el.getBoundingClientRect();
      if (x < r.left - radio || x > r.right + radio || y < r.top - radio || y > r.bottom + radio || !r.width) continue;
      const quedan = borrados.get(a.id) ?? a.content?.strokes ?? [];
      const nuevos = quedan.filter((t) => !toca(t, (x - r.left) / r.width, (y - r.top) / r.width, radio / r.width));
      if (nuevos.length === quedan.length) continue;
      borrados.set(a.id, nuevos);
      ctx.cambiarTrazos(a.id, nuevos);
    }
  }

  function terminarDeBorrar() {
    for (const [id, quedan] of borrados) enviar(quedan.length ? { type: 'inkChange', id, strokes: quedan } : { type: 'remove', id });
    borrados.clear();
  }

  return {
    /** Lo que manda la app: poner o quitar el lápiz y con qué se dibuja. */
    poner(m) {
      const on = m?.on === true && ctx.forma() !== 'book';
      if (!on) {
        if (trazo?.borrador) terminarDeBorrar();
        trazo = null;
        guardar();
        modo = null;
        document.body.classList.remove('dibujando', 'dibujando-dedo');
        return;
      }
      const herramienta = [...TRAZOS, 'eraser'].includes(m.tool) ? m.tool : 'pen';
      if (modo && herramienta !== modo.tool) guardar();
      modo = {
        tool: herramienta,
        color: /^#[0-9a-fA-F]{6}$/.test(m.color ?? '') ? m.color : '#1A1A1A',
        size: Number.isFinite(m.size) ? Math.min(48, Math.max(1, m.size)) : 3,
        penOnly: m.penOnly === true,
      };
      document.body.classList.add('dibujando');
      document.body.classList.toggle('dibujando-dedo', !modo.penOnly);
    },
    /** Deshacer: el último trazo que aún no se guarda; si no hay, lo último guardado (lo hace la app). */
    deshacer() {
      if (pendientes.length) {
        pendientes.pop();
        if (!pendientes.length) {
          clearTimeout(espera);
          paginaPendiente = null;
        }
        pedirCuadro();
        return;
      }
      enviar({ type: 'undo' });
    },
    /** Un capítulo del EPUB que se cargó: también se dibuja en él. */
    enganchar: (doc) => enganchar(doc?.defaultView),
    /** Se movió el libro (scroll, otra página): lo pendiente se guarda donde se dibujó. */
    alMoverse() {
      if (pendientes.length && !trazo) guardar();
    },
    cerrar() {
      clearTimeout(espera);
      pendientes = [];
      trazo = null;
      modo = null;
      paginaPendiente = null;
      borrados.clear();
      vivo?.remove();
      vivo = null;
      document.body.classList.remove('dibujando', 'dibujando-dedo');
    },
  };
}
