/**
 * Libro real (spec 13b, RF-BR5; T284): la hoja se dobla al pasar, como en FlipHTML5. La animación es de
 * StPageFlip (`page-flip`, MIT), dentro del motor: igual en la web, el iPhone y Android.
 *
 * - Vertical: una página a la vez. Horizontal (o una ventana ancha): dos, con la portada sola a la derecha
 *   y luego en pares. Se decide por lo que quepa: dos si caben a buen tamaño, una si no.
 * - PDF: cada página es un canvas que se pinta al acercarse.
 * - EPUB: cada capítulo se acomoda en columnas del tamaño de la hoja y cada columna es una página. Las
 *   páginas cercanas se arman con una copia del capítulo; las lejanas quedan vacías. La posición se sigue
 *   guardando como CFI, así cambiar de forma de leer no pierde el lugar.
 *
 * Los toques en los bordes y el centro, el teclado y el trackpad los pone `engine.js`; aquí, el arrastre de
 * la esquina y el deslizar con el dedo, que hace StPageFlip.
 *
 * Lo pegado (13c, T286) se ve en su hoja: `capa` lo dibuja al armar cada página y `recapar()` lo vuelve a
 * dibujar cuando cambia. Aquí no se toca ni se arrastra: arrastrar es doblar la hoja.
 */
import { PageFlip } from './vendor/page-flip/page-flip.module.js';

const MARGEN = 8; // alrededor del libro
const MARGEN_TEXTO = 28; // dentro de la página de un EPUB
const CERCA = 3; // páginas que se arman a cada lado de la actual

const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Lo que tapan los controles arriba y abajo (T286b): el libro se acomoda en el espacio que queda. */
let reserva = { arriba: 0, abajo: 0 };
export function fijarReserva(r) {
  reserva = { arriba: r?.arriba ?? 0, abajo: r?.abajo ?? 0 };
}

/** El tamaño de la hoja y si van dos: dos si caben sin que cada una quede chica. */
export function medidas(proporcion) {
  const W = window.innerWidth - MARGEN * 2;
  const H = Math.max(120, window.innerHeight - MARGEN * 2 - reserva.arriba - reserva.abajo);
  const dos = W >= 1.8 * H * proporcion;
  let alto = H;
  let ancho = alto * proporcion;
  const cabe = dos ? W / 2 : W;
  if (ancho > cabe) {
    ancho = cabe;
    alto = ancho / proporcion;
  }
  return { ancho: Math.floor(ancho), alto: Math.floor(alto), dos };
}

/**
 * Arma el hojeador sobre `paginas` (elementos ya del tamaño de la hoja). `alPasar(indice, dos)` avisa la
 * página a la vista (la de la izquierda en un par).
 */
function hojeador(raiz, paginas, { ancho, alto, dos, inicio, alPasar }) {
  const caja = document.createElement('div');
  caja.className = 'libro-caja';
  caja.style.width = `${dos ? ancho * 2 : ancho}px`;
  const bloque = document.createElement('div');
  caja.append(bloque);
  raiz.replaceChildren(caja);

  const pf = new PageFlip(bloque, {
    width: ancho,
    height: alto,
    size: 'fixed',
    startPage: inicio,
    showCover: true,
    usePortrait: true,
    autoSize: true,
    drawShadow: true,
    maxShadowOpacity: 0.5,
    flippingTime: sinMovimiento() ? 1 : 700,
    showPageCorners: !sinMovimiento(),
    mobileScrollSupport: true,
  });
  // Un clic quieto no pasa de página aquí: los bordes y el centro los atiende el motor (RF-BR7b), así el
  // centro muestra los controles en vez de voltear la hoja.
  const detener = pf.userStop.bind(pf);
  pf.userStop = (pos, deslizo = false) => {
    if (pf.isUserTouch && !deslizo && !pf.isUserMove) {
      pf.isUserTouch = false;
      return;
    }
    detener(pos, deslizo);
  };
  pf.on('flip', (e) => alPasar(e.data, pf.getOrientation() === 'landscape'));
  pf.on('init', (e) => alPasar(e.data.page, e.data.mode === 'landscape'));
  pf.loadFromHTML(paginas);
  return pf;
}

