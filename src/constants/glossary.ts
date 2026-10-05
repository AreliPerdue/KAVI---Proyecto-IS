/**
 * Glosario de fitness (spec 07 v2, RF-F64). Fuente única: lo usan la pantalla Glosario y las
 * explicaciones que se abren al tocar un término en el logger, el detalle del ejercicio y
 * Progreso.
 *
 * Cada entrada sigue el formato del documento de producto: qué significa, un ejemplo y la
 * idea en pocas palabras. Español latinoamericano; el término en inglés solo cuando ayuda a
 * reconocerlo en otras apps (va en `also`, que también sirve para buscar).
 */
export type GlossaryTopic = 'basics' | 'effort' | 'set_types' | 'movement' | 'techniques' | 'groups' | 'protocols' | 'kavi';

export type GlossaryEntry = {
  id: string;
  term: string;
  /** Otros nombres: en inglés, abreviaturas. Se muestran y se buscan. */
  also?: string;
  topic: GlossaryTopic;
  meaning: string;
  example: string;
  short: string;
};

export const GLOSSARY_TOPICS: { id: GlossaryTopic; label: string }[] = [
  { id: 'basics', label: 'Lo básico' },
  { id: 'effort', label: 'Esfuerzo' },
  { id: 'set_types', label: 'Tipos de serie' },
  { id: 'movement', label: 'Cómo haces el movimiento' },
  { id: 'techniques', label: 'Técnicas dentro de una serie' },
  { id: 'groups', label: 'Ejercicios agrupados' },
  { id: 'protocols', label: 'Protocolos y métodos' },
  { id: 'kavi', label: 'En KAVI' },
];

