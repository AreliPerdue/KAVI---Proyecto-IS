/**
 * Tokens de diseño de KAVI — fuente única (ver .claude/skills/kavi-design).
 * "La app es monocroma; tu vida trae el color": el chrome usa neutros de tinta,
 * el color saturado proviene solo de las dimensiones/temas de las actividades.
 */
import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#FAFAF8',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F1EE',
    border: '#E4E4DF',
    text: '#16171A',
    textSecondary: '#5C5F66',
    textTertiary: '#8A8D94',
    ink: '#16171A',
    onInk: '#FFFFFF',
    today: '#FF5A3C',
    danger: '#D62839',
    success: '#1F9D55',
    neutralActivity: '#9A9DA5',
    overlay: 'rgba(15,16,19,0.45)',
  },
  dark: {
    background: '#0F1013',
    surface: '#17181C',
    surfaceAlt: '#1F2126',
    border: '#2A2C33',
    text: '#F4F4F1',
    textSecondary: '#A3A6AE',
    textTertiary: '#6F727A',
    ink: '#F4F4F1',
    onInk: '#0F1013',
    today: '#FF7A5C',
    danger: '#FF5C6C',
    success: '#3DD68C',
    neutralActivity: '#6F727A',
    overlay: 'rgba(0,0,0,0.6)',
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
