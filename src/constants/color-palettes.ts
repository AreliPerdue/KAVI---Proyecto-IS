/**
 * Colores de referencia del selector de color (spec 13h, RF-CC12; T365, decisión de Areli del 22 oct 2026): los
 * básicos y el set de Office, cada uno con su nombre (en `i18n`, por su clave). No son paletas de KAVI (RF-CC11): son
 * colores que la persona ya conoce por su nombre; las piezas siguen empezando en neutros.
 */

export type ColorConNombre = { clave: string; hex: string };

/** Los básicos, con sus HEX de siempre (los nombres de color de la web). */
export const COLORES_BASICOS: readonly ColorConNombre[] = [
  { clave: 'black', hex: '#000000' },
  { clave: 'white', hex: '#FFFFFF' },
  { clave: 'gray', hex: '#808080' },
  { clave: 'lightGray', hex: '#D3D3D3' },
  { clave: 'red', hex: '#FF0000' },
  { clave: 'orange', hex: '#FFA500' },
  { clave: 'yellow', hex: '#FFFF00' },
  { clave: 'green', hex: '#008000' },
  { clave: 'cyan', hex: '#00FFFF' },
  { clave: 'blue', hex: '#0000FF' },
  { clave: 'purple', hex: '#800080' },
  { clave: 'pink', hex: '#FFC0CB' },
  { clave: 'brown', hex: '#8B4513' },
];

/** El set de Office: los colores del tema "Office" y los estándar, como en Word o PowerPoint. */
export const COLORES_DE_OFFICE: readonly ColorConNombre[] = [
  { clave: 'officeBlack', hex: '#000000' },
  { clave: 'officeWhite', hex: '#FFFFFF' },
  { clave: 'officeBlueGray', hex: '#44546A' },
  { clave: 'officeTan', hex: '#E7E6E6' },
  { clave: 'officeBlue', hex: '#4472C4' },
  { clave: 'officeOrange', hex: '#ED7D31' },
  { clave: 'officeGray', hex: '#A5A5A5' },
  { clave: 'officeGold', hex: '#FFC000' },
  { clave: 'officeLightBlue', hex: '#5B9BD5' },
  { clave: 'officeGreen', hex: '#70AD47' },
  { clave: 'darkRed', hex: '#C00000' },
  { clave: 'standardRed', hex: '#FF0000' },
  { clave: 'standardOrange', hex: '#FFC000' },
  { clave: 'standardYellow', hex: '#FFFF00' },
  { clave: 'lightGreen', hex: '#92D050' },
  { clave: 'standardGreen', hex: '#00B050' },
  { clave: 'standardLightBlue', hex: '#00B0F0' },
  { clave: 'standardBlue', hex: '#0070C0' },
  { clave: 'darkBlue', hex: '#002060' },
  { clave: 'standardPurple', hex: '#7030A0' },
];

/**
 * Los colores de las portadas de la biblioteca, cada uno con los títulos que lo tienen ("De tus portadas"): el mismo
 * color de dos libros sale una vez, con los dos nombres.
 */
export function coloresDePortadas(piezas: readonly { title: string; color: string }[]): { hex: string; nombre: string }[] {
  const porColor = new Map<string, string[]>();
  for (const p of piezas) {
    const hex = p.color.toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(hex)) continue;
    porColor.set(hex, [...(porColor.get(hex) ?? []), p.title]);
  }
  return [...porColor.entries()].map(([hex, titulos]) => ({ hex, nombre: titulos.join(' · ') }));
}