export const GLOSSARY: readonly GlossaryEntry[] = [
  // ── Lo básico ──
  {
    id: 'workout', term: 'Entrenamiento', also: 'Sesión, workout', topic: 'basics',
    meaning: 'Una sesión completa de ejercicio, de que empiezas a que terminas.',
    example: 'Lunes: 55 minutos de pierna con 5 ejercicios.',
    short: 'Es la sesión completa, no una sola serie.',
  },
  {
    id: 'exercise', term: 'Ejercicio', topic: 'basics',
    meaning: 'Un movimiento concreto que haces con un propósito: fuerza, resistencia, movilidad.',
    example: 'Sentadilla, press de banca o remo con mancuerna.',
    short: 'Cada movimiento distinto de tu entrenamiento.',
  },
  {
    id: 'set', term: 'Serie', also: 'Set', topic: 'basics',
    meaning: 'Un bloque de repeticiones seguidas de un ejercicio, antes de descansar.',
    example: 'Press de banca: 10 repeticiones con 60 kg son una serie. En KAVI: "60 kg × 10".',
    short: 'Un bloque de repeticiones.',
  },
  {
    id: 'rep', term: 'Repetición', also: 'Rep', topic: 'basics',
    meaning: 'Una vez que completas el movimiento.',
    example: 'Si haces 8 sentadillas seguidas, hiciste 8 repeticiones.',
    short: 'Cada vez que completas el movimiento.',
  },
  {
    id: 'volume', term: 'Volumen', topic: 'basics',
    meaning: 'El peso total que moviste: peso por repeticiones, sumando las series. El calentamiento no cuenta.',
    example: '60 kg × 10 + 60 kg × 10 + 65 kg × 8 = 1,720 kg de volumen.',
    short: 'Sirve para comparar cuánto trabajo hiciste.',
  },
  {
    id: 'pr', term: 'Récord personal', also: 'PR', topic: 'basics',
    meaning: 'Tu mejor marca registrada en un ejercicio: más peso, más repeticiones con un peso, más volumen o un peso máximo estimado más alto.',
    example: 'Tu mejor sentadilla era 100 kg × 5 y hoy haces 100 kg × 6: es un PR.',
    short: 'Tu mejor marca personal registrada.',
  },
  {
    id: 'max_estimate', term: 'Peso máximo estimado', also: '1RM estimado, e1RM', topic: 'basics',
    meaning: 'Cuánto podrías levantar en una sola repetición, calculado con el peso y las repeticiones de una serie más ligera. Es más confiable con 12 repeticiones o menos.',
    example: 'Si haces 80 kg × 8, la fórmula estima un máximo de ≈ 101 kg.',
    short: 'No significa que hayas levantado 101 kg: es un cálculo.',
  },
  {
    id: 'effective_set', term: 'Serie efectiva', topic: 'basics',
    meaning: 'Una serie de trabajo que marcaste como hecha. En KAVI es la que cuenta para el volumen y para las series por músculo; el calentamiento no.',
    example: '2 de calentamiento y 3 de trabajo en banca = 3 series efectivas de pecho.',
    short: 'Las series que de verdad cuentan como trabajo.',
  },
  // ── Esfuerzo ──
  {
    id: 'rir', term: 'Reps en reserva', also: 'RIR', topic: 'effort',
    meaning: 'Cuántas repeticiones más crees que te salían al terminar la serie. 0 es que llegaste al fallo.',
    example: 'Haces 10 y sientes que podías 2 más: RIR 2. En KAVI: "60 kg × 10 · RIR 2".',
    short: 'Las repeticiones que te quedaron "en el tanque".',
  },
  {
    id: 'rpe', term: 'Esfuerzo percibido', also: 'RPE', topic: 'effort',
    meaning: 'Qué tan pesada se sintió la serie, del 1 al 10. 10 es que no podías hacer ni una más.',
    example: 'Terminas 8 repeticiones y te quedaban unas 2: más o menos RPE 8.',
    short: 'Mientras más alto, más cerca estuviste de tu límite.',
  },
  {
    id: 'failure', term: 'Fallo', also: 'Fallo muscular', topic: 'effort',
    meaning: 'El punto en que ya no puedes completar otra repetición con buena técnica. KAVI distingue fallo técnico, muscular y absoluto.',
    example: 'Intentas otra repetición de banca y la barra no sube.',
    short: 'Ya no sale otra repetición bien hecha.',
  },
  // ── Tipos de serie ──
  {
    id: 'warmup', term: 'Calentamiento', topic: 'set_types',
    meaning: 'Series ligeras para entrar en calor. No cuentan para tu volumen ni para tus récords.',
    example: 'Barra sola × 10 y 40 kg × 5 antes de tus series de 80 kg.',
    short: 'Preparan, no cuentan.',
  },
  {
    id: 'feeder', term: 'Aproximación', also: 'Feeder', topic: 'set_types',
    meaning: 'Series de pocas repeticiones para acercarte poco a poco al peso fuerte.',
    example: '60 kg × 3 y 70 kg × 2 antes de un top set de 80 kg.',
    short: 'Escalones hacia el peso fuerte.',
  },
  {
    id: 'top_set', term: 'Top set', topic: 'set_types',
    meaning: 'La serie más pesada del ejercicio en el día.',
    example: 'Sentadilla: 120 kg × 5 es tu top set; luego bajas el peso.',
    short: 'Tu serie más pesada del día.',
  },
  {
    id: 'backoff', term: 'Back-off', topic: 'set_types',
    meaning: 'Las series que siguen al top set, con menos peso y normalmente más repeticiones.',
    example: 'Después de 120 kg × 5, haces 100 kg × 8 dos veces.',
    short: 'Bajas el peso después de la serie fuerte.',
  },
  {
    id: 'amrap', term: 'AMRAP', also: 'As many reps as possible', topic: 'set_types',
    meaning: 'Tantas repeticiones como puedas con un peso fijo, o dentro de un tiempo.',
    example: 'Con 60 kg haces todas las que salgan: 14. En KAVI: "AMRAP · 14 reps".',
    short: 'Todas las que puedas.',
  },
  // ── Cómo haces el movimiento ──
  {
    id: 'tempo', term: 'Tempo', topic: 'movement',
    meaning: 'El ritmo de cada fase de la repetición, en segundos: bajada, pausa abajo, subida, pausa arriba. X es "lo más rápido que puedas".',
    example: 'Tempo 3-1-X-0: 3 s bajando, 1 s de pausa, subes explosivo, sin pausa arriba.',
    short: 'Cuánto controlas cada parte del movimiento.',
  },
  {
    id: 'rom', term: 'Rango de movimiento', also: 'ROM', topic: 'movement',
    meaning: 'Qué tan amplio es el recorrido. KAVI distingue completo, parcial, en la parte alargada o en la acortada.',
    example: 'Una sentadilla profunda tiene más rango que media sentadilla.',
    short: 'Cuánto recorrido haces.',
  },
  {
    id: 'unilateral', term: 'Unilateral', also: 'Lateralidad', topic: 'movement',
    meaning: 'Un ejercicio que se hace con un lado a la vez. En KAVI se anotan las repeticiones de cada lado.',
    example: 'Curl con mancuerna a un brazo: 10 con el izquierdo, 9 con el derecho.',
    short: 'Un lado a la vez.',
  },
  {
    id: 'isometric', term: 'Isométrico', topic: 'movement',
    meaning: 'Sostener una posición sin moverte, contra reloj.',
    example: 'Una plancha de 30 segundos. En KAVI: "Isométrico · 30 s".',
    short: 'Aguantas en vez de repetir.',
  },
  {
    id: 'concentric', term: 'Fase concéntrica', also: 'Concéntrico', topic: 'movement',
    meaning: 'La parte del movimiento en la que el músculo se acorta mientras hace fuerza.',
    example: 'En un curl de bíceps, subir la mancuerna.',
    short: 'La parte en que "empujas" o "jalas".',
  },
  {
    id: 'eccentric', term: 'Fase excéntrica', also: 'Excéntrico, negativa', topic: 'movement',
    meaning: 'La parte del movimiento en la que el músculo se alarga mientras controla el peso.',
    example: 'En un curl de bíceps, bajar la mancuerna despacio.',
    short: 'La parte en que controlas el regreso.',
  },
  // ── Técnicas dentro de una serie ──
  {
    id: 'drop_set', term: 'Drop set', topic: 'techniques',
    meaning: 'Llegas cerca del fallo, bajas el peso y sigues sin descansar. En KAVI todo queda como una sola serie con varios tramos.',
    example: '60 kg × 10 → 45 kg × 8 → 30 kg × 7.',
    short: 'Bajas el peso y sigues sin descanso.',
  },
  {
    id: 'strip_set', term: 'Strip set', topic: 'techniques',
    meaning: 'Un drop set en el que vas quitando discos o cambiando a mancuernas más ligeras.',
    example: 'Barra con 4 discos; un compañero quita uno cada vez que llegas al fallo.',
    short: 'Quitas peso poco a poco mientras sigues.',
  },
  {
    id: 'mechanical_drop', term: 'Drop mecánico', also: 'Mechanical drop set', topic: 'techniques',
    meaning: 'Con el mismo peso, cambias a una variante más fácil del ejercicio para seguir. En KAVI eliges a qué variante pasas.',
    example: 'Press inclinado al fallo → sigues en press plano → luego declinado, con la misma barra.',
    short: 'En vez de bajar el peso, haces el movimiento más fácil.',
  },
  {
    id: 'rest_pause', term: 'Rest-pause', topic: 'techniques',
    meaning: 'Llegas al fallo, descansas unos segundos y sacas unas repeticiones más, una o dos veces.',
    example: '10 repeticiones, 15 s de pausa, 3 más, otra pausa, 2 más.',
    short: 'Pausas muy cortas dentro de la misma serie.',
  },
  {
    id: 'myo_reps', term: 'Myo-reps', topic: 'techniques',
    meaning: 'Una serie de activación casi al fallo y luego mini-series de pocas repeticiones con unas cuantas respiraciones entre ellas.',
    example: 'Activación de 15 y luego 4 + 4 + 4 con descansos cortos.',
    short: 'Un bloque grande y luego bloquecitos.',
  },
  {
    id: 'cluster', term: 'Cluster', also: 'Cluster set', topic: 'techniques',
    meaning: 'La serie se parte en grupos pequeños de repeticiones con descansos muy breves, para usar más peso con buena técnica.',
    example: '2 reps → 15 s → 2 reps → 15 s → 2 reps.',
    short: 'Partes la serie para rendir más.',
  },
  {
    id: 'bfr', term: 'BFR', also: 'Restricción del flujo sanguíneo, oclusión', topic: 'techniques',
    meaning: 'Se usa una banda especial para limitar parte del flujo sanguíneo y entrenar con poco peso. Requiere el equipo adecuado e informarse antes.',
    example: 'Curl con banda de oclusión: 30-15-15-15 repeticiones con 30 s de descanso.',
    short: 'Técnica especializada: úsala con información y precaución.',
  },
  // ── Ejercicios agrupados ──
  {
    id: 'superset', term: 'Superserie', also: 'Superset', topic: 'groups',
    meaning: 'Dos ejercicios seguidos, sin descanso entre ellos; descansas al terminar los dos. En KAVI se marcan A1 y A2.',
    example: 'Press de pecho → curl de bíceps → descanso.',
    short: 'Dos ejercicios juntos antes de descansar.',
  },
  {
    id: 'tri_set', term: 'Triserie', also: 'Tri-set', topic: 'groups',
    meaning: 'Tres ejercicios seguidos como un solo bloque.',
    example: 'Sentadilla → zancadas → extensión de pierna → descanso.',
    short: 'Tres ejercicios seguidos.',
  },
  {
    id: 'giant_set', term: 'Serie gigante', also: 'Giant set', topic: 'groups',
    meaning: 'Cuatro o más ejercicios seguidos antes de descansar.',
    example: 'Cuatro ejercicios de hombro uno tras otro y luego descanso.',
    short: 'Varios ejercicios encadenados.',
  },
  {
    id: 'circuit', term: 'Circuito', topic: 'groups',
    meaning: 'Una lista de ejercicios que recorres en orden y repites por rondas.',
    example: 'Sentadillas → lagartijas → remo → abdominales, y otra vuelta.',
    short: 'Recorres la lista y vuelves a empezar.',
  },
  // ── Protocolos y métodos ──
  {
    id: 'pyramid', term: 'Pirámide', topic: 'protocols',
    meaning: 'El peso sube y las repeticiones bajan de una serie a otra.',
    example: '40 kg × 10 → 50 kg × 8 → 60 kg × 6.',
    short: 'Las series cambian poco a poco.',
  },
  {
    id: 'reverse_pyramid', term: 'Pirámide inversa', also: 'RPT', topic: 'protocols',
    meaning: 'Empiezas con la serie más pesada y luego bajas el peso mientras suben las repeticiones.',
    example: '70 kg × 6 → 60 kg × 8 → 50 kg × 10.',
    short: 'Primero pesado, luego más ligero.',
  },
  {
    id: 'wave_loading', term: 'Ondas', also: 'Wave loading', topic: 'protocols',
    meaning: 'El peso sube en una secuencia y luego la repites un poco más pesada.',
    example: '3 – 2 – 1 repeticiones, y otra vez 3 – 2 – 1 con algo más de peso.',
    short: 'El peso sube y baja siguiendo un patrón.',
  },
  {
    id: 'ladder', term: 'Escalera', also: 'Ladder', topic: 'protocols',
    meaning: 'Las repeticiones suben (o bajan) un paso en cada serie.',
    example: '1, 2, 3, 4, 5 repeticiones.',
    short: 'Paso a paso.',
  },
  {
    id: 'emom', term: 'EMOM', also: 'Every minute on the minute, E2MOM', topic: 'protocols',
    meaning: 'Al empezar cada minuto haces una tarea; lo que sobra del minuto es tu descanso. E2MOM es cada 2 minutos. KAVI trae un temporizador para esto.',
    example: 'Al inicio de cada minuto, 10 sentadillas, durante 10 minutos.',
    short: 'La tarea va al ritmo del reloj.',
  },
  {
    id: 'tabata', term: 'Tabata', topic: 'protocols',
    meaning: 'Intervalos de 20 segundos de trabajo intenso y 10 de descanso, durante 8 rondas.',
    example: '20 s de burpees, 10 s de descanso, ocho veces: 4 minutos.',
    short: 'Intervalos cortos y muy intensos.',
  },
  {
    id: 'density', term: 'Densidad', also: 'EDT', topic: 'protocols',
    meaning: 'Cuánto trabajo haces en un tiempo dado. Como método: sacar el mayor número de repeticiones en un bloque de minutos.',
    example: 'Dos sesiones con el mismo volumen: la que terminas en menos tiempo tiene más densidad.',
    short: 'Trabajo por tiempo.',
  },
  {
    id: 'gvt', term: 'German Volume Training', also: 'GVT, 10 × 10', topic: 'protocols',
    meaning: 'Método de mucho volumen: 10 series de 10 repeticiones del mismo ejercicio con un peso moderado.',
    example: 'Sentadilla con 60 kg: 10 series de 10, con 60–90 s de descanso.',
    short: 'Muchas series iguales del mismo ejercicio.',
  },
  {
    id: 'widowmaker', term: 'Widowmaker', topic: 'protocols',
    meaning: 'Una sola serie muy larga y demandante, normalmente de 20 repeticiones, al final de la sesión.',
    example: 'Sentadilla: una serie de 20 con el peso con el que harías unas 10.',
    short: 'El nombre de un método intenso, no una medida.',
  },
  {
    id: 'hit', term: 'HIT', also: 'High Intensity Training', topic: 'protocols',
    meaning: 'Un estilo de entrenamiento de pocas series llevadas muy cerca del fallo, en vez de muchas.',
    example: 'Una sola serie al fallo por ejercicio.',
    short: 'Un estilo de entrenamiento, no una medida.',
  },
  // ── En KAVI ──
  {
    id: 'estimate', term: 'Estimación de KAVI', also: 'Estimado, ≈', topic: 'kavi',
    meaning: 'Un valor que KAVI calcula con una fórmula a partir de lo que registraste, cuando no hay una medición directa. Siempre va con "≈" o la palabra "estimado".',
    example: 'El peso máximo estimado: "≈ 101 kg máximo estimado".',
    short: 'Un cálculo aproximado, no una medición.',
  },
  {
    id: 'muscle_sets', term: 'Series por músculo', topic: 'kavi',
    meaning: 'Cuántas series efectivas le diste a cada grupo muscular en la semana. Una serie cuenta 1 para los músculos principales del ejercicio y ½ para los que ayudan.',
    example: '3 series de press de banca suman 3 a pecho y 1.5 a hombro y tríceps.',
    short: 'Cuánto trabajó cada músculo en la semana; la franja de 10–20 es una referencia, no una receta.',
  },
  {
    id: 'iron_streak', term: 'Racha de Hierro', topic: 'kavi',
    meaning: 'Las semanas seguidas en las que entrenaste al menos una vez. Si una semana no entrenas, no se pierde: queda en pausa y tú decides si sigue o se reinicia.',
    example: 'Entrenaste 6 semanas seguidas, faltaste una por viaje y eliges "Mi racha sigue": continúas en 6.',
    short: 'Cuenta semanas, no días, y nunca se rompe sola.',
  },
];

const POR_ID = new Map(GLOSSARY.map((e) => [e.id, e]));

export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return POR_ID.get(id);
}
