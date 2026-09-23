import type { ImageSourcePropType } from 'react-native';

/**
 * Nobi, la mascota de KAVI, en sus diez colores.
 *
 * Se declaran uno a uno y no por plantilla porque `require` de Metro necesita una
 * ruta literal: se resuelve al empaquetar, no en tiempo de ejecución.
 *
 * El color elegido se guarda en el perfil con el prefijo `nobi:` en vez de en una
 * preferencia del dispositivo, para que los contactos vean el mismo avatar que tú.
 */
export const NOBI_PREFIX = 'nobi:';

export type NobiColor = {
  id: string;
  label: string;
  source: ImageSourcePropType;
};

export const NOBIS: readonly NobiColor[] = [
  { id: 'pink', label: 'Rosa', source: require('../../assets/nobi/pink.png') },
  { id: 'magenta', label: 'Magenta', source: require('../../assets/nobi/magenta.png') },
  { id: 'red', label: 'Rojo', source: require('../../assets/nobi/red.png') },
  { id: 'deep_red', label: 'Rojo oscuro', source: require('../../assets/nobi/deep_red.png') },
  { id: 'orange', label: 'Naranja', source: require('../../assets/nobi/orange.png') },
  { id: 'yellow', label: 'Amarillo', source: require('../../assets/nobi/yellow.png') },
  { id: 'olive_green', label: 'Verde oliva', source: require('../../assets/nobi/olive_green.png') },
  { id: 'lime_green', label: 'Verde lima', source: require('../../assets/nobi/lime_green.png') },
  { id: 'green', label: 'Verde', source: require('../../assets/nobi/green.png') },
  { id: 'turquois', label: 'Turquesa', source: require('../../assets/nobi/turquois.png') },
  { id: 'baby_blue', label: 'Azul cielo', source: require('../../assets/nobi/baby_blue.png') },
  { id: 'blue', label: 'Azul', source: require('../../assets/nobi/blue.png') },
  { id: 'navy_blue', label: 'Azul marino', source: require('../../assets/nobi/navy_blue.png') },
  { id: 'indigo', label: 'Índigo', source: require('../../assets/nobi/indigo.png') },
  { id: 'purple', label: 'Morado', source: require('../../assets/nobi/purple.png') },
  { id: 'light_purple', label: 'Morado claro', source: require('../../assets/nobi/light_purple.png') },
  { id: 'lilac', label: 'Lila', source: require('../../assets/nobi/lilac.png') },
  { id: 'white', label: 'Blanco', source: require('../../assets/nobi/white.png') },
  { id: 'gray', label: 'Gris', source: require('../../assets/nobi/gray.png') },
  { id: 'black', label: 'Negro', source: require('../../assets/nobi/black.png') },
];

/** El identificador guardado en el perfil, o `null` si no hay Nobi elegido. */
export function nobiIdDesde(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl?.startsWith(NOBI_PREFIX)) return null;
  const id = avatarUrl.slice(NOBI_PREFIX.length);
  return NOBIS.some((n) => n.id === id) ? id : null;
}

/** La imagen correspondiente, o `null` si el perfil no tiene un Nobi válido. */
export function nobiSource(avatarUrl: string | null | undefined): ImageSourcePropType | null {
  const id = nobiIdDesde(avatarUrl);
  return id ? (NOBIS.find((n) => n.id === id)?.source ?? null) : null;
}

/** Lo que se guarda en `profiles.avatar_url`. */
export function nobiUrl(id: string): string {
  return `${NOBI_PREFIX}${id}`;
}
