/**
 * Los módulos del lienzo creativo (spec 13h, RF-CC14; T343): polaroid, quote, rating y libro. Cada uno se pinta dentro
 * de su caja con medidas relativas a su propio ancho (`cqw` de la caja): al estirarlo, todo crece junto y se ve igual
 * a cualquier tamaño. Los estilos van en línea, como lo demás de la capa.
 */

/** La letra de la app y una con serifa para las citas. */
const LETRA = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
const SERIFA = 'Georgia, "Times New Roman", serif';
/** El papel de una polaroid sin color elegido y el gris de un hueco sin foto. */
export const MARCO_POLAROID = '#FBFAF6';
export const SIN_FOTO = '#D6D6D6';
export const PELICULA = '#161616';
const TINTA = '#1A1A1A';

export const MODULOS = ['polaroid', 'quote', 'rating', 'book', 'stat', 'swatch', 'checklist', 'mood', 'song', 'date', 'timeline'];

// Con transparencia (`#RRGGBBAA`) para los acabados de una tapa del Journal (T348).
const esColor = (c) => /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(c ?? '');
const claroSobre = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
};

function caja(estilos = {}) {
  const el = document.createElement('div');
  Object.assign(el.style, { boxSizing: 'border-box', pointerEvents: 'none', ...estilos });
  return el;
}

/** Un hueco de foto: la imagen recortada para llenarlo, o el gris de "aún sin foto". */
function foto(src, proporcion) {
  const hueco = caja({ width: '100%', aspectRatio: `1 / ${proporcion}`, background: SIN_FOTO, overflow: 'hidden', flexShrink: '0' });
  if (src) {
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = src;
    Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
    hueco.append(img);
  }
  return hueco;
}

/** Medidas de cada variante: márgenes del marco (cqw de la caja), proporción de cada foto y tamaño del pie. */
const VARIANTES = {
  classic: { margen: 6, abajo: 0, proporcion: 1, pie: 7 },
  mini: { margen: 6, abajo: 0, proporcion: 1.33, pie: 7 },
  caption: { margen: 6, abajo: 0, proporcion: 1, pie: 9 },
  tape: { margen: 6, abajo: 0, proporcion: 1, pie: 7 },
  stack: { margen: 6, abajo: 0, proporcion: 1, pie: 7 },
  double: { margen: 3.5, abajo: 0, proporcion: 1, pie: 4.2 },
};

function polaroid(el, a) {
  const c = a.content ?? {};
  const variante = c.variant ?? 'classic';
  const srcs = Array.isArray(c.srcs) ? c.srcs : [];
  const texto = c.text ?? '';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', texto ? `Polaroid: ${texto}` : 'Polaroid');

  if (variante === 'film') {
    // Tira de película: tres cuadros en negro con sus perforaciones a los lados.
    const fondo = esColor(c.color) ? c.color : PELICULA;
    const tira = caja({
      position: 'absolute',
      inset: '0',
      background: fondo,
      padding: '7cqw 14cqw',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundImage:
        'repeating-linear-gradient(to bottom, transparent 0 3cqw, rgb(255 255 255 / 0.85) 3cqw 7cqw, transparent 7cqw 10cqw), repeating-linear-gradient(to bottom, transparent 0 3cqw, rgb(255 255 255 / 0.85) 3cqw 7cqw, transparent 7cqw 10cqw)',
      backgroundSize: '5cqw 100%, 5cqw 100%',
      backgroundPosition: '4.5cqw 0, calc(100% - 4.5cqw) 0',
      backgroundRepeat: 'repeat-y',
    });
    for (let i = 0; i < 3; i++) tira.append(foto(srcs[i], 0.78));
    el.append(tira);
    return;
  }

  const v = VARIANTES[variante] ?? VARIANTES.classic;
  const papel = esColor(c.color) ? c.color : MARCO_POLAROID;
  if (variante === 'stack') {
    // En pila: dos polaroids más asoman detrás, un poco giradas.
    for (const giro of [-6, 4]) el.append(caja({ position: 'absolute', inset: '0', background: papel, rotate: `${giro}deg`, boxShadow: '0 0.6cqw 2cqw rgb(0 0 0 / 0.18)' }));
  }
  const marco = caja({
    position: 'absolute',
    inset: '0',
    background: papel,
    padding: `${v.margen}cqw ${v.margen}cqw 0`,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 0.4cqw 1.5cqw rgb(0 0 0 / 0.12)',
  });
  const fotos = caja({ display: 'flex', gap: `${v.margen}cqw`, flexShrink: '0' });
  const cuantas = variante === 'double' ? 2 : 1;
  for (let i = 0; i < cuantas; i++) {
    const columna = caja({ flex: '1', minWidth: '0' });
    columna.append(foto(srcs[i], v.proporcion));
    fotos.append(columna);
  }
  const pie = caja({
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `0 ${v.margen}cqw`,
    font: `italic ${v.pie}cqw/1.2 ${LETRA}`,
    color: claroSobre(papel) ? '#F2F2F2' : TINTA,
    textAlign: 'center',
    overflow: 'hidden',
    overflowWrap: 'anywhere',
  });
  pie.textContent = texto;
  marco.append(fotos, pie);
  el.append(marco);
  if (variante === 'tape') {
    // Con cinta: un pedazo de washi translúcido sujeta la foto arriba.
    el.append(caja({ position: 'absolute', top: '-5cqw', left: '30cqw', width: '40cqw', height: '12cqw', background: 'rgb(214 210 200 / 0.7)', rotate: '-4deg', boxShadow: '0 0.3cqw 0.8cqw rgb(0 0 0 / 0.1)' }));
  }
}

