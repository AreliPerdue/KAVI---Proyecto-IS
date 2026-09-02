import { Tag } from 'lucide-react-native';

import { IconSize, IconStroke } from '@/constants/theme';
import { isThemeIconName, THEME_ICONS } from '@/constants/icons';

export type ThemeIconProps = {
  /** Nombre lucide en kebab-case (p. ej. 'book-open'). Desconocido → etiqueta genérica. */
  name: string | null | undefined;
  color: string;
  size?: number;
};

/** Icono de tema/dimensión por nombre, del set curado en constants/icons.ts. */
export function ThemeIcon({ name, color, size = IconSize.inline }: ThemeIconProps) {
  const Component = isThemeIconName(name) ? THEME_ICONS[name] : Tag;
  return <Component size={size} strokeWidth={IconStroke} color={color} />;
}
