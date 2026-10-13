/**
 * Buscar dentro de un PDF (spec 13b, RF-BR4): lo puro, sin DOM, para probarlo aparte.
 *
 * Se busca sin distinguir mayúsculas ni acentos ("cancion" encuentra "Canción"), sobre el texto de
 * la página entero, para que una frase partida en dos renglones también salga. Cada coincidencia se
 * devuelve como tramos por pedazo de texto (`item`), que es como pdf.js la pinta: un `span` por pedazo.
 */

/** Una letra sin acento y en minúscula. Siempre de un carácter, para no mover las posiciones. */
function plegar(c) {
  const base = c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return base.length === 1 ? base : c.toLowerCase().slice(0, 1) || c;
}

export function plegarTexto(texto) {
  let salida = '';
  for (const c of texto) salida += plegar(c);
  return salida;
}

/**
 * Las coincidencias de `consulta` en una página hecha de pedazos de texto.
 * @param {string[]} pedazos el texto de cada pedazo, en orden
 * @param {string} consulta
 * @returns {{ tramos: { item: number, inicio: number, fin: number }[] }[]}
 */
export function buscarEnPedazos(pedazos, consulta) {
  const buscada = plegarTexto(consulta.trim());
  if (!buscada) return [];
  // Texto completo de la página y, para cada carácter, de qué pedazo viene y en qué posición.
  let texto = '';
  const origen = [];
  pedazos.forEach((pedazo, item) => {
    const plegado = plegarTexto(pedazo);
    [...plegado].forEach((c, i) => {
      texto += c;
      origen.push({ item, i });
    });
    // Entre pedazos va un espacio: así "fin de" + "línea" encuentra "de línea" y no "delínea".
    texto += ' ';
    origen.push(null);
  });
  const resultados = [];
  for (let desde = texto.indexOf(buscada); desde !== -1; desde = texto.indexOf(buscada, desde + buscada.length)) {
    const tramos = [];
    for (let k = desde; k < desde + buscada.length; k++) {
      const o = origen[k];
      if (!o) continue;
      const ultimo = tramos[tramos.length - 1];
      if (ultimo && ultimo.item === o.item && ultimo.fin === o.i) ultimo.fin = o.i + 1;
      else tramos.push({ item: o.item, inicio: o.i, fin: o.i + 1 });
    }
    if (tramos.length) resultados.push({ tramos });
  }
  return resultados;
}

/**
 * Qué parte de la pantalla se tocó (spec 13b, RF-BR7b): el 20 % de cada borde pasa de página y el
 * centro muestra u oculta los controles.
 */
export function zonaDeToque(x, ancho) {
  if (ancho <= 0) return 'centro';
  const f = x / ancho;
  return f < 0.2 ? 'izquierda' : f > 0.8 ? 'derecha' : 'centro';
}
