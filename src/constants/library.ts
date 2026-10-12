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
