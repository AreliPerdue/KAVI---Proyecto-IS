/**
 * RPE y RIR son dos formas de decir lo mismo (RF-F47): "me quedaban 2" equivale a un 8.
 * La equivalencia es la de la escala de Tuchscherer, RIR ≈ 10 − RPE, y se acota a los
 * rangos de cada escala para que un 10.5 o un RIR negativo no aparezcan nunca.
 */
export function rpeToRir(rpe: number): number {
  return clamp(10 - rpe, 0, 10);
}

export function rirToRpe(rir: number): number {
  return clamp(10 - rir, 1, 10);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
