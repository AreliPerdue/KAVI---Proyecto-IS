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
    /** Primario, FAB, selección y el indicador de hoy / hora actual. */
    ink: INK,
    onInk: PAPER,
    /** Acento cálido de aviso (recordatorios vencidos, filtros activos, choque de horario). */
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

/** Familia tipográfica de la interfaz: la del sistema. */
export const Fonts = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace' },
  web: { sans: 'var(--font-sans)', mono: 'var(--font-mono)' },
  default: { sans: 'normal', mono: 'monospace' },
});

/**
 * Fuentes de marca. Solo para el wordmark y el eslogan del logo — nunca para
 * texto de interfaz, que sigue en la fuente del sistema.
 *
 * Se embeben en nativo con el config plugin de `expo-font` (`app.json`) y en web
 * con las reglas `@font-face` de `src/global.css`. Los tres destinos resuelven la
 * familia por el nombre PostScript, por eso el valor es el mismo en todas.
 */
export const BrandFonts = {
  /** Moirai One: el wordmark "KAVI" con el trazo de contorno del logo. */
  wordmark: 'MoiraiOne-Regular',
  /** Poiret One: el eslogan bajo el wordmark. */
  slogan: 'PoiretOne-Regular',
} as const;

/** Eslogan de KAVI, tal cual aparece en el logo. */
export const SLOGAN = 'Plan more. be more.';

/**
 * Proporciones del logo original (medidas sobre `Kavi_Icon_With_Slogan.jpeg`),
 * para que el bloque wordmark + eslogan se arme igual a cualquier tamaño.
 */
export const Brand = {
  /** Tracking del wordmark, en múltiplos del tamaño de fuente. */
  wordmarkTracking: 0.06,
  /** Tracking del eslogan: el logo lo lleva muy abierto. */
  sloganTracking: 0.141,
  /** Tamaño del eslogan respecto al del wordmark. */
  sloganScale: 0.32,
} as const;

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

/**
 * Piso de permanencia del splash en ms, contado desde el arranque (NFR-19).
 * No es una transición: es cuánto se sostiene la marca antes de dar paso a la app.
 */
export const SplashMinDuration = 3000;

/** Touch target mínimo (iOS 44 / Android 48). */
export const MinTouchTarget = Platform.select({ android: 48, default: 44 });

/** Ancho máximo de contenido en web (NFR-9). */
export const MaxContentWidth = 1100;
