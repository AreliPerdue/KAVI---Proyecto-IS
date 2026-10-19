/**
 * En la web no se guardan copias de los stickers propios (T335): se ven con su dirección firmada. Estas funciones
 * existen para que el código común no pregunte por la plataforma.
 */
export function guardarCopia(): void {}

export async function asegurarCopia(): Promise<void> {}

export function uriLocal(): string | null {
  return null;
}

export async function comoDato(): Promise<string | null> {
  return null;
}

export function borrarCopia(): void {}

export function borrarCopias(): void {}
