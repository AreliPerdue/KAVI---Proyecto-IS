import type { ExerciseGroupType, SetType } from '@/types/domain';

/**
 * Tipos de serie (RF-F43) con una línea que los explica: "Top set" o "Back-off" son
 * términos de gimnasio que no todos conocen, y la explicación se muestra bajo los chips.
 * Aquí vive el español; el inglés está en `i18n/en/training` y se muestra con
 * `lib/gym/display-names`.
 */
export const SET_TYPES: { value: SetType; label: string; description: string }[] = [
  { value: 'warmup', label: 'Calentamiento', description: 'Para entrar en calor. No cuenta para tu volumen ni para tus récords.' },
  { value: 'feeder', label: 'Aproximación', description: 'Series ligeras para acercarte poco a poco al peso fuerte.' },
  { value: 'working', label: 'Efectiva', description: 'Una serie normal de trabajo.' },
  { value: 'top_set', label: 'Top set', description: 'La serie más pesada del ejercicio en el día.' },
  { value: 'backoff', label: 'Back-off', description: 'Las que siguen al top set, con menos peso.' },
  { value: 'failure', label: 'Al fallo', description: 'Hasta que no sale otra repetición.' },
  { value: 'amrap', label: 'AMRAP', description: 'Tantas repeticiones como puedas con un peso fijo.' },
  { value: 'technique', label: 'Técnica', description: 'Para practicar el movimiento, con poco esfuerzo.' },
  { value: 'max_test', label: 'Test de máximo', description: 'Para probar cuánto levantas en una sola repetición.' },
];

/**
 * Intensificadores, agrupaciones y protocolos (spec 07 v2, §6). Lo que la persona lee en
 * las hojas; la transformación de cada uno vive en `lib/gym/transforms.ts`.
 *
 * La descripción es una línea; "cómo se hace" es lo que alguien que nunca lo hizo necesita
 * para hacerlo bien. El detalle completo está en `docs/gym/intensificadores.md`.
 */

export type IntensifierKey =
  | 'drop_set' | 'strip_set' | 'mechanical_drop' | 'rest_pause' | 'myo_reps' | 'myo_match'
  | 'dc_rest_pause' | 'cluster' | 'forced_reps' | 'negatives' | 'partials' | 'one_and_half'
  | 'twenty_ones' | 'paused_reps' | 'iso_hold' | 'loaded_stretch' | 'peak_contraction' | 'tempo'
  | 'super_slow' | 'cheat_reps' | 'burns' | 'bfr' | 'accommodating' | 'dynamic_effort';

export type IntensifierInfo = { key: IntensifierKey; label: string; description: string; howTo: string; aliases: string[] };