/** Pasar con la hoja que se dobla, o de golpe con movimiento reducido. */
function pasarEn(pf, paso) {
  if (sinMovimiento()) {
    if (paso > 0) pf.turnToNextPage();
    else pf.turnToPrevPage();
    return;
  }
  if (paso > 0) pf.flipNext('bottom');
  else pf.flipPrev('bottom');
}

/** La página (o el par) a la vista, contando desde 1: "p. 1" sola o "pp. 2–3". */
function aLaVista(indice, dos, total) {
  const pagina = indice + 1;
  const hasta = dos && indice > 0 && indice + 1 < total ? indice + 2 : pagina;
  return { pagina, hasta };
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

/**
 * El libro real de un PDF. `pintar(n, canvas, ancho, alto)` dibuja la página n en el canvas. `avisar`
 * recibe { pagina, hasta, total }. `capa(n, div, rect)` pone lo pegado sobre el rectángulo de la hoja
 * donde quedó la página (centrada, del tamaño que quepa).
 */
export function libroPdf({ raiz, doc, total, base, inicio, pintar, capa, avisar }) {
  const { ancho, alto, dos } = medidas(base.width / base.height);
  const escala = Math.min(ancho / base.width, alto / base.height);
  const rect = { width: base.width * escala, height: base.height * escala };
  rect.left = (ancho - rect.width) / 2;
  rect.top = (alto - rect.height) / 2;
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  const paginas = [];
  const pintadas = new Set();
  for (let n = 1; n <= total; n++) {
    const div = document.createElement('div');
    div.className = 'hoja-libro';
    paginas.push(div);
  }

  /** Pinta las cercanas y suelta las lejanas: con 400 páginas no hay 400 canvas en memoria. */
  const acercar = (indice) => {
    for (let i = 0; i < total; i++) {
      const cerca = i >= indice - CERCA && i <= indice + CERCA + 1;
      if (cerca && !pintadas.has(i)) {
        pintadas.add(i);
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(ancho * ratio);
        canvas.height = Math.floor(alto * ratio);
        paginas[i].append(canvas);
        void pintar(i + 1, canvas, ancho * ratio, alto * ratio);
        capa?.(i + 1, paginas[i], rect);
      } else if (!cerca && pintadas.has(i)) {
        pintadas.delete(i);
        paginas[i].replaceChildren();
      }
    }
  };

  let actual = Math.min(Math.max(0, inicio - 1), total - 1);
  acercar(actual);
  const pf = hojeador(raiz, paginas, {
    ancho,
    alto,
    dos,
    inicio: actual,
    alPasar: (indice, enPar) => {
      actual = indice;
      acercar(indice);
      avisar({ ...aLaVista(indice, enPar, total), total });
    },
  });

  return {
    pasar: (paso) => pasarEn(pf, paso),
    irA: (pagina) => {
      const i = Math.min(Math.max(0, pagina - 1), total - 1);
      acercar(i);
      pf.turnToPage(i);
      actual = i;
      avisar({ ...aLaVista(i, pf.getOrientation() === 'landscape', total), total });
    },
    pagina: () => actual + 1,
    recapar: () => {
      for (const i of pintadas) capa?.(i + 1, paginas[i], rect);
    },
    cerrar: () => pf.destroy(),
  };
}

// ─── EPUB ────────────────────────────────────────────────────────────────────

/**
 * La letra del libro real (T288): tamaño en % del de base (17 px) y familia (`null` = la de siempre). La pone
 * `libroEpub` al armarse; sus `@font-face` viven en el documento del motor.
 */
let textoDelLibro = { tamano: 100, familia: null };

/** Los estilos de la página de un EPUB: los del capítulo más los nuestros, que acomodan en columnas. */
function estilosDePagina(ancho, alto, cssDelCapitulo) {
  const letra = Math.round(17 * (textoDelLibro.tamano / 100) * 10) / 10;
  const familia = textoDelLibro.familia ?? `Georgia, 'Times New Roman', serif`;
  const columna = ancho - MARGEN_TEXTO * 2;
  return `${cssDelCapitulo}
/* La hoja recorta: el contenido se corre de lado y solo se ve su columna. */
:host { all: initial; display: block; position: relative; width: ${ancho}px; height: ${alto}px; overflow: hidden; background: var(--papel, #fff); }
.contenido {
  box-sizing: content-box; width: ${columna}px; height: ${alto - MARGEN_TEXTO * 2}px; padding: ${MARGEN_TEXTO}px;
  column-width: ${columna}px; column-gap: ${MARGEN_TEXTO * 2}px; column-fill: auto;
  font-family: ${familia}; font-size: ${letra}px; line-height: 1.5; color: var(--tinta, #1a1a1a);
  text-align: start; hyphens: auto; overflow-wrap: break-word;
  /* Se selecciona para subrayar, definir o copiar (T330). */
  -webkit-user-select: text; user-select: text;
}
.contenido img, .contenido svg, .contenido video { max-width: 100%; max-height: ${alto - MARGEN_TEXTO * 2}px; object-fit: contain; break-inside: avoid; }
.contenido script, .contenido style, .contenido link { display: none; }
.contenido a { color: inherit; }
/* Tema del lector (RF-BH5): la letra y el fondo del tema, aunque el capítulo traiga otros. */
.contenido *:not(img):not(svg):not(video) { color: inherit !important; background-color: transparent !important; }
${textoDelLibro.familia ? `.contenido *:not(code):not(pre):not(kbd):not(samp) { font-family: ${familia} !important; }` : ''}`;
}

/** Lee un capítulo ya preparado por foliate (sus recursos son direcciones `blob:`) y su CSS. */
async function leerCapitulo(seccion) {
  const url = await seccion.load();
  const texto = await (await fetch(url)).text();
  let doc = new DOMParser().parseFromString(texto, 'application/xhtml+xml');
  if (doc.querySelector('parsererror')) doc = new DOMParser().parseFromString(texto, 'text/html');
  // El CSP del motor no deja cargar hojas de estilo `blob:`: se traen como texto.
  const partes = [];
  for (const el of doc.querySelectorAll('style, link[rel~="stylesheet"]')) {
    if (el.localName === 'style') partes.push(el.textContent ?? '');
    else {
      const href = el.getAttribute('href');
      if (href) partes.push(await fetch(new URL(href, url)).then((r) => r.text()).catch(() => ''));
    }
  }
  return { doc, css: partes.join('\n') };
}

/** Copia el cuerpo del capítulo nodo por nodo: el mismo árbol, para que los CFI apunten igual. */
function copiaDelCuerpo(doc) {
  const contenido = document.createElement('div');
  contenido.className = 'contenido';
  for (const nodo of doc.body?.childNodes ?? []) contenido.append(document.importNode(nodo, true));
  return contenido;
}

/** Un elemento con su sombra (estilos aislados del motor) y una copia del capítulo dentro. */
function pagina(ancho, alto, capitulo) {
  const host = document.createElement('div');
  host.className = 'hoja-libro';
  const sombra = host.attachShadow({ mode: 'open' });
  const estilo = document.createElement('style');
  estilo.textContent = estilosDePagina(ancho, alto, capitulo.css);
  sombra.append(estilo);
  if (capitulo) {
    const contenido = copiaDelCuerpo(capitulo.doc);
    sombra.append(contenido);
  }
  return { host, sombra };
}

/**
 * La selección dentro de la sombra de una hoja, si la hay. Los navegadores la exponen distinto: Chrome con
 * `shadowRoot.getSelection()`, Safari 17+ y Chrome 137+ con `getComposedRanges`.
 */
function rangoEnSombra(sombra) {
  if (!sombra) return null;
  const sel = document.getSelection();
  if (sel?.getComposedRanges) {
    let rangos = [];
    try {
      rangos = sel.getComposedRanges({ shadowRoots: [sombra] });
    } catch {
      rangos = sel.getComposedRanges(sombra);
    }
    const r = rangos[0];
    if (r && !r.collapsed && sombra.contains(r.startContainer) && sombra.contains(r.endContainer)) return r;
  }
  const propia = sombra.getSelection?.();
  if (propia && !propia.isCollapsed && propia.rangeCount) {
    const r = propia.getRangeAt(0);
    if (sombra.contains(r.startContainer)) return r;
  }
  return null;
}

/** El camino de índices desde la raíz hasta un nodo, y al revés. */
function camino(raiz, nodo) {
  const pasos = [];
  for (let n = nodo; n && n !== raiz; n = n.parentNode) pasos.unshift([...n.parentNode.childNodes].indexOf(n));
  return pasos;
}
function seguir(raiz, pasos) {
  let n = raiz;
  for (const i of pasos) n = n?.childNodes[i];
  return n ?? null;
}

/** Espera las imágenes del capítulo (cambian el largo), sin quedarse colgado si una no carga. */
function imagenesListas(raiz) {
  const imagenes = [...raiz.querySelectorAll('img')];
  const tope = new Promise((r) => setTimeout(r, 3000));
  return Promise.race([Promise.all(imagenes.map((i) => (i.complete ? null : i.decode().catch(() => null)))), tope]);
}

/**
 * El libro real de un EPUB. `view` es el foliate-view abierto (su libro, sus CFI); `cfi`, dónde abrir.
 * `avisar` recibe { cfi, pagina, total, fraccion }; `texto`, la letra (T288). `capa(i, sombra, ancho, ubicar)` pone lo pegado en la
 * hoja i; `ubicar(cfi)` dice en qué hoja y a qué altura cae un CFI y `ubicarRango(cfi)`, los renglones de un
 * subrayado.
 */
export async function libroEpub({ raiz, view, cfi, texto, capa, avisar }) {
  textoDelLibro = { tamano: texto?.tamano ?? 100, familia: texto?.familia ?? null };
  // La proporción de una página de libro de bolsillo; el texto se acomoda a lo que quepa.
  const { ancho, alto, dos } = medidas(2 / 3);
  const libro = view.book;

  // Medir: cada capítulo en un lugar fuera de la vista, del tamaño de la hoja. Se quedan ahí para
  // traducir entre páginas y CFI.
  const medidor = document.createElement('div');
  medidor.className = 'libro-medidor';
  document.body.append(medidor);
  const capitulos = [];
  let total = 0;
  for (const [indice, seccion] of libro.sections.entries()) {
    if (seccion.linear === 'no') continue;
    const capitulo = await leerCapitulo(seccion);
    const { host, sombra } = pagina(ancho, alto, capitulo);
    medidor.append(host);
    const contenido = sombra.querySelector('.contenido');
    await imagenesListas(contenido);
    const n = Math.max(1, Math.round((contenido.scrollWidth + MARGEN_TEXTO * 2) / ancho));
    capitulos.push({ indice, ...capitulo, contenido, inicio: total, n });
    total += n;
  }

  const capituloDe = (g) => capitulos.findLast((c) => c.inicio <= g) ?? capitulos[0];
  const columnaDe = (c, rect) => Math.floor((rect.left - c.contenido.getBoundingClientRect().left + 1) / ancho);

  /** El CFI de una página: el primer texto que cae en su columna. */
  const cfiDe = (g) => {
    const c = capituloDe(g);
    const k = g - c.inicio;
    const andador = document.createTreeWalker(c.contenido, NodeFilter.SHOW_TEXT, (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP));
    for (let n = andador.nextNode(); n; n = andador.nextNode()) {
      const r = document.createRange();
      r.selectNodeContents(n);
      if ([...r.getClientRects()].some((rect) => columnaDe(c, rect) >= k)) {
        const original = seguir(c.doc.body, camino(c.contenido, n));
        if (!original) break;
        const rango = c.doc.createRange();
        rango.setStart(original, 0);
        rango.collapse(true);
        return view.getCFI(c.indice, rango);
      }
    }
    return view.getCFI(c.indice);
  };

  /**
   * Dónde cae un CFI en el capítulo acomodado: la hoja y la altura dentro de ella (para lo pegado). Si no
   * se encuentra el punto exacto, la primera hoja de su capítulo.
   */
  const ubicarCfi = (valor) => {
    try {
      const { index, anchor } = view.resolveCFI(valor);
      const c = capitulos.find((x) => x.indice === index) ?? capitulos.findLast((x) => x.indice < index) ?? capitulos[0];
      if (c.indice !== index || !anchor) return { pagina: c.inicio, y: null };
      const rango = anchor(c.doc);
      const nodo = seguir(c.contenido, camino(c.doc.body, rango.startContainer));
      if (!nodo) return { pagina: c.inicio, y: null };
      const r = document.createRange();
      if (nodo.nodeType === Node.TEXT_NODE) {
        const desde = Math.min(rango.startOffset, nodo.length);
        r.setStart(nodo, desde);
        r.setEnd(nodo, Math.min(desde + 1, nodo.length));
      } else r.selectNode(nodo);
      const rect = r.getClientRects()[0] ?? (nodo.nodeType === Node.ELEMENT_NODE ? nodo.getBoundingClientRect() : null);
      if (!rect) return { pagina: c.inicio, y: null };
      return {
        pagina: c.inicio + Math.min(c.n - 1, Math.max(0, columnaDe(c, rect))),
        y: rect.top - c.contenido.getBoundingClientRect().top,
      };
    } catch {
      return { pagina: 0, y: null };
    }
  };
  /** La página de un CFI: dónde cae su punto en el capítulo acomodado. */
  const paginaDe = (valor) => ubicarCfi(valor).pagina;
  /**
   * Los renglones de un CFI de rango (un subrayado) en el capítulo acomodado: cada uno en la hoja donde cae,
   * con su posición en px dentro de ella.
   */
  const ubicarRangoCfi = (valor) => {
    try {
      const { index, anchor } = view.resolveCFI(valor);
      const c = capitulos.find((x) => x.indice === index);
      if (!c || !anchor) return [];
      const rango = anchor(c.doc);
      const inicio = seguir(c.contenido, camino(c.doc.body, rango.startContainer));
      const fin = seguir(c.contenido, camino(c.doc.body, rango.endContainer));
      if (!inicio || !fin) return [];
      const r = document.createRange();
      r.setStart(inicio, Math.min(rango.startOffset, inicio.length ?? inicio.childNodes.length));
      r.setEnd(fin, Math.min(rango.endOffset, fin.length ?? fin.childNodes.length));
      const base = c.contenido.getBoundingClientRect();
      return [...r.getClientRects()]
        .filter((q) => q.width > 0.5 && q.height > 0.5)
        .map((q) => {
          const columna = Math.max(0, Math.min(c.n - 1, columnaDe(c, q)));
          return { pagina: c.inicio + columna, x: q.left - base.left - columna * ancho, y: q.top - base.top, w: q.width, h: q.height };
        });
    } catch {
      return [];
    }
  };
  const rangos = new Map();
  const ubicarRango = (valor) => {
    if (!rangos.has(valor)) rangos.set(valor, ubicarRangoCfi(valor));
    return rangos.get(valor);
  };
  // El acomodo no cambia mientras dure este libro: cada CFI se ubica una vez.
  const ubicados = new Map();
  const ubicar = (valor) => {
    if (!ubicados.has(valor)) {
      const u = ubicarCfi(valor);
      ubicados.set(valor, u.y == null ? null : u);
    }
    return ubicados.get(valor);
  };

  // Las páginas del hojeador: vacías hasta que se acercan.
  const paginas = [];
  for (const c of capitulos) {
    for (let k = 0; k < c.n; k++) {
      const div = document.createElement('div');
      div.className = 'hoja-libro';
      div.dataset.capitulo = String(c.indice);
      div.dataset.columna = String(k);
      paginas.push(div);
    }
  }
  const armadas = new Set();
  const acercar = (indice) => {
    for (let i = 0; i < total; i++) {
      const cerca = i >= indice - CERCA && i <= indice + CERCA + 1;
      if (cerca && !armadas.has(i)) {
        armadas.add(i);
        const c = capituloDe(i);
        const sombra = paginas[i].shadowRoot ?? paginas[i].attachShadow({ mode: 'open' });
        const estilo = document.createElement('style');
        estilo.textContent = estilosDePagina(ancho, alto, c.css);
        const contenido = copiaDelCuerpo(c.doc);
        contenido.style.transform = `translateX(${-(i - c.inicio) * ancho}px)`;
        sombra.replaceChildren(estilo, contenido);
        capa?.(i, sombra, ancho, { ubicar, ubicarRango });
      } else if (!cerca && armadas.has(i)) {
        armadas.delete(i);
        paginas[i].shadowRoot?.replaceChildren();
      }
    }
  };

  let actual = cfi ? paginaDe(cfi) : 0;
  const decir = (indice, enPar) => {
    actual = indice;
    acercar(indice);
    const { pagina: p } = aLaVista(indice, enPar, total);
    avisar({ cfi: cfiDe(indice), pagina: p, total, fraccion: total > 1 ? indice / (total - 1) : 1 });
  };
  acercar(actual);
  const pf = hojeador(raiz, paginas, { ancho, alto, dos, inicio: actual, alPasar: decir });

  return {
    pasar: (paso) => pasarEn(pf, paso),
    irACfi: (valor) => {
      const i = paginaDe(valor);
      acercar(i);
      pf.turnToPage(i);
      decir(i, pf.getOrientation() === 'landscape');
    },
    irAFraccion: (f) => {
      const i = Math.round(Math.min(Math.max(0, f), 1) * (total - 1));
      acercar(i);
      pf.turnToPage(i);
      decir(i, pf.getOrientation() === 'landscape');
    },
    cfi: () => cfiDe(actual),
    /**
     * Lo seleccionado en una hoja (T330): su texto y su CFI, traducido de la copia de la hoja al capítulo
     * original (el mismo árbol, ver `copiaDelCuerpo`). `null` si no hay nada seleccionado.
     */
    seleccion: () => {
      for (const i of armadas) {
        const sombra = paginas[i].shadowRoot;
        const r = rangoEnSombra(sombra);
        if (!r) continue;
        const c = capituloDe(i);
        const copia = sombra.querySelector('.contenido');
        const inicio = seguir(c.doc.body, camino(copia, r.startContainer));
        const fin = seguir(c.doc.body, camino(copia, r.endContainer));
        if (!inicio || !fin) return null;
        try {
          const original = c.doc.createRange();
          original.setStart(inicio, r.startOffset);
          original.setEnd(fin, r.endOffset);
          const texto = original.toString().trim();
          return texto ? { texto, cfi: view.getCFI(c.indice, original), fraccion: total > 1 ? i / (total - 1) : 0 } : null;
        } catch {
          return null;
        }
      }
      return null;
    },
    recapar: () => {
      for (const i of armadas) if (paginas[i].shadowRoot) capa?.(i, paginas[i].shadowRoot, ancho, { ubicar, ubicarRango });
    },
    cerrar: () => {
      pf.destroy();
      medidor.remove();
    },
  };
}
