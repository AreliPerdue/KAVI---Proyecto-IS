/**
 * KAVI Library (spec 13). Los límites son los de la decisión B2 y los mismos que impone la base
 * (`20261012100000_library.sql`): si cambian aquí, cambian allá.
 */
export const LIBRARY_BUCKET = 'library';

export const LIBRARY_LIMITS = {
  /** Por archivo: el bucket no acepta más. */
  fileBytes: 50 * 1024 * 1024,
  /** Por persona, sumando todos sus archivos: la base no deja pasar de aquí. */
  userBytes: 500 * 1024 * 1024,
  /** Fuentes propias (RF-BH4). */
  fontBytes: 10 * 1024 * 1024,
} as const;

/** Desde cuánto uso se avisa que la biblioteca se está llenando. */
export const LIBRARY_WARN_RATIO = 0.8;

/** Cuánto dura la dirección temporal para leer un archivo privado. */
export const LIBRARY_URL_SECONDS = 60 * 60;

/**
 * Colores para filtrar por portada (RF-BL10). Son colores de portada de verdad —un azul marino
 * oscuro, un crema— y no los de los Nobi, que están aclarados para verse sobre el fondo de la app:
 * con esos, un azul marino de portada quedaba en el límite y unas veces entraba y otras no.
 */
export const LIBRARY_FILTER_COLORS = [
  { id: 'red', hex: '#C0392B' },
  { id: 'orange', hex: '#E67E22' },
  { id: 'yellow', hex: '#F1C40F' },
  { id: 'green', hex: '#2E8B57' },
  { id: 'blue', hex: '#2E86DE' },
  { id: 'navy', hex: '#1F2A5C' },
  { id: 'purple', hex: '#7D3C98' },
  { id: 'pink', hex: '#E84393' },
  { id: 'brown', hex: '#7B4A2D' },
  { id: 'cream', hex: '#EDE4D3' },
  { id: 'gray', hex: '#8A8F98' },
  { id: 'black', hex: '#141414' },
] as const;

export type LibraryFilterColorId = (typeof LIBRARY_FILTER_COLORS)[number]['id'];