function quote(el, a) {
  const c = a.content ?? {};
  const color = esColor(c.color) ? c.color : TINTA;
  const escala = Number.isFinite(c.size) ? Math.min(3, Math.max(0.5, c.size)) : 1;
  el.setAttribute('role', 'note');
  el.setAttribute('aria-label', c.text ? `Cita: ${c.text}${c.who ? `, de ${c.who}` : ''}` : 'Cita');
  const cuerpo = caja({ position: 'absolute', inset: '0', padding: '5cqw 6cqw', display: 'flex', flexDirection: 'column', gap: '2.5cqw', color, overflow: 'hidden' });
  const comillas = caja({ font: `700 ${22 * escala}cqw/0.6 ${SERIFA}`, height: `${11 * escala}cqw`, opacity: '0.85' });
  comillas.textContent = '“';
  const cita = caja({ font: `italic ${7.5 * escala}cqw/1.35 ${SERIFA}`, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' });
  cita.textContent = c.text ?? '';
  cuerpo.append(comillas, cita);
  const quien = [c.who, c.chapter].filter(Boolean).join(', ');
  if (quien) {
    const firma = caja({ font: `600 ${5 * escala}cqw/1.3 ${LETRA}`, opacity: '0.85' });
    firma.textContent = `— ${quien}`;
    cuerpo.append(firma);
  }
  if (c.note) {
    const nota = caja({ font: `${4.5 * escala}cqw/1.35 ${LETRA}`, opacity: '0.7', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' });
    nota.textContent = c.note;
    cuerpo.append(nota);
  }
  el.append(cuerpo);
}

const ESTRELLA = 'M50 4l13.6 29.4 32.2 3.7-23.9 21.9 6.5 31.8L50 74.8 21.6 90.8l6.5-31.8L4.2 37.1l32.2-3.7z';
const CORAZON = 'M50 90C22 70 4 54 4 32 4 17 16 6 30 6c9 0 16 5 20 12 4-7 11-12 20-12 14 0 26 11 26 26 0 22-18 38-46 58z';
export const SIMBOLOS = { stars: ESTRELLA, hearts: CORAZON };

function simbolo(trazo, color, lleno) {
  const lugar = caja({ position: 'relative', width: '18cqw', height: '18cqw', flexShrink: '0' });
  lugar.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%" style="position:absolute;inset:0"><path d="${trazo}" fill="none" stroke="${color}" stroke-width="5"/></svg><svg viewBox="0 0 100 100" width="100%" height="100%" style="position:absolute;inset:0;clip-path:inset(0 ${(100 - lleno * 100).toFixed(1)}% 0 0)"><path d="${trazo}" fill="${color}"/></svg>`;
  return lugar;
}

function rating(el, a) {
  const c = a.content ?? {};
  const color = esColor(c.color) ? c.color : TINTA;
  const escala = c.scale === 'hearts' || c.scale === 'number' ? c.scale : 'stars';
  const valor = Number.isFinite(c.value) ? c.value : 0;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', escala === 'number' ? `Calificación: ${valor} de 10` : `Calificación: ${valor} de 5`);
  if (escala === 'number') {
    const numero = caja({ position: 'absolute', inset: '0', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2cqw', color, font: `700 34cqw/1 ${LETRA}` });
    const de = caja({ font: `600 14cqw/1 ${LETRA}`, opacity: '0.7' });
    de.textContent = '/10';
    numero.append(String(valor), de);
    el.append(numero);
    return;
  }
  const fila = caja({ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' });
  for (let i = 0; i < 5; i++) fila.append(simbolo(SIMBOLOS[escala], color, Math.min(1, Math.max(0, valor - i))));
  el.append(fila);
}

function libro(el, a) {
  const c = a.content ?? {};
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', c.title ? `Libro: ${c.title}` : 'Libro');
  const color = esColor(c.coverColor) ? c.coverColor : '#DCD3C8';
  const portada = caja({ position: 'absolute', inset: '0', background: color, overflow: 'hidden', borderRadius: '1.5cqw', boxShadow: '0 0.8cqw 2.4cqw rgb(0 0 0 / 0.25)' });
  if (c.src) {
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = c.src;
    Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
    portada.append(img);
  } else {
    const titulo = caja({ position: 'absolute', inset: '0', padding: '10cqw 8cqw', font: `700 11cqw/1.2 ${LETRA}`, color: claroSobre(color) ? '#F2F2F2' : TINTA, overflow: 'hidden', overflowWrap: 'anywhere' });
    titulo.textContent = c.title ?? '';
    portada.append(titulo);
  }
  el.append(portada);
}

/**
 * Los assets del lienzo (T343b): papeles, notas, cintas y doodles en grises. Los incluidos vienen junto al motor (en el
 * teléfono, dentro de la página: `KAVI_ASSETS`); uno de la tienda llega con su `src`.
 */
export function fuenteDeAsset(id) {
  if (typeof id !== 'string' || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(id)) return '';
  if (globalThis.KAVI_ASSETS?.[id]) return globalThis.KAVI_ASSETS[id];
  return new URL(`lienzo/${id}.png`, globalThis.KAVI_BASE ?? document.baseURI).href;
}

function imagenEstirada(src) {
  const img = document.createElement('img');
  img.alt = '';
  img.draggable = false;
  img.src = src;
  Object.assign(img.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none' });
  return img;
}

/**
 * Un asset con su color (RF-CC13): una capa del color recortada con la forma del asset y, si es de textura, el gris
 * encima multiplicando (conserva fibras, pliegues y rayas). Un doodle (trazo) es solo la capa de color. Sin color, el
 * gris tal cual.
 */
export function pintarAsset(el, a) {
  const c = a.content ?? {};
  const src = c.src || fuenteDeAsset(c.asset);
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', c.label || 'Adorno');
  el.style.isolation = 'isolate';
  if (!src) return;
  if (!esColor(c.color)) {
    el.append(imagenEstirada(src));
    return;
  }
  const mascara = `url("${src}")`;
  el.append(
    caja({ position: 'absolute', inset: '0', background: c.color, maskImage: mascara, webkitMaskImage: mascara, maskSize: '100% 100%', webkitMaskSize: '100% 100%', maskRepeat: 'no-repeat', webkitMaskRepeat: 'no-repeat' }),
  );
  if (c.mode !== 'trazo') {
    const gris = imagenEstirada(src);
    gris.style.mixBlendMode = 'multiply';
    el.append(gris);
  }
}

/** Pinta un módulo dentro de su caja `el` (ya posicionada y con su tamaño). */
export function pintarModulo(el, a) {
  // Lo de adentro se mide contra el ancho de la caja.
  el.style.containerType = 'inline-size';
  if (a.kind === 'polaroid') polaroid(el, a);
  else if (a.kind === 'quote') quote(el, a);
  else if (a.kind === 'rating') rating(el, a);
  else if (a.kind === 'book') libro(el, a);
  else if (a.kind === 'stat') dato(el, a);
  else if (a.kind === 'swatch') muestra(el, a);
  else if (a.kind === 'checklist') checklist(el, a);
  else if (a.kind === 'mood') mood(el, a);
  else if (a.kind === 'song') cancion(el, a);
  else if (a.kind === 'date') fecha(el, a);
  else if (a.kind === 'timeline') timeline(el, a);
}

// ─── T349b: checklist, mood, canción, fecha y lugar, y timeline ───────────────────

const renglones = (c) => (Array.isArray(c.items) ? c.items.filter((r) => r && typeof r.text === 'string').slice(0, 12) : []);

/** Una lista con casillas: su título y cada renglón con su casilla, marcada o no (tachado si se marcó). */
function checklist(el, a) {
  const c = a.content ?? {};
  const color = esColor(c.color) ? c.color : TINTA;
  const items = renglones(c);
  el.setAttribute('role', 'list');
  el.setAttribute('aria-label', [c.text, ...items.map((r) => `${r.done ? '✓ ' : ''}${r.text}`)].filter(Boolean).join(', ') || 'Lista');
  const cuerpo = caja({ position: 'absolute', inset: '0', padding: '5cqw 6cqw', display: 'flex', flexDirection: 'column', gap: '3cqw', color, overflow: 'hidden', font: `7cqw/1.3 ${LETRA}` });
  if (c.text) {
    const titulo = caja({ font: `700 8.5cqw/1.2 ${LETRA}` });
    titulo.textContent = c.text;
    cuerpo.append(titulo);
  }
  for (const r of items) {
    const fila = caja({ display: 'flex', alignItems: 'flex-start', gap: '3cqw' });
    const casilla = caja({ width: '6.5cqw', height: '6.5cqw', marginTop: '1cqw', flexShrink: '0', border: `0.6cqw solid ${color}`, borderRadius: '1.2cqw', display: 'grid', placeItems: 'center' });
    if (r.done) casilla.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>`;
    const texto = caja({ overflowWrap: 'anywhere', ...(r.done ? { textDecoration: 'line-through', opacity: '0.6' } : {}) });
    texto.textContent = r.text;
    fila.append(casilla, texto);
    cuerpo.append(fila);
  }
  el.append(cuerpo);
}

const OJOS = 'M31 40a4 4 0 1 0 8 0a4 4 0 1 0-8 0M61 40a4 4 0 1 0 8 0a4 4 0 1 0-8 0';
const corazonito = (x, y) => `M${x} ${y + 6}c-6-4-9-7-9-10a4.5 4.5 0 0 1 9-2a4.5 4.5 0 0 1 9 2c0 3-3 6-9 10z`;
/** Las caritas del mood, como en la app (`canvas-shapes.ts`). */
export const CARITAS = {
  happy: { trazo: 'M30 60Q50 80 70 60', relleno: OJOS },
  sad: { trazo: 'M30 72Q50 56 70 72', relleno: OJOS },
  angry: { trazo: 'M26 30L42 37M74 30L58 37M32 72Q50 62 68 72', relleno: 'M31 44a4 4 0 1 0 8 0a4 4 0 1 0-8 0M61 44a4 4 0 1 0 8 0a4 4 0 1 0-8 0' },
  surprised: { trazo: 'M41 68a9 9 0 1 0 18 0a9 9 0 1 0-18 0', relleno: OJOS },
  inLove: { trazo: 'M30 60Q50 80 70 60', relleno: `${corazonito(35, 34)}${corazonito(65, 34)}` },
  crying: { trazo: 'M28 42Q35 36 42 42M58 42Q65 36 72 42M32 72Q50 58 68 72', relleno: 'M34 48q-4 9 0 11q4-2 0-11zM66 48q-4 9 0 11q4-2 0-11z' },
  calm: { trazo: 'M28 40Q35 46 42 40M58 40Q65 46 72 40M38 64Q50 71 62 64', relleno: '' },
  scared: { trazo: 'M29 40a6 6 0 1 0 12 0a6 6 0 1 0-12 0M59 40a6 6 0 1 0 12 0a6 6 0 1 0-12 0M30 70q5-6 10 0t10 0t10 0t10 0', relleno: '' },
};
export const CARA = 'M50 4a46 46 0 1 0 0.01 0z';

/** Un mood: la carita a lo ancho y, abajo, su palabra. */
function mood(el, a) {
  const c = a.content ?? {};
  const color = esColor(c.color) ? c.color : TINTA;
  const carita = CARITAS[c.mood] ?? CARITAS.happy;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', c.text ? `Mood: ${c.text}` : 'Mood');
  const cuerpo = caja({ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3cqw', color });
  const dibujo = caja({ width: '100%', aspectRatio: '1 / 1' });
  dibujo.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="${CARA}"/><path d="${carita.trazo}"/>${carita.relleno ? `<path d="${carita.relleno}" fill="${color}" stroke="none"/>` : ''}</svg>`;
  cuerpo.append(dibujo);
  if (c.text) {
    const palabra = caja({ font: `600 11cqw/1.1 ${LETRA}`, textAlign: 'center', overflowWrap: 'anywhere' });
    palabra.textContent = c.text;
    cuerpo.append(palabra);
  }
  el.append(cuerpo);
}

/** Una canción: un reproductor dibujado (sin sonido) con su título y artista, su barra y sus botones. */
function cancion(el, a) {
  const c = a.content ?? {};
  const color = esColor(c.color) ? c.color : TINTA;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `Canción: ${c.text ?? ''}${c.who ? `, de ${c.who}` : ''}`);
  const tarjeta = caja({ position: 'absolute', inset: '0', background: MARCO_POLAROID, borderRadius: '4cqw', padding: '4cqw 5cqw', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2cqw', color, boxShadow: '0 0.6cqw 1.8cqw rgb(0 0 0 / 0.18)', overflow: 'hidden' });
  const arriba = caja({ display: 'flex', alignItems: 'center', gap: '4cqw' });
  const disco = caja({ width: '14cqw', height: '14cqw', flexShrink: '0', borderRadius: '2cqw', background: SIN_FOTO });
  const textos = caja({ display: 'flex', flexDirection: 'column', minWidth: '0' });
  const titulo = caja({ font: `700 6.5cqw/1.2 ${LETRA}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
  titulo.textContent = c.text ?? '';
  const quien = caja({ font: `5cqw/1.2 ${LETRA}`, opacity: '0.7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
  quien.textContent = c.who ?? '';
  textos.append(titulo, quien);
  arriba.append(disco, textos);
  const barra = caja({ height: '1.2cqw', borderRadius: '1cqw', background: `color-mix(in srgb, ${color} 25%, transparent)`, overflow: 'hidden' });
  barra.append(caja({ width: '38%', height: '100%', background: color }));
  const botones = caja({ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8cqw', height: '9cqw' });
  botones.innerHTML = `<svg viewBox="0 0 24 24" height="70%" fill="${color}"><path d="M19 20L9 12l10-8zM5 19V5h2v14z"/></svg><svg viewBox="0 0 24 24" height="100%" fill="${color}"><path d="M8 5v14l11-7z"/></svg><svg viewBox="0 0 24 24" height="70%" fill="${color}"><path d="M5 4l10 8-10 8zM17 5h2v14h-2z"/></svg>`;
  tarjeta.append(arriba, barra, botones);
  el.append(tarjeta);
}

/** Fecha y lugar: una etiqueta con la fecha (ya escrita en el idioma de la app) y el lugar. */
function fecha(el, a) {
  const c = a.content ?? {};
  const color = esColor(c.color) ? c.color : TINTA;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', [c.title, c.note].filter(Boolean).join(', ') || 'Fecha');
  const etiqueta = caja({ position: 'absolute', inset: '0', border: `0.6cqw dashed ${color}`, borderRadius: '2cqw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1cqw', color, padding: '2cqw 4cqw', overflow: 'hidden' });
  const dia = caja({ font: `700 9cqw/1.15 ${LETRA}`, whiteSpace: 'nowrap', letterSpacing: '0.03em', textTransform: 'uppercase' });
  dia.textContent = c.title ?? '';
  etiqueta.append(dia);
  if (c.note) {
    const lugar = caja({ font: `6cqw/1.2 ${LETRA}`, opacity: '0.8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' });
    lugar.textContent = c.note;
    etiqueta.append(lugar);
  }
  el.append(etiqueta);
}

/** Un timeline: una línea de arriba abajo con un punto por suceso y su texto al lado. */
function timeline(el, a) {
  const c = a.content ?? {};
  const color = esColor(c.color) ? c.color : TINTA;
  const items = renglones(c);
  el.setAttribute('role', 'list');
  el.setAttribute('aria-label', items.map((r) => r.text).join(', ') || 'Timeline');
  const cuerpo = caja({ position: 'absolute', inset: '0', padding: '4cqw 4cqw 4cqw 12cqw', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', color, overflow: 'hidden' });
  cuerpo.append(caja({ position: 'absolute', left: '6cqw', top: '4cqw', bottom: '4cqw', width: '0.8cqw', background: color, opacity: '0.5' }));
  for (const r of items) {
    const fila = caja({ position: 'relative', font: `6.5cqw/1.3 ${LETRA}`, overflowWrap: 'anywhere' });
    fila.append(caja({ position: 'absolute', left: '-8.4cqw', top: '1.4cqw', width: '5cqw', height: '5cqw', borderRadius: '50%', background: color }));
    const texto = caja({});
    texto.textContent = r.text;
    fila.append(texto);
    cuerpo.append(fila);
  }
  el.append(cuerpo);
}

/** Un dato de la biblioteca (13h, RF-CC22; T349): el número grande, qué es y de cuándo. Ya viene escrito. */
function dato(el, a) {
  const c = a.content ?? {};
  const color = esColor(c.color) ? c.color : TINTA;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', [c.title, c.text, c.note].filter(Boolean).join(' '));
  const cuerpo = caja({ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5cqw', color, textAlign: 'center', overflow: 'hidden' });
  const numero = caja({ font: `700 26cqw/1 ${LETRA}`, fontVariantNumeric: 'tabular-nums' });
  numero.textContent = c.title ?? '';
  const que = caja({ font: `600 8cqw/1.2 ${LETRA}` });
  que.textContent = c.text ?? '';
  cuerpo.append(numero, que);
  if (c.note) {
    const cuando = caja({ font: `6cqw/1.2 ${LETRA}`, opacity: '0.7' });
    cuando.textContent = c.note;
    cuerpo.append(cuando);
  }
  el.append(cuerpo);
}

/** Una muestra de color (RF-CC14; T349), como las de pintura: el color arriba y su nombre y HEX en la banda de abajo. */
function muestra(el, a) {
  const c = a.content ?? {};
  const color = esColor(c.color) ? c.color.slice(0, 7) : '#C9C2B8';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `Muestra de color ${c.text ? `${c.text}, ` : ''}${color}`);
  const tarjeta = caja({ position: 'absolute', inset: '0', background: MARCO_POLAROID, padding: '5cqw', display: 'flex', flexDirection: 'column', gap: '4cqw', boxShadow: '0 0.6cqw 1.8cqw rgb(0 0 0 / 0.18)' });
  const parche = caja({ flex: '1', background: color });
  const banda = caja({ display: 'flex', flexDirection: 'column', gap: '1cqw', color: TINTA });
  if (c.text) {
    const nombre = caja({ font: `700 9cqw/1.15 ${LETRA}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
    nombre.textContent = c.text;
    banda.append(nombre);
  }
  const hex = caja({ font: `600 7cqw/1.1 ${LETRA}`, opacity: '0.7', letterSpacing: '0.04em' });
  hex.textContent = color.toUpperCase();
  banda.append(hex);
  tarjeta.append(parche, banda);
  el.append(tarjeta);
}
