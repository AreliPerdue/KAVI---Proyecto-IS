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
 * - **Libro real:** lo pegado se ve en su hoja, pero no se toca: ahí arrastrar dobla la hoja. El texto sí se
 *   selecciona y se subraya (T330): en PDF cada hoja lleva su capa de texto (`.hoja-pdf`); en EPUB la
 *   selección de la hoja se traduce a CFI del capítulo (`libro.seleccion()`, en `book.js`).
 *
 * Pinta post-its (T286), subrayados (T287), cuadros de texto e imágenes (T289) y stickers (T290); el lápiz
 * llega con su tarea (T291) sobre esta misma capa.
 *
 * Subrayados (13c, RF-BH7): al seleccionar texto el motor avisa `selection` con lo que dice y dónde está (en
 * PDF, un rectángulo por renglón en 0–1 de su página; en EPUB, el CFI del rango). La app crea el subrayado y
 * lo manda de vuelta en la lista. En PDF se pinta en la capa de cada página (resaltado, subrayado o tachado);
 * en EPUB lo dibuja foliate con su capa de dibujo. Tocar uno lo elige.
 */
import { pellizcando as pellizcandoAhora } from './zoom.js';

/** El ancho de un post-it nuevo, relativo a la página (igual que `ANCHO_DE_POSTIT` en la app). */
const ANCHO = 0.24;
const ANCHO_MIN_PX = 96;
const ANCHO_MAX_PX = 220;
const DOBLE_TOQUE_MS = 350;

const redondear = (v) => Math.round(v * 10000) / 10000;
/** Lo más chico que puede quedar un post-it al cambiarle el tamaño (T329). */
const LADO_MIN_PX = 48;
/** Alto entre ancho del post-it: 1 es cuadrado. */
const proporcionDe = (a) => (Number.isFinite(a.locator?.ar) && a.locator.ar >= 0.25 && a.locator.ar <= 4 ? a.locator.ar : 1);
const entre = (v, min, max) => Math.min(Math.max(v, min), max);

/**
 * La letra de un post-it (T336): la de uno nuevo, fija. En PDF va en la medida de la página (cqw: acompaña al
 * zoom); en EPUB y el libro real, en px. Si el texto no cabe, baja hasta `LETRA_MINIMA_PX`.
 */
const LETRA_POSTIT_PAGINA = '2.05cqw';
const LETRA_POSTIT_PX = 15;
const LETRA_MINIMA_PX = 6;

/** El tamaño de letra elegido (1 = normal), de 50 % a 300 %. */
const escalaDe = (a) => (Number.isFinite(a.content?.size) ? Math.min(3, Math.max(0.5, a.content.size)) : 1);

const desborda = (caja) => caja.scrollHeight > caja.clientHeight || caja.scrollWidth > caja.clientWidth;

/** Que todo el texto quepa en el post-it: la letra de siempre, o la más grande con la que cabe. */
function ajustarLetra(el) {
  const caja = el.querySelector(':scope > .texto');
  if (!caja || !caja.clientHeight) return;
  caja.style.fontSize = '';
  if (!desborda(caja)) return;
  let chica = LETRA_MINIMA_PX;
  let grande = parseFloat(getComputedStyle(caja).fontSize) || LETRA_POSTIT_PX;
  for (let paso = 0; paso < 8; paso++) {
    const medio = (chica + grande) / 2;
    caja.style.fontSize = `${medio}px`;
    if (desborda(caja)) grande = medio;
    else chica = medio;
  }
  caja.style.fontSize = `${Math.floor(chica * 10) / 10}px`;
}

/** Cada vez que un post-it cambia de tamaño (al pintarlo, estirarlo o con el zoom), se vuelve a ajustar. */
const ajusteDeLetra = new ResizeObserver((cambios) => {
  for (const c of cambios) ajustarLetra(c.target);
});

/** Lo que se pega encima de la página (lo demás, como los subrayados, va en el texto). */
const PEGABLES = ['postit', 'textbox', 'image', 'sticker'];
/** Lo que es solo una imagen: se gira y no se escribe. */
const esImagen = (a) => a.kind === 'image' || a.kind === 'sticker';

/**
 * La imagen de un sticker incluido (T290): en el teléfono viene dentro del motor (sin red también se ve); en
 * la web, junto a él, en `stickers/<paquete>/<nombre>.png`.
 */
