/** Utilidades de color: contraste WCAG para decidir cuándo una marca necesita contorno. */

function canal(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa (WCAG 2) de un `#RRGGBB`. */
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => canal(Number.parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [claro, oscuro] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/**
 * Un color con significado (persona, tema) que no llega a 3:1 contra el fondo casi no se
 * ve como punto o borde: el negro o el azul marino de un Nobi sobre la tinta de la app.
 * En esos casos la marca lleva un contorno claro en vez de cambiarle el color (T202).
 */
export function needsOutline(hex: string, background: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) && contrastRatio(hex, background) < 3;
}
