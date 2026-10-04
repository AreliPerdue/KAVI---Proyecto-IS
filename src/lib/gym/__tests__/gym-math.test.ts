/**
 * Cálculos del gym tracker (spec 07 v2): unidades, esfuerzo, e1RM, volumen y récords.
 * Son la base de PRs y logros; un error aquí celebra lo que no fue o esconde lo que sí.
 */
import { rirToRpe, rpeToRir } from '@/lib/gym/effort';
import { e1rm } from '@/lib/gym/e1rm';
import { uuidFrom, uuidv4 } from '@/lib/gym/ids';
import { detectPRs, type SetWithContext } from '@/lib/gym/records';
import { formatWeight, fromKg, toKg } from '@/lib/gym/units';
import { segmentLoadKg, segmentReps, setVolume, totalVolume, type VolumeContext } from '@/lib/gym/volume';
import type { SetSegment, WorkoutSet } from '@/types/domain';

const PESO: VolumeContext = { trackingType: 'weight_reps', bodyweightKg: null };

let n = 0;
function seg(over: Partial<SetSegment> = {}): SetSegment {
  n += 1;
  return {
    id: `seg-${n}`, set_id: 's', sort_order: 0, kind: 'main', weight_kg: null, input_unit: 'kg',
    reps: null, reps_left: null, reps_right: null, partial_reps: null, forced_reps: null, cheat_reps: null,
    duration_sec: null, distance_m: null, rest_before_sec: null, variant_exercise_id: null, notes: null,
    ...over,
  };
}

function serie(segments: SetSegment[], over: Partial<WorkoutSet> = {}): WorkoutSet {
  n += 1;
  return {
    id: `set-${n}`, workout_exercise_id: 'we', sort_order: n, set_type: 'working', intensifiers: [], target: null,
    rpe: null, rir: null, failure: null, tempo: null, rom: null, side: null, load_mods: null, gear: [], spotter: false,
    rest_after_sec: null, completed_at: '2026-10-01T10:00:00.000Z', notes: null, tags: [], from_legacy: false, segments,
    ...over,
  };
}

const conCtx = (set: WorkoutSet, ctx = PESO): SetWithContext => ({ set, ctx });

describe('unidades', () => {
  it('guarda en kg y vuelve a mostrar la libra que se escribió', () => {
    expect(toKg(225, 'lb')).toBe(102.06);
    expect(formatWeight(toKg(225, 'lb'), 'lb')).toBe('225 lb');
  });
  it('conserva los discos fraccionarios en kg', () => {
    expect(formatWeight(1.25, 'kg')).toBe('1.25 kg');
    expect(formatWeight(80, 'kg')).toBe('80 kg');
  });
  it('kg a kg no cambia nada', () => {
    expect(toKg(80, 'kg')).toBe(80);
    expect(fromKg(80, 'kg')).toBe(80);
  });
});

describe('RPE ↔ RIR', () => {
  it('RIR ≈ 10 − RPE', () => {
    expect(rpeToRir(8)).toBe(2);
    expect(rirToRpe(2)).toBe(8);
    expect(rpeToRir(9.5)).toBe(0.5);
  });
  it('no sale de las escalas', () => {
    expect(rpeToRir(11)).toBe(0);
    expect(rirToRpe(12)).toBe(1);
  });
});

describe('e1RM', () => {
  it('Epley: 100 × 5 ≈ 116.7', () => {
    expect(e1rm(100, 5, 'epley')).toBeCloseTo(116.67, 1);
  });
  it('Brzycki: 100 × 5 = 112.5', () => {
    expect(e1rm(100, 5, 'brzycki')).toBeCloseTo(112.5, 1);
  });
  it('una rep es el peso mismo', () => {
    expect(e1rm(140, 1)).toBe(140);
  });
  it('sin peso o sin reps no hay estimado', () => {
    expect(e1rm(null, 5)).toBeNull();
    expect(e1rm(100, 0)).toBeNull();
    expect(e1rm(0, 5)).toBeNull();
  });
});

