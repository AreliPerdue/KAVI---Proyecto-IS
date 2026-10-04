/**
 * Catálogo de ejercicios del sistema (spec 07 v2, RF-F20 – RF-F23).
 *
 * **Fuente única.** De aquí salen el catálogo del modo demo y la migración SQL que lo
 * siembra en Supabase (`scripts/gen-exercise-seed.ts`), así que las dos versiones no se
 * pueden separar. Por eso el archivo no importa nada: el generador lo carga con Node tal
 * cual, sin pasar por Metro ni por los alias `@/`.
 *
 * Cada familia trae los músculos, el patrón y la mecánica. El equipo, la lateralidad y el
 * tipo de registro se **infieren del nombre en español** ("con mancuernas", "unilateral",
 * "lastradas"), y solo se escriben a mano las excepciones en que la inferencia se
 * equivocaría: un "Pushdown con barra recta" es de polea aunque diga barra.
 */

// ─── Taxonomía ────────────────────────────────────────────────────────────────────────

export const MUSCLES = {
  chest_upper: 'Pecho superior',
  chest_mid: 'Pecho medio',
  chest_lower: 'Pecho inferior',
  lats: 'Dorsal',
  traps_upper: 'Trapecio superior',
  traps_mid: 'Trapecio medio',
  rhomboids: 'Romboides',
  erectors: 'Erectores',
  delts_front: 'Deltoide anterior',
  delts_side: 'Deltoide lateral',
  delts_rear: 'Deltoide posterior',
  rotator_cuff: 'Manguito rotador',
  biceps: 'Bíceps',
  brachialis: 'Braquial',
  brachioradialis: 'Braquiorradial',
  forearm_flexors: 'Flexores de antebrazo',
  forearm_extensors: 'Extensores de antebrazo',
  triceps_long: 'Tríceps (cabeza larga)',
  triceps_lateral: 'Tríceps (cabeza lateral)',
  triceps_medial: 'Tríceps (cabeza medial)',
  quads: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  glutes_max: 'Glúteo mayor',
  glutes_med: 'Glúteo medio',
  adductors: 'Aductores',
  calves_gastroc: 'Pantorrilla (gastrocnemio)',
  calves_soleus: 'Pantorrilla (sóleo)',
  tibialis: 'Tibial',
  abs: 'Recto abdominal',
  obliques: 'Oblicuos',
  transverse_abs: 'Transverso',
  neck: 'Cuello',
  cardio: 'Cardio',
} as const;
export type Muscle = keyof typeof MUSCLES;

export const EQUIPMENT = {
  barbell: 'Barra',
  ez_bar: 'Barra EZ',
  trap_bar: 'Trap bar',
  ssb: 'Safety bar',
  dumbbell: 'Mancuernas',
  kettlebell: 'Kettlebell',
  plate: 'Disco',
  machine: 'Máquina',
  cable: 'Polea',
  smith: 'Smith',
  landmine: 'Landmine',
  band: 'Banda',
  chains: 'Cadenas',
  rings: 'Anillas',
  trx: 'TRX',
  bodyweight: 'Peso corporal',
  medicine_ball: 'Balón medicinal',
  sled: 'Trineo',
  cardio_machine: 'Máquina de cardio',
  other: 'Otro',
} as const;
export type Equipment = keyof typeof EQUIPMENT;

export const PATTERNS = {
  horizontal_push: 'Empuje horizontal',
  incline_push: 'Empuje inclinado',
  vertical_push: 'Empuje vertical',
  dip: 'Fondos',
  chest_fly: 'Aperturas',
  horizontal_pull: 'Jalón horizontal (remo)',
  vertical_pull: 'Jalón vertical',
  shoulder_extension: 'Extensión de hombro',
  shoulder_abduction: 'Abducción de hombro',
  shoulder_flexion: 'Flexión de hombro',
  rear_delt: 'Deltoide posterior',
  rotator_cuff: 'Rotación de hombro',
  shrug: 'Encogimiento',
  elbow_flexion: 'Flexión de codo',
  elbow_extension: 'Extensión de codo',
  wrist: 'Muñeca',
  grip: 'Agarre',
  squat: 'Sentadilla',
  lunge: 'Zancada',
  hinge: 'Bisagra de cadera',
  knee_extension: 'Extensión de rodilla',
  knee_flexion: 'Flexión de rodilla',
  hip_extension: 'Extensión de cadera',
  hip_abduction: 'Abducción de cadera',
  hip_adduction: 'Aducción de cadera',
  calf_raise: 'Elevación de talones',
  ankle_dorsiflexion: 'Dorsiflexión',
  core_anti_extension: 'Core: anti-extensión',
  core_flexion: 'Core: flexión',
  core_rotation: 'Core: rotación',
  olympic: 'Olímpico',
  plyometric: 'Pliometría',
  carry: 'Acarreo',
  static_hold: 'Estático',
  locomotion: 'Locomoción',
  cardio: 'Cardio',
  neck: 'Cuello',
} as const;
export type Pattern = keyof typeof PATTERNS;

export const TRACKING_TYPES = {
  weight_reps: 'Peso y reps',
  bodyweight_reps: 'Peso corporal',
  weighted_bodyweight: 'Peso corporal con lastre',
  assisted_bodyweight: 'Peso corporal asistido',
  reps_only: 'Solo reps',
  duration: 'Tiempo',
  weight_duration: 'Peso y tiempo',
  distance_duration: 'Distancia y tiempo',
  weight_distance: 'Peso y distancia',
} as const;
export type Tracking = keyof typeof TRACKING_TYPES;

type Mechanic = 'compound' | 'isolation';
type Laterality = 'bilateral' | 'unilateral' | 'alternating';

/** Excepciones por ejercicio a lo que dicta la familia o la inferencia. */
type Extra = {
  eq?: Equipment[];
  pri?: Muscle[];
  sec?: Muscle[];
  trk?: Tracking;
  lat?: Laterality;
  mech?: Mechanic;
  pat?: Pattern;
};

/** `[nombre en español, nombre en inglés, alias separados por "|", excepciones]` */
type Item = [string, string, string?, Extra?];

type Family = {
  group: string;
  family: string;
  pri: Muscle[];
  sec?: Muscle[];
  pat: Pattern;
  mech: Mechanic;
  /** Equipo si el nombre no lo dice. */
  eq?: Equipment[];
  trk?: Tracking;
  lat?: Laterality;
  items: Item[];
};

// ─── Datos (Apéndice A de prompt-gym-tracker-upgrade.md) ─────────────────────────────

