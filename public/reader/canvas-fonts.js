import { caraDeLetra, familiaDe } from './text.js';

/**
 * La letra de los textos del lienzo (T375): la del sistema, serifa (Literata) o manuscrita (Patrick Hand). Son las mismas
 * OFL que el motor ya trae para leer; aquí se declaran una vez en el documento del motor (las hojas del libro real, en
 * su sombra, también las ven).
 */
const SISTEMA = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';

/** La pila de letras para CSS y para el canvas de la exportación. */
export const familiaDeLienzo = (letra) => (letra === 'serif' || letra === 'hand' ? familiaDe(letra) : SISTEMA);

let cargando = null;
/** Declara las dos letras en el documento (una vez). Si fallan, se ven con su respaldo. */
export function cargarLetrasDeLienzo(vendor) {
  cargando ??= Promise.all([caraDeLetra('serif', vendor), caraDeLetra('hand', vendor)])
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
  const usadas = [...new Set(letras.filter((l) => l === 'serif' || l === 'hand'))];
  if (!usadas.length || !document.fonts?.load) return;
  await Promise.all(usadas.map((l) => document.fonts.load(`16px ${familiaDeLienzo(l)}`).catch(() => undefined)));
}
