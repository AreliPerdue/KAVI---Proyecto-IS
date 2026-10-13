/**
 * Motor de lectura de KAVI Library (spec 13b §4, T279).
 *
 * Una sola página para las tres plataformas (spec 13 §5): la web la abre en un iframe del mismo
 * origen y el teléfono en un WebView. La app y el motor solo se hablan por mensajes JSON; los tipos
 * viven del lado de la app en `src/lib/library/reader-protocol.ts`.
 *
 * App → motor: `open`, `goTo`, `mode`, `turn`, `search`, `searchStep`, `searchClear`, `cover`.
 * Motor → app: `ready`, `opened`, `position`, `search`, `tap`, `cover`, `error`.
 *
 * PDF con pdf.js (página fija, con capa de texto para buscar); EPUB con foliate-js (texto que se
 * reacomoda, posición por CFI). El archivo se descarga directo de R2 con la dirección firmada que manda
 * la app.
 *
 * Dos formas de leer (13b, RF-BR6 – RF-BR8; T283): **scroll** (una página debajo de otra) y **páginas de
 * lado** (una a la vez, que se desliza). En páginas de lado se pasa de página sin botones (RF-BR7b): toque o
 * clic en el 20 % de cada borde, deslizar el dedo, el trackpad hacia los lados, las flechas, Re Pág / Av Pág
 * y la barra espaciadora. El centro avisa `tap` para que la app muestre u oculte sus controles.
 */
import { buscarEnPedazos } from './text-search.js';

const VENDOR = new URL('./vendor/', import.meta.url).href;

// ─── Mensajes ────────────────────────────────────────────────────────────────

function enviar(mensaje) {
  const texto = JSON.stringify(mensaje);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(texto);
  else if (window.parent !== window) window.parent.postMessage({ kaviReader: texto }, location.origin);
}

function recibir(evento) {
  // En web solo se acepta a la app del mismo origen; en el WebView los mensajes llegan sin origen.
  if (!window.ReactNativeWebView && evento.origin !== location.origin) return;
  const crudo = typeof evento.data === 'string' ? evento.data : evento.data?.kaviApp;
  if (typeof crudo !== 'string') return;
  let mensaje;
  try {
    mensaje = JSON.parse(crudo);
  } catch {
    return;
  }
  atender(mensaje).catch((e) => enviar({ type: 'error', code: codigoDe(e), message: String(e?.message ?? e) }));
}

window.addEventListener('message', recibir);
// Android entrega los mensajes del WebView en `document`.
document.addEventListener('message', recibir);

async function atender(m) {
  switch (m.type) {
    case 'open':
      cerrar();
      forma = m.mode === 'paged' ? 'paged' : 'scroll';
      if (m.format === 'pdf') await abrirPdf(m.url, m.position);
      else if (m.format === 'epub') await abrirEpub(m.url, m.position);
      else throw Object.assign(new Error('formato'), { name: 'FormatoDesconocido' });
      return;
    case 'goTo':
      return irA(m);
    case 'mode':
      return cambiarForma(m.mode === 'paged' ? 'paged' : 'scroll');
    case 'turn':
      return pasar(m.step === -1 ? -1 : 1);
    case 'search':
      return buscar(m.query ?? '');
    case 'searchStep':
      return pasoDeBusqueda(m.step === -1 ? -1 : 1);
    case 'searchClear':
      return limpiarBusqueda();
    case 'cover':
      return portada(m.url, m.width ?? 600);
  }
}

/** Errores del motor en códigos que la app traduce (spec 12). */
function codigoDe(e) {
  const nombre = e?.name ?? '';
  if (nombre === 'PasswordException') return 'password';
  if (nombre === 'InvalidPDFException' || nombre === 'FormatoDesconocido') return 'damaged';
  if (nombre === 'ResponseException' || nombre === 'MissingPDFException' || nombre === 'TypeError') return 'network';
  if (/zip|epub|xml/i.test(String(e?.message ?? ''))) return 'damaged';
  return 'unknown';
}

// ─── Estado ──────────────────────────────────────────────────────────────────

let pdf = null; // { doc, raiz, pista, paginas: HTMLElement[], observador, renderizadas: Map, total, pagina }
let forma = 'scroll'; // 'scroll' | 'paged'
let epub = null; // { view }
let busqueda = { consulta: '', resultados: [], actual: -1 };

