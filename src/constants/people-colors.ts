/**
 * Colores de persona para el calendario superpuesto (RF-S15).
 *
 * Cuando se superpone el calendario de alguien, las actividades dejan de pintarse por
 * dimensión/tema y pasan a pintarse por **quién es su dueño**: un color por persona.
 * Es una capa distinta de la paleta de dimensiones (spec 05) y solo aplica en ese modo;
 * con "Tú" a solas vuelve el color coding de temas.
 *
 * Los 8 matices están separados 32–55° y todos superan 5,6:1 sobre el fondo `#131313`
 * (kavi-design §5 pide ≥ 3:1 para puntos y bordes con significado).
 */

export type PersonColor = { id: string; label: string; hex: string };

/** El primer color queda para la persona dueña de la sesión ("Tú"). */
export const PEOPLE_COLORS: readonly PersonColor[] = [
  { id: 'azul', label: 'Azul', hex: '#4C8DFF' },
  { id: 'morado', label: 'Morado', hex: '#B06BFF' },
  { id: 'verde', label: 'Verde', hex: '#46C46A' },
  { id: 'coral', label: 'Coral', hex: '#FF7B6B' },
  { id: 'cian', label: 'Cian', hex: '#35C7D8' },
  { id: 'ambar', label: 'Ámbar', hex: '#E3C245' },
  { id: 'magenta', label: 'Magenta', hex: '#F26BD1' },
  { id: 'lima', label: 'Lima', hex: '#A8D45A' },
] as const;

/** Color de "Tú": siempre el primero de la paleta. */
export const SELF_COLOR = (PEOPLE_COLORS[0] as PersonColor).hex;

const FALLBACK = SELF_COLOR;

/**
 * Resuelve el color de cada contacto: respeta el elegido a mano y, para el resto,
 * reparte los colores libres en orden estable. Es una derivación pura — nunca escribe —
 * así que los contactos ya existentes (o los del seed) siempre tienen color.
 *
 * @param contacts Contactos aceptados, en el orden en que deben repartirse los colores.
 */
export function assignPeopleColors(contacts: readonly { userId: string; color: string | null }[]): Map<string, string> {
  const resolved = new Map<string, string>();
  const taken = new Set<string>([SELF_COLOR]);

  for (const contact of contacts) {
    if (!contact.color) continue;
    resolved.set(contact.userId, contact.color);
    taken.add(contact.color);
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
export function nextAvailableColor(usedColors: readonly string[]): string {
  const taken = new Set<string>([SELF_COLOR, ...usedColors]);
  return PEOPLE_COLORS.find((c) => !taken.has(c.hex))?.hex ?? FALLBACK;
}
