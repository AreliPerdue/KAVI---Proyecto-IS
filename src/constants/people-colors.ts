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
 * Desde T202 los hex **son los del Nobi**, tal cual, porque el color es la personalidad de
 * cada quien y los tonos ajustados para contraste dejaban "morado claro" y "lila" casi
 * iguales y a varios lejos del Nobi que representan. Los más oscuros (negro, azul marino,
 * rojo vino…) no llegan a 3:1 sobre la tinta de la app: en vez de aclararlos —que juntaba
 * rojo con rojo vino y azul con azul marino— sus marcas llevan un contorno claro
 * (`needsOutline` en `lib/color.ts`). Con el nombre siempre al lado, el color nunca es el
 * único indicador.
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
  { id: 'baby_blue', label: 'Azul cielo', hex: '#89CFF0' },
  { id: 'orange', label: 'Naranja', hex: '#FE6E00' },
  { id: 'lime_green', label: 'Verde lima', hex: '#AAFF00' },
  { id: 'pink', label: 'Rosa', hex: '#FFC0F3' },
  { id: 'turquois', label: 'Turquesa', hex: '#00CED1' },
  { id: 'yellow', label: 'Amarillo', hex: '#EDE609' },
  { id: 'lilac', label: 'Lila', hex: '#B47EDE' },
  { id: 'coral', label: 'Coral', hex: '#F86061' },
  { id: 'gray', label: 'Gris', hex: '#AAABB0' },
  { id: 'olive_green', label: 'Verde oliva', hex: '#636B2F' },
  { id: 'white', label: 'Blanco', hex: '#D3D3D3' },
  { id: 'magenta', label: 'Magenta', hex: '#AA0664' },
  { id: 'light_purple', label: 'Morado intermedio', hex: '#6F2DA8' },
  { id: 'red', label: 'Rojo', hex: '#980002' },
  { id: 'indigo', label: 'Índigo', hex: '#3A00E7' },
  { id: 'blue', label: 'Azul', hex: '#0028B3' },
  { id: 'deep_red', label: 'Rojo vino', hex: '#430000' },
  { id: 'green', label: 'Verde bandera', hex: '#002D04' },
  { id: 'navy_blue', label: 'Azul marino', hex: '#000435' },
  { id: 'purple', label: 'Morado', hex: '#35063E' },
  { id: 'black', label: 'Negro', hex: '#232323' },
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
 * contacto, de lista, el propio) se traduce al leerlo; la migración
 * `20261004130000_people_colors_t202.sql` hace lo mismo en la base.
 */
const ANTERIORES: Record<string, string> = {
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
