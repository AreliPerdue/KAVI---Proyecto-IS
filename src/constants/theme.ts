/**
 * Tokens de diseño de KAVI — fuente única (ver .claude/skills/kavi-design).
 * "La app es monocroma; tu vida trae el color": el chrome usa neutros de tinta,
 * el color saturado proviene solo de las dimensiones/temas de las actividades.
 *
 * El sistema se construye sobre dos anclas: tinta `#131313` y blanco contrastante
 * `#F2F2F2`. En oscuro (tema por defecto, ver `useResolvedScheme`) `#131313` es el
 * fondo y `#F2F2F2` el texto; en claro se invierten. Los grises intermedios son
 * pasos neutros entre ambas anclas. Todos los pares texto/fondo verificados ≥ 4.5:1.
 */
import '@/global.css';

import { Platform } from 'react-native';

/** Anclas del sistema. Todo neutro sale de estas dos. */
export const INK = '#131313';
export const PAPER = '#F2F2F2';

export const Colors = {
  light: {
    background: PAPER,
    surface: '#FFFFFF',
    surfaceAlt: '#E6E6E6',
    border: '#D4D4D4',
    text: INK,
    textSecondary: '#565656',
    textTertiary: '#6E6E6E',
    ink: INK,
    onInk: PAPER,
    today: '#BC3617',
    danger: '#B81E2F',
    success: '#116B36',
    neutralActivity: '#747474',
    overlay: 'rgba(19,19,19,0.45)',
  },
  dark: {
    background: INK,
    surface: '#1A1A1A',
    surfaceAlt: '#232323',
    border: '#303030',
    text: PAPER,
    textSecondary: '#ABABAB',
    textTertiary: '#8C8C8C',
    ink: PAPER,
    onInk: INK,
    today: '#FF7A5C',
    danger: '#FF6B7A',
    success: '#3DD68C',
    neutralActivity: '#7C7C7C',
    overlay: 'rgba(0,0,0,0.66)',
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = (typeof Colors)[ColorScheme];
export type ThemeColor = keyof ThemeColors;

/** Familia tipográfica del sistema (sin fuentes custom en V1). */
export const Fonts = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace' },
  web: { sans: 'var(--font-sans)', mono: 'var(--font-mono)' },
  default: { sans: 'normal', mono: 'monospace' },
});

/** Escala tipográfica: tamaño / peso / interlineado. */
export const Typography = {
  display: { fontSize: 34, fontWeight: '700', lineHeight: 40, letterSpacing: -0.5 },
  title: { fontSize: 28, fontWeight: '700', lineHeight: 34, letterSpacing: -0.3 },
  heading: { fontSize: 20, fontWeight: '600', lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyStrong: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  label: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
} as const;

export type TypographyVariant = keyof typeof Typography;

/** Ritmo 4/8. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

/** Siempre usar junto con `borderCurve: 'continuous'`. */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

/** Única sombra permitida (FAB, sheets). */
export const Shadow = {
  floating: '0 4px 16px rgba(22,23,26,0.08)',
} as const;

export const IconSize = { inline: 20, action: 24, tab: 28 } as const;
export const IconStroke = 2;

/** Duraciones de movimiento en ms. */
export const Motion = { fast: 120, base: 200, slow: 320 } as const;

/** Touch target mínimo (iOS 44 / Android 48). */
export const MinTouchTarget = Platform.select({ android: 48, default: 44 });

/** Ancho máximo de contenido en web (NFR-9). */
export const MaxContentWidth = 1100;
