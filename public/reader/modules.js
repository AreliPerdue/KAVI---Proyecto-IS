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

export const MODULOS = ['polaroid', 'quote', 'rating', 'book'];

const esColor = (c) => /^#[0-9a-fA-F]{6}$/.test(c ?? '');
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
  const color = esColor(c.coverColor) ? c.coverColor : '#8C8C8C';
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
}