function fuenteDeSticker(id) {
  if (typeof id !== 'string' || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(id)) return '';
  if (globalThis.KAVI_STICKERS?.[id]) return globalThis.KAVI_STICKERS[id];
  // Solo los incluidos viven junto al motor; los de la tienda llegan con su `src` (T338).
  return id.startsWith('nobi-pink/') ? new URL(`stickers/${id}.png`, globalThis.KAVI_BASE ?? document.baseURI).href : '';
}

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
  let seleccionEnviada = false;
  let herramienta = null;
  let seleccion = null;
  let arrastre = null; // { id, el, x0, y0, movido }
  let repintarAlSoltar = false;
  let ultimoToque = { id: null, t: 0 };

  const pegados = () => lista.filter((a) => PEGABLES.includes(a.kind));
  let editando = null; // { id, el, caja }
  let proporcionNueva = 1; // la de la imagen o el sticker que se va a pegar
  let anchoNuevo = null; // el de un sticker que vuelve de la charola: conserva su tamaño
  let porEditar = null; // un id que pidió escribirse antes de pintarse
  const subrayados = () => lista.filter((a) => a.kind === 'highlight');
  const colorDe = (a) => (/^#[0-9a-fA-F]{6}$/.test(a.content?.color ?? '') ? a.content.color : '#F1D35D');
  const estiloDe = (a) => (a.content?.style === 'underline' || a.content?.style === 'strike' ? a.content.style : 'highlight');
  const interactiva = () => ctx.forma() !== 'book';

  // ─── Lo pegado: post-it, cuadro de texto, imagen y sticker ────────────────────

  /** Cuánto puede escribirse en cada uno. */
  const MAX_TEXTO = { postit: 280, textbox: 1000 };

  /**
   * Algo pegado (T286, T289). Los estilos van en línea para que se vean igual dentro de la sombra de las hojas
   * del libro real, donde no llega la hoja de estilos del motor. `ancho`: en PDF, el porcentaje de la página;
   * en EPUB y en el libro real, en px.
   * - **Post-it:** cuadro de color con su texto; la letra crece con el ancho.
   * - **Cuadro de texto:** solo el texto, del color y tamaño elegidos, sin fondo (RF-BH10).
   * - **Imagen:** la imagen entera en su caja, que se puede girar (RF-BH12).
   * - **Sticker:** igual, de la colección incluida y con una sombrita de calcomanía (RF-BH13).
   */
  function pegado(a, { ancho, enLibro = false }) {
    const el = document.createElement('div');
    el.className = `anotacion ${a.kind}`;
    el.dataset.id = a.id;
    const px = typeof ancho === 'number';
    const texto = a.content?.text ?? '';
    Object.assign(el.style, {
      position: 'absolute',
      boxSizing: 'border-box',
      width: px ? `${ancho}px` : ancho,
      aspectRatio: `1 / ${proporcionDe(a)}`,
      pointerEvents: enLibro ? 'none' : 'auto',
      touchAction: 'none',
      userSelect: 'none',
      webkitUserSelect: 'none',
      cursor: a.locked ? 'pointer' : 'grab',
      rotate: Number.isFinite(a.content?.rot) && a.content.rot ? `${a.content.rot}deg` : '',
    });
    if (esImagen(a)) {
      const sticker = a.kind === 'sticker';
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', sticker ? (a.content?.label ?? 'Sticker') : 'Imagen');
      const img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      // Un sticker de la tienda llega con su imagen (`src`); los incluidos se toman del motor.
      const src = sticker ? (a.content?.src ?? fuenteDeSticker(a.content?.sticker)) : a.content?.src;
      if (src) img.src = src;
      Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' });
      // Un sticker estirado se estira con su caja; una imagen se ve entera.
      if (sticker) Object.assign(img.style, { objectFit: 'fill', filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.22))' });
      el.append(img);
    } else {
      const caja = document.createElement('div');
      caja.className = 'texto';
      Object.assign(caja.style, { height: '100%', overflow: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', outline: 'none' });
      caja.textContent = texto;
      el.append(caja);
      el.setAttribute('role', 'note');
      if (a.kind === 'postit') {
        const color = colorDe(a);
        el.setAttribute('aria-label', texto ? `Post-it: ${texto}` : 'Post-it');
        Object.assign(el.style, {
          background: color,
          color: letraSobre(color),
          // La letra es la de siempre (la de un post-it nuevo) aunque se agrande; si se achica y el texto ya no
          // cabe, se reduce lo justo para que quepa todo, como PowerPoint (`ajustarLetra`, pedido de Areli).
          padding: px ? `${Math.max(4, Math.round(Math.min(ancho, ancho * proporcionDe(a)) * 0.07))}px` : '0.55em',
          fontFamily: '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif',
          fontSize: px ? `${Math.round(LETRA_POSTIT_PX * escalaDe(a))}px` : `calc(${escalaDe(a)} * ${LETRA_POSTIT_PAGINA})`,
          lineHeight: '1.3',
          borderRadius: '2px',
          boxShadow: '0 2px 6px rgb(0 0 0 / 0.28)',
        });
        ajusteDeLetra.observe(el);
      } else {
        // Cuadro de texto: la letra no depende del ancho (estirarlo reacomoda los renglones).
        const escala = escalaDe(a);
        el.setAttribute('aria-label', texto ? `Cuadro de texto: ${texto}` : 'Cuadro de texto');
        Object.assign(el.style, {
          color: /^#[0-9a-fA-F]{6}$/.test(a.content?.color ?? '') ? a.content.color : '#1A1A1A',
          padding: '0.25em 0.35em',
          fontFamily: '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif',
          fontSize: px ? `${Math.round(16 * escala)}px` : `calc(${escala} * 2.1cqw)`,
          lineHeight: '1.35',
        });
        if (!texto) el.classList.add('vacio');
      }
    }
    if (a.locked) el.dataset.bloqueado = '';
    if (!enLibro) {
      if (a.id === seleccion) marcarSeleccion(el, a);
      escucharArrastre(el, a);
    }
    return el;
  }

  // ─── Escribir directo (T289, pedido de Areli) ─────────────────────────────────

  /** Escribir en un post-it o un cuadro de texto, ahí mismo; al salir, la app guarda lo escrito. */
  function editar(id) {
    const a = lista.find((x) => x.id === id);
    const el = document.querySelector(`.anotacion[data-id="${CSS.escape(id)}"]`);
    // Recién pegado, la lista con él llega justo después: se escribe en cuanto se pinte.
    if (!a || !el) {
      porEditar = id;
      return;
    }
    if (esImagen(a) || a.locked || !interactiva()) {
      porEditar = null;
      return;
    }
    // En EPUB nace escondido hasta que se acomoda junto a su renglón (al siguiente cuadro): algo escondido no
    // recibe el foco, así que se espera a que se vea.
    if (el.style.display === 'none' || !el.offsetWidth) {
      porEditar = id;
      requestAnimationFrame(() => {
        if (porEditar === id) editar(id);
      });
      return;
    }
    porEditar = null;
    if (editando?.id === id) return;
    if (editando) editando.caja.blur();
    const caja = el.querySelector('.texto');
    if (!caja) return;
    try {
      caja.contentEditable = 'plaintext-only';
    } catch {
      caja.contentEditable = 'true';
    }
    if (caja.contentEditable !== 'plaintext-only') caja.contentEditable = 'true';
    Object.assign(caja.style, { userSelect: 'text', webkitUserSelect: 'text', cursor: 'text' });
    el.classList.add('editando');
    editando = { id, el, caja };
    caja.focus();
    // El cursor, al final de lo escrito.
    const rango = document.createRange();
    rango.selectNodeContents(caja);
    rango.collapse(false);
    const sel = document.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(rango);
    const maximo = MAX_TEXTO[a.kind] ?? 280;
    const alEscribir = () => {
      if (caja.innerText.length > maximo) caja.innerText = caja.innerText.slice(0, maximo);
      if (a.kind === 'postit') ajustarLetra(el);
    };
    const alTeclear = (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') caja.blur();
    };
    caja.addEventListener('input', alEscribir);
    caja.addEventListener('keydown', alTeclear);
    caja.addEventListener(
      'blur',
      () => {
        caja.removeEventListener('input', alEscribir);
        caja.removeEventListener('keydown', alTeclear);
        caja.contentEditable = 'false';
        Object.assign(caja.style, { userSelect: 'none', webkitUserSelect: 'none', cursor: '' });
        el.classList.remove('editando');
        editando = null;
        const texto = caja.innerText.replace(/\n+$/, '').slice(0, maximo);
        enviar({ type: 'text', id, text: texto });
        if (repintarAlSoltar) {
          repintarAlSoltar = false;
          repintar();
        }
        ctx.alDejarDeEscribir?.();
      },
      { once: true },
    );
  }

  function marcarSeleccion(el, a) {
    el.classList.add('seleccionada');
    if (a.locked && !el.querySelector('.candado')) {
      const candado = document.createElement('span');
      candado.className = 'candado';
      candado.innerHTML = CANDADO;
      el.append(candado);
    }
    // Elegido y sin candado: asas en las esquinas y orillas para cambiarle el tamaño (T329).
    if (!a.locked && interactiva() && !el.querySelector('.asa')) ponerAsas(el, a);
  }

  function remarcar() {
    for (const el of document.querySelectorAll('.anotacion')) {
      el.classList.remove('seleccionada');
      el.querySelector('.candado')?.remove();
      for (const asa of el.querySelectorAll('.asa')) asa.remove();
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
      // Escribiendo, el dedo pone el cursor: no arrastra.
      if (editando?.el === el) return;
      e.preventDefault();
      arrastre = { id: a.id, el, x0: e.clientX, y0: e.clientY, movido: false };
      el.setPointerCapture?.(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      // Jalando un asa (tamaño o giro), la nota no se mueve: ese movimiento es del asa.
      if (arrastre?.el !== el || arrastre.tamano || arrastre.giro) return;
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
    el.addEventListener('pointerup', (e) => {
      if (editando?.el === el) {
        e.stopPropagation();
        return;
      }
      soltar(e, false);
    });
    el.addEventListener('pointercancel', (e) => soltar(e, true));
  }

  /** Un toque elige; dos seguidos, en un post-it o un cuadro de texto, ponen a escribir ahí mismo. */
  function tocar(a) {
    const ahora = performance.now();
    const doble = ultimoToque.id === a.id && ahora - ultimoToque.t < DOBLE_TOQUE_MS;
    ultimoToque = { id: doble ? null : a.id, t: ahora };
    if (seleccion !== a.id) elegir(a.id);
    if (doble) editar(a.id);
  }

  /** Al soltar: la nueva posición, en la página (PDF) o el renglón (EPUB) donde quedó. */
  function soltarEn(el, a) {
    const caja = cajaSinGiro(el);
    let locator = null;
    if (ctx.pdf()) {
      const centro = [caja.left + caja.width / 2, caja.top + caja.height / 2];
      const pagina = document.elementsFromPoint(...centro).find((x) => x.classList?.contains('pagina')) ?? el.closest('.pagina');
      if (pagina) locator = enPagina(pagina, caja.left, caja.top, a.locator.w, proporcionDe(a));
    } else if (ctx.epub()) {
      locator = enEpub(caja.left, caja.top, caja.width, a.locator.w, proporcionDe(a));
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

  /**
   * La caja de algo pegado en px de la ventana, como si no estuviera girado (con lo que lleva arrastrado). La
   * de `getBoundingClientRect` crece al girarlo y movería la pieza al soltarla.
   */
  function cajaSinGiro(el) {
    const padre = el.offsetParent;
    if (!padre || !padre.offsetWidth) return el.getBoundingClientRect();
    const r = padre.getBoundingClientRect();
    const k = r.width / padre.offsetWidth;
    const [tx = 0, ty = 0] = (el.style.translate || '').split(' ').map((v) => parseFloat(v) || 0);
    return { left: r.left + el.offsetLeft * k + tx, top: r.top + el.offsetTop * k + ty, width: el.offsetWidth * k, height: el.offsetHeight * k };
  }

  /** La esquina (izquierda, arriba) en px de la ventana → posición en la página, sin salirse. */
  function enPagina(pagina, izquierda, arriba, w, ar = 1) {
    const r = pagina.getBoundingClientRect();
    const alto = (w * r.width * ar) / r.height;
    return {
      page: Number(pagina.dataset.pagina),
      x: redondear(entre((izquierda - r.left) / r.width, 0, 1 - w)),
      y: redondear(entre((arriba - r.top) / r.height, 0, Math.max(0, 1 - alto))),
      w,
      ...(Math.abs(ar - 1) > 0.001 ? { ar: redondear(ar) } : {}),
    };
  }

  // ─── Cambiar el tamaño (T329) ────────────────────────────────────────────────

  const LADOS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  /**
   * Las 8 asas de algo pegado y elegido (T329, pedido de Areli): una "L" en cada esquina y una rayita en medio
   * de cada lado, en tinta, cada una con área de sobra para tomarla (así estirar nunca arrastra la nota).
   * Jalar una cambia el ancho y el alto sin mover la orilla de enfrente; las de los lados, solo uno de los dos.
   * Las imágenes y los stickers llevan además un asa arriba para girarlas. En un sticker las esquinas lo
   * agrandan o achican sin deformarlo y las de los lados lo estiran (pedido de Areli, 14 oct).
   */
  function ponerAsas(el, a) {
    if (esImagen(a)) ponerGiro(el, a);
    for (const lado of LADOS) {
      const proporcional = a.kind === 'sticker' && lado.length === 2;
      const asa = document.createElement('div');
      asa.className = `asa asa-${lado}`;
      asa.dataset.lado = lado;
      asa.setAttribute('aria-hidden', 'true');
      let inicio = null;
      asa.addEventListener('pointerdown', (e) => {
        if (!e.isPrimary || pellizcandoAhora()) return;
        e.stopPropagation();
        e.preventDefault();
        inicio = { x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
        arrastre = { id: a.id, el, x0: e.clientX, y0: e.clientY, movido: false, tamano: true };
        asa.setPointerCapture?.(e.pointerId);
      });
      asa.addEventListener('pointermove', (e) => {
        if (!inicio) return;
        e.stopPropagation();
        // Con la pieza girada, el jalón se mide en sus propios ejes.
        const grados = Number.isFinite(a.content?.rot) ? a.content.rot : 0;
        const rad = (-grados * Math.PI) / 180;
        const [gx, gy] = [e.clientX - inicio.x, e.clientY - inicio.y];
        const dx = gx * Math.cos(rad) - gy * Math.sin(rad);
        const dy = gx * Math.sin(rad) + gy * Math.cos(rad);
        const caja = (proporcional ? cajaProporcional : cajaNueva)(inicio, lado, dx, dy, el.offsetParent);
        Object.assign(el.style, { left: `${caja.l}px`, top: `${caja.t}px`, width: `${caja.w}px`, height: `${caja.h}px`, aspectRatio: 'auto' });
        arrastre.movido = true;
      });
      const soltar = (e, cancelado) => {
        if (!inicio) return;
        e.stopPropagation();
        inicio = null;
        const movido = arrastre?.movido;
        arrastre = null;
        if (!cancelado && movido) redimensionado(el, a);
        else repintar();
        if (repintarAlSoltar) {
          repintarAlSoltar = false;
          repintar();
        }
      };
      asa.addEventListener('pointerup', (e) => soltar(e, false));
      asa.addEventListener('pointercancel', (e) => soltar(e, true));
      el.append(asa);
    }
  }

  /**
   * El asa de giro de una imagen (RF-BH12): arriba al centro; se gira alrededor del centro y se queda en el
   * ángulo recto más cercano si pasa a menos de 4°.
   */
  function ponerGiro(el, a) {
    const asa = document.createElement('div');
    asa.className = 'asa asa-giro';
    asa.setAttribute('aria-hidden', 'true');
    let centro = null;
    let grados = Number.isFinite(a.content?.rot) ? a.content.rot : 0;
    asa.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary) return;
      e.stopPropagation();
      e.preventDefault();
      const r = el.getBoundingClientRect();
      centro = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      arrastre = { id: a.id, el, x0: e.clientX, y0: e.clientY, movido: false, giro: true };
      asa.setPointerCapture?.(e.pointerId);
    });
    asa.addEventListener('pointermove', (e) => {
      if (!centro) return;
      e.stopPropagation();
      let g = (Math.atan2(e.clientY - centro.y, e.clientX - centro.x) * 180) / Math.PI + 90;
      const recto = Math.round(g / 90) * 90;
      if (Math.abs(g - recto) < 4) g = recto;
      grados = Math.round(((g % 360) + 360) % 360);
      el.style.rotate = `${grados}deg`;
      arrastre.movido = true;
    });
    const soltar = (e) => {
      if (!centro) return;
      e.stopPropagation();
      centro = null;
      const movido = arrastre?.movido;
      arrastre = null;
      if (movido) enviar({ type: 'rotate', id: a.id, rot: grados });
      if (repintarAlSoltar) {
        repintarAlSoltar = false;
        repintar();
      }
    };
    asa.addEventListener('pointerup', soltar);
    asa.addEventListener('pointercancel', soltar);
    el.append(asa);
  }

  /** La caja nueva al jalar `lado` (px dentro de su capa), sin bajar del mínimo ni salirse de la capa. */
  function cajaNueva(inicio, lado, dx, dy, capa) {
    let { l, t, w, h } = inicio;
    const maxW = capa?.clientWidth || Infinity;
    const maxH = capa?.clientHeight || Infinity;
    if (lado.includes('e')) w = entre(w + dx, LADO_MIN_PX, maxW - l);
    if (lado.includes('s')) h = entre(h + dy, LADO_MIN_PX, maxH - t);
    if (lado.includes('w')) {
      const nw = entre(w - dx, LADO_MIN_PX, l + w);
      l += w - nw;
      w = nw;
    }
    if (lado.includes('n')) {
      const nh = entre(h - dy, LADO_MIN_PX, t + h);
      t += h - nh;
      h = nh;
    }
    return { l, t, w, h };
  }

  /** Jalando una esquina de un sticker: crece o se encoge entero, con la esquina de enfrente fija. */
  function cajaProporcional(inicio, lado, dx, dy, capa) {
    const maxW = capa?.clientWidth || Infinity;
    const maxH = capa?.clientHeight || Infinity;
    const sx = (inicio.w + (lado.includes('e') ? dx : -dx)) / inicio.w;
    const sy = (inicio.h + (lado.includes('s') ? dy : -dy)) / inicio.h;
    // Lo que hay hasta la orilla de la capa desde la esquina que no se mueve.
    const libreW = lado.includes('e') ? maxW - inicio.l : inicio.l + inicio.w;
    const libreH = lado.includes('s') ? maxH - inicio.t : inicio.t + inicio.h;
    const s = entre(Math.max(sx, sy), LADO_MIN_PX / Math.min(inicio.w, inicio.h), Math.min(libreW / inicio.w, libreH / inicio.h));
    const w = inicio.w * s;
    const h = inicio.h * s;
    return { l: lado.includes('w') ? inicio.l + inicio.w - w : inicio.l, t: lado.includes('n') ? inicio.t + inicio.h - h : inicio.t, w, h };
  }

  /** Al soltar un asa: la caja nueva como posición, ancho y proporción. */
  function redimensionado(el, a) {
    const caja = cajaSinGiro(el);
    const ar = entre(caja.height / caja.width, 0.25, 4);
    let locator = null;
    if (ctx.pdf()) {
      const pagina = el.closest('.pagina');
      if (pagina) {
        const r = pagina.getBoundingClientRect();
        locator = enPagina(pagina, caja.left, caja.top, redondear(entre(caja.width / r.width, 0.02, 1)), ar);
      }
    } else if (ctx.epub()) {
      const area = areaEpub();
      if (area) locator = enEpub(caja.left, caja.top, caja.width, redondear(entre(caja.width / area.width, 0.02, 1)), ar);
    }
    if (!locator) return repintar();
    enviar({ type: 'move', id: a.id, locator });
  }

  /**
   * Un toque en la página que no cayó sobre algo pegado. Con la herramienta de post-it, ahí se pega; si había
   * algo elegido, se suelta. Devuelve si lo atendió (entonces no pasa de página ni muestra los controles).
   * `doc` es el documento donde ocurrió (el del capítulo, en EPUB).
   */
  function alTocar(e, doc) {
    // En el libro real solo se tocan los subrayados (para cambiarlos); lo demás es de la hoja.
    if (!interactiva()) {
      const marcado = subrayadoEnLibro(e);
      if (marcado) elegir(marcado.id);
      return !!marcado;
    }
    if (herramienta) {
      const locator = doc === document ? lugarEnPdf(e) : lugarEnEpub(e, doc);
      if (locator) enviar({ type: 'place', locator });
      return true;
    }
    // Tocar un subrayado lo elige (para cambiarlo, anotarle o quitarlo).
    const marcado = doc === document ? subrayadoEnPdf(e) : subrayadoEnEpub(e, doc);
    if (marcado) {
      elegir(marcado.id);
      return true;
    }
    if (seleccion) {
      elegir(null);
      return true;
    }
    return false;
  }

  /** Las páginas del PDF a la vista que llevan texto: las del scroll o de lado, o las hojas del libro real. */
  function paginasPdf() {
    if (ctx.forma() === 'book') return [...document.querySelectorAll('#libro .hoja-pdf')].filter((el) => el.getClientRects().length > 0);
    const pdf = ctx.pdf();
    return pdf ? [...pdf.renderizadas.keys()].map((n) => pdf.paginas[n - 1]) : [];
  }

  const esPaginaPdf = (x) => x.classList?.contains('pagina') || x.classList?.contains('hoja-pdf');

  function subrayadoEnPdf(e) {
    const pagina = document.elementsFromPoint(e.clientX, e.clientY).find(esPaginaPdf);
    if (!pagina) return null;
    const n = Number(pagina.dataset.pagina);
    const r = pagina.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    // El de más arriba en la capa gana.
    return [...subrayados()].reverse().find((a) => (a.locator.rects ?? []).some((q) => q.page === n && px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h)) ?? null;
  }

  /** Un subrayado bajo el dedo en el libro real: en PDF, en la hoja; en EPUB, dentro de la sombra de la hoja. */
  function subrayadoEnLibro(e) {
    if (ctx.pdf()) return subrayadoEnPdf(e);
    const hoja = document.elementsFromPoint(e.clientX, e.clientY).find((x) => x.classList?.contains('hoja-libro') && x.shadowRoot);
    if (!hoja) return null;
    for (const marca of [...hoja.shadowRoot.querySelectorAll('[data-subrayado]')].reverse()) {
      const r = marca.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        return subrayados().find((a) => a.id === marca.dataset.subrayado) ?? null;
      }
    }
    return null;
  }

  function subrayadoEnEpub(e, doc) {
    const c = capitulos().find((x) => x.doc === doc);
    const [valor] = c?.overlayer?.hitTest?.({ x: e.clientX, y: e.clientY }) ?? [];
    return valor ? (subrayados().find((a) => a.locator.cfi === valor) ?? null) : null;
  }

  // ─── Selección de texto (RF-BH7) ─────────────────────────────────────────────

  /**
   * La selección cambió en `doc` (el del motor, o el de un capítulo del EPUB). Con texto, se avisa qué dice y
   * dónde está; si se soltó, se avisa vacía. En el libro real no se selecciona.
   */
  function alCambiarSeleccion(doc) {
    const sinSeleccion = () => {
      if (seleccionEnviada) {
        seleccionEnviada = false;
        enviar({ type: 'selection', text: '' });
      }
    };
    // En el libro real (T330): en PDF, la capa de texto de la hoja; en EPUB, lo que diga el libro.
    if (!interactiva()) {
      const enLibro = ctx.pdf() ? seleccionDelDocumento() : seleccionDelEpubEnLibro();
      if (!enLibro) return sinSeleccion();
      seleccionEnviada = true;
      enviar({ type: 'selection', text: enLibro.texto.slice(0, 2000), locator: enLibro.locator });
      return;
    }
    const sel = doc.getSelection?.();
    const texto = sel && !sel.isCollapsed ? sel.toString().trim() : '';
    if (!texto || !sel.rangeCount) return sinSeleccion();
    const rango = sel.getRangeAt(0);
    const locator = doc === document ? textoEnPdf(rango) : textoEnEpub(rango, doc);
    if (!locator) return;
    seleccionEnviada = true;
    enviar({ type: 'selection', text: texto.slice(0, 2000), locator });
  }

  function seleccionDelDocumento() {
    const sel = document.getSelection();
    const texto = sel && !sel.isCollapsed && sel.rangeCount ? sel.toString().trim() : '';
    const locator = texto ? textoEnPdf(sel.getRangeAt(0)) : null;
    return locator ? { texto, locator } : null;
  }

  function seleccionDelEpubEnLibro() {
    const s = ctx.libro()?.seleccion?.();
    return s ? { texto: s.texto, locator: { cfi: s.cfi, fraction: redondear(s.fraccion ?? 0) } } : null;
  }

  /** Los renglones de un rango del PDF, en 0–1 de su página: un rectángulo por renglón. */
  function textoEnPdf(rango) {
    if (!ctx.pdf()) return null;
    const paginas = paginasPdf().map((el) => ({ n: Number(el.dataset.pagina), r: el.getBoundingClientRect() }));
    const sueltos = [];
    for (const q of rango.getClientRects()) {
      if (q.width < 1 || q.height < 1) continue;
      const cx = q.left + q.width / 2;
      const cy = q.top + q.height / 2;
      const p = paginas.find(({ r }) => cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom);
      if (p) sueltos.push({ page: p.n, left: q.left - p.r.left, top: q.top - p.r.top, right: q.right - p.r.left, bottom: q.bottom - p.r.top, ancho: p.r.width, alto: p.r.height });
    }
    if (!sueltos.length) return null;
    // Juntar los pedazos de un mismo renglón (pdf.js parte el texto en muchos).
    sueltos.sort((a, b) => a.page - b.page || a.top - b.top || a.left - b.left);
    const renglones = [];
    for (const q of sueltos) {
      const ultimo = renglones[renglones.length - 1];
      const mismo = ultimo && ultimo.page === q.page && Math.min(ultimo.bottom, q.bottom) - Math.max(ultimo.top, q.top) > Math.min(ultimo.bottom - ultimo.top, q.bottom - q.top) * 0.5;
      if (mismo) {
        ultimo.left = Math.min(ultimo.left, q.left);
        ultimo.right = Math.max(ultimo.right, q.right);
        ultimo.top = Math.min(ultimo.top, q.top);
        ultimo.bottom = Math.max(ultimo.bottom, q.bottom);
      } else renglones.push({ ...q });
    }
    const rects = renglones.slice(0, 400).map((q) => ({
      page: q.page,
      x: redondear(entre(q.left / q.ancho, 0, 1)),
      y: redondear(entre(q.top / q.alto, 0, 1)),
      w: redondear(entre((q.right - q.left) / q.ancho, 0, 1)),
      h: redondear(entre((q.bottom - q.top) / q.alto, 0, 1)),
    }));
    return { rects };
  }

  function textoEnEpub(rango, doc) {
    const c = capitulos().find((x) => x.doc === doc);
    if (!c) return null;
    try {
      return { cfi: ctx.epub().view.getCFI(c.index, rango), fraction: redondear(ctx.epub().fraccion ?? 0) };
    } catch {
      return null;
    }
  }

  function soltarSeleccion() {
    seleccionEnviada = false;
    document.getSelection?.()?.removeAllRanges();
    for (const c of capitulos()) c.doc.getSelection?.()?.removeAllRanges();
  }

  // ─── Marcas de texto ─────────────────────────────────────────────────────────

  /** Un renglón marcado, en % de su página (PDF y libro real de PDF). */
  function marcaDeTexto(a, q) {
    const el = document.createElement('div');
    el.className = 'subrayado';
    el.dataset.id = a.id;
    const color = colorDe(a);
    Object.assign(el.style, { position: 'absolute', left: `${q.x * 100}%`, top: `${q.y * 100}%`, width: `${q.w * 100}%`, height: `${q.h * 100}%`, pointerEvents: 'none' });
    pintarEstilo(el, estiloDe(a), color);
    return el;
  }

  /** Resaltado como marcatextos; subrayado, una raya abajo; tachado, una raya en medio. */
  function pintarEstilo(el, estilo, color) {
    if (estilo === 'underline') el.style.boxShadow = `inset 0 -2px 0 ${color}`;
    else if (estilo === 'strike') el.style.background = `linear-gradient(transparent calc(50% - 1px), ${color} calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px))`;
    else {
      el.style.background = color;
      el.style.opacity = '0.42';
      // Sobre página blanca se mezcla como tinta; con tema oscuro, encima.
      el.style.mixBlendMode = ctx.paginaBlanca?.() === false ? 'normal' : 'multiply';
      el.style.borderRadius = '2px';
    }
  }

  /** EPUB: foliate dibuja los subrayados con su capa; aquí se lleva la cuenta de cuáles van. */
  const enFoliate = new Map(); // cfi → clave (color + estilo)

  function sincronizarEpub() {
    const view = ctx.epub()?.view;
    if (!view) {
      enFoliate.clear();
      return;
    }
    const deseados = new Map();
    for (const a of subrayados()) if (a.locator.cfi) deseados.set(a.locator.cfi, `${colorDe(a)}|${estiloDe(a)}`);
    for (const [cfi, clave] of enFoliate) {
      if (deseados.get(cfi) === clave) continue;
      enFoliate.delete(cfi);
      void view.deleteAnnotation({ value: cfi })?.catch?.(() => undefined);
    }
    for (const [cfi, clave] of deseados) {
      if (enFoliate.get(cfi) === clave) continue;
      enFoliate.set(cfi, clave);
      void view.addAnnotation({ value: cfi })?.catch?.(() => undefined);
    }
  }

  /** Un capítulo se volvió a cargar con su capa vacía: se le vuelven a poner. */
  function recargarEpub() {
    const view = ctx.epub()?.view;
    if (!view) return;
    for (const cfi of enFoliate.keys()) void view.addAnnotation({ value: cfi })?.catch?.(() => undefined);
  }

  /** Cómo dibujar en foliate el subrayado de un CFI (lo pide `draw-annotation`). */
  function dibujoEpub(cfi) {
    const a = subrayados().find((x) => x.locator.cfi === cfi);
    return a ? { color: colorDe(a), estilo: estiloDe(a) } : null;
  }

  /** El tamaño de lo que se va a pegar: ancho (parte de la página) y proporción, según la herramienta. */
  function medidaNueva() {
    if (herramienta === 'textbox') return { w: 0.42, ar: 0.3 };
    if (herramienta === 'image') return { w: 0.4, ar: entre(proporcionNueva, 0.25, 4) };
    if (herramienta === 'sticker') return { w: anchoNuevo ?? 0.3, ar: entre(proporcionNueva, 0.25, 4) };
    return { w: ANCHO, ar: 1 };
  }

  function lugarEnPdf(e) {
    const pagina = e.target?.closest?.('.pagina') ?? document.elementsFromPoint(e.clientX, e.clientY).find((x) => x.classList?.contains('pagina'));
    if (!pagina) return null;
    const r = pagina.getBoundingClientRect();
    const { w, ar } = medidaNueva();
    const ancho = w * r.width;
    return enPagina(pagina, e.clientX - ancho / 2, e.clientY - (ancho * ar) / 2, w, ar);
  }


  // ─── EPUB ────────────────────────────────────────────────────────────────────

  /** El área a la vista del EPUB, en px de la ventana del motor. */
  const areaEpub = () => ctx.epub()?.raiz.getBoundingClientRect();
  /** El ancho en px de un post-it de EPUB: su parte del área, sin bajar del mínimo para tomarlo. */
  const anchoEpub = (w, area) => entre(w * area.width, LADO_MIN_PX, area.width);
  /** Uno nuevo: un cuarto del área, pero ni diminuto en el teléfono ni enorme en una ventana ancha. */
  const anchoNuevoEpub = (area) => entre(ANCHO * area.width, ANCHO_MIN_PX, ANCHO_MAX_PX);

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
    return anclaEn(x, y)?.cfi ?? null;
  }

  /**
   * El renglón más cercano a un punto (px de la ventana del motor): su CFI, su rango y su capítulo. Si el
   * punto no cae sobre un capítulo (un margen, el hueco entre capítulos), se busca en el más cercano.
   */
  function anclaEn(x, y) {
    const view = ctx.epub()?.view;
    const area = areaEpub();
    const cargados = capitulos();
    if (!view || !area || !cargados.length) return null;
    const distancia = (m) => (y < m.top ? m.top - y : y > m.bottom ? y - m.bottom : 0);
    const c = [...cargados].sort((a, b) => distancia(a.marco.getBoundingClientRect()) - distancia(b.marco.getBoundingClientRect()))[0];
    const m = c.marco.getBoundingClientRect();
    const py = entre(y, m.top + 1, m.bottom - 1) - m.top;
    const px = entre(x, m.left + 1, m.right - 1) - m.left;
    // Si el punto cae en el margen, se busca el renglón a esa altura por el centro de la columna.
    const rango = caretEn(c.doc, px, py) ?? caretEn(c.doc, area.left + area.width / 2 - m.left, py);
    if (!rango) return null;
    try {
      return { cfi: view.getCFI(c.index, rango), rango, capitulo: c };
    } catch {
      return null;
    }
  }

  /** El tamaño de la letra de un capítulo: la separación del renglón se guarda en esa medida. */
  const letraDe = (doc) => parseFloat(doc.defaultView?.getComputedStyle(doc.body ?? doc.documentElement).fontSize) || 16;

  function caretEn(doc, x, y) {
    if (doc.caretRangeFromPoint) return doc.caretRangeFromPoint(x, y);
    const p = doc.caretPositionFromPoint?.(x, y);
    if (!p) return null;
    const r = doc.createRange();
    r.setStart(p.offsetNode, p.offset);
    r.collapse(true);
    return r;
  }

  /**
   * La posición en un EPUB: el renglón que queda bajo el centro de lo pegado y cuánto se separa su orilla de
   * arriba de ese renglón (`dy`, en tamaños de letra). Así se queda donde se soltó aunque caiga en un margen o
   * en un hueco sin texto, y si cambia la letra se mueve con su renglón.
   */
  function enEpub(izquierda, arriba, anchoPx, w, ar = 1) {
    const area = areaEpub();
    if (!area) return null;
    const ancla = anclaEn(izquierda + anchoPx / 2, arriba + (anchoPx * ar) / 2);
    if (!ancla) return null;
    const m = ancla.capitulo.marco.getBoundingClientRect();
    const renglon = m.top + rectDe(ancla.rango).top;
    const dy = redondear((arriba - renglon) / letraDe(ancla.capitulo.doc));
    const x = entre((izquierda - area.left) / area.width, 0, 1 - anchoPx / area.width);
    return {
      cfi: ancla.cfi,
      x: redondear(Math.max(0, x)),
      w,
      fraction: redondear(ctx.epub().fraccion ?? 0),
      ...(Math.abs(ar - 1) > 0.001 ? { ar: redondear(ar) } : {}),
      ...(Math.abs(dy) > 0.01 ? { dy } : {}),
    };
  }

  function lugarEnEpub(e, doc) {
    const area = areaEpub();
    const marco = doc.defaultView?.frameElement;
    if (!area || !marco) return null;
    const m = marco.getBoundingClientRect();
    const { w, ar } = medidaNueva();
    const anchoPx =
      herramienta === 'postit'
        ? anchoNuevoEpub(area)
        : anchoNuevo
          ? anchoEpub(anchoNuevo, area)
          : entre(w * Math.min(area.width, 760), herramienta === 'sticker' ? ANCHO_MIN_PX : 120, area.width);
    return enEpub(e.clientX + m.left - anchoPx / 2, e.clientY + m.top - anchoPx / 4, anchoPx, redondear(anchoPx / area.width), ar);
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
      const el = pegado(a, { ancho: anchoEpub(a.locator.w, area) });
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
    const left = m.left + r.left;
    const ancho = anchoEpub(a.locator.w, area);
    const top = m.top + r.top + (Number.isFinite(a.locator.dy) ? a.locator.dy * letraDe(capitulo.doc) : 0);
    const alto = ancho * proporcionDe(a);
    // En páginas de lado, las otras columnas del capítulo están a los lados, fuera de la vista.
    if (top + alto < area.top || top > area.bottom - 16 || left < area.left - 2 || left > area.right) return null;
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
  function pintarPaginaPdf(n, div, { enLibro = false } = {}) {
    div.querySelector(':scope > .capa-anotaciones')?.remove();
    div.querySelector(':scope > .capa-subrayados')?.remove();
    pintarSubrayadosPdf(n, div);
    const enPaginaN = pegados().filter((a) => a.locator.page === n);
    if (!enPaginaN.length) return;
    const capa = document.createElement('div');
    capa.className = 'capa-anotaciones';
    for (const a of enPaginaN) {
      const el = pegado(a, { ancho: `${a.locator.w * 100}%`, enLibro });
      el.style.left = `${a.locator.x * 100}%`;
      el.style.top = `${a.locator.y * 100}%`;
      capa.append(el);
    }
    div.append(capa);
  }

  /** Los subrayados de una página del PDF, en su propia capa debajo de lo pegado. */
  function pintarSubrayadosPdf(n, div) {
    const marcas = [];
    for (const a of subrayados()) for (const q of a.locator.rects ?? []) if (q.page === n) marcas.push(marcaDeTexto(a, q));
    if (!marcas.length) return;
    const capa = document.createElement('div');
    capa.className = 'capa-subrayados';
    capa.append(...marcas);
    div.append(capa);
  }

  /**
   * En el libro real de un EPUB: lo de la hoja `i`. `ubicar(cfi)` dice en qué hoja y a qué altura cae un CFI
   * (lo calcula `book.js` con el capítulo ya acomodado en columnas).
   */
  function capaLibroEpub(i, sombra, ancho, { ubicar, ubicarRango }) {
    sombra.querySelector('.capa-anotaciones')?.remove();
    const capa = document.createElement('div');
    capa.className = 'capa-anotaciones';
    Object.assign(capa.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    // Los subrayados primero, debajo de lo pegado: cada renglón en la hoja donde cayó.
    for (const a of subrayados()) {
      if (!a.locator.cfi) continue;
      for (const q of ubicarRango(a.locator.cfi) ?? []) {
        if (q.pagina !== i) continue;
        const el = document.createElement('div');
        el.dataset.subrayado = a.id;
        Object.assign(el.style, { position: 'absolute', left: `${q.x}px`, top: `${q.y}px`, width: `${q.w}px`, height: `${q.h}px`, pointerEvents: 'none' });
        pintarEstilo(el, estiloDe(a), colorDe(a));
        capa.append(el);
      }
    }
    for (const a of pegados()) {
      if (!a.locator.cfi) continue;
      const u = ubicar(a.locator.cfi);
      if (!u || u.pagina !== i) continue;
      const px = entre(a.locator.w * ancho, LADO_MIN_PX, ancho);
      const el = pegado(a, { ancho: px, enLibro: true });
      el.style.left = `${entre(a.locator.x * ancho, 0, ancho - px)}px`;
      const letra = parseFloat(getComputedStyle(sombra.host ?? document.body).fontSize) || 16;
      el.style.top = `${u.y + (Number.isFinite(a.locator.dy) ? a.locator.dy * letra : 0)}px`;
      capa.append(el);
    }
    if (capa.childElementCount) sombra.append(capa);
  }

  // ─── Lo que pide la app ──────────────────────────────────────────────────────

  function repintar() {
    if (arrastre || editando) {
      repintarAlSoltar = true;
      return;
    }
    const pdf = ctx.pdf();
    if (pdf) for (const n of pdf.renderizadas.keys()) pintarPaginaPdf(n, pdf.paginas[n - 1]);
    ctx.libro()?.recapar?.();
    pintarEpub();
    sincronizarEpub();
    if (porEditar) editar(porEditar);
  }

  /**
   * Supr o Retroceso con algo pegado elegido (y sin estar escribiendo): quitarlo, como el botón (pedido de
   * Areli, 14 oct). Devuelve si lo atendió.
   */
  function alTeclear(e) {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return false;
    if (!seleccion || editando || !interactiva() || e.metaKey || e.ctrlKey || e.altKey) return false;
    if (e.target?.closest?.('input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]')) return false;
    if (!pegados().some((a) => a.id === seleccion)) return false;
    e.preventDefault();
    enviar({ type: 'remove', id: seleccion });
    return true;
  }

  return {
    alTeclear,
    actualizar(items) {
      lista = Array.isArray(items) ? [...items].sort((a, b) => a.z - b.z) : [];
      if (seleccion && !lista.some((a) => a.id === seleccion)) seleccion = null;
      repintar();
    },
    /** `ancho`: el de un sticker que vuelve de la charola, para que conserve su tamaño. */
    herramienta(valor, proporcion, ancho) {
      herramienta = PEGABLES.includes(valor) ? valor : null;
      proporcionNueva = Number.isFinite(proporcion) && proporcion > 0 ? proporcion : 1;
      anchoNuevo = herramienta === 'sticker' && Number.isFinite(ancho) && ancho > 0 && ancho <= 1 ? ancho : null;
      document.body.classList.toggle('pegando', !!herramienta);
      if (herramienta && seleccion) elegir(null, false);
    },
    elegir: (id) => elegir(typeof id === 'string' ? id : null, false),
    escribir: (id) => typeof id === 'string' && editar(id),
    /** Si hay un post-it o un cuadro de texto abierto para escribir (el teclado está arriba). */
    escribiendo: () => !!editando,
    alTocar,
    alCambiarSeleccion,
    soltarSeleccion,
    dibujoEpub,
    recargarEpub,
    pintarPaginaPdf,
    capaLibroEpub,
    /** Cambió la forma de leer o se abrió otro libro. */
    repintar,
    cerrar() {
      detenerCuadros();
      enFoliate.clear();
      seleccionEnviada = false;
      capaEpub?.remove();
      capaEpub = null;
      rangos = new Map();
      seleccion = null;
    },
  };
}