function cerrar() {
  limpiarBusqueda();
  if (pdf) {
    pdf.observador.disconnect();
    pdf.tarea.destroy();
    pdf.raiz.remove();
    pdf = null;
  }
  if (epub) {
    const { view, raiz } = epub;
    epub = null;
    // foliate puede seguir buscando o pintando marcas en un documento que ya se fue: que no truene.
    try {
      view.close?.();
    } catch {
      // nada que limpiar
    }
    raiz.remove();
  }
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

let pdfjsCargado = null;
function pdfjs() {
  pdfjsCargado ??= import(`${VENDOR}pdfjs/pdf.min.mjs`).then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = `${VENDOR}pdfjs/pdf.worker.min.mjs`;
    return lib;
  });
  return pdfjsCargado;
}

/**
 * Descarga el libro completo y lo abre. No se pide por partes: la dirección firmada de R2 vence en
 * una hora y una sesión de lectura puede durar más; con todo en memoria, el vencimiento no importa.
 */
async function cargarPdf(url) {
  const [lib, respuesta] = await Promise.all([pdfjs(), fetch(url)]);
  if (!respuesta.ok) throw Object.assign(new Error(`HTTP ${respuesta.status}`), { name: 'ResponseException' });
  const datos = new Uint8Array(await respuesta.arrayBuffer());
  const tarea = lib.getDocument({
    data: datos,
    cMapUrl: `${VENDOR}pdfjs/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${VENDOR}pdfjs/standard_fonts/`,
    wasmUrl: `${VENDOR}pdfjs/wasm/`,
    iccUrl: `${VENDOR}pdfjs/iccs/`,
    isEvalSupported: false,
  });
  // Un PDF que pide contraseña ya se rechaza al importarlo (RF-BL14); si aun así llega uno, se dice.
  tarea.onPassword = () => tarea.destroy();
  try {
    // Se cierra con la tarea de carga: en pdf.js 6 el documento ya no tiene `destroy`.
    return { doc: await tarea.promise, tarea };
  } catch (e) {
    if (tarea.destroyed && !e?.name) throw Object.assign(new Error('password'), { name: 'PasswordException' });
    throw e;
  }
}

/**
 * La escala de una página en pantalla. En scroll, todo el ancho con un margen, sin pasar de 900 px (web
 * ancha); en páginas de lado, la página entera a la vista: lo que quepa a lo ancho y a lo alto.
 */
function escalaDe(base) {
  const ancho = Math.min(window.innerWidth - 16, 900) / base.width;
  if (forma !== 'paged') return ancho;
  return Math.min((window.innerWidth - 16) / base.width, (window.innerHeight - 16) / base.height);
}

/** Medida provisional de cada página mientras no se pinta: la de la primera. */
function medirProvisionales() {
  const escala = escalaDe(pdf.base);
  for (const div of pdf.paginas) {
    div.style.width = `${Math.round(pdf.base.width * escala)}px`;
    div.style.height = `${Math.round(pdf.base.height * escala)}px`;
  }
}

/**
 * Qué se pinta: en scroll, una pantalla de adelanto arriba y abajo; en páginas de lado, la de cada lado.
 * Lo que queda lejos se suelta.
 */
function observar() {
  pdf.observador?.disconnect();
  pdf.observador = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        const n = Number(e.target.dataset.pagina);
        if (e.isIntersecting) pintar(n);
        else despintar(n);
      }
    },
    { root: pdf.raiz, rootMargin: forma === 'paged' ? '0px 100%' : '150% 0px' },
  );
  pdf.paginas.forEach((p) => pdf.observador.observe(p));
}

/** Rehacer la página con otra forma o tamaño: se suelta lo pintado y se vuelve a la misma página. */
function reacomodarPdf() {
  if (!pdf) return;
  const pagina = pdf.pagina || 1;
  pdf.raiz.classList.toggle('paginado', forma === 'paged');
  for (const n of [...pdf.renderizadas.keys()]) despintar(n);
  medirProvisionales();
  observar();
  irAPaginaPdf(pagina, false);
}

