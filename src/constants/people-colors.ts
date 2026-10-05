import { NOBIS } from '@/constants/nobi';

/**
 * Colores de persona para el calendario superpuesto (RF-S15).
 *
 * Cuando se superpone el calendario de alguien, las actividades dejan de pintarse por
 * dimensión/tema y pasan a pintarse por **quién es su dueño**: un color por persona.
 * Es una capa distinta de la paleta de dimensiones (spec 05) y solo aplica en ese modo;
 * con "Tú" a solas vuelve el color coding de temas.
 *
 * Son **veintiuno**, emparejados uno a uno con los Nobi (`constants/nobi`): el color que
 * alguien eligió para su mascota es el que lo representa en el calendario de los demás.
 *
 * Los tonos parten del matiz de cada Nobi pero **no son los del PNG**: se ajustaron en
 * OKLCH para que sean vibrantes sin llegar a chillones (saturación media-alta, nunca al
 * tope) y para que **todos** se lean sobre la tinta de la app (≥ 3:1 contra `#131313`),
 * también sobre el fondo de las hojas (`#1A1A1A`) y también los de nombre oscuro: rojo vino, azul marino, verde bandera, morado y negro.
 * Dentro de cada familia los separa la luminosidad (rosa claro, magenta medio…), y ningún
 * par queda a menos de 16 de distancia perceptual. Si algún día se usan sobre un fondo
 * donde no llegan a 3:1, sus marcas llevan contorno (`needsOutline` en `lib/color.ts`).
 * Con el nombre siempre al lado, el color nunca es el único indicador.
 *
 * Dos órdenes distintos:
 * - `PEOPLE_COLORS` es el del **reparto automático** a quien no ha elegido color. Va
 *   alternando matices y pone primero los que mejor se ven; agregar uno nuevo va **al
 *   final**, porque el reparto se deriva en cada render y meter uno en medio le cambiaría
 *   el color a contactos que ya llevaban el suyo.
 * - `PEOPLE_COLORS_DISPLAY` es el de los **menús**: por familias (rosas y rojos, naranja y
 *   amarillo, verdes, azules, morados, neutros), de claro a oscuro dentro de cada una.
 */

export type PersonColor = { id: string; label: string; hex: string };

export const PEOPLE_COLORS: readonly PersonColor[] = [
  { id: 'baby_blue', label: 'Azul cielo', hex: '#86CBF3' },
  { id: 'orange', label: 'Naranja', hex: '#F68C36' },
  { id: 'lime_green', label: 'Verde lima', hex: '#A2DD5C' },
  { id: 'pink', label: 'Rosa', hex: '#F6A9CD' },
  { id: 'turquois', label: 'Turquesa', hex: '#3ACCC5' },
  { id: 'yellow', label: 'Amarillo', hex: '#F1D35D' },
  { id: 'lilac', label: 'Lila', hex: '#C9AAEE' },
  { id: 'coral', label: 'Coral', hex: '#F68675' },
  { id: 'gray', label: 'Gris', hex: '#9FA5AE' },
  { id: 'olive_green', label: 'Verde oliva', hex: '#8A9348' },
  { id: 'white', label: 'Blanco', hex: '#EAE8E0' },
  { id: 'magenta', label: 'Magenta', hex: '#DB509C' },
  { id: 'light_purple', label: 'Morado intermedio', hex: '#A878DB' },
  { id: 'red', label: 'Rojo', hex: '#E24947' },
  { id: 'indigo', label: 'Índigo', hex: '#7067E9' },
  { id: 'blue', label: 'Azul', hex: '#4087EE' },
  { id: 'deep_red', label: 'Rojo vino', hex: '#B24755' },
  { id: 'green', label: 'Verde bandera', hex: '#318C4C' },
  { id: 'navy_blue', label: 'Azul marino', hex: '#496BBA' },
  { id: 'purple', label: 'Morado', hex: '#934FA8' },
  { id: 'black', label: 'Negro', hex: '#666B71' },
] as const;

/** El orden de los menús de color (el de los Nobi): por familias, de claro a oscuro. */
export const COLOR_DISPLAY_ORDER: readonly string[] = [
  'pink', 'magenta', 'coral', 'red', 'deep_red',
  'orange', 'yellow',
  'lime_green', 'olive_green', 'green',
  'turquois', 'baby_blue', 'blue', 'navy_blue',
  'indigo', 'lilac', 'light_purple', 'purple',
  'white', 'gray', 'black',
];

export const PEOPLE_COLORS_DISPLAY: readonly PersonColor[] = COLOR_DISPLAY_ORDER.map(
  (id) => PEOPLE_COLORS.find((c) => c.id === id) as PersonColor,
);

/**
 * Hex de paletas anteriores → id del color actual. Lo guardado antes de T202 (colores de
 * contacto, de lista, el propio) se traduce al leerlo; las migraciones
 * `20261004130000_people_colors_t202.sql` y `20261004140000_people_colors_v3.sql` hacen lo
 * mismo en la base.
 */
