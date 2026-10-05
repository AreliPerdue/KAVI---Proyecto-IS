import type { Dictionary } from '../types';

export const fitness: Dictionary['fitness'] = {
  settings: {
    title: 'Gym',
    weightUnit: 'Weight unit',
    weightUnitHint: 'Changing it doesn’t alter what you already logged: it only changes how you see it.',
    kilos: 'Kilograms (kg)',
    pounds: 'Pounds (lb)',
    effort: 'How you log the effort of each set',
    effortHint:
      'Reps in reserve (RIR): how many more reps you had left before failing; 0 is to failure. 1–10 scale (RPE): how hard it felt; 10 is your max. Logging it is optional.',
    rir: 'Reps in reserve',
    rpe: '1–10 scale',
    e1rm: 'How your max weight is estimated',
    e1rmHint:
      'From the weight and reps of your sets, KAVI estimates how much you could lift for a single rep (your 1RM) to show your progress. Epley and Brzycki are two well-known formulas that give almost the same result; if you’re not sure, keep Epley.',
    epley: 'Epley (standard)',
    brzycki: 'Brzycki',
    rest: 'Rest between sets',
    restHint: 'Marking a set as done starts a timer with this time. While it runs you can add or remove 15 seconds.',
    drop: 'Weight you drop in a drop set',
    dropHint:
      'In a drop set you finish the set and keep going with less weight, no rest. Each drop you add starts this much lighter: from 50 kg at 20% you go to 40 kg.',
    timerSound: 'Timer sounds',
    timerSoundHint:
      'Beeps in the last 3 seconds of rest and at each change of an interval timer (EMOM, Tabata). It plays over your music without pausing it.',
    serious: 'Serious mode',
    seriousHint: 'Removes jokes, quips and celebrations. Your personal records (PRs) and achievements still show.',
    voice: 'How KAVI talks to you',
    voiceHint: 'In quips and celebrations: “PR, king!” or “PR, queen!”. Neutral uses neither.',
    voiceOptions: { neutral: 'Neutral', rey: 'King', reina: 'Queen' },
  },
  health: {
    title: 'Health data',
    connectedTo: (fuente, que) => `Connected to ${fuente}: ${que}. They’re only read on this device; KAVI doesn’t upload them.`,
    notConnected: 'Steps, distance, active calories and workouts from other apps, to see them in Fitness → Activity. They’re only read on this device.',
    disconnect: 'Disconnect',
    disconnectTitle: 'Disconnect health data',
    disconnectMessage: 'KAVI stops reading them and forgets what it had on this device. Your KAVI workouts don’t change.',
    disconnected: 'Health data disconnected.',
    connect: 'Connect',
    metrics: {
      steps: 'Steps',
      distance: 'Distance',
      active_calories: 'Active calories',
      exercise_sessions: 'Workouts from other apps',
    },
  },
};
