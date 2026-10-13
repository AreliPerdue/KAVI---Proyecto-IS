/**
 * En la web no se guardan copias (spec 13b, RF-BR3; T285): el motor descarga el libro con su dirección
 * firmada, y sin red la web misma no carga. Estas funciones existen para que el código común no pregunte
 * por la plataforma.
 */
export function hayCopia(): boolean {
  return false;
}

export function borrarCopias(): void {}

export function borrarTodas(): void {}