async function abrirPdf(url, posicion) {
  const { doc, tarea } = await cargarPdf(url);
  const total = doc.numPages;
  const primera = await doc.getPage(1);
  const base = primera.getViewport({ scale: 1 });

  // raíz (lo que se desplaza) → pista (lo que se corre en páginas de lado) → hoja (el lugar de cada
  // página, que la centra) → página.
  const raiz = document.createElement('div');
  raiz.id = 'pdf';
  const pista = document.createElement('div');
  pista.className = 'pista';
  raiz.append(pista);
  document.body.append(raiz);

  const paginas = [];
  for (let n = 1; n <= total; n++) {
    const hoja = document.createElement('div');
    hoja.className = 'hoja';
    const div = document.createElement('div');
    div.className = 'pagina';
    div.dataset.pagina = String(n);
    hoja.append(div);
    pista.append(hoja);
    paginas.push(div);
  }

  pdf = { doc, tarea, raiz, pista, paginas, base, renderizadas: new Map(), observador: null, total, pagina: 0 };
  raiz.classList.toggle('paginado', forma === 'paged');
  medirProvisionales();
  observar();
  gestosDePaginas(raiz);

  raiz.addEventListener('scroll', () => requestAnimationFrame(avisarPosicion), { passive: true });
  enviar({ type: 'opened', total });

  irAPaginaPdf(Math.min(Math.max(1, posicion?.page ?? 1), total), false);
}

/** Ir a una página del PDF: en scroll se desplaza hasta ella; en páginas de lado, la pista se corre. */
function irAPaginaPdf(n, animar = true) {
  if (!pdf) return;
  const pagina = Math.min(Math.max(1, n), pdf.total);
  if (forma === 'paged') {
    pdf.raiz.scrollTop = 0;
    pdf.pista.classList.toggle('sin-animar', !animar);
    pdf.pista.style.transform = `translateX(${-(pagina - 1) * 100}%)`;
    if (pagina !== pdf.pagina) {
      pdf.pagina = pagina;
      enviar({ type: 'position', page: pagina, total: pdf.total, fraction: pagina / pdf.total });
    }
    return;
  }
  pdf.pista.style.transform = '';
  if (pagina > 1) pdf.paginas[pagina - 1].scrollIntoView({ block: 'start' });
  else pdf.raiz.scrollTop = 0;
  avisarPosicion();
}

async function pintar(n) {
  if (!pdf || pdf.renderizadas.has(n)) return;
  const estado = { cancelado: false, tarea: null, capa: null };
  pdf.renderizadas.set(n, estado);
  const pagina = await pdf.doc.getPage(n);
  if (estado.cancelado || !pdf) return;
  const div = pdf.paginas[n - 1];
  const base = pagina.getViewport({ scale: 1 });
  const vista = pagina.getViewport({ scale: escalaDe(base) });
  div.style.width = `${Math.round(vista.width)}px`;
  div.style.height = `${Math.round(vista.height)}px`;
  div.style.setProperty('--total-scale-factor', String(vista.scale));

  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(vista.width * ratio);
  canvas.height = Math.floor(vista.height * ratio);
  div.append(canvas);
  estado.tarea = pagina.render({
    canvasContext: canvas.getContext('2d'),
    canvas,
    viewport: vista,
    transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null,
  });
  try {
    await estado.tarea.promise;
  } catch {
    return; // cancelada al alejarse
  }
  if (estado.cancelado) return;

  const capa = document.createElement('div');
  capa.className = 'textLayer';
  div.append(capa);
  const lib = await pdfjs();
  const texto = new lib.TextLayer({ textContentSource: pagina.streamTextContent(), container: capa, viewport: vista });
  estado.capa = texto;
  await texto.render().catch(() => undefined);
  if (!estado.cancelado) marcarPagina(n);
}

function despintar(n) {
  const estado = pdf?.renderizadas.get(n);
  if (!estado) return;
  estado.cancelado = true;
  estado.tarea?.cancel();
  pdf.renderizadas.delete(n);
  pdf.paginas[n - 1].replaceChildren();
}

/** La página que ocupa el tercio de arriba de la pantalla es "donde voy" (RF-BR9). */
function avisarPosicion() {
  if (!pdf || forma === 'paged') return;
  const { raiz, paginas, total } = pdf;
  const linea = raiz.scrollTop + raiz.clientHeight / 3;
  let actual = 1;
  for (const p of paginas) {
    if (p.offsetTop <= linea) actual = Number(p.dataset.pagina);
    else break;
  }
  // Al fondo del todo, la última página aunque no llegue al tercio.
  if (raiz.scrollTop + raiz.clientHeight >= raiz.scrollHeight - 4) actual = total;
  if (actual === pdf.pagina) return;
  pdf.pagina = actual;
  enviar({ type: 'position', page: actual, total, fraction: actual / total });
}

// ─── EPUB ────────────────────────────────────────────────────────────────────

