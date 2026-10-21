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

/** Mezcla dos colores hex: `t` = 0 es `a`, 1 es `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const canal = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const k = Math.min(1, Math.max(0, t));
  return `#${[0, 1, 2]
    .map((i) => Math.round(canal(a, i) * (1 - k) + canal(b, i) * k).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/** Tono (0–360), saturación y brillo (0–1): lo que mueve el selector de color del lienzo (13h, RF-CC12; T342). */
export type Hsv = { h: number; s: number; v: number };

/** `#RRGGBB` (o `#RGB`, con o sin `#`) en mayúscula; `null` si no es un color. */
export function normalizarHex(texto: string): string | null {
  const limpio = texto.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(limpio)) return `#${[...limpio].map((c) => c + c).join('')}`.toUpperCase();
  return /^[0-9a-fA-F]{6}$/.test(limpio) ? `#${limpio}`.toUpperCase() : null;
}

export function hsvAHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + ((((h % 360) + 360) % 360) / 60)) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return `#${[f(5), f(3), f(1)].map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function hexAHsv(hex: string): Hsv {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => x / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: (h + 360) % 360, s: max ? d / max : 0, v: max };
}
