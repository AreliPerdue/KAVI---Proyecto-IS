/**
 * Capa de anotaciones del motor (spec 13c, RF-BH16 – RF-BH18; T286).
 *
 * Lo pegado vive encima de la página y nunca toca el archivo (spec 13 §3). La app manda la lista completa
 * (`annotations`) cada vez que cambia y el motor la pinta; lo que la persona hace sobre la página vuelve a la
 * app como mensajes (`place`, `select`, `move`, `edit`), que lo guarda y lo puede deshacer.
 *
 * Posición estable (spec 13 §5):
 * - **PDF:** página y esquina de arriba a la izquierda en 0–1, con el ancho relativo al de la página. Se pinta
 *   en una capa dentro de cada página, así acompaña al zoom, al scroll y a las páginas de lado.
 * - **EPUB:** el CFI del renglón donde empieza, más la x (0–1) en la columna. Si cambia la letra o la
 *   pantalla, el post-it sigue junto al mismo texto. Se pinta en una capa encima del libro y se reacomoda
 *   en cada cuadro mientras haya algo que mostrar.
 * - **Libro real:** se ve en su página, pero no se toca: ahí arrastrar dobla la hoja.
 *
 * Por ahora el motor pinta post-its (T286); los subrayados, cuadros, stickers y el lápiz llegan con sus
 * tareas (T287 – T291) sobre esta misma capa.
 */

/** El ancho de un post-it nuevo, relativo a la página (igual que `ANCHO_DE_POSTIT` en la app). */
const ANCHO = 0.24;
const ANCHO_MIN_PX = 96;
const ANCHO_MAX_PX = 220;
const DOBLE_TOQUE_MS = 350;

const redondear = (v) => Math.round(v * 10000) / 10000;
const entre = (v, min, max) => Math.min(Math.max(v, min), max);

/** Letra clara u oscura según el color del post-it: que se lea siempre. */
function letraSobre(hex) {
  const c = (i) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * c(0) + 0.7152 * c(1) + 0.0722 * c(2);
  return l > 0.18 ? '#131313' : '#F2F2F2';
}

const CANDADO =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

/**
 * `ctx` da acceso al estado del motor: `forma()`, `pdf()`, `epub()` y `libro()`; `enviar` manda a la app.
 */