export const INTENSIFIERS: IntensifierInfo[] = [
  { key: 'drop_set', label: 'Drop set', description: 'Al fallo, bajas el peso y sigues sin descanso.', howTo: 'Termina la serie, quita ~20 % del peso y sigue de inmediato. Repite una o dos veces más.', aliases: ['drop', 'descendente'] },
  { key: 'strip_set', label: 'Strip set', description: 'Como el drop, quitando discos o bajando de mancuernas.', howTo: 'Ten el siguiente par de mancuernas listo (running the rack) o un compañero que quite discos.', aliases: ['running the rack', 'rack'] },
  { key: 'mechanical_drop', label: 'Drop mecánico', description: 'Mismo peso, cambias a una variante más fácil.', howTo: 'Al fallo pasa de la variante difícil a una más fuerte: inclinado → plano → declinado, sin descanso.', aliases: ['mecanico'] },
  { key: 'rest_pause', label: 'Rest-pause', description: 'Al fallo, pausa de 10–20 s y sacas unas reps más.', howTo: 'Llega al fallo, respira 10–20 s con el peso en el rack y saca 2–4 reps más. Una o dos veces.', aliases: ['rest pause', 'pausa'] },
  { key: 'myo_reps', label: 'Myo-reps', description: 'Una serie de activación y mini-series de 3–5 reps.', howTo: 'Activación de 12–20 reps cerca del fallo; luego 3–5 respiraciones y 3–5 reps, varias veces, hasta que no salgan.', aliases: ['myo', 'myoreps'] },
  { key: 'myo_match', label: 'Myo-rep match', description: 'Igualas en mini-series las reps de la activación.', howTo: 'Activación de, por ejemplo, 15 reps; luego mini-series cortas hasta sumar otras 15.', aliases: ['match'] },
  { key: 'dc_rest_pause', label: 'Rest-pause DC', description: 'Estilo DoggCrapp: tres tramos con 15 respiraciones.', howTo: 'Un tramo al fallo (~8), 15 respiraciones, otro (~4), 15 respiraciones, otro (~2).', aliases: ['doggcrapp', 'dc'] },
  { key: 'cluster', label: 'Cluster', description: 'La serie se parte en bloques con descansos cortos.', howTo: 'En vez de 8 seguidas: 4 bloques de 2 con 15 s entre bloques. Más peso con buena técnica.', aliases: ['clusters'] },
  { key: 'forced_reps', label: 'Reps forzadas', description: 'Un compañero te ayuda con las últimas reps.', howTo: 'Al fallo, tu spotter ayuda lo justo para 1–3 reps más. Se anotan aparte de las tuyas.', aliases: ['forzadas', 'asistidas'] },
  { key: 'negatives', label: 'Negativas', description: 'Énfasis en la bajada, lenta y controlada.', howTo: 'Baja en 3–5 s. Con más peso que tu máximo, alguien te ayuda a subir (2/1: subes con dos, bajas con uno).', aliases: ['excentricas', 'negativa'] },
  { key: 'partials', label: 'Parciales', description: 'Reps de rango corto al final, contadas aparte.', howTo: 'Al terminar las completas, saca reps en una parte del recorrido (alargada, media o acortada).', aliases: ['parcial', 'lengthened partials'] },
  { key: 'one_and_half', label: 'Reps y media', description: 'Cada rep: una completa y media más.', howTo: 'Baja completo, sube a la mitad, vuelve a bajar y sube completo. Eso es una rep.', aliases: ['1 y media', 'one and a half'] },
  { key: 'twenty_ones', label: '21s', description: '7 abajo, 7 arriba y 7 completas.', howTo: '7 reps en la mitad baja, 7 en la mitad alta y 7 completas, sin descanso.', aliases: ['21', 'veintiunos'] },
  { key: 'paused_reps', label: 'Reps con pausa', description: 'Pausa en un punto de cada rep.', howTo: 'Detente 1–3 s en el punto elegido (abajo en sentadilla, en el pecho en banca) sin rebotar.', aliases: ['pausa', 'paused'] },
  { key: 'iso_hold', label: 'Isométrico', description: 'Sostienes en una posición, contra reloj.', howTo: 'Sostén el peso quieto en estirado, medio o contraído el tiempo marcado.', aliases: ['isometrico', 'hold'] },
  { key: 'loaded_stretch', label: 'Estiramiento cargado', description: 'Sostienes en el punto estirado al terminar.', howTo: 'Al terminar la serie, quédate 20–60 s en la posición más estirada con el peso.', aliases: ['stretch'] },
  { key: 'peak_contraction', label: 'Contracción pico', description: 'Aprietas arriba unos segundos en cada rep.', howTo: 'En la parte más contraída de cada rep, sostén y aprieta 1–3 s.', aliases: ['squeeze', 'pico'] },
  { key: 'tempo', label: 'Tempo', description: 'Ritmo fijo: bajada, pausa, subida, pausa.', howTo: 'Se escribe 3-1-X-0: 3 s bajando, 1 s abajo, subida explosiva (X), sin pausa arriba.', aliases: ['ritmo', 'cadencia'] },
  { key: 'super_slow', label: 'Superlento', description: 'Tempo muy lento, de 10 s por fase.', howTo: '10 s bajando y 10 s subiendo, sin pausas. Pocas reps, mucha tensión.', aliases: ['super slow', 'lento'] },
  { key: 'cheat_reps', label: 'Reps con trampa', description: 'Un poco de impulso para sacar las últimas.', howTo: 'Al fallo, usa un leve balanceo para 1–3 reps más y baja controlado. Se anotan aparte.', aliases: ['trampa', 'cheat'] },
  { key: 'burns', label: 'Burns', description: 'Pulsos cortos al final, contados aparte.', howTo: 'Al fallo, haz movimientos cortos y rápidos en el tramo que puedas hasta que arda.', aliases: ['pulsos', 'quemadas'] },
  { key: 'bfr', label: 'BFR / oclusión', description: 'Con banda de oclusión: 30-15-15-15.', howTo: 'Banda en la parte alta del brazo o pierna al 50–70 % de presión. Carga ligera, 30-15-15-15 con 30 s.', aliases: ['oclusion', 'blood flow'] },
  { key: 'accommodating', label: 'Resistencia acomodada', description: 'Con bandas o cadenas: más carga arriba.', howTo: 'Anota la tensión de la banda o los kg de cadena; la barra pesa menos abajo y más arriba.', aliases: ['bandas', 'cadenas'] },
  { key: 'dynamic_effort', label: 'Esfuerzo dinámico', description: 'Peso moderado, subida lo más rápida posible.', howTo: '50–60 % del 1RM, pocas reps, cada una lo más explosiva que puedas.', aliases: ['velocidad', 'speed'] },
];

