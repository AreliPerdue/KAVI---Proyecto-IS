/**
 * Ventana en la que un toque se ignora por venir de un arrastre que acaba de terminar.
 *
 * Hace falta porque el arrastre y el toque conviven en el mismo elemento y la disputa la
 * gana el toque: al soltar una tarjeta, además de moverse, se abría. Se probó con el
 * `Pressable` de gesture-handler esperando que el gesto padre lo cancelara, y no ocurre —
 * por omisión el hijo tiene prioridad sobre el gesto de un ancestro.
 *
 * La alternativa era encadenar referencias entre el gesto y cada elemento tocable, lo que
 * obligaría a que cada pantalla conociera la maquinaria del arrastre. Esto es una guarda de
 * dos funciones que las pantallas consultan en una línea, y funciona igual en las tres
 * plataformas.
 */
let ultimoArrastre = 0;

/** Lo llaman los componentes arrastrables al soltar, si de verdad hubo movimiento. */
export function marcarArrastre(): void {
  ultimoArrastre = Date.now();
}

/** Lo consultan los `onPress` de lo arrastrable antes de hacer nada. */
export function arrastreReciente(ventanaMs = 250): boolean {
  return Date.now() - ultimoArrastre < ventanaMs;
}
