/**
 * Chips rápidos de las notas (spec 07 v2, RF-F49, RF-F51). Se guardan por clave en
 * `workouts.tags` y `workout_sets.tags`; la etiqueta en español es la de aquí, y se muestra
 * en el idioma activo con `tagLabel` (`lib/gym/display-names`).
 */
export const SESSION_TAGS: { value: string; label: string }[] = [
  { value: 'fasted', label: 'En ayunas' },
  { value: 'pre_workout', label: 'Con pre-entreno' },
  { value: 'low_sleep', label: 'Poco sueño' },
];

export const SET_TAGS: { value: string; label: string }[] = [
  { value: 'form_break', label: 'Técnica rota' },
  { value: 'pain', label: 'Dolor' },
  { value: 'spotted', label: 'Con spotter' },
  { value: 'felt_easy', label: 'Se sintió fácil' },
  { value: 'pr_attempt', label: 'Intento de PR' },
];
