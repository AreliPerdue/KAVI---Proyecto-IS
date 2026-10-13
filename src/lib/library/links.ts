import type { LibraryLink, LibraryLinkKind } from '@/types/domain';

/**
 * Libros enlazados (spec 13a, RF-BL27; T316). Un enlace se guarda una sola vez y aquí se lee desde
 * cualquiera de las dos piezas, con el papel que tiene la otra.
 */

/** Lo que es la **otra** pieza vista desde esta: lo que dice la lista de "Libros enlazados". */
export type PapelDeEnlace = 'prequel' | 'sequel' | 'spinoff' | 'origin' | 'universe' | 'related' | 'notes' | 'notesOf';

/**
 * Las opciones al enlazar, dichas desde el libro que se está viendo ("este libro es… de"): cada una
 * sabe cómo se guarda —qué tipo y si este libro va como `from` o como `to`—.
 */
export type OpcionDeEnlace = 'isPrequelOf' | 'isSequelOf' | 'isSpinoffOf' | 'hasSpinoff' | 'sameUniverse' | 'related';

export const OPCIONES_DE_ENLACE: readonly OpcionDeEnlace[] = ['isPrequelOf', 'isSequelOf', 'isSpinoffOf', 'hasSpinoff', 'sameUniverse', 'related'];

const COMO_SE_GUARDA: Record<OpcionDeEnlace, { kind: LibraryLinkKind; esteVaPrimero: boolean }> = {
  isPrequelOf: { kind: 'prequel', esteVaPrimero: true },
  // "Este es secuela de aquel" es "aquel es precuela de este".
  isSequelOf: { kind: 'prequel', esteVaPrimero: false },
  isSpinoffOf: { kind: 'spinoff', esteVaPrimero: true },
  hasSpinoff: { kind: 'spinoff', esteVaPrimero: false },
  sameUniverse: { kind: 'universe', esteVaPrimero: true },
  related: { kind: 'related', esteVaPrimero: true },
};

/** Cómo se guarda enlazar `este` con `otro` con una opción: `{ from, to, kind }`. */
export function enlaceParaGuardar(este: string, otro: string, opcion: OpcionDeEnlace): { from: string; to: string; kind: LibraryLinkKind } {
  const { kind, esteVaPrimero } = COMO_SE_GUARDA[opcion];
  return esteVaPrimero ? { from: este, to: otro, kind } : { from: otro, to: este, kind };
}

export type EnlaceVisto = { id: string; otro: string; papel: PapelDeEnlace };

/** Los enlaces de una pieza con el papel de la otra (si A es precuela de B, en B: "Precuela: A"). */
export function enlacesDe(itemId: string, enlaces: readonly LibraryLink[]): EnlaceVisto[] {
  const vistos: EnlaceVisto[] = [];
  for (const k of enlaces) {
    const soyFrom = k.from_item === itemId;
    if (!soyFrom && k.to_item !== itemId) continue;
    const otro = soyFrom ? k.to_item : k.from_item;
    const papel: PapelDeEnlace =
      k.kind === 'prequel'
        ? soyFrom
          ? 'sequel'
          : 'prequel'
        : k.kind === 'spinoff'
          ? soyFrom
            ? 'origin'
            : 'spinoff'
          : k.kind === 'notes'
            ? soyFrom
              ? 'notesOf'
              : 'notes'
            : k.kind;
    vistos.push({ id: k.id, otro, papel });
  }
  // En un orden que se lea como una historia: antes, después, derivados, el mismo mundo, lo demás.
  const orden: PapelDeEnlace[] = ['prequel', 'sequel', 'origin', 'spinoff', 'universe', 'related', 'notes', 'notesOf'];
  return vistos.sort((a, b) => orden.indexOf(a.papel) - orden.indexOf(b.papel));
}

/** ¿Ya están enlazadas? (un solo enlace por pareja, en cualquier sentido). */
export function yaEnlazados(a: string, b: string, enlaces: readonly LibraryLink[]): boolean {
  return enlaces.some((k) => (k.from_item === a && k.to_item === b) || (k.from_item === b && k.to_item === a));
}
