import { contrastRatio } from '@/lib/color';
import { hexValido } from '@/lib/library/cover/parts';

/**
 * Tema del lector (spec 13c, RF-BH5): el color de la página y de la letra mientras se lee, aparte del tema
 * de la app. Claro, oscuro (fondo negro, letra blanca), sepia o uno propio. Sin React.
 */
export type TemaDeLectura = 'light' | 'dark' | 'sepia' | 'custom';
export const TEMAS_DE_LECTURA: readonly TemaDeLectura[] = ['light', 'dark', 'sepia', 'custom'];

export type ColoresDeLectura = { pagina: string; letra: string };

/** Los colores de los temas fijos. El oscuro es negro de verdad: en pantallas OLED casi no gasta. */
export const COLORES_DE_TEMA: Record<Exclude<TemaDeLectura, 'custom'>, ColoresDeLectura> = {
  light: { pagina: '#FFFFFF', letra: '#1A1A1A' },
  dark: { pagina: '#000000', letra: '#F2F2F2' },
  sepia: { pagina: '#F4ECD8', letra: '#5B4636' },
};

export type PreferenciaDeTema = { tema: TemaDeLectura; propio: ColoresDeLectura };

/** Al empezar: claro, y el propio arranca del sepia para que elegir colores no parta de cero. */
export const TEMA_POR_OMISION: PreferenciaDeTema = { tema: 'light', propio: COLORES_DE_TEMA.sepia };

/** Lo guardado en el dispositivo, o el de omisión si no sirve. */
export function temaValido(valor: unknown): PreferenciaDeTema {
  const v = valor as Partial<PreferenciaDeTema> | null;
  const tema = TEMAS_DE_LECTURA.includes(v?.tema as TemaDeLectura) ? (v?.tema as TemaDeLectura) : TEMA_POR_OMISION.tema;
  const pagina = hexValido(v?.propio?.pagina ?? '');
  const letra = hexValido(v?.propio?.letra ?? '');
  return { tema, propio: pagina && letra ? { pagina, letra } : TEMA_POR_OMISION.propio };
}

/** Los colores que se usan: los del tema o, en el propio, los que eligió la persona. */
export function coloresDe(preferencia: PreferenciaDeTema): ColoresDeLectura {
  return preferencia.tema === 'custom' ? preferencia.propio : COLORES_DE_TEMA[preferencia.tema];
}

/** Con menos de 4.5:1 el texto cuesta (WCAG AA): se avisa, pero se deja elegir. */
export function pocoContraste({ pagina, letra }: ColoresDeLectura): boolean {
  return contrastRatio(pagina, letra) < 4.5;
}

/** Colores a la mano para el tema propio: páginas claras, cálidas y oscuras, y letras que contrastan. */
export const PAGINAS_SUGERIDAS = ['#FFFFFF', '#F4ECD8', '#ECE6D6', '#DDE5D3', '#1E2328', '#121212', '#000000'] as const;
export const LETRAS_SUGERIDAS = ['#1A1A1A', '#3B3B3B', '#5B4636', '#2B3A55', '#C8C8C8', '#F2F2F2', '#FFE8B0'] as const;
