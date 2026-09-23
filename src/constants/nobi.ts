import type { ImageSourcePropType } from 'react-native';

import type { ColorScheme } from './theme';

/**
 * Nobi, la mascota de KAVI, en sus veinte colores.
 *
 * Se declaran uno a uno y no por plantilla porque `require` de Metro necesita una
 * ruta literal: se resuelve al empaquetar, no en tiempo de ejecución.
 *
 * Cada color viene en dos versiones porque el fondo va pintado en la propia imagen,
 * no es transparente: la oscura sobre tinta y la clara sobre blanco. Se eligen por
 * esquema activo (NFR-18) — el mismo Nobi sobre el fondo equivocado se recorta como
 * un cuadro de otro color dentro del círculo del avatar.
 *
 * El color elegido se guarda en el perfil con el prefijo `nobi:` en vez de en una
 * preferencia del dispositivo, para que los contactos vean el mismo avatar que tú.
 * Lo que se guarda es el id, no la imagen: el esquema de quien mira es el que decide
 * cuál de las dos se pinta.
 */
export const NOBI_PREFIX = 'nobi:';

export type NobiColor = {
  id: string;
  label: string;
  /** Indexadas por esquema, para que quien las use no tenga que ramificar. */
  sources: Record<ColorScheme, ImageSourcePropType>;
};

export const NOBIS: readonly NobiColor[] = [
  { id: 'pink', label: 'Rosa', sources: {
    dark: require('../../assets/nobi/pink.png'),
    light: require('../../assets/nobi/light/pink.png'),
  } },
  { id: 'magenta', label: 'Magenta', sources: {
    dark: require('../../assets/nobi/magenta.png'),
    light: require('../../assets/nobi/light/magenta.png'),
  } },
  { id: 'red', label: 'Rojo', sources: {
    dark: require('../../assets/nobi/red.png'),
    light: require('../../assets/nobi/light/red.png'),
  } },
  { id: 'deep_red', label: 'Rojo oscuro', sources: {
    dark: require('../../assets/nobi/deep_red.png'),
    light: require('../../assets/nobi/light/deep_red.png'),
  } },
  { id: 'orange', label: 'Naranja', sources: {
    dark: require('../../assets/nobi/orange.png'),
    light: require('../../assets/nobi/light/orange.png'),
  } },
  { id: 'yellow', label: 'Amarillo', sources: {
    dark: require('../../assets/nobi/yellow.png'),
    light: require('../../assets/nobi/light/yellow.png'),
  } },
  { id: 'olive_green', label: 'Verde oliva', sources: {
    dark: require('../../assets/nobi/olive_green.png'),
    light: require('../../assets/nobi/light/olive_green.png'),
  } },
  { id: 'lime_green', label: 'Verde lima', sources: {
    dark: require('../../assets/nobi/lime_green.png'),
    light: require('../../assets/nobi/light/lime_green.png'),
  } },
  { id: 'green', label: 'Verde', sources: {
    dark: require('../../assets/nobi/green.png'),
    light: require('../../assets/nobi/light/green.png'),
  } },
  { id: 'turquois', label: 'Turquesa', sources: {
    dark: require('../../assets/nobi/turquois.png'),
    light: require('../../assets/nobi/light/turquois.png'),
  } },
  { id: 'baby_blue', label: 'Azul cielo', sources: {
    dark: require('../../assets/nobi/baby_blue.png'),
    light: require('../../assets/nobi/light/baby_blue.png'),
  } },
  { id: 'blue', label: 'Azul', sources: {
    dark: require('../../assets/nobi/blue.png'),
    light: require('../../assets/nobi/light/blue.png'),
  } },
  { id: 'navy_blue', label: 'Azul marino', sources: {
    dark: require('../../assets/nobi/navy_blue.png'),
    light: require('../../assets/nobi/light/navy_blue.png'),
  } },
  { id: 'indigo', label: 'Índigo', sources: {
    dark: require('../../assets/nobi/indigo.png'),
    light: require('../../assets/nobi/light/indigo.png'),
  } },
  { id: 'purple', label: 'Morado', sources: {
    dark: require('../../assets/nobi/purple.png'),
    light: require('../../assets/nobi/light/purple.png'),
  } },
  { id: 'light_purple', label: 'Morado claro', sources: {
    dark: require('../../assets/nobi/light_purple.png'),
    light: require('../../assets/nobi/light/light_purple.png'),
  } },
  { id: 'lilac', label: 'Lila', sources: {
    dark: require('../../assets/nobi/lilac.png'),
    light: require('../../assets/nobi/light/lilac.png'),
  } },
  { id: 'white', label: 'Blanco', sources: {
    dark: require('../../assets/nobi/white.png'),
    light: require('../../assets/nobi/light/white.png'),
  } },
  { id: 'gray', label: 'Gris', sources: {
    dark: require('../../assets/nobi/gray.png'),
    light: require('../../assets/nobi/light/gray.png'),
  } },
  { id: 'black', label: 'Negro', sources: {
    dark: require('../../assets/nobi/black.png'),
    light: require('../../assets/nobi/light/black.png'),
  } },
];

/** El identificador guardado en el perfil, o `null` si no hay Nobi elegido. */
export function nobiIdDesde(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl?.startsWith(NOBI_PREFIX)) return null;
  const id = avatarUrl.slice(NOBI_PREFIX.length);
  return NOBIS.some((n) => n.id === id) ? id : null;
}

/** La imagen del esquema activo, o `null` si el perfil no tiene un Nobi válido. */
export function nobiSource(avatarUrl: string | null | undefined, scheme: ColorScheme): ImageSourcePropType | null {
  const id = nobiIdDesde(avatarUrl);
  return id ? (NOBIS.find((n) => n.id === id)?.sources[scheme] ?? null) : null;
}

/** Lo que se guarda en `profiles.avatar_url`. */
export function nobiUrl(id: string): string {
  return `${NOBI_PREFIX}${id}`;
}