const FAMILIES: Family[] = [
  // ── Pecho
  {
    group: 'Pecho', family: 'Press plano', pri: ['chest_mid'], sec: ['delts_front', 'triceps_lateral'], pat: 'horizontal_push', mech: 'compound', eq: ['barbell'],
    items: [
      ['Press de banca plano con barra', 'Barbell bench press', 'banca|bench|press banca|bench press|press plano|press de pecho'],
      ['Press de banca con pausa', 'Paused bench press', 'paused bench|banca con pausa'],
      ['Spoto press', 'Spoto press', 'spoto'],
      ['Larsen press', 'Larsen press', 'larsen'],
      ['Press de banca con pies arriba', 'Feet-up bench press', 'feet up bench'],
      ['Press de banca con barra multiagarre (Swiss bar)', 'Swiss bar bench press', 'swiss bar|football bar|multiagarre'],
      ['Press de banca con cadenas', 'Bench press with chains', 'chain bench', { eq: ['barbell', 'chains'] }],
      ['Press de banca con bandas', 'Banded bench press', 'band bench', { eq: ['barbell', 'band'] }],
      ['Board press', 'Board press', 'tablas'],
      ['Press guillotina', 'Guillotine press', 'guillotina'],
      ['Press de banca plano con mancuernas', 'Flat dumbbell bench press', 'press con mancuernas|db bench|dumbbell press|banca con mancuernas'],
      ['Press de banca con mancuernas agarre neutro', 'Neutral-grip dumbbell bench press', 'neutral db press'],
      ['Press de banca con mancuerna a una mano', 'Single-arm dumbbell bench press', 'one arm db press'],
      ['Press de banca plano en Smith', 'Smith machine bench press', 'smith bench'],
      ['Press de pecho en máquina sentado', 'Seated machine chest press', 'chest press|press de pecho en máquina'],
      ['Press de pecho en máquina convergente (Hammer Strength)', 'Hammer Strength chest press', 'hammer|iso-lateral chest press'],
      ['Press de pecho unilateral en máquina', 'Single-arm machine chest press'],
      ['Floor press con barra', 'Barbell floor press', 'floor press|press en piso'],
      ['Floor press con mancuernas', 'Dumbbell floor press', 'db floor press'],
    ],
  },
  {
    group: 'Pecho', family: 'Press inclinado', pri: ['chest_upper'], sec: ['delts_front', 'triceps_lateral'], pat: 'incline_push', mech: 'compound', eq: ['barbell'],
    items: [
      ['Press inclinado con barra', 'Incline barbell bench press', 'inclinado|incline bench|banca inclinada|press inclinado'],
      ['Press inclinado con mancuernas', 'Incline dumbbell press', 'incline db|inclinado con mancuernas'],
      ['Press inclinado bajo (15–30°) con mancuernas', 'Low-incline dumbbell press', 'low incline|inclinado bajo'],
      ['Press inclinado con mancuernas agarre neutro', 'Neutral-grip incline dumbbell press'],
      ['Press inclinado en Smith', 'Smith machine incline press', 'smith inclinado'],
      ['Press inclinado en máquina', 'Incline machine press'],
      ['Press inclinado en máquina convergente (Hammer Strength)', 'Hammer Strength incline press', 'hammer inclinado'],
      ['Press landmine para pecho', 'Landmine chest press'],
    ],
  },
  {
    group: 'Pecho', family: 'Press declinado', pri: ['chest_lower'], sec: ['delts_front', 'triceps_lateral'], pat: 'horizontal_push', mech: 'compound', eq: ['barbell'],
    items: [
      ['Press declinado con barra', 'Decline barbell bench press', 'declinado|decline bench|banca declinada'],
      ['Press declinado con mancuernas', 'Decline dumbbell press'],
      ['Press declinado en Smith', 'Smith machine decline press'],
      ['Press declinado en máquina', 'Decline machine press'],
    ],
  },
  {
    group: 'Pecho', family: 'Aperturas y cruces', pri: ['chest_mid'], sec: ['delts_front'], pat: 'chest_fly', mech: 'isolation', eq: ['dumbbell'],
    items: [
      ['Aperturas planas con mancuernas', 'Flat dumbbell fly', 'aperturas|flyes|db fly|fly'],
      ['Aperturas inclinadas con mancuernas', 'Incline dumbbell fly', 'incline fly', { pri: ['chest_upper'] }],
      ['Aperturas declinadas con mancuernas', 'Decline dumbbell fly', 'decline fly', { pri: ['chest_lower'] }],
      ['Aperturas en piso (floor fly)', 'Floor fly', 'floor fly'],
      ['Pec deck', 'Pec deck', 'peck deck|mariposa|butterfly|contractor'],
      ['Aperturas en banco con poleas', 'Cable bench fly', 'cable fly'],
      ['Cruce de poleas alto a bajo', 'High-to-low cable crossover', 'crossover|cruces|cruce de poleas', { pri: ['chest_lower'] }],
      ['Cruce de poleas a media altura', 'Mid-height cable crossover', 'crossover medio'],
      ['Cruce de poleas bajo a alto', 'Low-to-high cable crossover', 'low to high', { pri: ['chest_upper'] }],
      ['Aperturas en polea unilateral', 'Single-arm cable fly'],
      ['Squeeze press con mancuernas', 'Dumbbell squeeze press', 'squeeze press', { mech: 'compound', pat: 'horizontal_push' }],
      ['Svend press', 'Svend press', 'svend', { eq: ['plate'] }],
    ],
  },
  {
    group: 'Pecho', family: 'Fondos y lagartijas', pri: ['chest_lower', 'chest_mid'], sec: ['triceps_lateral', 'delts_front'], pat: 'dip', mech: 'compound', eq: ['bodyweight'], trk: 'bodyweight_reps',
    items: [
      ['Fondos en paralelas para pecho', 'Chest dips', 'fondos|dips|paralelas'],
      ['Fondos lastrados', 'Weighted dips', 'weighted dips|fondos con peso'],
      ['Fondos asistidos en máquina', 'Machine-assisted dips', 'assisted dips'],
      ['Lagartijas (push-ups)', 'Push-ups', 'lagartijas|flexiones|push ups|pushups', { pat: 'horizontal_push' }],
      ['Lagartijas con déficit', 'Deficit push-ups', undefined, { pat: 'horizontal_push' }],
      ['Lagartijas declinadas (pies elevados)', 'Decline push-ups', undefined, { pat: 'horizontal_push', pri: ['chest_upper'] }],
      ['Lagartijas inclinadas (manos elevadas)', 'Incline push-ups', undefined, { pat: 'horizontal_push' }],
      ['Lagartijas con lastre o chaleco', 'Weighted push-ups', 'weighted push ups', { pat: 'horizontal_push' }],
      ['Lagartijas con palmada', 'Clap push-ups', undefined, { pat: 'horizontal_push' }],
      ['Lagartijas en anillas', 'Ring push-ups', undefined, { pat: 'horizontal_push' }],
      ['Lagartijas arqueras', 'Archer push-ups', undefined, { pat: 'horizontal_push' }],
    ],
  },
  {
    group: 'Pecho', family: 'Pullover', pri: ['lats', 'chest_mid'], sec: ['triceps_long'], pat: 'shoulder_extension', mech: 'isolation', eq: ['dumbbell'],
    items: [
      ['Pullover con mancuerna', 'Dumbbell pullover', 'pullover'],
      ['Pullover con barra', 'Barbell pullover'],
      ['Pullover en máquina', 'Machine pullover'],
    ],
  },

  // ── Espalda
  {
    group: 'Espalda', family: 'Dominadas', pri: ['lats'], sec: ['biceps', 'rhomboids', 'traps_mid'], pat: 'vertical_pull', mech: 'compound', eq: ['bodyweight'], trk: 'bodyweight_reps',
    items: [
      ['Dominadas pronas', 'Pull-ups', 'dominadas|pull ups|pullups'],
      ['Dominadas agarre ancho', 'Wide-grip pull-ups', 'wide pull ups'],
      ['Dominadas supinas (chin-ups)', 'Chin-ups', 'chin ups|chinups', { sec: ['biceps', 'brachialis'] }],
      ['Dominadas agarre neutro', 'Neutral-grip pull-ups', 'neutral pull ups'],
      ['Dominadas lastradas', 'Weighted pull-ups', 'weighted pull ups|dominadas con peso'],
      ['Dominadas asistidas en máquina', 'Machine-assisted pull-ups', 'assisted pull ups|gravitron'],
      ['Dominadas asistidas con banda', 'Band-assisted pull-ups', 'band pull ups'],
      ['Dominadas negativas', 'Negative pull-ups', 'negativas'],
      ['Dominadas en anillas', 'Ring pull-ups'],
    ],
  },
  {
    group: 'Espalda', family: 'Jalones', pri: ['lats'], sec: ['biceps', 'rhomboids'], pat: 'vertical_pull', mech: 'compound', eq: ['cable'],
    items: [
      ['Jalón al pecho agarre ancho', 'Wide-grip lat pulldown', 'jalón|jalon|lat pulldown|pulldown|polea al pecho|jalón al pecho'],
      ['Jalón al pecho agarre medio', 'Medium-grip lat pulldown'],
      ['Jalón con triángulo (agarre cerrado neutro)', 'Close-grip neutral lat pulldown', 'v-bar pulldown|triangulo'],
      ['Jalón supino', 'Underhand lat pulldown', 'reverse grip pulldown'],
      ['Jalón tras nuca', 'Behind-the-neck lat pulldown'],
      ['Jalón unilateral en polea', 'Single-arm cable pulldown'],
      ['Jalón de rodillas en polea', 'Kneeling cable pulldown'],
      ['Jalón en máquina convergente (Hammer Strength)', 'Hammer Strength pulldown'],
      ['Jalón unilateral en máquina', 'Single-arm machine pulldown'],
      ['Pulldown con brazos rectos con barra', 'Straight-arm cable pulldown', 'straight arm pulldown|pullover en polea', { eq: ['cable'], mech: 'isolation', pat: 'shoulder_extension' }],
      ['Pulldown con brazos rectos con cuerda', 'Straight-arm rope pulldown', 'rope pullover', { mech: 'isolation', pat: 'shoulder_extension' }],
      ['Pulldown con brazo recto unilateral', 'Single-arm straight-arm pulldown', undefined, { mech: 'isolation', pat: 'shoulder_extension' }],
    ],
  },
  {
    group: 'Espalda', family: 'Remos con barra', pri: ['lats', 'rhomboids', 'traps_mid'], sec: ['biceps', 'delts_rear', 'erectors'], pat: 'horizontal_pull', mech: 'compound', eq: ['barbell'],
    items: [
      ['Remo con barra inclinado', 'Bent-over barbell row', 'remo con barra|barbell row|bent over row|remo inclinado'],
      ['Remo Pendlay', 'Pendlay row', 'pendlay'],
      ['Remo Yates (agarre supino)', 'Yates row', 'yates'],
      ['Remo en Smith', 'Smith machine row'],
      ['Remo en T con barra (landmine)', 'T-bar row', 't bar row|remo en t'],
      ['Remo Meadows', 'Meadows row', 'meadows', { eq: ['landmine'], lat: 'unilateral' }],
      ['Remo Seal con barra', 'Barbell seal row', 'seal row'],
    ],
  },
  {
    group: 'Espalda', family: 'Remos con mancuerna', pri: ['lats', 'rhomboids'], sec: ['biceps', 'delts_rear'], pat: 'horizontal_pull', mech: 'compound', eq: ['dumbbell'],
    items: [
      ['Remo con mancuerna a una mano', 'Single-arm dumbbell row', 'remo con mancuerna|db row|one arm row|serrucho'],
      ['Remo Kroc', 'Kroc row', 'kroc', { lat: 'unilateral' }],
      ['Remo con mancuernas inclinado (bilateral)', 'Bent-over dumbbell row'],
      ['Remo con mancuernas con pecho apoyado', 'Chest-supported dumbbell row', 'chest supported row'],
      ['Remo Helms', 'Helms row', 'helms'],
      ['Remo Seal con mancuernas', 'Dumbbell seal row'],
      ['Remo gorila con kettlebells', 'Kettlebell gorilla row', 'gorilla row', { lat: 'alternating' }],
    ],
  },
  {
    group: 'Espalda', family: 'Remos en polea y máquina', pri: ['lats', 'rhomboids', 'traps_mid'], sec: ['biceps', 'delts_rear'], pat: 'horizontal_pull', mech: 'compound', eq: ['cable'],
    items: [
      ['Remo sentado en polea agarre cerrado', 'Close-grip seated cable row', 'remo en polea|seated row|cable row|remo sentado'],
      ['Remo sentado en polea agarre ancho', 'Wide-grip seated cable row'],
      ['Remo en polea unilateral', 'Single-arm cable row'],
      ['Remo en polea de pie', 'Standing cable row'],
      ['Remo en T con soporte de pecho (máquina)', 'Chest-supported T-bar row'],
      ['Remo en máquina convergente (Hammer Strength)', 'Hammer Strength row'],
      ['Remo en máquina con soporte de pecho', 'Chest-supported machine row'],
      ['Remo invertido (australian pull-up)', 'Inverted row', 'australian pull up|remo australiano', { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
      ['Remo en TRX', 'TRX row', undefined, { trk: 'bodyweight_reps' }],
    ],
  },
  {
    group: 'Espalda', family: 'Trapecio', pri: ['traps_upper'], sec: ['traps_mid'], pat: 'shrug', mech: 'isolation', eq: ['barbell'],
    items: [
      ['Encogimientos con barra', 'Barbell shrug', 'encogimientos|shrugs|trapecios'],
      ['Encogimientos con barra por detrás', 'Behind-the-back barbell shrug'],
      ['Encogimientos con mancuernas', 'Dumbbell shrug', 'db shrug'],
      ['Encogimientos en Smith', 'Smith machine shrug'],
      ['Encogimientos en máquina', 'Machine shrug'],
      ['Encogimientos con trap bar', 'Trap bar shrug'],
      ['Encogimientos en banco inclinado (Kelso shrug)', 'Kelso shrug', 'kelso', { eq: ['dumbbell'], pri: ['traps_mid'], sec: ['rhomboids'] }],
      ['Encogimientos en polea', 'Cable shrug'],
    ],
  },
  {
    group: 'Espalda', family: 'Lumbar y cadena posterior', pri: ['erectors'], sec: ['glutes_max', 'hamstrings'], pat: 'hinge', mech: 'isolation', eq: ['other'], trk: 'weighted_bodyweight',
    items: [
      ['Hiperextensiones a 45°', '45° back extension', 'hiperextensiones|back extension|hyperextension|lumbares'],
      ['Hiperextensiones a 90° (banco romano)', '90° back extension', 'banco romano|roman chair'],
      ['Hiperextensiones inversas (reverse hyper)', 'Reverse hyperextension', 'reverse hyper', { eq: ['machine'], trk: 'weight_reps', pri: ['glutes_max', 'erectors'] }],
      ['Extensión lumbar en máquina', 'Machine back extension', undefined, { trk: 'weight_reps' }],
      ['Superman en piso', 'Superman', 'superman', { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
      ['Jefferson curl', 'Jefferson curl', 'jefferson', { eq: ['barbell'], trk: 'weight_reps' }],
    ],
  },
  {
    group: 'Espalda', family: 'Peso muerto', pri: ['hamstrings', 'glutes_max', 'erectors'], sec: ['traps_upper', 'forearm_flexors', 'quads'], pat: 'hinge', mech: 'compound', eq: ['barbell'],
    items: [
      ['Peso muerto convencional', 'Conventional deadlift', 'peso muerto|deadlift|pm|dl|muerto'],
      ['Peso muerto sumo', 'Sumo deadlift', 'sumo', { sec: ['adductors', 'quads', 'traps_upper'] }],
      ['Peso muerto con trap bar', 'Trap bar deadlift', 'hex bar|trap bar deadlift', { sec: ['quads', 'traps_upper'] }],
      ['Peso muerto con déficit', 'Deficit deadlift'],
      ['Peso muerto con pausa', 'Paused deadlift'],
      ['Rack pull', 'Rack pull', 'rack pull|desde rack'],
      ['Peso muerto con agarre de arranque (snatch grip)', 'Snatch-grip deadlift'],
      ['Peso muerto con bandas o cadenas', 'Deadlift with bands or chains', undefined, { eq: ['barbell', 'band', 'chains'] }],
      ['Peso muerto con mancuernas', 'Dumbbell deadlift'],
      ['Peso muerto en Smith', 'Smith machine deadlift'],
      ['Peso muerto con kettlebell', 'Kettlebell deadlift'],
    ],
  },

  // ── Hombro
  {
    group: 'Hombro', family: 'Press vertical', pri: ['delts_front'], sec: ['delts_side', 'triceps_lateral', 'traps_upper'], pat: 'vertical_push', mech: 'compound', eq: ['barbell'],
    items: [
      ['Press militar de pie con barra', 'Standing barbell overhead press', 'press militar|ohp|overhead press|military press'],
      ['Press militar sentado con barra', 'Seated barbell overhead press'],
      ['Press tras nuca', 'Behind-the-neck press'],
      ['Press de hombro sentado con mancuernas', 'Seated dumbbell shoulder press', 'press de hombro|db shoulder press|press militar con mancuernas'],
      ['Press de hombro de pie con mancuernas', 'Standing dumbbell shoulder press'],
      ['Press de hombro con mancuernas agarre neutro', 'Neutral-grip dumbbell shoulder press'],
      ['Press de hombro unilateral con mancuerna', 'Single-arm dumbbell shoulder press'],
      ['Press Arnold', 'Arnold press', 'arnold', { eq: ['dumbbell'] }],
      ['Press de hombro en Smith', 'Smith machine shoulder press'],
      ['Press de hombro en máquina', 'Machine shoulder press'],
      ['Press de hombro en máquina convergente (Hammer Strength)', 'Hammer Strength shoulder press'],
      ['Push press', 'Push press', 'push press'],
      ['Z press', 'Z press', 'z press'],
      ['Press Bradford', 'Bradford press', 'bradford'],
      ['Press landmine a una mano', 'Single-arm landmine press', 'landmine press'],
      ['Press Viking', 'Viking press', 'viking', { eq: ['machine'] }],
      ['Press con kettlebell', 'Kettlebell press', 'kb press'],
      ['Lagartijas pike', 'Pike push-ups', 'pike push ups', { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
    ],
  },
  {
    group: 'Hombro', family: 'Elevaciones laterales', pri: ['delts_side'], pat: 'shoulder_abduction', mech: 'isolation', eq: ['dumbbell'],
    items: [
      ['Elevaciones laterales con mancuernas', 'Dumbbell lateral raise', 'laterales|lateral raise|vuelos laterales|side raise|elevaciones laterales'],
      ['Elevaciones laterales sentado', 'Seated lateral raise'],
      ['Elevaciones laterales unilateral con mancuerna', 'Single-arm dumbbell lateral raise'],
      ['Elevaciones laterales inclinado (lean-away)', 'Lean-away lateral raise', 'lean away'],
      ['Elevaciones laterales en polea', 'Cable lateral raise', 'cable lateral'],
      ['Elevaciones laterales en polea por detrás', 'Behind-the-back cable lateral raise'],
      ['Y-raise en polea', 'Cable Y-raise', 'y raise'],
      ['Elevaciones laterales en máquina', 'Machine lateral raise'],
      ['Y-raise en banco inclinado', 'Incline Y-raise'],
      ['Lu raises', 'Lu raise', 'lu raise'],
    ],
  },
  {
    group: 'Hombro', family: 'Remo al mentón', pri: ['delts_side', 'traps_upper'], sec: ['biceps'], pat: 'shoulder_abduction', mech: 'compound', eq: ['barbell'],
    items: [
      ['Remo al mentón con barra', 'Barbell upright row', 'remo al menton|upright row|remo al mentón'],
      ['Remo al mentón con mancuernas', 'Dumbbell upright row'],
      ['Remo al mentón en polea', 'Cable upright row'],
    ],
  },
  {
    group: 'Hombro', family: 'Elevaciones frontales', pri: ['delts_front'], pat: 'shoulder_flexion', mech: 'isolation', eq: ['dumbbell'],
    items: [
      ['Elevaciones frontales con mancuernas', 'Dumbbell front raise', 'frontales|front raise|elevaciones frontales'],
      ['Elevaciones frontales con barra', 'Barbell front raise'],
      ['Elevaciones frontales con disco', 'Plate front raise'],
      ['Elevaciones frontales en polea', 'Cable front raise'],
      ['Elevaciones frontales en banco inclinado', 'Incline front raise'],
    ],
  },
  {
    group: 'Hombro', family: 'Deltoide posterior', pri: ['delts_rear'], sec: ['rhomboids', 'traps_mid'], pat: 'rear_delt', mech: 'isolation', eq: ['dumbbell'],
    items: [
      ['Pájaros con mancuernas (vuelos posteriores)', 'Dumbbell rear delt fly', 'pajaros|pájaros|vuelos posteriores|rear delt fly|reverse fly|deltoide posterior'],
      ['Pájaros en banco inclinado boca abajo', 'Chest-supported rear delt fly'],
      ['Pec deck inverso', 'Reverse pec deck', 'reverse pec deck|mariposa inversa'],
      ['Cruces inversos en polea', 'Reverse cable fly', 'reverse cable crossover'],
      ['Pájaros en polea unilateral', 'Single-arm cable rear delt fly'],
      ['Face pull con cuerda', 'Rope face pull', 'face pull|facepull|jalón a la cara'],
      ['Remo para deltoide posterior con mancuernas', 'Dumbbell rear delt row'],
      ['Remo para deltoide posterior en polea', 'Cable rear delt row'],
    ],
  },
  {
    group: 'Hombro', family: 'Manguito rotador y salud de hombro', pri: ['rotator_cuff'], sec: ['delts_rear'], pat: 'rotator_cuff', mech: 'isolation', eq: ['cable'],
    items: [
      ['Rotación externa en polea', 'Cable external rotation', 'rotacion externa|external rotation'],
      ['Rotación externa con mancuerna acostado de lado', 'Side-lying dumbbell external rotation'],
      ['Rotación interna en polea', 'Cable internal rotation', 'rotacion interna'],
      ['Cuban press', 'Cuban press', 'cuban', { eq: ['dumbbell'] }],
      ['Band pull-apart', 'Band pull-apart', 'pull apart', { eq: ['band'], pri: ['delts_rear'], sec: ['rhomboids', 'rotator_cuff'] }],
      ['YTW en banco inclinado', 'Incline YTW', 'ytw', { eq: ['dumbbell'], pri: ['delts_rear', 'traps_mid'] }],
    ],
  },

  // ── Bíceps
  {
    group: 'Bíceps', family: 'Curl con barra', pri: ['biceps'], sec: ['brachialis', 'brachioradialis'], pat: 'elbow_flexion', mech: 'isolation', eq: ['barbell'],
    items: [
      ['Curl con barra recta', 'Barbell curl', 'curl con barra|barbell curl|curl de bíceps|curl de biceps'],
      ['Curl con barra EZ', 'EZ-bar curl', 'curl ez'],
      ['Curl con barra agarre ancho', 'Wide-grip barbell curl'],
      ['Curl con barra agarre cerrado', 'Close-grip barbell curl'],
      ['Curl de arrastre (drag curl)', 'Drag curl', 'drag curl'],
      ['Curl estricto contra la pared', 'Strict wall curl', 'strict curl'],
      ['Curl inverso con barra', 'Reverse barbell curl', 'reverse curl', { pri: ['brachioradialis', 'brachialis'], sec: ['biceps'] }],
    ],
  },
  {
    group: 'Bíceps', family: 'Curl con mancuernas', pri: ['biceps'], sec: ['brachialis', 'brachioradialis'], pat: 'elbow_flexion', mech: 'isolation', eq: ['dumbbell'],
    items: [
      ['Curl con mancuernas alterno', 'Alternating dumbbell curl', 'curl alterno|db curl'],
      ['Curl con mancuernas simultáneo', 'Dumbbell curl', 'curl con mancuernas'],
      ['Curl martillo', 'Hammer curl', 'martillo|hammer curl', { pri: ['brachialis', 'brachioradialis'], sec: ['biceps'] }],
      ['Curl martillo cruzado', 'Cross-body hammer curl', 'cross body', { pri: ['brachialis', 'brachioradialis'], sec: ['biceps'] }],
      ['Curl inclinado con mancuernas', 'Incline dumbbell curl', 'incline curl'],
      ['Curl concentrado', 'Concentration curl', 'concentrado', { lat: 'unilateral' }],
      ['Curl araña (spider curl)', 'Spider curl', 'spider'],
      ['Curl Zottman', 'Zottman curl', 'zottman'],
      ['Curl Waiter', 'Waiter curl', 'waiter'],
      ['Curl con mancuernas acostado en banco plano', 'Lying dumbbell curl'],
    ],
  },
  {
    group: 'Bíceps', family: 'Curl predicador', pri: ['biceps'], sec: ['brachialis'], pat: 'elbow_flexion', mech: 'isolation', eq: ['ez_bar'],
    items: [
      ['Curl predicador con barra EZ', 'EZ-bar preacher curl', 'predicador|preacher|scott|banco scott'],
      ['Curl predicador con mancuerna', 'Dumbbell preacher curl', 'preacher db'],
      ['Curl predicador en máquina', 'Machine preacher curl'],
      ['Curl predicador en polea', 'Cable preacher curl'],
      ['Curl predicador inverso', 'Reverse preacher curl', undefined, { pri: ['brachioradialis', 'brachialis'] }],
      ['Curl martillo en predicador', 'Preacher hammer curl', undefined, { eq: ['dumbbell'], pri: ['brachialis', 'brachioradialis'] }],
    ],
  },
  {
    group: 'Bíceps', family: 'Curl en polea y máquina', pri: ['biceps'], sec: ['brachialis'], pat: 'elbow_flexion', mech: 'isolation', eq: ['cable'],
    items: [
      ['Curl en polea baja con barra', 'Cable bar curl', 'curl en polea|cable curl', { eq: ['cable'] }],
      ['Curl en polea unilateral', 'Single-arm cable curl'],
      ['Curl Bayesian', 'Bayesian curl', 'bayesian', { lat: 'unilateral' }],
      ['Curl en polea alta (doble bíceps)', 'High cable curl', 'double biceps curl'],
      ['Curl martillo en polea con cuerda', 'Rope hammer curl', 'rope curl', { pri: ['brachialis', 'brachioradialis'] }],
      ['Curl acostado en polea', 'Lying cable curl'],
      ['Curl en máquina', 'Machine curl', 'machine curl'],
    ],
  },

  // ── Tríceps
  {
    group: 'Tríceps', family: 'Extensiones en polea', pri: ['triceps_lateral', 'triceps_medial'], sec: ['triceps_long'], pat: 'elbow_extension', mech: 'isolation', eq: ['cable'],
    items: [
      ['Pushdown con cuerda', 'Rope pushdown', 'jalón de tríceps|tricep pushdown|extensión en polea|pushdown|jalon de triceps'],
      ['Pushdown con barra recta', 'Straight-bar pushdown', 'bar pushdown', { eq: ['cable'] }],
      ['Pushdown con barra V', 'V-bar pushdown', 'v bar', { eq: ['cable'] }],
      ['Pushdown unilateral agarre supino', 'Single-arm reverse-grip pushdown'],
      ['Pushdown unilateral agarre prono', 'Single-arm pushdown'],
      ['Extensión cruzada en polea', 'Cable cross-body triceps extension'],
      ['Extensión sobre la cabeza en polea con cuerda', 'Overhead rope triceps extension', 'overhead extension|extensión por encima', { pri: ['triceps_long'], sec: ['triceps_lateral'] }],
      ['Extensión sobre la cabeza en polea con barra', 'Overhead cable bar triceps extension', undefined, { eq: ['cable'], pri: ['triceps_long'], sec: ['triceps_lateral'] }],
      ['Extensión Katana (unilateral sobre la cabeza en polea)', 'Katana extension', 'katana', { pri: ['triceps_long'] }],
      ['Patada de tríceps en polea', 'Cable triceps kickback', 'kickback'],
    ],
  },
  {
    group: 'Tríceps', family: 'Press francés y extensiones', pri: ['triceps_long'], sec: ['triceps_lateral', 'triceps_medial'], pat: 'elbow_extension', mech: 'isolation', eq: ['ez_bar'],
    items: [
      ['Press francés con barra EZ (skull crusher)', 'EZ-bar skull crusher', 'press frances|press francés|rompecraneos|rompecráneos|skull crusher|skullcrusher'],
      ['Press francés con mancuernas', 'Dumbbell skull crusher'],
      ['Press francés en polea', 'Cable skull crusher', undefined, { eq: ['cable'] }],
      ['Press francés inclinado', 'Incline skull crusher'],
      ['Press francés declinado', 'Decline skull crusher'],
      ['Extensión rodante con mancuernas', 'Dumbbell rolling triceps extension', 'rolling extension'],
      ['Extensión sobre la cabeza con mancuerna a dos manos', 'Two-hand overhead dumbbell extension', 'copa|french press'],
      ['Extensión sobre la cabeza con mancuerna unilateral', 'Single-arm overhead dumbbell extension'],
      ['Extensión sobre la cabeza sentado con barra EZ', 'Seated overhead EZ-bar extension'],
      ['Press Tate', 'Tate press', 'tate', { eq: ['dumbbell'] }],
      ['Patada de tríceps con mancuerna', 'Dumbbell triceps kickback', 'patada de triceps', { pri: ['triceps_lateral'] }],
      ['Extensión de tríceps en máquina', 'Machine triceps extension'],
    ],
  },
  {
    group: 'Tríceps', family: 'Press y fondos para tríceps', pri: ['triceps_lateral', 'triceps_medial'], sec: ['chest_mid', 'delts_front'], pat: 'horizontal_push', mech: 'compound', eq: ['barbell'],
    items: [
      ['Press de banca agarre cerrado', 'Close-grip bench press', 'agarre cerrado|cgbp|close grip bench'],
      ['Press de banca agarre cerrado en Smith', 'Smith machine close-grip bench press'],
      ['Press JM', 'JM press', 'jm press'],
      ['Fondos en banco', 'Bench dips', 'bench dips', { eq: ['bodyweight'], trk: 'bodyweight_reps', pat: 'dip' }],
      ['Fondos en paralelas para tríceps', 'Triceps dips', 'triceps dips', { eq: ['bodyweight'], trk: 'bodyweight_reps', pat: 'dip' }],
      ['Fondos en máquina', 'Machine dips', 'dip machine', { pat: 'dip' }],
      ['Lagartijas diamante', 'Diamond push-ups', 'diamond push ups', { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
    ],
  },

  // ── Antebrazo y agarre
  {
    group: 'Antebrazo y agarre', family: 'Muñeca', pri: ['forearm_flexors'], pat: 'wrist', mech: 'isolation', eq: ['barbell'],
    items: [
      ['Curl de muñeca con barra', 'Barbell wrist curl', 'curl de muñeca|wrist curl|antebrazo'],
      ['Curl de muñeca inverso con barra', 'Reverse barbell wrist curl', 'reverse wrist curl', { pri: ['forearm_extensors'] }],
      ['Curl de muñeca con mancuerna', 'Dumbbell wrist curl'],
      ['Curl de muñeca por detrás de la espalda', 'Behind-the-back wrist curl'],
      ['Rodillo de muñeca', 'Wrist roller', 'wrist roller', { eq: ['other'], pri: ['forearm_flexors', 'forearm_extensors'] }],
      ['Pronación y supinación con mancuerna', 'Dumbbell pronation and supination', undefined, { pri: ['brachioradialis', 'forearm_flexors'] }],
      ['Desviación radial con mancuerna', 'Dumbbell radial deviation', undefined, { pri: ['forearm_extensors'] }],
    ],
  },
  {
    group: 'Antebrazo y agarre', family: 'Agarre', pri: ['forearm_flexors'], pat: 'grip', mech: 'isolation', eq: ['other'], trk: 'duration',
    items: [
      ['Colgado en barra (dead hang)', 'Dead hang', 'dead hang|colgarse', { eq: ['bodyweight'] }],
      ['Colgado con toalla', 'Towel hang', 'towel hang', { eq: ['bodyweight'] }],
      ['Pinza de discos (plate pinch)', 'Plate pinch', 'plate pinch', { trk: 'weight_duration' }],
      ['Grippers', 'Grippers', 'hand gripper|gripper', { trk: 'reps_only' }],
      ['Sostén con barra gruesa', 'Thick-bar hold', 'fat grip|axle hold', { trk: 'weight_duration' }],
      ['Extensión de dedos con banda', 'Band finger extension', undefined, { trk: 'reps_only', pri: ['forearm_extensors'] }],
    ],
  },

  // ── Cuádriceps
  {
    group: 'Cuádriceps', family: 'Sentadilla', pri: ['quads', 'glutes_max'], sec: ['adductors', 'erectors'], pat: 'squat', mech: 'compound', eq: ['barbell'],
    items: [
      ['Sentadilla trasera barra alta', 'High-bar back squat', 'sentadilla|squat|back squat|high bar|sentadilla libre'],
      ['Sentadilla trasera barra baja', 'Low-bar back squat', 'low bar'],
      ['Sentadilla frontal', 'Front squat', 'front squat|sentadilla al frente'],
      ['Sentadilla con safety bar (SSB)', 'Safety bar squat', 'ssb squat'],
      ['Sentadilla con pausa', 'Paused squat', 'pause squat'],
      ['Sentadilla a caja (box squat)', 'Box squat', 'box squat'],
      ['Sentadilla Anderson (desde pines)', 'Anderson squat', 'pin squat|anderson'],
      ['Sentadilla Zercher', 'Zercher squat', 'zercher'],
      ['Sentadilla overhead', 'Overhead squat', 'ohs|overhead squat'],
      ['Sentadilla con talones elevados', 'Heels-elevated squat'],
      ['Sentadilla ciclista', 'Cyclist squat', 'cyclist squat'],
      ['Sentadilla goblet', 'Goblet squat', 'goblet|sentadilla copa', { eq: ['dumbbell', 'kettlebell'] }],
      ['Sentadilla con mancuernas', 'Dumbbell squat'],
      ['Sentadilla frontal con kettlebells dobles', 'Double kettlebell front squat'],
      ['Sentadilla landmine', 'Landmine squat'],
      ['Sentadilla en Smith', 'Smith machine squat', 'smith squat'],
      ['Sentadilla con peso corporal', 'Bodyweight squat', 'air squat|sentadilla libre sin peso', { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
    ],
  },
  {
    group: 'Cuádriceps', family: 'Sentadilla en máquina', pri: ['quads'], sec: ['glutes_max'], pat: 'squat', mech: 'compound', eq: ['machine'],
    items: [
      ['Sentadilla hack', 'Hack squat', 'hack|hack squat|jaca'],
      ['Sentadilla hack inversa', 'Reverse hack squat', 'reverse hack', { pri: ['glutes_max', 'quads'] }],
      ['Sentadilla péndulo', 'Pendulum squat', 'pendulo|péndulo|pendulum'],
      ['Sentadilla en V (V-squat)', 'V-squat', 'v squat'],
      ['Belt squat', 'Belt squat', 'belt squat|sentadilla con cinturón'],
      ['Sentadilla sissy', 'Sissy squat', 'sissy', { eq: ['bodyweight'], trk: 'bodyweight_reps', mech: 'isolation', pat: 'knee_extension' }],
      ['Sentadilla sissy en máquina', 'Machine sissy squat', undefined, { mech: 'isolation', pat: 'knee_extension' }],
    ],
  },
  {
    group: 'Cuádriceps', family: 'Prensa', pri: ['quads', 'glutes_max'], sec: ['adductors'], pat: 'squat', mech: 'compound', eq: ['machine'],
    items: [
      ['Prensa de pierna 45°', '45° leg press', 'prensa|leg press|prensa 45'],
      ['Prensa de pierna horizontal', 'Horizontal leg press'],
      ['Prensa de pierna vertical', 'Vertical leg press'],
      ['Prensa unilateral', 'Single-leg press'],
      ['Prensa con pies bajos y juntos', 'Leg press, low narrow stance', undefined, { pri: ['quads'] }],
      ['Prensa con pies altos y abiertos', 'Leg press, high wide stance', undefined, { pri: ['glutes_max', 'hamstrings'], sec: ['adductors', 'quads'] }],
    ],
  },
  {
    group: 'Cuádriceps', family: 'Extensión de cuádriceps', pri: ['quads'], pat: 'knee_extension', mech: 'isolation', eq: ['machine'],
    items: [
      ['Extensión de cuádriceps en máquina', 'Leg extension', 'extensiones|leg extension|extensión de pierna|extension de cuadriceps'],
      ['Extensión de cuádriceps unilateral', 'Single-leg extension'],
      ['Extensión de pierna con tobillera', 'Ankle-weight leg extension', undefined, { eq: ['other'] }],
      ['Reverse Nordic', 'Reverse Nordic', 'reverse nordic|nórdico inverso', { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
      ['Spanish squat', 'Spanish squat', 'spanish squat', { eq: ['band'], trk: 'reps_only' }],
    ],
  },
  {
    group: 'Cuádriceps', family: 'Zancadas y unilaterales', pri: ['quads', 'glutes_max'], sec: ['adductors', 'hamstrings'], pat: 'lunge', mech: 'compound', eq: ['dumbbell'], lat: 'unilateral',
    items: [
      ['Zancadas caminando con mancuernas', 'Dumbbell walking lunge', 'zancadas|desplantes|lunges|walking lunges', { lat: 'alternating' }],
      ['Zancadas caminando con barra', 'Barbell walking lunge', undefined, { lat: 'alternating' }],
      ['Zancada frontal', 'Forward lunge', 'forward lunge'],
      ['Zancada inversa con mancuernas', 'Dumbbell reverse lunge', 'reverse lunge'],
      ['Zancada inversa en déficit', 'Deficit reverse lunge'],
      ['Zancada lateral', 'Lateral lunge', 'side lunge', { sec: ['adductors'] }],
      ['Zancada cruzada (curtsy)', 'Curtsy lunge', 'curtsy', { pri: ['glutes_max', 'glutes_med'] }],
      ['Zancada en Smith', 'Smith machine lunge'],
      ['Zancada con landmine', 'Landmine lunge'],
      ['Split squat', 'Split squat', 'split squat|sentadilla dividida'],
      ['Split squat con pie delantero elevado', 'Front-foot-elevated split squat'],
      ['Sentadilla búlgara con mancuernas', 'Dumbbell Bulgarian split squat', 'bulgara|búlgara|bulgarian|bss'],
      ['Sentadilla búlgara con barra', 'Barbell Bulgarian split squat'],
      ['Sentadilla búlgara en Smith', 'Smith machine Bulgarian split squat'],
      ['Step-up con mancuernas', 'Dumbbell step-up', 'step up|subida al cajón'],
      ['Step-up con barra', 'Barbell step-up'],
      ['Peterson step-up', 'Peterson step-up', 'peterson', { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
      ['Sentadilla patinador (skater squat)', 'Skater squat', 'skater squat', { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
    ],
  },

  // ── Isquiotibiales y bisagra
  {
    group: 'Isquiotibiales y bisagra', family: 'Peso muerto rumano y bisagra', pri: ['hamstrings', 'glutes_max'], sec: ['erectors'], pat: 'hinge', mech: 'compound', eq: ['barbell'],
    items: [
      ['Peso muerto rumano con barra (RDL)', 'Barbell Romanian deadlift', 'rdl|rumano|peso muerto rumano|romanian deadlift|pmr'],
      ['Peso muerto rumano con mancuernas', 'Dumbbell Romanian deadlift', 'db rdl'],
      ['Peso muerto rumano con déficit', 'Deficit Romanian deadlift'],
      ['Peso muerto rumano en Smith', 'Smith machine Romanian deadlift'],
      ['Peso muerto rumano con kettlebell', 'Kettlebell Romanian deadlift'],
      ['Peso muerto rumano unilateral', 'Single-leg Romanian deadlift', 'sl rdl', { eq: ['dumbbell'] }],
      ['Peso muerto rumano unilateral con landmine', 'Single-leg landmine Romanian deadlift'],
      ['Peso muerto rumano B-stance', 'B-stance Romanian deadlift', 'b stance rdl', { lat: 'unilateral' }],
      ['Peso muerto piernas rígidas (stiff-leg)', 'Stiff-leg deadlift', 'stiff leg|sldl|piernas rigidas'],
      ['Buenos días con barra', 'Barbell good morning', 'good morning|buenos dias'],
      ['Buenos días sentado', 'Seated good morning'],
    ],
  },
  {
    group: 'Isquiotibiales y bisagra', family: 'Curl femoral', pri: ['hamstrings'], sec: ['calves_gastroc'], pat: 'knee_flexion', mech: 'isolation', eq: ['machine'],
    items: [
      ['Curl femoral acostado', 'Lying leg curl', 'femoral|leg curl|curl de pierna|curl femoral'],
      ['Curl femoral acostado unilateral', 'Single-leg lying leg curl'],
      ['Curl femoral sentado', 'Seated leg curl', 'seated leg curl'],
      ['Curl femoral sentado unilateral', 'Single-leg seated leg curl'],
      ['Curl femoral de pie unilateral', 'Standing single-leg curl'],
      ['Curl femoral en polea de pie', 'Standing cable leg curl', undefined, { lat: 'unilateral' }],
      ['Curl femoral con mancuerna acostado', 'Lying dumbbell leg curl'],
      ['Curl femoral con fitball', 'Stability ball leg curl', 'swiss ball leg curl', { eq: ['other'], trk: 'bodyweight_reps' }],
      ['Curl femoral con sliders', 'Slider leg curl', undefined, { eq: ['other'], trk: 'bodyweight_reps' }],
      ['Curl nórdico', 'Nordic curl', 'nordico|nórdico|nordics|nordic', { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
      ['Curl nórdico asistido con banda', 'Band-assisted Nordic curl', undefined, { trk: 'bodyweight_reps' }],
      ['Glute-ham raise (GHR)', 'Glute-ham raise', 'ghr', { eq: ['other'], trk: 'bodyweight_reps' }],
    ],
  },

  // ── Glúteo
  {
    group: 'Glúteo', family: 'Hip thrust y puentes', pri: ['glutes_max'], sec: ['hamstrings'], pat: 'hip_extension', mech: 'compound', eq: ['barbell'],
    items: [
      ['Hip thrust con barra', 'Barbell hip thrust', 'hip thrust|empuje de cadera|elevación de cadera'],
      ['Hip thrust en máquina', 'Machine hip thrust'],
      ['Hip thrust en Smith', 'Smith machine hip thrust'],
      ['Hip thrust con mancuerna', 'Dumbbell hip thrust'],
      ['Hip thrust unilateral', 'Single-leg hip thrust', undefined, { eq: ['bodyweight'], trk: 'weighted_bodyweight' }],
      ['Hip thrust B-stance', 'B-stance hip thrust', undefined, { lat: 'unilateral' }],
      ['Hip thrust con banda', 'Banded hip thrust', undefined, { trk: 'reps_only' }],
      ['Puente de glúteo con barra', 'Barbell glute bridge', 'glute bridge|puente de gluteo|puente'],
      ['Puente de glúteo unilateral', 'Single-leg glute bridge', undefined, { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
      ['Puente de glúteo con pies elevados', 'Feet-elevated glute bridge', undefined, { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
      ['Kas glute bridge', 'Kas glute bridge', 'kas bridge'],
      ['Frog pump', 'Frog pump', 'frog pumps', { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
    ],
  },
  {
    group: 'Glúteo', family: 'Patadas y extensión de cadera', pri: ['glutes_max'], sec: ['hamstrings'], pat: 'hip_extension', mech: 'isolation', eq: ['cable'], lat: 'unilateral',
    items: [
      ['Patada de glúteo en polea', 'Cable glute kickback', 'patada de gluteo|kickback de gluteo|glute kickback'],
      ['Patada de glúteo en máquina', 'Machine glute kickback'],
      ['Patada de glúteo en Smith', 'Smith machine glute kickback'],
      ['Patada de glúteo en cuadrupedia', 'Quadruped glute kickback', 'donkey kick', { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
      ['Patada de glúteo con banda', 'Banded glute kickback', undefined, { trk: 'reps_only' }],
      ['Pull-through en polea', 'Cable pull-through', 'pull through', { lat: 'bilateral', mech: 'compound', pat: 'hinge' }],
      ['Hiperextensión enfocada a glúteo', 'Glute-focused back extension', undefined, { eq: ['other'], trk: 'weighted_bodyweight', lat: 'bilateral' }],
    ],
  },
  {
    group: 'Glúteo', family: 'Abducción', pri: ['glutes_med'], sec: ['glutes_max'], pat: 'hip_abduction', mech: 'isolation', eq: ['machine'],
    items: [
      ['Abducción de cadera en máquina', 'Hip abduction machine', 'abduccion|abducción|abductores|abduction|apertura de piernas'],
      ['Abducción en máquina inclinado hacia adelante', 'Forward-lean machine hip abduction'],
      ['Abducción de cadera en polea', 'Cable hip abduction', undefined, { lat: 'unilateral' }],
      ['Abducción de cadera de pie en máquina multicadera', 'Standing multi-hip abduction', undefined, { lat: 'unilateral' }],
      ['Abducción acostado de lado', 'Side-lying hip abduction', undefined, { eq: ['bodyweight'], trk: 'bodyweight_reps', lat: 'unilateral' }],
      ['Caminata lateral con banda', 'Banded lateral walk', 'monster walk|lateral band walk', { trk: 'reps_only' }],
      ['Clamshell con banda', 'Banded clamshell', 'clamshell|almeja', { trk: 'reps_only', lat: 'unilateral' }],
      ['Fire hydrant', 'Fire hydrant', 'fire hydrant', { eq: ['bodyweight'], trk: 'bodyweight_reps', lat: 'unilateral' }],
    ],
  },
  {
    group: 'Glúteo', family: 'Sentadilla sumo', pri: ['glutes_max', 'adductors'], sec: ['quads'], pat: 'squat', mech: 'compound', eq: ['dumbbell'],
    items: [
      ['Sentadilla sumo con mancuerna o kettlebell', 'Dumbbell or kettlebell sumo squat', 'sentadilla sumo|sumo squat'],
      ['Sentadilla sumo con barra', 'Barbell sumo squat'],
    ],
  },

  // ── Aductores
  {
    group: 'Aductores', family: 'Aducción', pri: ['adductors'], pat: 'hip_adduction', mech: 'isolation', eq: ['machine'],
    items: [
      ['Aducción en máquina', 'Hip adduction machine', 'aduccion|aducción|aductores|adduction|cierre de piernas'],
      ['Aducción en polea', 'Cable hip adduction', undefined, { lat: 'unilateral' }],
      ['Aducción acostado de lado', 'Side-lying hip adduction', undefined, { eq: ['bodyweight'], trk: 'bodyweight_reps', lat: 'unilateral' }],
      ['Aducción isométrica con balón', 'Isometric ball squeeze', 'ball squeeze', { eq: ['other'], trk: 'duration' }],
      ['Plancha Copenhagen', 'Copenhagen plank', 'copenhagen', { eq: ['bodyweight'], trk: 'duration', lat: 'unilateral' }],
      ['Sentadilla Cossack', 'Cossack squat', 'cossack', { eq: ['bodyweight'], trk: 'bodyweight_reps', mech: 'compound', pat: 'lunge', lat: 'alternating' }],
    ],
  },

  // ── Pantorrilla y tibial
  {
    group: 'Pantorrilla y tibial', family: 'Elevación de talones', pri: ['calves_gastroc'], sec: ['calves_soleus'], pat: 'calf_raise', mech: 'isolation', eq: ['machine'],
    items: [
      ['Elevación de talones de pie en máquina', 'Standing calf raise', 'pantorrilla|pantorrillas|gemelos|chamorros|calf raise|talones'],
      ['Elevación de talones sentado', 'Seated calf raise', 'seated calf', { pri: ['calves_soleus'], sec: ['calves_gastroc'] }],
      ['Elevación de talones en prensa', 'Leg press calf raise'],
      ['Elevación de talones en Smith', 'Smith machine calf raise'],
      ['Elevación de talones en hack squat', 'Hack squat calf raise'],
      ['Elevación de talones con barra', 'Barbell calf raise'],
      ['Elevación de talones unilateral con mancuerna', 'Single-leg dumbbell calf raise'],
      ['Elevación de talones tipo burro', 'Donkey calf raise', 'donkey calf'],
      ['Elevación de talones en escalón con peso corporal', 'Bodyweight step calf raise', undefined, { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
    ],
  },
  {
    group: 'Pantorrilla y tibial', family: 'Tibial', pri: ['tibialis'], pat: 'ankle_dorsiflexion', mech: 'isolation', eq: ['bodyweight'], trk: 'bodyweight_reps',
    items: [
      ['Elevación de tibial', 'Tibialis raise', 'tibial|tib raise'],
      ['Tibial en máquina', 'Tibialis machine', 'tib bar', { trk: 'weight_reps' }],
    ],
  },

  // ── Core
  {
    group: 'Core', family: 'Planchas y anti-extensión', pri: ['abs', 'transverse_abs'], sec: ['obliques'], pat: 'core_anti_extension', mech: 'isolation', eq: ['bodyweight'], trk: 'duration',
    items: [
      ['Plancha frontal', 'Front plank', 'plancha|plank|tabla'],
      ['Plancha con lastre', 'Weighted plank', 'weighted plank', { eq: ['plate'], trk: 'weight_duration' }],
      ['Plancha RKC', 'RKC plank', 'rkc'],
      ['Plancha con toque de hombro', 'Plank shoulder taps', 'shoulder taps', { trk: 'reps_only' }],
      ['Stir the pot', 'Stir the pot', 'stir the pot', { eq: ['other'], trk: 'reps_only' }],
      ['Body saw', 'Body saw', 'body saw', { eq: ['other'], trk: 'reps_only' }],
      ['Rueda abdominal', 'Ab wheel rollout', 'rueda|ab wheel|rollout', { eq: ['other'], trk: 'reps_only' }],
      ['Rueda abdominal de pie', 'Standing ab wheel rollout', undefined, { eq: ['other'], trk: 'reps_only' }],
      ['Rollout con barra', 'Barbell rollout', undefined, { trk: 'reps_only' }],
      ['Dead bug', 'Dead bug', 'dead bug|bicho muerto', { trk: 'bodyweight_reps' }],
      ['Bird dog', 'Bird dog', 'bird dog', { trk: 'bodyweight_reps', sec: ['erectors', 'glutes_max'] }],
      ['Hollow hold', 'Hollow hold', 'hollow'],
      ['Hollow rocks', 'Hollow rocks', undefined, { trk: 'bodyweight_reps' }],
      ['Vacuum abdominal', 'Stomach vacuum', 'vacuum|vacío abdominal', { pri: ['transverse_abs'] }],
    ],
  },
  {
    group: 'Core', family: 'Flexión de tronco', pri: ['abs'], sec: ['obliques'], pat: 'core_flexion', mech: 'isolation', eq: ['bodyweight'], trk: 'bodyweight_reps',
    items: [
      ['Crunch en piso', 'Floor crunch', 'abdominales|crunch|abs|encogimiento abdominal'],
      ['Crunch en polea de rodillas', 'Kneeling cable crunch', 'cable crunch', { trk: 'weight_reps' }],
      ['Crunch en máquina', 'Machine crunch', 'ab machine', { trk: 'weight_reps' }],
      ['Crunch declinado', 'Decline crunch', 'decline crunch', { eq: ['other'] }],
      ['Crunch en fitball', 'Stability ball crunch', undefined, { eq: ['other'] }],
      ['Crunch bicicleta', 'Bicycle crunch', 'bicycle crunch', { pri: ['obliques', 'abs'] }],
      ['Sit-up', 'Sit-up', 'situps|abdominal completo'],
      ['Sit-up con peso', 'Weighted sit-up', 'weighted sit up'],
      ['GHD sit-up', 'GHD sit-up', 'ghd', { eq: ['other'] }],
      ['V-ups', 'V-ups', 'v up|navajas'],
      ['Jackknife en fitball', 'Stability ball jackknife', 'jackknife', { eq: ['other'] }],
    ],
  },
  {
    group: 'Core', family: 'Elevaciones de piernas', pri: ['abs'], sec: ['obliques'], pat: 'core_flexion', mech: 'isolation', eq: ['bodyweight'], trk: 'bodyweight_reps',
    items: [
      ['Crunch inverso', 'Reverse crunch', 'reverse crunch'],
      ['Elevación de piernas acostado', 'Lying leg raise', 'elevacion de piernas|leg raises|elevaciones de piernas'],
      ['Elevación de piernas en silla romana', "Captain's chair leg raise", 'captain chair|silla romana'],
      ['Elevación de rodillas colgado', 'Hanging knee raise', 'knee raise'],
      ['Elevación de piernas colgado', 'Hanging leg raise', 'hanging leg raise|elevaciones colgado'],
      ['Elevación de piernas colgado oblicua', 'Hanging oblique leg raise', undefined, { pri: ['obliques'], sec: ['abs'] }],
      ['Toes to bar', 'Toes to bar', 't2b|ttb|pies a la barra'],
      ['Tijeras (flutter kicks)', 'Flutter kicks', 'flutter kicks|tijeras'],
      ['Dragon flag', 'Dragon flag', 'dragon flag'],
    ],
  },
  {
    group: 'Core', family: 'Rotación y anti-rotación', pri: ['obliques'], sec: ['abs', 'transverse_abs'], pat: 'core_rotation', mech: 'isolation', eq: ['bodyweight'], trk: 'bodyweight_reps',
    items: [
      ['Plancha lateral', 'Side plank', 'side plank|plancha de lado', { trk: 'duration', lat: 'unilateral' }],
      ['Pallof press', 'Pallof press', 'pallof', { eq: ['cable'], trk: 'weight_reps' }],
      ['Leñador en polea alto a bajo', 'High-to-low cable woodchop', 'leñador|lenador|woodchop|wood chop', { trk: 'weight_reps' }],
      ['Leñador en polea bajo a alto', 'Low-to-high cable woodchop', undefined, { trk: 'weight_reps' }],
      ['Russian twist', 'Russian twist', 'giros rusos|russian twist'],
      ['Rotación con landmine', 'Landmine rotation', 'landmine twist|arco iris', { trk: 'weight_reps' }],
      ['Windshield wipers', 'Windshield wipers', 'limpiaparabrisas'],
      ['Flexión lateral con mancuerna', 'Dumbbell side bend', 'side bend|inclinaciones laterales', { trk: 'weight_reps' }],
      ['Crunch oblicuo en polea', 'Cable oblique crunch', undefined, { trk: 'weight_reps' }],
      ['Mountain climbers', 'Mountain climbers', 'escaladores|mountain climber', { trk: 'reps_only', pri: ['abs'], sec: ['obliques', 'cardio'] }],
    ],
  },

  // ── Olímpicos y potencia
  {
    group: 'Olímpicos y potencia', family: 'Arranque', pri: ['glutes_max', 'hamstrings', 'traps_upper'], sec: ['quads', 'delts_side', 'erectors'], pat: 'olympic', mech: 'compound', eq: ['barbell'],
    items: [
      ['Arranque (snatch)', 'Snatch', 'snatch|arranque'],
      ['Arranque de potencia (power snatch)', 'Power snatch', 'power snatch'],
      ['Arranque colgado (hang snatch)', 'Hang snatch', 'hang snatch'],
      ['Arranque desde bloques', 'Block snatch', 'block snatch'],
      ['Muscle snatch', 'Muscle snatch'],
      ['Snatch balance', 'Snatch balance', undefined, { pri: ['quads', 'delts_front'] }],
      ['Tirón de arranque (snatch pull)', 'Snatch pull', 'snatch pull'],
      ['Arranque con mancuerna a un brazo', 'Single-arm dumbbell snatch', 'db snatch'],
    ],
  },
  {
    group: 'Olímpicos y potencia', family: 'Cargada y envión', pri: ['glutes_max', 'hamstrings', 'quads'], sec: ['traps_upper', 'delts_front', 'erectors'], pat: 'olympic', mech: 'compound', eq: ['barbell'],
    items: [
      ['Cargada (clean)', 'Clean', 'clean|cargada'],
      ['Cargada de potencia (power clean)', 'Power clean', 'power clean'],
      ['Cargada colgada (hang clean)', 'Hang clean', 'hang clean'],
      ['Cargada de potencia colgada (hang power clean)', 'Hang power clean', 'hpc'],
      ['Tirón de cargada (clean pull)', 'Clean pull', 'clean pull'],
      ['Cargada y envión (clean & jerk)', 'Clean and jerk', 'clean and jerk|c&j|envion'],
      ['Envión dividido (split jerk)', 'Split jerk', 'split jerk', { pri: ['delts_front', 'quads'] }],
      ['Push jerk', 'Push jerk', 'push jerk', { pri: ['delts_front', 'quads'] }],
      ['High pull', 'High pull', 'high pull', { pri: ['traps_upper', 'delts_side'] }],
      ['Cargada con mancuernas', 'Dumbbell clean', 'db clean'],
      ['Thruster con barra', 'Barbell thruster', 'thruster', { pri: ['quads', 'delts_front'] }],
      ['Thruster con mancuernas', 'Dumbbell thruster', undefined, { pri: ['quads', 'delts_front'] }],
    ],
  },
  {
    group: 'Olímpicos y potencia', family: 'Pliometría y balón medicinal', pri: ['quads', 'glutes_max'], sec: ['calves_gastroc'], pat: 'plyometric', mech: 'compound', eq: ['bodyweight'], trk: 'reps_only',
    items: [
      ['Salto al cajón (box jump)', 'Box jump', 'box jump|salto al cajon', { eq: ['other'] }],
      ['Salto en profundidad (depth jump)', 'Depth jump', 'depth jump', { eq: ['other'] }],
      ['Salto largo (broad jump)', 'Broad jump', 'broad jump|salto de longitud'],
      ['Saltos con vallas', 'Hurdle jumps', 'hurdle hops', { eq: ['other'] }],
      ['Sentadilla con salto', 'Jump squat', 'jump squat|squat jump'],
      ['Zancadas con salto', 'Jumping lunges', 'jumping lunges', { lat: 'alternating' }],
      ['Saltos de pantorrilla (pogo jumps)', 'Pogo jumps', 'pogo', { pri: ['calves_gastroc'] }],
      ['Lanzamiento de balón medicinal al pecho', 'Medicine ball chest pass', 'chest pass', { trk: 'weight_reps', pri: ['chest_mid', 'triceps_lateral'] }],
      ['Slam de balón medicinal', 'Medicine ball slam', 'ball slam|slam', { trk: 'weight_reps', pri: ['lats', 'abs'] }],
      ['Lanzamiento rotacional de balón medicinal', 'Rotational medicine ball throw', undefined, { trk: 'weight_reps', pri: ['obliques'] }],
      ['Wall ball', 'Wall ball', 'wall balls', { trk: 'weight_reps' }],
    ],
  },

  // ── Kettlebell y strongman
  {
    group: 'Kettlebell y strongman', family: 'Kettlebell', pri: ['glutes_max', 'hamstrings'], sec: ['erectors', 'forearm_flexors'], pat: 'hinge', mech: 'compound', eq: ['kettlebell'],
    items: [
      ['Swing con kettlebell a dos manos', 'Two-hand kettlebell swing', 'swing|kb swing|kettlebell swing|columpio'],
      ['Swing con kettlebell a una mano', 'Single-arm kettlebell swing'],
      ['Clean con kettlebell', 'Kettlebell clean', 'kb clean', { pat: 'olympic' }],
      ['Snatch con kettlebell', 'Kettlebell snatch', 'kb snatch', { pat: 'olympic' }],
      ['Turkish get-up', 'Turkish get-up', 'tgu|levantamiento turco|get up', { pri: ['delts_front', 'abs'], pat: 'static_hold', lat: 'unilateral' }],
      ['Windmill con kettlebell', 'Kettlebell windmill', 'windmill|molino', { pri: ['obliques'], lat: 'unilateral' }],
      ['Halo con kettlebell', 'Kettlebell halo', 'halo', { pri: ['delts_front', 'delts_side'], mech: 'isolation', pat: 'rotator_cuff' }],
      ['Bottoms-up press con kettlebell', 'Bottoms-up kettlebell press', 'bottoms up', { pri: ['delts_front'], sec: ['rotator_cuff', 'forearm_flexors'], pat: 'vertical_push' }],
    ],
  },
  {
    group: 'Kettlebell y strongman', family: 'Cargas y acarreos', pri: ['forearm_flexors', 'traps_upper'], sec: ['abs', 'obliques'], pat: 'carry', mech: 'compound', eq: ['dumbbell'], trk: 'weight_distance',
    items: [
      ["Caminata de granjero (farmer's walk)", "Farmer's walk", 'farmer|farmers walk|granjero|paseo del granjero'],
      ['Caminata de granjero con trap bar', "Trap bar farmer's walk"],
      ['Suitcase carry', 'Suitcase carry', 'suitcase', { lat: 'unilateral', pri: ['obliques', 'forearm_flexors'] }],
      ['Rack carry con kettlebells', 'Kettlebell rack carry', 'rack carry'],
      ['Caminata con peso sobre la cabeza', 'Overhead carry', 'overhead carry|waiter walk', { pri: ['delts_front', 'traps_upper'] }],
      ['Caminata con sandbag', 'Sandbag carry', 'sandbag', { eq: ['other'] }],
      ['Yoke walk', 'Yoke walk', 'yoke', { eq: ['other'] }],
    ],
  },
  {
    group: 'Kettlebell y strongman', family: 'Strongman', pri: ['glutes_max', 'hamstrings', 'erectors'], sec: ['traps_upper', 'forearm_flexors'], pat: 'hinge', mech: 'compound', eq: ['other'],
    items: [
      ['Volteo de llanta (tire flip)', 'Tire flip', 'tire flip|llanta'],
      ['Empuje de trineo', 'Sled push', 'sled push|prowler', { trk: 'weight_distance', pri: ['quads', 'glutes_max'], pat: 'locomotion' }],
      ['Arrastre de trineo', 'Sled drag', 'sled drag', { trk: 'weight_distance', pri: ['glutes_max', 'hamstrings'], pat: 'locomotion' }],
      ['Arrastre de trineo hacia atrás', 'Backward sled drag', 'backward drag', { trk: 'weight_distance', pri: ['quads'], pat: 'locomotion' }],
      ['Atlas stone', 'Atlas stone', 'atlas|piedra'],
      ['Log press', 'Log press', 'log', { pri: ['delts_front', 'triceps_lateral'], pat: 'vertical_push' }],
      ['Press con barra gruesa (axle)', 'Axle press', 'axle', { pri: ['delts_front', 'triceps_lateral'], pat: 'vertical_push' }],
      ['Sandbag al hombro', 'Sandbag to shoulder', 'sandbag shoulder'],
      ['Martillo en llanta', 'Sledgehammer tire strikes', 'sledgehammer|mazo', { trk: 'reps_only', pri: ['obliques', 'lats'], pat: 'core_rotation' }],
      ['Cuerdas de batalla', 'Battle ropes', 'battle ropes|cuerdas', { trk: 'duration', pri: ['delts_front', 'cardio'], pat: 'cardio' }],
    ],
  },

  // ── Calistenia
  {
    group: 'Calistenia', family: 'Empuje', pri: ['chest_mid', 'triceps_lateral'], sec: ['delts_front'], pat: 'dip', mech: 'compound', eq: ['bodyweight'], trk: 'bodyweight_reps',
    items: [
      ['Muscle-up en barra', 'Bar muscle-up', 'muscle up|muscleup', { eq: ['bodyweight'], pri: ['lats', 'triceps_lateral'], pat: 'vertical_pull' }],
      ['Muscle-up en anillas', 'Ring muscle-up', undefined, { pri: ['lats', 'triceps_lateral'], pat: 'vertical_pull' }],
      ['Fondos en anillas', 'Ring dips', 'ring dips'],
      ['Dips coreanos', 'Korean dips', 'korean dips'],
      ['Handstand push-up', 'Handstand push-up', 'hspu|flexiones de pino', { pri: ['delts_front', 'triceps_lateral'], pat: 'vertical_push' }],
      ['Handstand push-up con déficit', 'Deficit handstand push-up', undefined, { pri: ['delts_front', 'triceps_lateral'], pat: 'vertical_push' }],
      ['Lagartijas pike elevadas', 'Elevated pike push-ups', undefined, { pri: ['delts_front'], pat: 'vertical_push' }],
      ['Lagartijas pseudoplancha', 'Pseudo planche push-ups', 'pseudo planche', { pri: ['chest_mid', 'delts_front'], pat: 'horizontal_push' }],
      ['Lagartijas a una mano', 'One-arm push-ups', 'one arm push up', { lat: 'unilateral', pat: 'horizontal_push' }],
      ['Lagartijas hindúes', 'Hindu push-ups', 'hindu push ups', { pat: 'horizontal_push' }],
    ],
  },
  {
    group: 'Calistenia', family: 'Tracción', pri: ['lats'], sec: ['biceps', 'rhomboids'], pat: 'vertical_pull', mech: 'compound', eq: ['bodyweight'], trk: 'bodyweight_reps',
    items: [
      ['Dominada L-sit', 'L-sit pull-up', 'l sit pull up', { sec: ['abs', 'biceps'] }],
      ['Dominada arquera', 'Archer pull-up', 'archer pull up'],
      ['Dominada typewriter', 'Typewriter pull-up', 'typewriter'],
      ['Dominadas explosivas (chest to bar)', 'Chest-to-bar pull-ups', 'c2b|chest to bar'],
      ['Remo invertido en anillas', 'Ring inverted row', 'ring row', { pat: 'horizontal_pull', pri: ['lats', 'rhomboids'] }],
      ['Skin the cat', 'Skin the cat', 'skin the cat', { pri: ['lats', 'delts_rear'], mech: 'isolation', pat: 'shoulder_extension' }],
    ],
  },
  {
    group: 'Calistenia', family: 'Estáticos', pri: ['abs', 'delts_front'], sec: ['lats', 'triceps_lateral'], pat: 'static_hold', mech: 'compound', eq: ['bodyweight'], trk: 'duration',
    items: [
      ['Parada de manos (handstand hold)', 'Handstand hold', 'handstand|pino|parada de manos'],
      ['Wall walk', 'Wall walk', 'wall walk', { trk: 'reps_only' }],
      ['L-sit', 'L-sit', 'l sit', { pri: ['abs'], sec: ['triceps_lateral'] }],
      ['Front lever tuck', 'Tuck front lever', 'tuck front lever', { pri: ['lats', 'abs'] }],
      ['Front lever', 'Front lever', 'front lever', { pri: ['lats', 'abs'] }],
      ['Front lever raises', 'Front lever raises', undefined, { pri: ['lats', 'abs'], trk: 'bodyweight_reps' }],
      ['Back lever', 'Back lever', 'back lever', { pri: ['lats', 'delts_rear'] }],
      ['Planche lean', 'Planche lean', 'planche lean', { pri: ['delts_front', 'chest_mid'] }],
      ['Tuck planche', 'Tuck planche', undefined, { pri: ['delts_front', 'chest_mid'] }],
      ['Planche', 'Planche', 'plancha de gimnasta', { pri: ['delts_front', 'chest_mid'] }],
      ['Human flag', 'Human flag', 'bandera humana', { pri: ['obliques', 'lats'] }],
    ],
  },
  {
    group: 'Calistenia', family: 'Piernas y locomoción', pri: ['quads', 'glutes_max'], sec: ['adductors'], pat: 'squat', mech: 'compound', eq: ['bodyweight'], trk: 'bodyweight_reps', lat: 'unilateral',
    items: [
      ['Pistol squat', 'Pistol squat', 'pistol|sentadilla a una pierna'],
      ['Shrimp squat', 'Shrimp squat', 'shrimp'],
      ['Bear crawl', 'Bear crawl', 'gateo de oso|bear crawl', { trk: 'distance_duration', lat: 'alternating', pri: ['delts_front', 'abs'], pat: 'locomotion' }],
    ],
  },

  // ── Cardio y acondicionamiento
  {
    group: 'Cardio y acondicionamiento', family: 'Máquinas de cardio', pri: ['cardio'], pat: 'cardio', mech: 'compound', eq: ['cardio_machine'], trk: 'distance_duration',
    items: [
      ['Caminadora caminando', 'Treadmill walk', 'caminadora|treadmill|cinta|banda caminadora'],
      ['Caminadora corriendo', 'Treadmill run', 'correr en caminadora'],
      ['Caminadora inclinada', 'Incline treadmill walk', '12-3-30|incline walk'],
      ['Escaladora (stairmaster)', 'StairMaster', 'escaladora|escaleras|stairmaster|stair climber', { trk: 'duration' }],
      ['Elíptica', 'Elliptical', 'eliptica|elíptica|elliptical'],
      ['Bicicleta estática', 'Stationary bike', 'bici|bicicleta|bike'],
      ['Spinning', 'Spin bike', 'spinning|spin', { trk: 'duration' }],
      ['Bicicleta de aire (assault/echo bike)', 'Air bike', 'assault bike|echo bike|air bike'],
      ['Remo ergómetro', 'Rowing machine', 'remo|ergometro|erg|concept2|rower'],
      ['SkiErg', 'SkiErg', 'ski erg'],
    ],
  },
  {
    group: 'Cardio y acondicionamiento', family: 'Exterior', pri: ['cardio'], pat: 'cardio', mech: 'compound', eq: ['bodyweight'], trk: 'distance_duration',
    items: [
      ['Correr al aire libre', 'Outdoor run', 'correr|running|run|trotar'],
      ['Caminata al aire libre', 'Outdoor walk', 'caminar|walk|caminata'],
      ['Senderismo', 'Hiking', 'hiking|senderismo|trekking'],
      ['Ciclismo al aire libre', 'Outdoor cycling', 'ciclismo|cycling|rodar', { eq: ['other'] }],
      ['Natación', 'Swimming', 'nadar|natacion|swimming'],
      ['Rucking (caminata con chaleco)', 'Rucking', 'ruck|chaleco', { trk: 'weight_distance', eq: ['other'] }],
      ['Sprints', 'Sprints', 'sprint|velocidad'],
      ['Sprints en cuesta', 'Hill sprints', 'hill sprints|cuestas'],
    ],
  },
  {
    group: 'Cardio y acondicionamiento', family: 'Metcon', pri: ['cardio'], pat: 'cardio', mech: 'compound', eq: ['bodyweight'], trk: 'duration',
    items: [
      ['Cuerda para saltar', 'Jump rope', 'saltar la cuerda|comba|jump rope', { eq: ['other'] }],
      ['Burpees', 'Burpees', 'burpee', { trk: 'reps_only' }],
      ['Devil press', 'Devil press', 'devil press', { eq: ['dumbbell'], trk: 'weight_reps' }],
      ['Jumping jacks', 'Jumping jacks', 'saltos de tijera|jumping jack', { trk: 'reps_only' }],
      ['Rodillas altas', 'High knees', 'high knees'],
      ['Saltos laterales (skaters)', 'Skater jumps', 'skaters', { trk: 'reps_only' }],
      ['Saco de boxeo', 'Heavy bag', 'box|boxeo|costal', { eq: ['other'] }],
      ['Shadow boxing', 'Shadow boxing', 'boxeo de sombra'],
    ],
  },

  // ── Cuello
  {
    group: 'Cuello', family: 'Cuello', pri: ['neck'], pat: 'neck', mech: 'isolation', eq: ['other'],
    items: [
      ['Flexión de cuello con disco', 'Plate neck flexion', 'neck curl|cuello'],
      ['Extensión de cuello con arnés', 'Neck harness extension', 'neck harness'],
      ['Flexión lateral de cuello', 'Lateral neck flexion', undefined, { eq: ['bodyweight'], trk: 'bodyweight_reps' }],
      ['Cuello en máquina 4 vías', '4-way neck machine', 'neck machine', { eq: ['machine'] }],
    ],
  },
];

// ─── Construcción ─────────────────────────────────────────────────────────────────────

export type CatalogExercise = {
  slug: string;
  name_es: string;
  name_en: string;
  aliases: string[];
  group: string;
  family: string;
  primary_muscles: Muscle[];
  secondary_muscles: Muscle[];
  equipment: Equipment[];
  movement_pattern: Pattern;
  mechanic: Mechanic;
  laterality: Laterality;
  tracking_type: Tracking;
};

/** Minúsculas y sin acentos: "Elíptica" y "eliptica" son lo mismo. */
export function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function slugify(texto: string): string {
  return sinAcentos(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Qué equipo dice el nombre. El orden importa: "barra EZ" no debe contar también como barra. */
const REGLAS_EQUIPO: [RegExp, Equipment][] = [
  [/barra ez/, 'ez_bar'],
  [/trap bar/, 'trap_bar'],
  [/safety bar|\(ssb\)/, 'ssb'],
  [/mancuerna/, 'dumbbell'],
  [/kettlebell/, 'kettlebell'],
  [/\bdisco/, 'plate'],
  [/polea|con cuerda/, 'cable'],
  [/smith/, 'smith'],
  [/maquina|hammer strength|pec deck|prensa|\bhack\b|multicadera/, 'machine'],
  [/landmine/, 'landmine'],
  [/\bbanda/, 'band'],
  [/cadena/, 'chains'],
  [/anillas/, 'rings'],
  [/\btrx\b/, 'trx'],
  [/balon medicinal|wall ball/, 'medicine_ball'],
  [/trineo/, 'sled'],
];

function inferirEquipo(nombre: string): Equipment[] {
  const t = sinAcentos(nombre);
  const encontrados = REGLAS_EQUIPO.filter(([re]) => re.test(t)).map(([, eq]) => eq);
  if (/\bbarra\b/.test(t) && !encontrados.includes('ez_bar')) encontrados.push('barbell');
  return [...new Set(encontrados)];
}

function inferirLateralidad(nombre: string): Laterality | null {
  const t = sinAcentos(nombre);
  if (/unilateral|a una mano|a un brazo|una pierna/.test(t)) return 'unilateral';
  if (/\balterno\b/.test(t)) return 'alternating';
  return null;
}

/**
 * Peso corporal con matices: "lastradas" lleva lastre y "asistidas" se ayuda de una
 * máquina o banda. Solo se aplica cuando la base es de peso corporal y nadie fijó el tipo
 * a mano (así "con peso corporal" no se lee como "con peso").
 */
function ajustarRegistro(nombre: string, base: Tracking): Tracking {
  if (base !== 'bodyweight_reps') return base;
  const t = sinAcentos(nombre);
  if (/asistid/.test(t)) return 'assisted_bodyweight';
  if (/lastrad|lastre|con peso(?! corporal)/.test(t)) return 'weighted_bodyweight';
  return base;
}

export function buildCatalog(): CatalogExercise[] {
  const salida: CatalogExercise[] = [];
  for (const fam of FAMILIES) {
    for (const [name_es, name_en, aliases, extra = {}] of fam.items) {
      const inferido = inferirEquipo(name_es);
      const trkBase = extra.trk ?? fam.trk ?? 'weight_reps';
      salida.push({
        slug: slugify(name_es),
        name_es,
        name_en,
        aliases: aliases ? aliases.split('|').map((a) => a.trim()).filter(Boolean) : [],
        group: fam.group,
        family: fam.family,
        primary_muscles: extra.pri ?? fam.pri,
        secondary_muscles: extra.sec ?? fam.sec ?? [],
        equipment: extra.eq ?? (inferido.length > 0 ? inferido : fam.eq ?? ['other']),
        movement_pattern: extra.pat ?? fam.pat,
        mechanic: extra.mech ?? fam.mech,
        laterality: extra.lat ?? inferirLateralidad(name_es) ?? fam.lat ?? 'bilateral',
        tracking_type: extra.trk ? extra.trk : ajustarRegistro(name_es, trkBase),
      });
    }
  }
  return salida;
}
