/**
 * Motor de lectura de KAVI Library (spec 13b §4, T279).
 *
 * Una sola página para las tres plataformas (spec 13 §5): la web la abre en un iframe del mismo
 * origen y el teléfono en un WebView. La app y el motor solo se hablan por mensajes JSON; los tipos
 * viven del lado de la app en `src/lib/library/reader-protocol.ts`.
 *
 * App → motor: `open`, `openBegin` / `openChunk` / `openEnd`, `goTo`, `mode`, `turn`, `theme`, `search`,
 * `searchStep`, `searchClear`, `cover`, y de la capa de anotaciones (T286) `annotations`, `tool`, `select`,
 * `clearSelection`; de la letra y el zoom (T288) `text` y `zoom`.
 * Motor → app: `ready`, `opened`, `position`, `search`, `tap`, `cover`, `error`; `place`, `select`,
 * `move`, `edit`, `selection` (ver `annotations.js`); `zoom` y `textSize` (T288).
 *
 * Zoom y letra (13c, RF-BH1 – RF-BH3; T288): en PDF se acerca con pellizco o Ctrl/⌘ y la rueda (la página se
 * vuelve a pintar a ese tamaño, nítida); doble toque o "Ajustar" vuelve a la página entera. En EPUB el
 * pellizco cambia el tamaño de letra, que es lo que cuenta en un libro que se reacomoda. En el libro real se
 * acerca la hoja y se mueve arrastrando; mientras está acercada no se pasa de hoja.
 *
 * PDF con pdf.js (página fija, con capa de texto para buscar); EPUB con foliate-js (texto que se
 * reacomoda, posición por CFI). En la web el archivo se descarga directo de R2 con la dirección firmada que
 * manda la app; en el teléfono (T285, sin conexión) la app lo guarda en el dispositivo y lo manda en
 * pedazos (`openBegin`, `openChunk`, `openEnd`).
 *
 * Tres formas de leer (13b, RF-BR5 – RF-BR8; T283, T284): **scroll** (una página debajo de otra),
 * **páginas de lado** (una a la vez, que se desliza) y **libro real** (la hoja se dobla; ver `book.js`).
 * En las dos últimas se pasa de página sin botones (RF-BR7b): toque o clic en el 20 % de cada borde,
 * deslizar el dedo, el trackpad hacia los lados, las flechas, Re Pág / Av Pág y la barra espaciadora. El
 * centro avisa `tap` para que la app muestre u oculte sus controles.
 */
import { crearCapa } from './annotations.js';
import { buscarEnPedazos } from './text-search.js';
import { caraDeLetra, estilosDeTexto, familiaDe, letraValida, tamanoValido } from './text.js';
import { escucharPellizco, escucharRuedaConCtrl, pellizcando } from './zoom.js';

// Las librerías van junto al motor. Empaquetado en la app (T285), la página no tiene dirección propia: los
// archivos de apoyo de pdf.js (mapas de caracteres, fuentes) se piden a la web, si hay red.
const VENDOR = new URL('./vendor/', globalThis.KAVI_BASE ?? import.meta.url).href;

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

/** El libro que llega en pedazos desde la app (T285): se arma aquí y se abre al llegar el último. */
let llegando = null;

/** "Hola" en base64 → sus bytes. */
function bytesDe(base64) {
  const texto = atob(base64);
  const bytes = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i);
  return bytes;
}

async function abrir(m, fuente) {
  cerrar();
  forma = formaDe(m.mode);
  if (m.format === 'pdf') await abrirPdf(fuente, m.position);
  else if (m.format === 'epub') await abrirEpub(fuente, m.position);
  else throw Object.assign(new Error('formato'), { name: 'FormatoDesconocido' });
}

