import type { WeightUnit } from '@/types/domain';

/** Libras en un kilo (definición internacional de la libra). */
export const LB_PER_KG = 2.20462262185;

/**
 * El peso se guarda siempre en kg (RF-F16) y se muestra en la unidad que la persona eligió.
 * Se redondea a centésimas porque la columna es `numeric(7,2)`: 225 lb se guardan como
 * 102.06 kg y vuelven a mostrarse como 225 lb.
 */
export function toKg(value: number, unit: WeightUnit): number {
  return round(unit === 'kg' ? value : value / LB_PER_KG, 2);
}

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg * LB_PER_KG;
}

/**
 * Cómo se lee un peso: en kg con hasta dos decimales (los discos de 1.25 existen) y en lb
 * con uno, que es la precisión con que cualquier gimnasio etiqueta sus mancuernas.
 */
export function formatWeight(kg: number, unit: WeightUnit): string {
  const valor = round(fromKg(kg, unit), unit === 'kg' ? 2 : 1);
  return `${valor} ${unit}`;
}

export function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