export const GROUP_TYPES: { value: ExerciseGroupType; label: string; description: string; rounds: boolean }[] = [
  { value: 'superset', label: 'Superserie', description: 'Dos ejercicios antagonistas, sin descanso entre ellos.', rounds: false },
  { value: 'compound_set', label: 'Biserie', description: 'Dos ejercicios del mismo músculo seguidos.', rounds: false },
  { value: 'tri_set', label: 'Triserie', description: 'Tres ejercicios seguidos.', rounds: false },
  { value: 'giant_set', label: 'Serie gigante', description: 'Cuatro o más ejercicios seguidos.', rounds: false },
  { value: 'circuit', label: 'Circuito', description: 'Una vuelta por todos, varias rondas.', rounds: true },
  { value: 'pre_exhaust', label: 'Pre-fatiga', description: 'Aislamiento primero, luego el compuesto.', rounds: false },
  { value: 'post_exhaust', label: 'Post-fatiga', description: 'Compuesto primero, luego el aislamiento.', rounds: false },
  { value: 'contrast', label: 'Contraste', description: 'Pesado y luego explosivo (PAP).', rounds: false },
  { value: 'paired_sets', label: 'Series pareadas', description: 'Alternas ejercicios no relacionados con descanso.', rounds: false },
];

export type ProtocolKey =
  | 'straight_sets' | 'pyramid' | 'reverse_pyramid' | 'wave_loading' | 'ladder' | 'emom' | 'amrap_time'
  | 'tabata' | 'density' | 'fst7' | 'gvt' | 'widowmaker' | 'heavy_light' | 'hit';

export const PROTOCOLS: { key: ProtocolKey; label: string; description: string; timer: boolean }[] = [
  { key: 'straight_sets', label: 'Series rectas', description: '3 × 8–12 con el mismo peso.', timer: false },
  { key: 'pyramid', label: 'Pirámide', description: 'El peso sube y las reps bajan: 12-10-8-6.', timer: false },
  { key: 'reverse_pyramid', label: 'Pirámide inversa (RPT)', description: 'La pesada primero; luego −10 % y más reps.', timer: false },
  { key: 'wave_loading', label: 'Ondas', description: '3-2-1 y otra vez 3-2-1, un poco más pesado.', timer: false },
  { key: 'ladder', label: 'Escalera', description: '1, 2, 3, 4, 5 reps.', timer: false },
  { key: 'emom', label: 'EMOM', description: 'Un bloque al inicio de cada minuto, 10 minutos.', timer: true },
  { key: 'amrap_time', label: 'AMRAP por tiempo', description: 'Todas las reps posibles en 10 minutos.', timer: true },
  { key: 'tabata', label: 'Tabata', description: '8 rondas de 20 s de trabajo y 10 s de descanso.', timer: true },
  { key: 'density', label: 'Densidad (EDT)', description: 'Más trabajo en un bloque fijo de 15 minutos.', timer: true },
  { key: 'fst7', label: 'FST-7', description: '7 series de 10–12 con 30–45 s de descanso.', timer: false },
  { key: 'gvt', label: 'German Volume (10 × 10)', description: '10 series de 10 con el mismo peso.', timer: false },
  { key: 'widowmaker', label: 'Widowmaker', description: 'Una serie de 20 reps con tu peso de 10.', timer: false },
  { key: 'heavy_light', label: 'Pesado-ligero', description: 'Una pesada de 5 y una ligera de 15.', timer: false },
  { key: 'hit', label: 'HIT', description: 'Una sola serie al fallo total.', timer: false },
];

/** Equipo de apoyo que se marca por serie (RF-F47). */
export const GEAR: { value: string; label: string }[] = [
  { value: 'belt', label: 'Cinturón' },
  { value: 'straps', label: 'Straps' },
  { value: 'knee_sleeves', label: 'Rodilleras' },
  { value: 'wrist_wraps', label: 'Muñequeras' },
  { value: 'sleeves', label: 'Sleeves' },
  { value: 'elbow_sleeves', label: 'Coderas' },
  { value: 'lifting_shoes', label: 'Zapatos de halterofilia' },
];
