/**
 * Anotar juntos en un club de lectura (spec 13f, RF-BC6 – RF-BC7; T307): quién hizo cada anotación y quién la
 * cambió, con qué color se ve a cada miembro y qué se muestra si la capa del club está oculta. Sin React.
 */
import { PEOPLE_COLORS_DISPLAY } from '@/constants/people-colors';
import type { LibraryAnnotation, LibraryClubMember } from '@/types/domain';

export type Autor = { id: string; nombre: string; color: string; inicial: string };

/** El color de un miembro: el que le doy como contacto (RF-S15) o, si no es mi contacto, uno fijo por su id. */
export function colorDeMiembro(id: string, colores: ReadonlyMap<string, string>): string {
  const elegido = colores.get(id);
  if (elegido) return elegido;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PEOPLE_COLORS_DISPLAY[h % PEOPLE_COLORS_DISPLAY.length].hex;
}

/** Quiénes son los miembros de un club, con su nombre y color. */
export function autoresDelClub(miembros: readonly LibraryClubMember[], colores: ReadonlyMap<string, string>, sinNombre: string): Map<string, Autor> {
  const autores = new Map<string, Autor>();
  for (const m of miembros) {
    const nombre = m.profile?.display_name?.trim() || m.profile?.username || sinNombre;
    autores.set(m.person_id, { id: m.person_id, nombre, color: colorDeMiembro(m.person_id, colores), inicial: nombre.slice(0, 1).toUpperCase() });
  }
  return autores;
}

/** Mía: lo recién creado aún no trae dueño del servidor (`owner_id` vacío) y también es mío. */
export const esMia = (a: Pick<LibraryAnnotation, 'owner_id'>, yo: string | null) => !a.owner_id || a.owner_id === yo;

/** De otro miembro y del club: lleva su marca en la página. */
export const esDeOtroEnElClub = (a: Pick<LibraryAnnotation, 'club_id' | 'owner_id'>, yo: string | null) => !!a.club_id && !esMia(a, yo);

/** La capa del club oculta (RF-BC7, "leer limpio"): queda solo lo mío. */
export function conCapaDelClub<T extends Pick<LibraryAnnotation, 'club_id' | 'owner_id'>>(lista: readonly T[], yo: string | null, ver: boolean): readonly T[] {
  return ver ? lista : lista.filter((a) => !esDeOtroEnElClub(a, yo));
}

/**
 * Quién la hizo y quién la cambió por última vez (RF-BC7): "De Ana · la cambió Luis", "Tuya · la cambió Ana".
 * Nada si es mía y nadie más la tocó, o si no es del club.
 */
export function autoria(
  a: Pick<LibraryAnnotation, 'club_id' | 'owner_id' | 'updated_by'>,
  yo: string | null,
  autores: ReadonlyMap<string, Autor>,
  t: { by: (n: string) => string; mine: string; changedBy: (n: string) => string; someone: string },
): string | null {
  if (!a.club_id) return null;
  const mia = esMia(a, yo);
  const nombre = (id: string) => autores.get(id)?.nombre ?? t.someone;
  const cambio = a.updated_by && a.updated_by !== a.owner_id ? (a.updated_by === yo ? null : t.changedBy(nombre(a.updated_by))) : null;
  if (mia && !cambio) return null;
  return [mia ? t.mine : t.by(nombre(a.owner_id)), cambio].filter(Boolean).join(' · ');
}