const ANTERIORES: Record<string, string> = {
  // HEX exactos de los Nobi (T202, 4 oct 2026): demasiado saturados u oscuros.
  '#FFC0F3': 'pink', '#AA0664': 'magenta', '#F86061': 'coral', '#980002': 'red', '#430000': 'deep_red',
  '#FE6E00': 'orange', '#EDE609': 'yellow', '#AAFF00': 'lime_green', '#636B2F': 'olive_green', '#002D04': 'green',
  '#00CED1': 'turquois', '#89CFF0': 'baby_blue', '#0028B3': 'blue', '#000435': 'navy_blue', '#3A00E7': 'indigo',
  '#B47EDE': 'lilac', '#6F2DA8': 'light_purple', '#35063E': 'purple', '#D3D3D3': 'white', '#AAABB0': 'gray',
  '#232323': 'black',
  // Paleta ajustada de 21 (23 sep – 4 oct 2026).
  '#176BFF': 'blue', '#E3291F': 'red', '#1F8A4C': 'green', '#8E3FBE': 'purple', '#B95D16': 'orange',
  '#12878C': 'turquois', '#B02A78': 'magenta', '#4F8C22': 'lime_green', '#6A5ACD': 'indigo', '#B03A44': 'deep_red',
  '#3E86C4': 'baby_blue', '#6B7A2E': 'olive_green', '#E51764': 'pink', '#4A6BBF': 'navy_blue', '#8F731C': 'yellow',
  '#A96AE0': 'light_purple', '#8A8078': 'gray', '#A473C7': 'lilac', '#5F7266': 'black', '#78899F': 'white',
  '#DA6C50': 'coral',
  // Primera paleta de 8 (hasta el 23 sep 2026).
  '#4C8DFF': 'blue', '#B06BFF': 'lilac', '#46C46A': 'green', '#FF7B6B': 'coral', '#35C7D8': 'turquois',
  '#E3C245': 'yellow', '#F26BD1': 'magenta', '#A8D45A': 'lime_green',
};

const POR_ID = new Map(PEOPLE_COLORS.map((c) => [c.id, c.hex]));

/**
 * Un hex guardado con una paleta anterior, traducido al color actual del mismo Nobi. Lo que
 * no es de ninguna paleta (o ya es actual) se devuelve igual.
 */
export function currentColor(hex: string): string;
export function currentColor(hex: string | null | undefined): string | null;
export function currentColor(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const id = ANTERIORES[hex.toUpperCase()];
  return id ? (POR_ID.get(id) ?? hex) : hex;
}

/** Color por omisión de quien no ha elegido ninguno y no tiene Nobi: el primero del reparto. */
export const DEFAULT_SELF_COLOR = POR_ID.get('baby_blue') as string;

const FALLBACK = DEFAULT_SELF_COLOR;

/** El color de persona que corresponde al Nobi elegido, si lo hay. */
export function colorDeNobi(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  const nobi = NOBIS.find((n) => avatarUrl === `nobi:${n.id}`);
  return nobi ? (POR_ID.get(nobi.id) ?? null) : null;
}

/** Quién es cada persona a efectos de color: lo elegido a mano manda sobre su Nobi. */
export type ColoredPerson = { userId: string; color: string | null; avatarUrl?: string | null };

/**
 * Resuelve el color de cada contacto. Es una derivación pura —nunca escribe—, así que
 * los contactos ya existentes (o los del seed) siempre tienen color.
 *
 * El orden importa: primero lo elegido a mano, después el color del Nobi de cada quien
 * —que es lo que hace que la persona se vea del color con el que se presenta— y solo
 * al final el reparto de los que queden libres.
 *
 * @param contacts Contactos aceptados, en el orden en que deben repartirse los colores.
 * @param selfColor Color de quien mira, que queda reservado para no confundirse con él.
 */
export function assignPeopleColors(
  contacts: readonly ColoredPerson[],
  selfColor: string = DEFAULT_SELF_COLOR,
): Map<string, string> {
  const resolved = new Map<string, string>();
  const taken = new Set<string>([selfColor]);

  for (const contact of contacts) {
    if (!contact.color) continue;
    const color = currentColor(contact.color);
    resolved.set(contact.userId, color);
    taken.add(color);
  }

  for (const contact of contacts) {
    if (resolved.has(contact.userId)) continue;
    const suyo = colorDeNobi(contact.avatarUrl);
    if (!suyo || taken.has(suyo)) continue;
    resolved.set(contact.userId, suyo);
    taken.add(suyo);
  }

  for (const contact of contacts) {
    if (resolved.has(contact.userId)) continue;
    const free = PEOPLE_COLORS.find((c) => !taken.has(c.hex));
    // Con más contactos que colores la paleta se reutiliza en vez de dejar a alguien sin color.
    const hex = free?.hex ?? PEOPLE_COLORS[resolved.size % PEOPLE_COLORS.length]?.hex ?? FALLBACK;
    resolved.set(contact.userId, hex);
    taken.add(hex);
  }

  return resolved;
}

/** Primer color libre para un contacto nuevo, dado lo que ya está en uso. */
export function nextAvailableColor(usedColors: readonly string[], selfColor: string = DEFAULT_SELF_COLOR): string {
  const taken = new Set<string>([selfColor, ...usedColors]);
  return PEOPLE_COLORS.find((c) => !taken.has(c.hex))?.hex ?? FALLBACK;
}
