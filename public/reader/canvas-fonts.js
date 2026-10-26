import { caraDeLetra, familiaDe } from './text.js';

/**
 * La letra de los textos del lienzo (T375, T377): la del sistema, serifa (Literata), manuscrita (Patrick Hand), la del
 * logo de KAVI (Moirai One) o la de su eslogan (Poiret One), todas OFL. Se declaran una vez en el documento del motor
 * (las hojas del libro real, en su sombra, también las ven).
 */
const LETRAS = ['serif', 'hand', 'brand', 'slogan'];
const SISTEMA = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';

/** La pila de letras para CSS y para el canvas de la exportación. */
export const familiaDeLienzo = (letra) => (LETRAS.includes(letra) ? familiaDe(letra) : SISTEMA);

let cargando = null;
/** Declara las dos letras en el documento (una vez). Si fallan, se ven con su respaldo. */
export function cargarLetrasDeLienzo(vendor) {
  cargando ??= Promise.all(LETRAS.map((l) => caraDeLetra(l, vendor)))
    .then((caras) => {
      const estilo = document.createElement('style');
      estilo.dataset.kavi = 'letras-del-lienzo';
      estilo.textContent = caras.join('\n');
      document.head.append(estilo);
    })
    .catch(() => undefined);
  return cargando;
}

/** Antes de dibujar en un canvas: que las letras que se usan estén listas (si no, el canvas usa el respaldo). */
export async function letrasListas(letras) {
  const usadas = [...new Set(letras.filter((l) => LETRAS.includes(l)))];
  if (!usadas.length || !document.fonts?.load) return;
  await Promise.all(usadas.map((l) => document.fonts.load(`16px ${familiaDeLienzo(l)}`).catch(() => undefined)));
}
