/** Fitness (spec 07 y 11). La fase 1 trae solo los ajustes de Perfil y los datos de salud; el resto llega con T196b. */
export const fitness = {
  settings: {
    title: 'Gimnasio',
    weightUnit: 'Unidad de peso',
    weightUnitHint: 'Cambiarla no altera lo que ya registraste: solo cambia cómo lo ves.',
    kilos: 'Kilos (kg)',
    pounds: 'Libras (lb)',
    effort: 'Cómo anotas el esfuerzo de cada serie',
    effortHint:
      'Reps en reserva (RIR): cuántas repeticiones más te salían antes de no poder; 0 es al fallo. Escala del 1 al 10 (RPE): qué tan pesada se sintió; 10 es tu máximo. Anotarlo es opcional.',
    rir: 'Reps en reserva',
    rpe: 'Escala del 1 al 10',
    e1rm: 'Cálculo de tu peso máximo',
    e1rmHint:
      'Con el peso y las repeticiones de tus series, KAVI estima cuánto podrías levantar en una sola repetición (tu 1RM) para mostrarte cómo vas. Epley y Brzycki son dos fórmulas conocidas que dan casi lo mismo; si no sabes cuál, deja Epley.',
    epley: 'Epley (estándar)',
    brzycki: 'Brzycki',
    rest: 'Descanso entre series',
    restHint: 'Al marcar una serie como hecha arranca un temporizador con este tiempo. Mientras corre puedes sumarle o quitarle 15 segundos.',
    drop: 'Peso que quitas en un drop set',
    dropHint:
      'En un drop set terminas la serie y sigues sin descanso con menos peso. Cada drop que agregas empieza con este porcentaje menos: de 50 kg con 20 % pasas a 40 kg.',
    timerSound: 'Sonido de los temporizadores',
    timerSoundHint:
      'Pita en los últimos 3 segundos del descanso y en cada cambio de un temporizador de intervalos (EMOM, Tabata). Suena encima de tu música, sin pausarla.',
    serious: 'Modo serio',
    seriousHint: 'Quita las bromas, frases y celebraciones. Tus récords personales (PR) y logros se siguen mostrando.',
    voice: 'Cómo te habla KAVI',
    voiceHint: 'En las frases y celebraciones: «¡PR, mi rey!» o «¡PR, mi reina!». Neutral no usa ninguno.',
    voiceOptions: { neutral: 'Neutral', rey: 'Rey', reina: 'Reina' },
  },
  health: {
    title: 'Datos de salud',
    connectedTo: (fuente: string, que: string) =>
      `Conectado a ${fuente}: ${que}. Solo se leen en este dispositivo; KAVI no los sube a internet.`,
    notConnected: 'Pasos, distancia, calorías activas y entrenamientos de otras apps, para verlos en Fitness → Actividad. Solo se leen en este dispositivo.',
    disconnect: 'Desconectar',
    disconnectTitle: 'Desconectar datos de salud',
    disconnectMessage: 'KAVI deja de leerlos y olvida lo que tenía en este dispositivo. Tus entrenamientos de KAVI no cambian.',
    disconnected: 'Datos de salud desconectados.',
    connect: 'Conectar',
    metrics: {
      steps: 'Pasos',
      distance: 'Distancia',
      active_calories: 'Calorías activas',
      exercise_sessions: 'Entrenamientos de otras apps',
    },
  },
};
