/**
 * Etiquetas que la app sugiere al crear la primera (RF-L22).
 *
 * Son **sugerencias, no filas**: elegir una crea una etiqueta propia con ese nombre. Así
 * toda etiqueta tiene dueño y se puede renombrar o borrar sin pedirle permiso a nadie —al
 * revés que los temas, que sí son del sistema porque el producto define su dimensión y su
 * color; una etiqueta es solo una palabra que alguien eligió.
 */
export const SUGERENCIAS_ETIQUETA = [
  'Casa',
  'Escuela',
  'Trabajo',
  'Personal',
  'Compras',
  'Viaje',
  'Salud',
  'Ideas',
] as const;

/** Tope de la columna `name` en la base. */
export const MAX_ETIQUETA = 24;