export function crearCapa(ctx, enviar) {
  let lista = []; // en orden de capa: la primera, hasta atrás
  let herramienta = null;
  let seleccion = null;
  let arrastre = null; // { id, el, x0, y0, movido }
  let repintarAlSoltar = false;
  let ultimoToque = { id: null, t: 0 };

  const pegados = () => lista.filter((a) => a.kind === 'postit');
  const interactiva = () => ctx.forma() !== 'book';

  // ─── El post-it ────────────────────────────────────────────────────────────

  /**
   * Un post-it. Los estilos van en línea para que se vean igual dentro de la sombra de las páginas del libro
   * real, donde no llega la hoja de estilos del motor. `ancho`: en PDF, el porcentaje de la página; en EPUB y
   * en el libro real, en px.
   */
  function postit(a, { ancho, enLibro = false }) {
    const color = /^#[0-9a-fA-F]{6}$/.test(a.content?.color ?? '') ? a.content.color : '#F1D35D';
    const el = document.createElement('div');
    el.className = 'anotacion postit';
    el.dataset.id = a.id;
    el.setAttribute('role', 'note');
    const texto = a.content?.text ?? '';
    el.setAttribute('aria-label', texto ? `Post-it: ${texto}` : 'Post-it');
    const px = typeof ancho === 'number';
    Object.assign(el.style, {
      position: 'absolute',
      boxSizing: 'border-box',
      width: px ? `${ancho}px` : ancho,
      aspectRatio: '1',
      background: color,
      color: letraSobre(color),
      padding: px ? `${Math.round(ancho * 0.08)}px` : '0.6em',
      fontFamily: '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif',
      fontSize: px ? `${Math.max(10, Math.round(ancho * 0.085))}px` : `calc(${a.locator.w} * 8.5cqw)`,
      lineHeight: '1.3',
      borderRadius: '2px',
      boxShadow: '0 2px 6px rgb(0 0 0 / 0.28)',
      overflow: 'hidden',
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
      pointerEvents: enLibro ? 'none' : 'auto',
      touchAction: 'none',
      userSelect: 'none',
      webkitUserSelect: 'none',
      cursor: a.locked ? 'pointer' : 'grab',
    });
    el.textContent = texto;
    if (a.locked) el.dataset.bloqueado = '';
    if (!enLibro) {
      if (a.id === seleccion) marcarSeleccion(el, a);
      escucharArrastre(el, a);
    }
    return el;
  }

  function marcarSeleccion(el, a) {
    el.classList.add('seleccionada');
    if (a.locked && !el.querySelector('.candado')) {
      const candado = document.createElement('span');
      candado.className = 'candado';
      candado.innerHTML = CANDADO;
      el.append(candado);
    }
  }

  function remarcar() {
    for (const el of document.querySelectorAll('.anotacion')) {
      el.classList.remove('seleccionada');
      el.querySelector('.candado')?.remove();
      const a = lista.find((x) => x.id === el.dataset.id);
      if (a && a.id === seleccion) marcarSeleccion(el, a);
    }
  }

  function elegir(id, avisar = true) {
    seleccion = id;
    remarcar();
    if (avisar) enviar({ type: 'select', id });
  }

  // ─── Tocar y arrastrar ───────────────────────────────────────────────────────

  function escucharArrastre(el, a) {
    el.addEventListener('pointerdown', (e) => {
      if (!interactiva() || !e.isPrimary) return;
      e.stopPropagation();
      e.preventDefault();
      arrastre = { id: a.id, el, x0: e.clientX, y0: e.clientY, movido: false };
      el.setPointerCapture?.(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (arrastre?.el !== el) return;
      const dx = e.clientX - arrastre.x0;
      const dy = e.clientY - arrastre.y0;
      if (!arrastre.movido && Math.hypot(dx, dy) < 6) return;
      // Lo bloqueado no se mueve sin querer (RF-BH16).
      if (a.locked) return;
      arrastre.movido = true;
      el.style.translate = `${dx}px ${dy}px`;
      el.style.cursor = 'grabbing';
    });
    const soltar = (e, cancelado) => {
      if (arrastre?.el !== el) return;
      e.stopPropagation();
      const { movido } = arrastre;
      arrastre = null;
      if (cancelado) el.style.translate = '';
      else if (movido) soltarEn(el, a);
      else tocar(a);
      if (repintarAlSoltar) {
        repintarAlSoltar = false;
        repintar();
      }
    };
    el.addEventListener('pointerup', (e) => soltar(e, false));
    el.addEventListener('pointercancel', (e) => soltar(e, true));
  }

  /** Un toque elige; dos seguidos abren para escribir. */
  function tocar(a) {
    const ahora = performance.now();
    const doble = ultimoToque.id === a.id && ahora - ultimoToque.t < DOBLE_TOQUE_MS;
    ultimoToque = { id: doble ? null : a.id, t: ahora };
    if (seleccion !== a.id) elegir(a.id);
    if (doble) enviar({ type: 'edit', id: a.id });
  }

  /** Al soltar: la nueva posición, en la página (PDF) o el renglón (EPUB) donde quedó. */
  function soltarEn(el, a) {
    const caja = el.getBoundingClientRect();
    let locator = null;
    if (ctx.pdf()) {
      const centro = [caja.left + caja.width / 2, caja.top + caja.height / 2];
      const pagina = document.elementsFromPoint(...centro).find((x) => x.classList?.contains('pagina')) ?? el.closest('.pagina');
      if (pagina) locator = enPagina(pagina, caja.left, caja.top, a.locator.w);
    } else if (ctx.epub()) {
      locator = enEpub(caja.left, caja.top, caja.width, a.locator.w);
    }
    if (!locator) {
      el.style.translate = '';
      return;
    }
    // Se queda donde se soltó mientras la app guarda y manda la lista nueva.
    if (ctx.pdf()) {
      el.style.translate = '';
      const n = Number(el.closest('.pagina')?.dataset.pagina);
      if (n === locator.page) {
        el.style.left = `${locator.x * 100}%`;
        el.style.top = `${locator.y * 100}%`;
      }
    }
    if (seleccion !== a.id) elegir(a.id);
    enviar({ type: 'move', id: a.id, locator });
  }

  /** La esquina (izquierda, arriba) en px de la ventana → posición en la página, sin salirse. */
  function enPagina(pagina, izquierda, arriba, w) {
    const r = pagina.getBoundingClientRect();
    const alto = (w * r.width) / r.height;
    return {
      page: Number(pagina.dataset.pagina),
      x: redondear(entre((izquierda - r.left) / r.width, 0, 1 - w)),
      y: redondear(entre((arriba - r.top) / r.height, 0, Math.max(0, 1 - alto))),
      w,
    };
  }

  /**
   * Un toque en la página que no cayó sobre algo pegado. Con la herramienta de post-it, ahí se pega; si había
   * algo elegido, se suelta. Devuelve si lo atendió (entonces no pasa de página ni muestra los controles).
   * `doc` es el documento donde ocurrió (el del capítulo, en EPUB).
   */
  function alTocar(e, doc) {
    if (!interactiva()) return false;
    if (herramienta === 'postit') {
      const locator = doc === document ? lugarEnPdf(e) : lugarEnEpub(e, doc);
      if (locator) enviar({ type: 'place', locator });
      return true;
    }
    if (seleccion) {
      elegir(null);
      return true;
    }
    return false;
  }

  function lugarEnPdf(e) {
    const pagina = e.target?.closest?.('.pagina') ?? document.elementsFromPoint(e.clientX, e.clientY).find((x) => x.classList?.contains('pagina'));
    if (!pagina) return null;
    const r = pagina.getBoundingClientRect();
    const ancho = ANCHO * r.width;
    return enPagina(pagina, e.clientX - ancho / 2, e.clientY - ancho / 2, ANCHO);
  }

  // ─── EPUB ────────────────────────────────────────────────────────────────────

  /** El área a la vista del EPUB, en px de la ventana del motor. */
  const areaEpub = () => ctx.epub()?.raiz.getBoundingClientRect();
  const anchoEpub = (w, area) => entre(w * area.width, ANCHO_MIN_PX, ANCHO_MAX_PX);

  /** Los capítulos cargados por foliate, con su iframe. */
  function capitulos() {
    const view = ctx.epub()?.view;
    let contenidos = [];
    try {
      contenidos = view?.renderer?.getContents?.() ?? [];
    } catch {
      return [];
    }
    return contenidos
      .map((c) => ({ ...c, marco: c.doc?.defaultView?.frameElement ?? null }))
      .filter((c) => c.doc && c.marco);
  }

  /** El CFI del renglón en un punto (px de la ventana del motor), si cae sobre un capítulo. */
  function cfiEn(x, y) {
    const view = ctx.epub()?.view;
    for (const c of capitulos()) {
      const m = c.marco.getBoundingClientRect();
      if (x < m.left || x > m.right || y < m.top || y > m.bottom) continue;
      const area = areaEpub();
      // Si el punto cae en el margen, se busca el renglón a esa altura por el centro de la columna.
      const rango = caretEn(c.doc, x - m.left, y - m.top) ?? caretEn(c.doc, area.left + area.width / 2 - m.left, y - m.top);
      if (!rango) return null;
      try {
        return view.getCFI(c.index, rango);
      } catch {
        return null;
      }
    }
    return null;
  }

  function caretEn(doc, x, y) {
    if (doc.caretRangeFromPoint) return doc.caretRangeFromPoint(x, y);
    const p = doc.caretPositionFromPoint?.(x, y);
    if (!p) return null;
    const r = doc.createRange();
    r.setStart(p.offsetNode, p.offset);
    r.collapse(true);
    return r;
  }

  function enEpub(izquierda, arriba, anchoPx, w) {
    const area = areaEpub();
    if (!area) return null;
    // El renglón a la altura de la orilla de arriba del post-it.
    const cfi = cfiEn(izquierda + anchoPx / 2, arriba + 4);
    if (!cfi) return null;
    const x = entre((izquierda - area.left) / area.width, 0, 1 - anchoPx / area.width);
    return { cfi, x: redondear(Math.max(0, x)), w, fraction: redondear(ctx.epub().fraccion ?? 0) };
  }

  function lugarEnEpub(e, doc) {
    const area = areaEpub();
    const marco = doc.defaultView?.frameElement;
    if (!area || !marco) return null;
    const m = marco.getBoundingClientRect();
    const anchoPx = anchoEpub(ANCHO, area);
    return enEpub(e.clientX + m.left - anchoPx / 2, e.clientY + m.top - anchoPx / 4, anchoPx, ANCHO);
  }

  /** Un rango que mida algo: uno colapsado no siempre tiene rectángulo (WebKit). */
  function rectDe(rango) {
    const r = rango.cloneRange();
    const nodo = r.startContainer;
    if (r.collapsed) {
      if (nodo.nodeType === Node.TEXT_NODE && r.startOffset < nodo.length) r.setEnd(nodo, r.startOffset + 1);
      else if (nodo.nodeType === Node.ELEMENT_NODE) r.selectNode(nodo.childNodes[r.startOffset] ?? nodo);
    }
    return r.getClientRects()[0] ?? r.getBoundingClientRect();
  }

  let capaEpub = null;
  let rangos = new Map(); // id → { doc, rango }
  let cuadro = null;

  function capaDelEpub() {
    if (capaEpub?.isConnected) return capaEpub;
    capaEpub = document.createElement('div');
    capaEpub.id = 'capa-epub';
    document.body.append(capaEpub);
    return capaEpub;
  }

  function pintarEpub() {
    const epub = ctx.epub();
    rangos = new Map();
    if (!epub || ctx.forma() === 'book') {
      capaEpub?.replaceChildren();
      detenerCuadros();
      return;
    }
    const capa = capaDelEpub();
    capa.replaceChildren();
    const area = areaEpub();
    for (const a of pegados()) {
      if (!a.locator.cfi) continue;
      const el = postit(a, { ancho: anchoEpub(a.locator.w, area) });
      el.style.display = 'none';
      capa.append(el);
    }
    if (capa.childElementCount) seguirCuadros();
    else detenerCuadros();
  }

  /** Dónde va cada post-it del EPUB ahora: junto a su renglón, si está a la vista. */
  function acomodarEpub() {
    const epub = ctx.epub();
    if (!epub || !capaEpub) return;
    const area = areaEpub();
    const cargados = capitulos();
    for (const el of capaEpub.children) {
      if (arrastre?.el === el) continue;
      const a = lista.find((x) => x.id === el.dataset.id);
      const pos = a && posicionEpub(a, cargados, area);
      if (!pos) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = '';
      el.style.left = `${pos.left}px`;
      el.style.top = `${pos.top}px`;
    }
  }

  function posicionEpub(a, cargados, area) {
    let guardado = rangos.get(a.id);
    let capitulo = guardado && cargados.find((c) => c.doc === guardado.doc);
    if (!capitulo) {
      try {
        const { index, anchor } = ctx.epub().view.resolveCFI(a.locator.cfi);
        capitulo = cargados.find((c) => c.index === index);
        if (!capitulo) return null;
        guardado = { doc: capitulo.doc, rango: anchor(capitulo.doc) };
        rangos.set(a.id, guardado);
      } catch {
        return null;
      }
    }
    const m = capitulo.marco.getBoundingClientRect();
    const r = rectDe(guardado.rango);
    const top = m.top + r.top;
    const left = m.left + r.left;
    // En páginas de lado, las otras columnas del capítulo están a los lados, fuera de la vista.
    if (top < area.top - 2 || top > area.bottom - 16 || left < area.left - 2 || left > area.right) return null;
    const ancho = anchoEpub(a.locator.w, area);
    return { left: entre(area.left + a.locator.x * area.width, area.left, area.right - ancho), top };
  }

  function seguirCuadros() {
    if (cuadro) return;
    const paso = () => {
      acomodarEpub();
      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
  }

  function detenerCuadros() {
    if (cuadro) cancelAnimationFrame(cuadro);
    cuadro = null;
  }

  // ─── PDF ─────────────────────────────────────────────────────────────────────

  /** La capa de una página del PDF (scroll o de lado), con lo que va en ella. */
  function pintarPaginaPdf(n, div) {
    div.querySelector(':scope > .capa-anotaciones')?.remove();
    const enPaginaN = pegados().filter((a) => a.locator.page === n);
    if (!enPaginaN.length) return;
    const capa = document.createElement('div');
    capa.className = 'capa-anotaciones';
    for (const a of enPaginaN) {
      const el = postit(a, { ancho: `${a.locator.w * 100}%` });
      el.style.left = `${a.locator.x * 100}%`;
      el.style.top = `${a.locator.y * 100}%`;
      capa.append(el);
    }
    div.append(capa);
  }

  /** En el libro real: lo de la página n del PDF, sobre el rectángulo donde quedó pintada. */
  function capaLibroPdf(n, div, rect) {
    div.querySelector(':scope > .capa-anotaciones')?.remove();
    const enPaginaN = pegados().filter((a) => a.locator.page === n);
    if (!enPaginaN.length) return;
    const capa = document.createElement('div');
    capa.className = 'capa-anotaciones';
    Object.assign(capa.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, inset: 'auto' });
    for (const a of enPaginaN) {
      const el = postit(a, { ancho: a.locator.w * rect.width, enLibro: true });
      el.style.left = `${a.locator.x * 100}%`;
      el.style.top = `${a.locator.y * 100}%`;
      capa.append(el);
    }
    div.append(capa);
  }

  /**
   * En el libro real de un EPUB: lo de la hoja `i`. `ubicar(cfi)` dice en qué hoja y a qué altura cae un CFI
   * (lo calcula `book.js` con el capítulo ya acomodado en columnas).
   */
  function capaLibroEpub(i, sombra, ancho, ubicar) {
    sombra.querySelector('.capa-anotaciones')?.remove();
    const capa = document.createElement('div');
    capa.className = 'capa-anotaciones';
    Object.assign(capa.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    for (const a of pegados()) {
      if (!a.locator.cfi) continue;
      const u = ubicar(a.locator.cfi);
      if (!u || u.pagina !== i) continue;
      const px = entre(a.locator.w * ancho, 72, ANCHO_MAX_PX);
      const el = postit(a, { ancho: px, enLibro: true });
      el.style.left = `${entre(a.locator.x * ancho, 0, ancho - px)}px`;
      el.style.top = `${u.y}px`;
      capa.append(el);
    }
    if (capa.childElementCount) sombra.append(capa);
  }

  // ─── Lo que pide la app ──────────────────────────────────────────────────────

  function repintar() {
    if (arrastre) {
      repintarAlSoltar = true;
      return;
    }
    const pdf = ctx.pdf();
    if (pdf) for (const n of pdf.renderizadas.keys()) pintarPaginaPdf(n, pdf.paginas[n - 1]);
    ctx.libro()?.recapar?.();
    pintarEpub();
  }

  return {
    actualizar(items) {
      lista = Array.isArray(items) ? [...items].sort((a, b) => a.z - b.z) : [];
      if (seleccion && !lista.some((a) => a.id === seleccion)) seleccion = null;
      repintar();
    },
    herramienta(valor) {
      herramienta = valor === 'postit' ? 'postit' : null;
      document.body.classList.toggle('pegando', !!herramienta);
      if (herramienta && seleccion) elegir(null, false);
    },
    elegir: (id) => elegir(typeof id === 'string' ? id : null, false),
    alTocar,
    pintarPaginaPdf,
    capaLibroPdf,
    capaLibroEpub,
    /** Cambió la forma de leer o se abrió otro libro. */
    repintar,
    cerrar() {
      detenerCuadros();
      capaEpub?.remove();
      capaEpub = null;
      rangos = new Map();
      seleccion = null;
    },
  };
}