async function abrirEpub(url, posicion) {
  const [, { Overlayer }] = await Promise.all([import(`${VENDOR}foliate/view.js`), import(`${VENDOR}foliate/overlayer.js`)]);
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw Object.assign(new Error(`HTTP ${respuesta.status}`), { name: 'ResponseException' });
  const archivo = new File([await respuesta.blob()], 'libro.epub', { type: 'application/epub+zip' });

  const raiz = document.createElement('div');
  raiz.id = 'epub';
  document.body.append(raiz);
  const view = document.createElement('foliate-view');
  raiz.append(view);
  epub = { view, raiz };

  let ultimo = '';
  view.addEventListener('relocate', (e) => {
    const { fraction, cfi, location } = e.detail ?? {};
    // foliate avisa varias veces por el mismo lugar (al pintar, al acomodar): solo cuenta si cambió.
    if (!cfi || cfi === ultimo) return;
    ultimo = cfi;
    if (epub) epub.ultimo = cfi;
    enviar({
      type: 'position',
      cfi,
      fraction: typeof fraction === 'number' ? fraction : 0,
      page: location ? location.current + 1 : undefined,
      total: location?.total,
    });
  });
  // Las marcas de la búsqueda las pinta foliate con su capa de dibujo.
  view.addEventListener('draw-annotation', (e) => {
    const { draw } = e.detail;
    draw(Overlayer.highlight, { color: 'rgb(255 196 0)' });
  });

  await view.open(archivo);
  view.renderer.setAttribute('margin', '32px');
  view.renderer.setAttribute('max-inline-size', '720px');
  formaEpub(view);
  // Los toques en los bordes y el centro, el teclado y el trackpad van dentro de cada capítulo (otro
  // documento); el deslizar con el dedo ya lo hace foliate.
  view.addEventListener('load', (e) => gestosDePaginas(e.detail.doc, true));
  gestosDePaginas(raiz, true);
  enviar({ type: 'opened', total: null });
  if (posicion?.cfi) await view.init({ lastLocation: posicion.cfi });
  else if (posicion?.fraction) await view.goToFraction(posicion.fraction);
  else await view.init({ showTextStart: false });
}

/** En páginas de lado, una columna a la vez (como Kindle), con la animación de foliate salvo con movimiento reducido. */
function formaEpub(view) {
  const r = view.renderer;
  r.setAttribute('flow', forma === 'paged' ? 'paginated' : 'scrolled');
  r.setAttribute('max-column-count', '1');
  if (forma === 'paged' && !matchMedia('(prefers-reduced-motion: reduce)').matches) r.setAttribute('animated', '');
  else r.removeAttribute('animated');
}

// ─── Formas de leer (RF-BR6 – RF-BR8) ───────────────────────────────────────

/** Cambiar de forma sin perder el lugar: en PDF, la misma página; en EPUB, foliate se queda en su CFI. */
async function cambiarForma(nueva) {
  if (nueva === forma) return;
  forma = nueva;
  if (pdf) return reacomodarPdf();
  if (epub) {
    const cfi = epub.ultimo;
    formaEpub(epub.view);
    if (cfi) await epub.view.goTo(cfi);
  }
}

/** Una página adelante o atrás (solo en páginas de lado). */
async function pasar(paso) {
  if (forma !== 'paged') return;
  if (pdf) return irAPaginaPdf((pdf.pagina || 1) + paso);
  if (epub) await (paso > 0 ? epub.view.next() : epub.view.prev());
}

// Al girar el teléfono o cambiar el tamaño de la ventana, la página se vuelve a acomodar (foliate lo hace
// solo con el EPUB).
let esperaDeTamano = null;
window.addEventListener('resize', () => {
  clearTimeout(esperaDeTamano);
  esperaDeTamano = setTimeout(() => pdf && reacomodarPdf(), 150);
});

/**
 * Pasar de página sin botones (RF-BR7b) sobre `objetivo` (la raíz del PDF, o el documento de cada capítulo
 * del EPUB). Seleccionar o arrastrar sobre el texto nunca cambia de página; solo un toque o clic quieto, o
 * un deslizamiento corto del dedo.
 */