describe('ids', () => {
  it('uuidv4 tiene forma de UUID v4 y no se repite', () => {
    const a = uuidv4();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuidv4()).not.toBe(a);
  });
  it('uuidFrom es determinista: mismo texto, mismo id', () => {
    expect(uuidFrom('legacy:ex1:0')).toBe(uuidFrom('legacy:ex1:0'));
    expect(uuidFrom('legacy:ex1:0')).not.toBe(uuidFrom('legacy:ex1:1'));
    expect(uuidFrom('x')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('volumen', () => {
  it('un drop set triple es una serie con cuatro segmentos y suma los cuatro', () => {
    const drop = serie([
      seg({ weight_kg: 100, reps: 8 }),
      seg({ kind: 'drop', weight_kg: 80, reps: 6 }),
      seg({ kind: 'drop', weight_kg: 60, reps: 6 }),
      seg({ kind: 'drop', weight_kg: 40, reps: 8 }),
    ]);
    expect(drop.segments).toHaveLength(4);
    expect(setVolume(drop, PESO)).toBe(800 + 480 + 360 + 320);
  });
  it('el calentamiento no es volumen efectivo', () => {
    const cal = serie([seg({ weight_kg: 40, reps: 10 })], { set_type: 'warmup' });
    expect(setVolume(cal, PESO)).toBe(0);
    expect(setVolume(cal, PESO, false)).toBe(400);
  });
  it('unilateral suma los dos lados; las parciales no cuentan', () => {
    const s = seg({ weight_kg: 20, reps_left: 10, reps_right: 9, partial_reps: 4 });
    expect(segmentReps(s)).toBe(19);
    expect(setVolume(serie([s]), PESO)).toBe(380);
  });
  it('peso corporal: usa el del día y sin él no inventa carga', () => {
    expect(segmentLoadKg(seg(), { trackingType: 'bodyweight_reps', bodyweightKg: 70 })).toBe(70);
    expect(segmentLoadKg(seg(), { trackingType: 'bodyweight_reps', bodyweightKg: null })).toBeNull();
  });
  it('lastrado suma corporal + lastre; asistido resta la asistencia', () => {
    expect(segmentLoadKg(seg({ weight_kg: 20 }), { trackingType: 'weighted_bodyweight', bodyweightKg: 70 })).toBe(90);
    expect(segmentLoadKg(seg({ weight_kg: 20 }), { trackingType: 'weighted_bodyweight', bodyweightKg: null })).toBe(20);
    expect(segmentLoadKg(seg({ weight_kg: 25 }), { trackingType: 'assisted_bodyweight', bodyweightKg: 70 })).toBe(45);
  });
  it('el total solo cuenta series hechas', () => {
    const hecha = serie([seg({ weight_kg: 100, reps: 5 })]);
    const pendiente = serie([seg({ weight_kg: 100, reps: 5 })], { completed_at: null });
    expect(totalVolume([conCtx(hecha), conCtx(pendiente)])).toBe(500);
  });
});

describe('récords', () => {
  const historial = [conCtx(serie([seg({ weight_kg: 100, reps: 5 })])), conCtx(serie([seg({ weight_kg: 110, reps: 3 })]))];

  it('más peso que nunca es PR de peso', () => {
    const nueva = conCtx(serie([seg({ weight_kg: 115, reps: 1 })]));
    expect(detectPRs(nueva, historial)).toContain('max_weight');
  });

  it('más reps con una carga ya movida es PR de reps', () => {
    const nueva = conCtx(serie([seg({ weight_kg: 100, reps: 7 })]));
    const prs = detectPRs(nueva, historial);
    expect(prs).toContain('reps_at_weight');
    expect(prs).not.toContain('max_weight');
  });

  it('una serie peor no es récord', () => {
    const nueva = conCtx(serie([seg({ weight_kg: 90, reps: 5 })]));
    expect(detectPRs(nueva, historial)).toEqual([]);
  });

  it('un PR editado a la baja deja de serlo (se compara sin la serie misma)', () => {
    const pr = serie([seg({ weight_kg: 120, reps: 3 })]);
    const todas = [...historial, conCtx(pr)];
    expect(detectPRs(conCtx(pr), todas)).toContain('max_weight');
    const corregida = { ...pr, segments: [seg({ weight_kg: 105, reps: 3 })] };
    const despues = [...historial, conCtx(corregida)];
    expect(detectPRs(conCtx(corregida), despues)).not.toContain('max_weight');
  });

  it('calentamientos y series pendientes no cuentan', () => {
    const cal = conCtx(serie([seg({ weight_kg: 200, reps: 1 })], { set_type: 'warmup' }));
    const pendiente = conCtx(serie([seg({ weight_kg: 200, reps: 1 })], { completed_at: null }));
    expect(detectPRs(cal, historial)).toEqual([]);
    expect(detectPRs(pendiente, historial)).toEqual([]);
  });

  it('la primera vez no es PR: sin historial no hay contra qué', () => {
    expect(detectPRs(conCtx(serie([seg({ weight_kg: 60, reps: 10 })])), [])).toEqual([]);
  });

  it('el drop set cuenta para volumen de serie con todos sus segmentos', () => {
    const drop = conCtx(serie([seg({ weight_kg: 100, reps: 5 }), seg({ kind: 'drop', weight_kg: 80, reps: 5 })]));
    expect(detectPRs(drop, historial)).toContain('set_volume');
  });
});