async function atender(m) {
  switch (m.type) {
    case 'open':
      return abrir(m, { url: m.url });
    case 'openBegin':
      llegando = { m, datos: new Uint8Array(Math.max(0, m.size | 0)), lleno: 0 };
      return;
    case 'openChunk': {
      if (!llegando) return;
      const pedazo = bytesDe(m.data ?? '');
      if (llegando.lleno + pedazo.length > llegando.datos.length) throw Object.assign(new Error('tamaño'), { name: 'FormatoDesconocido' });
      llegando.datos.set(pedazo, llegando.lleno);
      llegando.lleno += pedazo.length;
      return;
    }
    case 'openEnd': {
      const listo = llegando;
      llegando = null;
      if (!listo || listo.lleno !== listo.datos.length) throw Object.assign(new Error('incompleto'), { name: 'FormatoDesconocido' });
      return abrir(listo.m, { datos: listo.datos });
    }
    case 'goTo':
      return irA(m);
    case 'mode':
      return cambiarForma(formaDe(m.mode));
    case 'theme':
      return cambiarTema(m.page, m.text);
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
    case 'annotations':
      return anotaciones.actualizar(m.items);
    case 'tool':
      return anotaciones.herramienta(m.tool);
    case 'select':
      return anotaciones.elegir(m.id);
    case 'clearSelection':
      return anotaciones.soltarSeleccion();
    case 'text':
      return cambiarTexto(m.size, m.font);
    case 'zoom':
      return fijarZoom(typeof m.level === 'number' ? m.level : 1);
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
let forma = 'scroll'; // 'scroll' | 'paged' | 'book'
let libro = null; // el libro real abierto (book.js): { pasar, irA | irACfi, cerrar, … }
let libroRaiz = null;

const formaDe = (valor) => (valor === 'paged' || valor === 'book' ? valor : 'scroll');
/** Páginas de lado y libro real se pasan igual: sin scroll, con bordes, teclado y trackpad. */
const porPaginas = () => forma !== 'scroll';
let epub = null; // { view, raiz, ultimo, fraccion }
let busqueda = { consulta: '', resultados: [], actual: -1 };

/** Lo pegado encima de las páginas (13c, T286). */
const anotaciones = crearCapa(
  { forma: () => forma, pdf: () => pdf, epub: () => epub, libro: () => libro, paginaBlanca: () => tema.pagina.toUpperCase() === '#FFFFFF' },
  enviar,
);

/** Al terminar de seleccionar (la selección deja de cambiar), la capa avisa qué quedó seleccionado (T287). */
function escucharSeleccion(doc) {
  let espera = null;
  doc.addEventListener('selectionchange', () => {
    clearTimeout(espera);
    espera = setTimeout(() => anotaciones.alCambiarSeleccion(doc), 250);
  });
}
escucharSeleccion(document);

function cerrar() {
  limpiarBusqueda();
  anotaciones.cerrar();
  zoom = 1;
  salirDelLibro();
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
  pdfjsCargado ??= import('./vendor/pdfjs/pdf.min.mjs').then((lib) => {
    // Empaquetado, el worker viene como texto dentro de la página; en la web, su archivo.
    if (globalThis.KAVI_PDF_WORKER) {
      const url = URL.createObjectURL(new Blob([globalThis.KAVI_PDF_WORKER], { type: 'text/javascript' }));
      lib.GlobalWorkerOptions.workerPort = new Worker(url, { type: 'module' });
    } else lib.GlobalWorkerOptions.workerSrc = `${VENDOR}pdfjs/pdf.worker.min.mjs`;
    return lib;
  });
  return pdfjsCargado;
}

/**
 * Descarga el libro completo y lo abre. No se pide por partes: la dirección firmada de R2 vence en
 * una hora y una sesión de lectura puede durar más; con todo en memoria, el vencimiento no importa.
 */
async function cargarPdf(fuente) {
  const [lib, datos] = await Promise.all([pdfjs(), bytesDeFuente(fuente)]);
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

/** Los bytes del libro: los que ya llegaron de la app, o descargados de la dirección firmada. */
async function bytesDeFuente(fuente) {
  if (fuente.datos) return fuente.datos;
  const respuesta = await fetch(fuente.url);
  if (!respuesta.ok) throw Object.assign(new Error(`HTTP ${respuesta.status}`), { name: 'ResponseException' });
  return new Uint8Array(await respuesta.arrayBuffer());
}

/**
 * La escala de una página en pantalla. En scroll, todo el ancho con un margen, sin pasar de 900 px (web
 * ancha); en páginas de lado, la página entera a la vista: lo que quepa a lo ancho y a lo alto.
 */
function escalaDe(base) {
  const ancho = Math.min(window.innerWidth - 16, 900) / base.width;
  if (forma !== 'paged') return ancho * zoom;
  return Math.min((window.innerWidth - 16) / base.width, (window.innerHeight - 16) / base.height) * zoom;
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
  pdf.raiz.classList.toggle('acercado', acercado());
  for (const n of [...pdf.renderizadas.keys()]) despintar(n);
  medirProvisionales();
  observar();
  irAPaginaPdf(pagina, false);
}

async function abrirPdf(fuente, posicion) {
  const { doc, tarea } = await cargarPdf(fuente);
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
  acercarConGestos(raiz);

  raiz.addEventListener('scroll', () => requestAnimationFrame(avisarPosicion), { passive: true });
  // Un PDF puede prohibir copiar su texto (RF-BH9): se sigue pudiendo subrayar, no copiar.
  const permisos = await doc.getPermissions().catch(() => null);
  const lib = await pdfjs();
  enviar({ type: 'opened', total, copiable: !permisos || permisos.includes(lib.PermissionFlag.COPY) });

  const inicio = Math.min(Math.max(1, posicion?.page ?? 1), total);
  if (forma === 'book') await entrarAlLibro(inicio);
  else irAPaginaPdf(inicio, false);
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
  anotaciones.pintarPaginaPdf(n, div);
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
  if (!pdf || forma !== 'scroll') return;
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

async function abrirEpub(fuente, posicion) {
  const [, { Overlayer }] = await Promise.all([import('./vendor/foliate/view.js'), import('./vendor/foliate/overlayer.js')]);
  const archivo = new File([await bytesDeFuente(fuente)], 'libro.epub', { type: 'application/epub+zip' });

  const raiz = document.createElement('div');
  raiz.id = 'epub';
  document.body.append(raiz);
  const view = document.createElement('foliate-view');
  raiz.append(view);
  epub = { view, raiz };

  let ultimo = '';
  view.addEventListener('relocate', (e) => {
    const { fraction, cfi, location } = e.detail ?? {};
    if (epub && typeof fraction === 'number' && forma !== 'book') epub.fraccion = fraction;
    // foliate avisa varias veces por el mismo lugar (al pintar, al acomodar): solo cuenta si cambió.
    // En el libro real la posición la dice el hojeador; foliate queda escondido detrás.
    if (!cfi || cfi === ultimo || forma === 'book') return;
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
  // Los subrayados (T287) los dibuja foliate con su capa, con el color y el estilo de cada uno.
  view.addEventListener('draw-annotation', (e) => {
    const { draw, annotation } = e.detail;
    const dibujo = anotaciones.dibujoEpub(annotation?.value);
    if (!dibujo) return;
    if (dibujo.estilo === 'underline') draw(Overlayer.underline, { color: dibujo.color, width: 2, padding: 1 });
    else if (dibujo.estilo === 'strike') draw(Overlayer.strikethrough, { color: dibujo.color, width: 2 });
    else draw(Overlayer.highlight, { color: dibujo.color });
  });
  // Un capítulo que se vuelve a cargar trae su capa de dibujo vacía.
  view.addEventListener('create-overlay', () => anotaciones.recargarEpub());

  await view.open(archivo);
  view.renderer.setAttribute('margin', '32px');
  view.renderer.setAttribute('max-inline-size', '720px');
  formaEpub(view);
  await cargandoTexto;
  view.renderer.setStyles?.(estilosEpub());
  // Los toques en los bordes y el centro, el teclado y el trackpad van dentro de cada capítulo (otro
  // documento); el deslizar con el dedo ya lo hace foliate.
  view.addEventListener('load', (e) => {
    gestosDePaginas(e.detail.doc, true);
    escucharSeleccion(e.detail.doc);
    letraConGestos(e.detail.doc);
  });
  gestosDePaginas(raiz, true);
  letraConGestos(raiz);
  // El idioma del libro: con él, "Definir" sabe si va al diccionario de inglés o a la RAE (T287).
  const idioma = view.language?.canonical ?? [].concat(view.book?.metadata?.language ?? [])[0] ?? null;
  enviar({ type: 'opened', total: null, copiable: true, lang: typeof idioma === 'string' ? idioma : null });
  if (posicion?.cfi) await view.init({ lastLocation: posicion.cfi });
  else if (posicion?.fraction) await view.goToFraction(posicion.fraction);
  else await view.init({ showTextStart: false });
  if (forma === 'book') await entrarAlLibro(posicion?.cfi ?? null);
  anotaciones.repintar();
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

/**
 * Cambiar de forma sin perder el lugar: en PDF, la misma página; en EPUB, el mismo CFI (foliate o el
 * libro real lo traducen a su página).
 */
async function cambiarForma(nueva) {
  if (nueva === forma) return;
  const antes = forma;
  // Dónde va: lo sabe quien está a la vista.
  const pagina = libro?.pagina?.() ?? pdf?.pagina ?? 1;
  const cfi = libro?.cfi?.() ?? epub?.ultimo ?? null;
  forma = nueva;
  if (acercado()) enviar({ type: 'zoom', level: 1 });
  zoom = 1;
  if (antes === 'book') salirDelLibro();
  if (nueva === 'book') {
    await entrarAlLibro(pdf ? pagina : cfi);
    return anotaciones.repintar();
  }
  if (pdf) {
    pdf.pagina = pagina;
    reacomodarPdf();
  } else if (epub) {
    formaEpub(epub.view);
    if (cfi) await epub.view.goTo(cfi);
  }
  anotaciones.repintar();
}

// ─── Tema del lector (13c, RF-BH5) ───────────────────────────────────────────

const HEX = /^#[0-9a-fA-F]{6}$/;
let tema = { pagina: '#FFFFFF', letra: '#1A1A1A' };

/**
 * Los colores de la página y de la letra. En EPUB el texto toma la letra y el fondo la página (lo que el
 * libro pinte de otro color se iguala). Un PDF es una imagen: se le pasa un filtro de dos tonos, así lo
 * blanco queda del color de la página y lo negro del de la letra (las fotos se ven en esos dos tonos). Con
 * página blanca, el PDF se queda tal cual.
 */
function cambiarTema(pagina, letra) {
  if (!HEX.test(pagina ?? '') || !HEX.test(letra ?? '')) return;
  tema = { pagina, letra };
  aplicarTema();
}

function aplicarTema() {
  const raiz = document.documentElement.style;
  raiz.setProperty('--papel', tema.pagina);
  raiz.setProperty('--tinta', tema.letra);
  const blanca = tema.pagina.toUpperCase() === '#FFFFFF';
  filtroDeDosTonos(tema.pagina, tema.letra);
  raiz.setProperty('--filtro-pdf', blanca ? 'none' : 'url(#kavi-tema)');
  if (epub) epub.view.renderer.setStyles?.(estilosEpub());
}

/** Lo que se le pone a cada capítulo de un EPUB (foliate lee el fondo de `--theme-bg-color`). */
function estilosDeTema() {
  const { pagina, letra } = tema;
  return `html { --theme-bg-color: ${pagina}; }
html, body { background: ${pagina} !important; color: ${letra} !important; }
body *:not(img):not(svg):not(video) { color: inherit !important; background-color: transparent !important; }
a:link, a:visited { color: inherit !important; }`;
}

/** El filtro SVG del PDF: pasa a grises y lleva del negro (letra) al blanco (página). */
function filtroDeDosTonos(pagina, letra) {
  const canal = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
  const tabla = (i) => `${canal(letra, i).toFixed(4)} ${canal(pagina, i).toFixed(4)}`;
  let svg = document.getElementById('kavi-filtros');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'kavi-filtros';
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    document.body.append(svg);
  }
  svg.innerHTML = `<filter id="kavi-tema" color-interpolation-filters="sRGB">
<feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0"/>
<feComponentTransfer><feFuncR type="table" tableValues="${tabla(0)}"/><feFuncG type="table" tableValues="${tabla(1)}"/><feFuncB type="table" tableValues="${tabla(2)}"/></feComponentTransfer>
</filter>`;
}

// ─── Libro real (RF-BR5, T284) ───────────────────────────────────────────────

let creandoLibro = null;

/** Abre el libro real donde va (la página del PDF o el CFI del EPUB) y esconde la otra vista. */
async function entrarAlLibro(donde) {
  const { libroPdf, libroEpub } = await import('./book.js');
  salirDelLibro();
  zoom = 1;
  panLibro = { x: 0, y: 0 };
  libroRaiz = document.createElement('div');
  libroRaiz.id = 'libro';
  document.body.append(libroRaiz);
  gestosDePaginas(libroRaiz, true);
  acercarLibroConGestos(libroRaiz);
  if (pdf) {
    pdf.raiz.style.display = 'none';
    libro = libroPdf({
      raiz: libroRaiz,
      doc: pdf.doc,
      total: pdf.total,
      base: pdf.base,
      inicio: typeof donde === 'number' ? donde : 1,
      pintar: pintarEnCanvas,
      capa: anotaciones.capaLibroPdf,
      avisar: ({ pagina, hasta, total }) => {
        pdf.pagina = pagina;
        enviar({ type: 'position', page: pagina, pageEnd: hasta, total, fraction: pagina / total });
      },
    });
    return;
  }
  if (epub) {
    epub.raiz.style.display = 'none';
    const raiz = libroRaiz;
    const tarea = libroEpub({
      raiz,
      view: epub.view,
      cfi: typeof donde === 'string' ? donde : epub.ultimo,
      texto: { tamano: texto.tamano, familia: familiaDe(texto.letra) },
      capa: anotaciones.capaLibroEpub,
      avisar: ({ cfi, pagina, total, fraccion }) => {
        if (epub) epub.ultimo = cfi;
        enviar({ type: 'position', cfi, page: pagina, total, fraction: fraccion });
      },
    });
    creandoLibro = tarea;
    const creado = await tarea;
    // Si mientras se acomodaba se cambió de forma o de libro, este ya no va.
    if (creandoLibro !== tarea || libroRaiz !== raiz) return creado.cerrar();
    creandoLibro = null;
    libro = creado;
  }
}

function salirDelLibro() {
  creandoLibro = null;
  try {
    libro?.cerrar();
  } catch {
    // ya se había ido
  }
  libro = null;
  libroRaiz?.remove();
  libroRaiz = null;
  if (pdf) pdf.raiz.style.display = '';
  if (epub) epub.raiz.style.display = '';
}

/** Pinta una página del PDF en el canvas de una hoja del libro real. */
async function pintarEnCanvas(n, canvas, ancho, alto) {
  if (!pdf) return;
  const pagina = await pdf.doc.getPage(n);
  const base = pagina.getViewport({ scale: 1 });
  const vista = pagina.getViewport({ scale: Math.min(ancho / base.width, alto / base.height) });
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate((canvas.width - vista.width) / 2, (canvas.height - vista.height) / 2);
  await pagina.render({ canvasContext: ctx, canvas, viewport: vista }).promise.catch(() => undefined);
}

/** Una página adelante o atrás (páginas de lado o libro real). */
async function pasar(paso) {
  if (!porPaginas()) return;
  if (forma === 'book') return libro?.pasar(paso);
  if (pdf) return irAPaginaPdf((pdf.pagina || 1) + paso);
  if (epub) await (paso > 0 ? epub.view.next() : epub.view.prev());
}

// Al girar el teléfono o cambiar el tamaño de la ventana, la página se vuelve a acomodar sin perder el
// lugar (foliate lo hace solo con el EPUB): en el libro real, de una a dos páginas o al revés.
let esperaDeTamano = null;
window.addEventListener('resize', () => {
  clearTimeout(esperaDeTamano);
  esperaDeTamano = setTimeout(() => {
    if (forma === 'book' && (libro || creandoLibro)) {
      const donde = pdf ? (libro?.pagina?.() ?? pdf.pagina) : (libro?.cfi?.() ?? epub?.ultimo);
      void entrarAlLibro(donde);
    } else if (pdf) reacomodarPdf();
  }, 200);
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
    inicio = e.isPrimary ? { x: e.clientX, y: e.clientY, t: e.timeStamp, toque: e.pointerType === 'touch' } : null;
  });
  let ultimoToque = 0;
  objetivo.addEventListener('pointerup', (e) => {
    const i = inicio;
    inicio = null;
    // Soltar los dedos de un pellizco no es deslizar ni tocar.
    if (!i || haySeleccion() || pellizcando()) return;
    const dx = e.clientX - i.x;
    const dy = e.clientY - i.y;
    const dt = e.timeStamp - i.t;
    // Doble toque con la página acercada: vuelve a verse entera (RF-BH1).
    if (i.toque && Math.hypot(dx, dy) <= 8 && dt <= 500 && acercado() && forma !== 'book') {
      const doble = e.timeStamp - ultimoToque < 320;
      ultimoToque = e.timeStamp;
      if (doble) {
        fijarZoom(1);
        return;
      }
    }
    // Un toque quieto es primero de la capa de anotaciones: pegar ahí o soltar lo elegido (T286), en
    // cualquier forma de leer.
    if (Math.hypot(dx, dy) <= 8 && dt <= 500 && anotaciones.alTocar(e, doc)) return;
    if (!porPaginas()) return;
    // Acercada, la página se recorre con el dedo: no se pasa de hoja (los controles siguen en el centro).
    if (acercado()) {
      if (Math.hypot(dx, dy) <= 8 && dt <= 500) enviar({ type: 'tap' });
      return;
    }
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
      // Ctrl/⌘ + rueda es el zoom (13c); acercada, la rueda recorre la página.
      if (!porPaginas() || e.ctrlKey || e.metaKey || acercado()) return;
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
  if (!porPaginas() || e.metaKey || e.ctrlKey || e.altKey) return;
  const adelante = e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey);
  const atras = e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey);
  if (!adelante && !atras) return;
  e.preventDefault();
  void pasar(adelante ? 1 : -1);
}

document.addEventListener('keydown', teclas);

// ─── Zoom (RF-BH1, T288) ─────────────────────────────────────────────────────

const ZOOM_MAX = 4;
let zoom = 1; // del PDF (scroll y de lado) y del libro real
let panLibro = { x: 0, y: 0 };
let vistaPrevia = null;
const acercado = () => zoom > 1.001;
const limitarZoom = (z) => Math.min(ZOOM_MAX, Math.max(1, Math.round(z * 20) / 20));

/** Mientras se pellizca, la página bajo los dedos crece sola (barato); al soltar se pinta a su tamaño. */
function mostrarVistaPrevia(escala, centro) {
  if (!pdf) return;
  const pagina = vistaPrevia ?? document.elementsFromPoint(centro.x, centro.y).find((x) => x.classList?.contains('pagina')) ?? pdf.paginas[(pdf.pagina || 1) - 1];
  if (!pagina) return;
  if (!vistaPrevia) {
    const r = pagina.getBoundingClientRect();
    pagina.style.transformOrigin = `${centro.x - r.left}px ${centro.y - r.top}px`;
    vistaPrevia = pagina;
  }
  pagina.style.scale = String(limitarZoom(zoom * escala) / zoom);
}

function quitarVistaPrevia() {
  if (!vistaPrevia) return;
  vistaPrevia.style.scale = '';
  vistaPrevia.style.transformOrigin = '';
  vistaPrevia = null;
}

/** Acercar o alejar el PDF (o el libro real) a `nuevo`, dejando quieto lo que está bajo `centro`. */
function fijarZoom(nuevo, centro = null) {
  const z = limitarZoom(nuevo);
  quitarVistaPrevia();
  if (forma === 'book') return zoomDelLibro(z);
  if (!pdf || Math.abs(z - zoom) < 0.01) return;
  const f = z / zoom;
  const raiz = pdf.raiz;
  const r = raiz.getBoundingClientRect();
  const c = centro ? { x: centro.x - r.left, y: centro.y - r.top } : { x: raiz.clientWidth / 2, y: raiz.clientHeight / 2 };
  zoom = z;
  if (forma === 'paged') {
    const hoja = () => pdf.paginas[(pdf.pagina || 1) - 1]?.parentElement;
    const antes = hoja();
    const x = (antes?.scrollLeft ?? 0) + c.x;
    const y = (antes?.scrollTop ?? 0) + c.y;
    reacomodarPdf();
    const despues = hoja();
    if (despues) {
      despues.scrollLeft = x * f - c.x;
      despues.scrollTop = y * f - c.y;
    }
  } else {
    const x = raiz.scrollLeft + c.x;
    const y = raiz.scrollTop + c.y;
    raiz.classList.toggle('acercado', acercado());
    for (const n of [...pdf.renderizadas.keys()]) despintar(n);
    medirProvisionales();
    observar();
    raiz.scrollLeft = x * f - c.x;
    raiz.scrollTop = y * f - c.y;
  }
  enviar({ type: 'zoom', level: zoom });
}

/** Pellizco y Ctrl/⌘ + rueda sobre el PDF. */
function acercarConGestos(raiz) {
  const opciones = {
    activo: () => forma !== 'book',
    alMover: (escala, centro) => mostrarVistaPrevia(escala, centro),
    alTerminar: (escala, centro) => fijarZoom(zoom * escala, centro),
  };
  escucharPellizco(raiz, opciones);
  escucharRuedaConCtrl(raiz, opciones);
}

/** El libro real acercado: la caja crece desde el centro y se mueve con `panLibro`. */
function zoomDelLibro(z) {
  zoom = z;
  if (!acercado()) panLibro = { x: 0, y: 0 };
  aplicarZoomDelLibro();
  enviar({ type: 'zoom', level: zoom });
}

function aplicarZoomDelLibro(escalaEnVivo = null) {
  const caja = libroRaiz?.querySelector('.libro-caja');
  if (!caja) return;
  const z = escalaEnVivo ?? zoom;
  panLibro = limitarPan(caja, panLibro, z);
  caja.style.scale = z > 1.001 ? String(z) : '';
  caja.style.translate = z > 1.001 ? `${panLibro.x}px ${panLibro.y}px` : '';
  lupa(z > 1.001);
}

/** Que la hoja acercada no se salga de la pantalla al moverla. */
function limitarPan(caja, pan, z) {
  const ancho = caja.offsetWidth;
  const alto = caja.offsetHeight;
  const mx = Math.max(0, (ancho * z - window.innerWidth) / 2 + 16);
  const my = Math.max(0, (alto * z - window.innerHeight) / 2 + 16);
  return { x: Math.min(mx, Math.max(-mx, pan.x)), y: Math.min(my, Math.max(-my, pan.y)) };
}

/**
 * Con el libro real acercado, una capa encima recibe los dedos: arrastrar mueve la hoja (no la dobla) y el
 * doble toque vuelve a verla entera.
 */
function lupa(activa) {
  let capa = libroRaiz?.querySelector(':scope > .lupa');
  if (!activa || !libroRaiz) {
    capa?.remove();
    return;
  }
  if (capa) return;
  capa = document.createElement('div');
  capa.className = 'lupa';
  let arrastre = null;
  let ultimo = 0;
  capa.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (!e.isPrimary) return;
    arrastre = { x: e.clientX - panLibro.x, y: e.clientY - panLibro.y, x0: e.clientX, y0: e.clientY };
    capa.setPointerCapture?.(e.pointerId);
  });
  capa.addEventListener('pointermove', (e) => {
    if (!arrastre || pellizcando()) return;
    panLibro = { x: e.clientX - arrastre.x, y: e.clientY - arrastre.y };
    aplicarZoomDelLibro();
  });
  capa.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    const quieto = arrastre && Math.hypot(e.clientX - arrastre.x0, e.clientY - arrastre.y0) < 8;
    arrastre = null;
    if (!quieto || pellizcando()) return;
    if (e.timeStamp - ultimo < 320) fijarZoom(1);
    ultimo = e.timeStamp;
  });
  libroRaiz.append(capa);
}

function acercarLibroConGestos(raiz) {
  let base = null;
  const opciones = {
    alMover: (escala) => {
      base ??= zoom;
      aplicarZoomDelLibro(limitarZoom(base * escala));
    },
    alTerminar: (escala) => {
      const desde = base ?? zoom;
      base = null;
      zoomDelLibro(limitarZoom(desde * escala));
    },
  };
  escucharPellizco(raiz, opciones);
  escucharRuedaConCtrl(raiz, opciones);
  // Con dos dedos, la hoja no se empieza a doblar: el segundo dedo no le llega al hojeador.
  raiz.addEventListener('touchstart', (e) => e.touches.length > 1 && e.stopPropagation(), true);
}

// ─── Letra y tamaño de un EPUB (RF-BH2, RF-BH3; T288) ─────────────────────────

let texto = { tamano: 100, letra: 'original' };
let cssTexto = estilosDeTexto(texto, '');
let cargandoTexto = Promise.resolve();

/** Tema y texto juntos: lo que foliate le pone a cada capítulo. */
function estilosEpub() {
  return `${estilosDeTema()}\n${cssTexto}`;
}

function cambiarTexto(tamano, letra) {
  const nuevo = { tamano: tamanoValido(tamano), letra: letraValida(letra) };
  if (nuevo.tamano === texto.tamano && nuevo.letra === texto.letra) return cargandoTexto;
  const antes = texto;
  texto = nuevo;
  cargandoTexto = (async () => {
    const caras = await caraDeLetra(texto.letra, VENDOR).catch(() => '');
    cssTexto = estilosDeTexto(texto, caras);
    letrasDelDocumento(caras);
    if (!epub) return;
    epub.view.renderer.setStyles?.(estilosEpub());
    // En el libro real las hojas se acomodaron con la letra de antes: se vuelven a hacer en el mismo lugar.
    if (forma === 'book' && (antes.tamano !== texto.tamano || antes.letra !== texto.letra)) await entrarAlLibro(libro?.cfi?.() ?? epub.ultimo);
  })();
  return cargandoTexto;
}

/** Las letras en el documento del motor, para las hojas del libro real (viven en su sombra). */
function letrasDelDocumento(caras) {
  let estilo = document.getElementById('kavi-letras');
  if (!estilo) {
    estilo = document.createElement('style');
    estilo.id = 'kavi-letras';
    document.head.append(estilo);
  }
  estilo.textContent = caras;
}

/** En EPUB, pellizcar o Ctrl/⌘ + rueda cambia el tamaño de letra; la app lo guarda y lo manda de vuelta. */
function letraConGestos(objetivo) {
  const vista = () => epub?.raiz;
  const opciones = {
    activo: () => forma !== 'book',
    alMover: (escala) => {
      const v = vista();
      if (v) v.style.scale = String(Math.min(2, Math.max(0.5, escala)));
    },
    alTerminar: (escala) => {
      const v = vista();
      if (v) v.style.scale = '';
      const tamano = tamanoValido(Math.round((texto.tamano * escala) / 10) * 10);
      if (tamano !== texto.tamano) enviar({ type: 'textSize', size: tamano });
    },
  };
  escucharPellizco(objetivo, opciones);
  escucharRuedaConCtrl(objetivo, opciones);
}

// ─── Ir a ────────────────────────────────────────────────────────────────────

async function irA({ page, cfi, fraction }) {
  if (forma === 'book' && libro) {
    if (pdf) return libro.irA(page ?? Math.round((fraction ?? 0) * (pdf.total - 1)) + 1);
    if (cfi) return libro.irACfi(cfi);
    if (typeof fraction === 'number') return libro.irAFraccion(fraction);
    return;
  }
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
  if (forma === 'book' && libro) {
    if (pdf) libro.irA(r.pagina);
    else if (r.cfi) libro.irACfi(r.cfi);
  } else if (pdf && forma === 'paged') {
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
  const { doc, tarea } = await cargarPdf({ url });
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