function gestosDePaginas(objetivo, esEpub = false) {
  const doc = objetivo.ownerDocument ?? objetivo;
  const ventana = doc.defaultView ?? window;
  let inicio = null;

  /** La x en la ventana del motor: los capítulos del EPUB viven en un iframe que foliate corre de lado. */
  const xEnPantalla = (e) => e.clientX + (ventana.frameElement && ventana !== window ? ventana.frameElement.getBoundingClientRect().left : 0);
  const haySeleccion = () => !!doc.getSelection?.()?.toString();

  objetivo.addEventListener('pointerdown', (e) => {
    inicio = forma === 'paged' && e.isPrimary ? { x: e.clientX, y: e.clientY, t: e.timeStamp, toque: e.pointerType === 'touch' } : null;
  });
  objetivo.addEventListener('pointerup', (e) => {
    const i = inicio;
    inicio = null;
    if (!i || forma !== 'paged' || haySeleccion()) return;
    const dx = e.clientX - i.x;
    const dy = e.clientY - i.y;
    const dt = e.timeStamp - i.t;
    // Deslizar el dedo (en EPUB lo hace foliate).
    if (i.toque && !esEpub && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 700) {
      void pasar(dx < 0 ? 1 : -1);
      return;
    }
    // Un toque o clic quieto; mantener presionado es para seleccionar.
    if (Math.hypot(dx, dy) > 8 || dt > 500) return;
    if (e.target?.closest?.('a[href]')) return;
    const x = xEnPantalla(e) / window.innerWidth;
    if (x < 0.2) void pasar(-1);
    else if (x > 0.8) void pasar(1);
    else enviar({ type: 'tap' });
  });
  objetivo.addEventListener('pointercancel', () => (inicio = null));

  // El trackpad (o la rueda): un deslizamiento largo pasa una sola página. Se espera a que pare antes de
  // dejar pasar otra.
  let acumulado = 0;
  let bloqueado = false;
  let pausa = null;
  objetivo.addEventListener(
    'wheel',
    (e) => {
      if (forma !== 'paged' || e.ctrlKey) return; // Ctrl + rueda es el zoom (13c)
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      clearTimeout(pausa);
      pausa = setTimeout(() => {
        acumulado = 0;
        bloqueado = false;
      }, 250);
      if (bloqueado) return;
      acumulado += delta;
      if (Math.abs(acumulado) > 40) {
        bloqueado = true;
        void pasar(acumulado > 0 ? 1 : -1);
      }
    },
    { passive: false },
  );

  // El documento del motor ya escucha las teclas (abajo); los capítulos del EPUB son otros documentos.
  if (doc !== document) doc.addEventListener('keydown', teclas);
}

function teclas(e) {
  if (forma !== 'paged' || e.metaKey || e.ctrlKey || e.altKey) return;
  const adelante = e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey);
  const atras = e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey);
  if (!adelante && !atras) return;
  e.preventDefault();
  void pasar(adelante ? 1 : -1);
}

document.addEventListener('keydown', teclas);

// ─── Ir a ────────────────────────────────────────────────────────────────────

async function irA({ page, cfi, fraction }) {
  if (pdf) {
    irAPaginaPdf(page ?? Math.round((fraction ?? 0) * (pdf.total - 1)) + 1);
    return;
  }
  if (epub) {
    if (cfi) await epub.view.goTo(cfi);
    else if (typeof fraction === 'number') await epub.view.goToFraction(Math.min(Math.max(0, fraction), 1));
  }
}

// ─── Buscar (RF-BR4) ─────────────────────────────────────────────────────────

const textoDePagina = new Map(); // n → string[] (los pedazos de texto de pdf.js)

async function pedazosPdf(n) {
  if (!textoDePagina.has(n)) {
    const pagina = await pdf.doc.getPage(n);
    const contenido = await pagina.getTextContent();
    textoDePagina.set(
      n,
      contenido.items.map((i) => i.str ?? ''),
    );
  }
  return textoDePagina.get(n);
}

async function buscar(consulta) {
  limpiarBusqueda();
  busqueda.consulta = consulta;
  if (!consulta.trim()) return enviar({ type: 'search', count: 0, index: -1 });
  enviar({ type: 'search', searching: true, count: 0, index: -1 });
  const resultados = [];
  if (pdf) {
    for (let n = 1; n <= pdf.total; n++) {
      if (busqueda.consulta !== consulta) return; // llegó otra búsqueda
      for (const r of buscarEnPedazos(await pedazosPdf(n), consulta)) resultados.push({ pagina: n, ...r });
    }
  } else if (epub) {
    for await (const r of epub.view.search({ query: consulta })) {
      if (busqueda.consulta !== consulta) return;
      if (r === 'done') break;
      for (const s of r.subitems ?? []) resultados.push({ cfi: s.cfi });
    }
  }
  busqueda.resultados = resultados;
  busqueda.actual = resultados.length ? 0 : -1;
  if (pdf) for (const n of pdf.renderizadas.keys()) marcarPagina(n);
  await irAResultado();
}

