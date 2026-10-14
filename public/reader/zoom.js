/**
 * Pellizco con dos dedos (spec 13c, RF-BH1; T288). Escucha en fase de captura para enterarse antes que los
 * gestos de pasar página; mientras dura (y un momento después) `pellizcando()` es verdadero, para que soltar
 * los dedos no cuente como deslizar ni como toque.
 *
 * `alMover(escala, centro)` va diciendo cuánto se abrió respecto al inicio (1 = igual) y `alTerminar(escala,
 * centro)` da el resultado al soltar. `centro` está en px del documento donde ocurrió.
 */

let ultimoPellizco = 0;
let dedosEnPellizco = 0;

export const pellizcando = () => dedosEnPellizco > 0 || performance.now() - ultimoPellizco < 350;

export function escucharPellizco(objetivo, { activo = () => true, alMover, alTerminar }) {
  const dedos = new Map();
  let inicio = null; // { distancia, centro }
  let escala = 1;

  const puntos = () => [...dedos.values()];
  const distancia = () => {
    const [a, b] = puntos();
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const centro = () => {
    const [a, b] = puntos();
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  objetivo.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType !== 'touch' || !activo()) return;
      dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (dedos.size === 2) {
        inicio = { distancia: Math.max(1, distancia()), centro: centro() };
        escala = 1;
        dedosEnPellizco = 2;
      }
    },
    true,
  );
  objetivo.addEventListener(
    'pointermove',
    (e) => {
      if (!dedos.has(e.pointerId)) return;
      dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!inicio || dedos.size !== 2) return;
      e.preventDefault();
      escala = distancia() / inicio.distancia;
      alMover?.(escala, inicio.centro);
    },
    { capture: true, passive: false },
  );
  const soltar = (e) => {
    if (!dedos.has(e.pointerId)) return;
    dedos.delete(e.pointerId);
    if (inicio && dedos.size < 2) {
      const fin = { escala, centro: inicio.centro };
      inicio = null;
      dedosEnPellizco = 0;
      ultimoPellizco = performance.now();
      alTerminar?.(fin.escala, fin.centro);
    }
  };
  objetivo.addEventListener('pointerup', soltar, true);
  objetivo.addEventListener('pointercancel', soltar, true);
}

/**
 * Ctrl/⌘ y la rueda (o pellizcar en el trackpad, que el navegador manda así): se junta el movimiento y se
 * aplica cuando para. `alMover` va dando la escala acumulada para mostrarla mientras tanto.
 */
export function escucharRuedaConCtrl(objetivo, { activo = () => true, alMover, alTerminar }) {
  let escala = 1;
  let centro = null;
  let espera = null;
  objetivo.addEventListener(
    'wheel',
    (e) => {
      if (!(e.ctrlKey || e.metaKey) || !activo()) return;
      e.preventDefault();
      // Un clic de rueda (~100) acerca ~1.5×; el pellizco del trackpad manda pasos chicos y va suave.
      escala = Math.min(8, Math.max(0.125, escala * Math.exp(-e.deltaY * 0.004)));
      centro ??= { x: e.clientX, y: e.clientY };
      alMover?.(escala, centro);
      clearTimeout(espera);
      espera = setTimeout(() => {
        const fin = { escala, centro };
        escala = 1;
        centro = null;
        alTerminar?.(fin.escala, fin.centro);
      }, 220);
    },
    { capture: true, passive: false },
  );
}
