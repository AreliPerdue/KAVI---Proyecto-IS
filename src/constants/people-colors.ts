import { NOBIS } from '@/constants/nobi';

/**
 * Colores de persona para el calendario superpuesto (RF-S15).
 *
 * Cuando se superpone el calendario de alguien, las actividades dejan de pintarse por
 * dimensión/tema y pasan a pintarse por **quién es su dueño**: un color por persona.
 * Es una capa distinta de la paleta de dimensiones (spec 05) y solo aplica en ese modo;
 * con "Tú" a solas vuelve el color coding de temas.
 *
 * Son **veinte y no ocho** porque con ocho, a partir del noveno contacto la paleta se
 * repetía y dos personas compartían color justo en la vista que existe para
 * distinguirlas. Van emparejados uno a uno con los colores de Nobi (`constants/nobi`),
 * para que el color que alguien eligió para su mascota sea el que lo representa en el
 * calendario de los demás.
 *
 * El **orden** no es decorativo: es el que se reparte a quien no ha elegido color, así
 * que va alternando matices en vez de agrupar los parecidos. Con los rosas juntos al
 * principio, los dos primeros contactos salían en dos rosas casi iguales.
 *
 * Los tonos **no** son los del PNG del Nobi: son ese mismo matiz llevado a la
 * luminosidad que cumple ≥ 3:1 sobre los dos fondos de la app (`#131313` y `#F2F2F2`),
 * porque el color aquí tiene significado (kavi-design §5) y el tema se puede cambiar.
 * Por eso "blanco" y "negro" son grises con matiz: ni el blanco puro se ve sobre papel
 * ni el negro puro sobre tinta. Hay una prueba que comprueba las dos cosas —contraste y
 * que ningún par se confunda— para que nadie los retoque a ojo.
 */

export type PersonColor = { id: string; label: string; hex: string };

export const PEOPLE_COLORS: readonly PersonColor[] = [
  { id: 'blue', label: 'Azul', hex: '#176BFF' },
  { id: 'red', label: 'Rojo', hex: '#E3291F' },
  { id: 'green', label: 'Verde', hex: '#1F8A4C' },
  { id: 'purple', label: 'Morado', hex: '#8E3FBE' },
  { id: 'orange', label: 'Naranja', hex: '#B95D16' },
  { id: 'turquois', label: 'Turquesa', hex: '#12878C' },
  { id: 'magenta', label: 'Magenta', hex: '#B02A78' },
  { id: 'lime_green', label: 'Verde lima', hex: '#4F8C22' },
  { id: 'indigo', label: 'Índigo', hex: '#6A5ACD' },
  { id: 'deep_red', label: 'Rojo oscuro', hex: '#B03A44' },
  { id: 'baby_blue', label: 'Azul cielo', hex: '#3E86C4' },
  { id: 'olive_green', label: 'Verde oliva', hex: '#6B7A2E' },
  { id: 'pink', label: 'Rosa', hex: '#E51764' },
  { id: 'navy_blue', label: 'Azul marino', hex: '#4A6BBF' },
  { id: 'yellow', label: 'Amarillo', hex: '#8F731C' },
  { id: 'light_purple', label: 'Morado claro', hex: '#A96AE0' },
  { id: 'gray', label: 'Gris', hex: '#8A8078' },
  { id: 'lilac', label: 'Lila', hex: '#A473C7' },
  { id: 'black', label: 'Negro', hex: '#5F7266' },
  { id: 'white', label: 'Blanco', hex: '#78899F' },
] as const;

const POR_ID = new Map(PEOPLE_COLORS.map((c) => [c.id, c.hex]));

/** Color por omisión de quien no ha elegido ninguno y no tiene Nobi. */
export const DEFAULT_SELF_COLOR = POR_ID.get('blue') as string;

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
    resolved.set(contact.userId, contact.color);
    taken.add(contact.color);
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