async function pasoDeBusqueda(paso) {
  const total = busqueda.resultados.length;
  if (!total) return;
  busqueda.actual = (busqueda.actual + paso + total) % total;
  if (pdf) for (const n of pdf.renderizadas.keys()) marcarPagina(n);
  await irAResultado();
}

async function irAResultado() {
  const r = busqueda.resultados[busqueda.actual];
  enviar({ type: 'search', count: busqueda.resultados.length, index: busqueda.actual });
  if (!r) return;
  if (pdf && forma === 'paged') {
    irAPaginaPdf(r.pagina);
  } else if (pdf) {
    const div = pdf.paginas[r.pagina - 1];
    const marca = div.querySelector('mark.actual');
    if (marca) marca.scrollIntoView({ block: 'center' });
    else {
      div.scrollIntoView({ block: 'start' });
      // Al pintarse la página, `marcarPagina` centra la marca actual.
      pdf.centrarAlMarcar = true;
    }
  } else if (epub && r.cfi) await epub.view.goTo(r.cfi);
}

function limpiarBusqueda() {
  busqueda = { consulta: '', resultados: [], actual: -1 };
  textoDePagina.clear();
  try {
    epub?.view.clearSearch?.();
  } catch {
    // la sección con marcas ya no está pintada
  }
  if (pdf) for (const n of pdf.renderizadas.keys()) marcarPagina(n);
}

/** Pinta las coincidencias en la capa de texto de una página ya dibujada. */
function marcarPagina(n) {
  const estado = pdf?.renderizadas.get(n);
  const capa = estado?.capa;
  if (!capa) return;
  const divs = capa.textDivs;
  const textos = capa.textContentItemsStr;
  divs.forEach((div, i) => {
    if (div.firstElementChild) div.textContent = textos[i];
  });
  if (!busqueda.consulta) return;
  const actual = busqueda.resultados[busqueda.actual];
  const enPagina = buscarEnPedazos(textos, busqueda.consulta);
  // Cuál de las de esta página es la actual: su número dentro de la página.
  const indiceActual = actual?.pagina === n ? busqueda.resultados.filter((r, k) => r.pagina === n && k < busqueda.actual).length : -1;
  const porItem = new Map();
  enPagina.forEach((r, k) => {
    for (const t of r.tramos) {
      const lista = porItem.get(t.item) ?? [];
      lista.push({ ...t, actual: k === indiceActual });
      porItem.set(t.item, lista);
    }
  });
  for (const [item, tramos] of porItem) {
    const div = divs[item];
    const texto = [...textos[item]];
    if (!div) continue;
    div.replaceChildren();
    let i = 0;
    for (const t of tramos.sort((a, b) => a.inicio - b.inicio)) {
      if (t.inicio > i) div.append(texto.slice(i, t.inicio).join(''));
      const marca = document.createElement('mark');
      if (t.actual) marca.className = 'actual';
      marca.textContent = texto.slice(t.inicio, t.fin).join('');
      div.append(marca);
      i = t.fin;
    }
    if (i < texto.length) div.append(texto.slice(i).join(''));
  }
  if (pdf.centrarAlMarcar && indiceActual >= 0 && forma !== 'paged') {
    pdf.centrarAlMarcar = false;
    capa.textDivs.find((d) => d.querySelector('mark.actual'))?.scrollIntoView({ block: 'center' });
  }
}

// ─── Portada de un PDF (RF-BL12) ─────────────────────────────────────────────

/** Dibuja la primera página y la devuelve como JPEG: es la portada del PDF, como en el Finder. */
async function portada(url, ancho) {
  const { doc, tarea } = await cargarPdf(url);
  try {
    const pagina = await doc.getPage(1);
    const base = pagina.getViewport({ scale: 1 });
    const vista = pagina.getViewport({ scale: ancho / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vista.width);
    canvas.height = Math.round(vista.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pagina.render({ canvasContext: ctx, canvas, viewport: vista }).promise;
    enviar({ type: 'cover', dataUrl: canvas.toDataURL('image/jpeg', 0.85) });
  } finally {
    tarea.destroy();
  }
}

enviar({ type: 'ready' });
