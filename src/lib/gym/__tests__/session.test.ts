/** PRs dentro de la sesión, "Anterior" y resumen (RF-F27, RF-F40, RF-F56, RF-F59). */
import { previousSets, sessionPRs, sessionSummary } from '@/lib/gym/session';
import { newSet, setSegmentField } from '@/lib/gym/sets';
import type { WorkoutSet } from '@/types/domain';

let orden = 0;
function hecha(kg: number, reps: number, over: Partial<WorkoutSet> = {}): WorkoutSet {
  orden += 1;
  const s = setSegmentField(setSegmentField(newSet('ex', orden, null, 'kg'), 0, 'weight_kg', kg, 'kg'), 0, 'reps', reps, 'kg');
  return { ...s, completed_at: '2026-10-04T10:00:00Z', ...over };
}

const historial = [
  { workout_id: 'hoy', bodyweight_kg: null, sets: [] as WorkoutSet[] },
  { workout_id: 'semana-pasada', bodyweight_kg: null, sets: [hecha(100, 5), hecha(100, 5)] },
  { workout_id: 'hace-un-mes', bodyweight_kg: null, sets: [hecha(90, 8)] },
];

it('"Anterior" es la sesión más reciente distinta de la actual', () => {
  expect(previousSets(historial, 'hoy').map((s) => s.segments[0].weight_kg)).toEqual([100, 100]);
});

it('sin historial no hay anterior', () => {
  expect(previousSets([], 'hoy')).toEqual([]);
});

describe('PRs en la sesión', () => {
  it('la primera serie que supera el historial es PR; la siguiente igual ya no', () => {
    const s1 = hecha(105, 5);
    const s2 = hecha(105, 5);
    const prs = sessionPRs([s1, s2], historial, 'hoy', 'weight_reps', null, 'epley');
    expect(prs.get(s1.id)).toContain('max_weight');
    expect(prs.has(s2.id)).toBe(false);
  });

  it('editar a la baja le quita el PR', () => {
    const s1 = hecha(105, 5);
    expect(sessionPRs([s1], historial, 'hoy', 'weight_reps', null, 'epley').has(s1.id)).toBe(true);
    const corregida = setSegmentField(s1, 0, 'weight_kg', 95, 'kg');
    expect(sessionPRs([corregida], historial, 'hoy', 'weight_reps', null, 'epley').get(corregida.id) ?? []).not.toContain('max_weight');
  });

  it('las series pendientes no son PR', () => {
    const p = { ...hecha(200, 1), completed_at: null };
    expect(sessionPRs([p], historial, 'hoy', 'weight_reps', null, 'epley').size).toBe(0);
  });
});

it('resumen: volumen solo de lo hecho, PRs y duración', () => {
  const ctx = { trackingType: 'weight_reps' as const, bodyweightKg: null };
  const s1 = hecha(100, 10);
  const pendiente = { ...hecha(100, 10), completed_at: null };
  const r = sessionSummary([{ sets: [s1, pendiente], ctx, prs: new Map([[s1.id, ['max_weight' as const]]]) }], '2026-10-04T10:00:00Z', '2026-10-04T11:05:00Z');
  expect(r).toEqual({ durationMin: 65, volumeKg: 1000, setsDone: 1, setsPending: 1, prCount: 1 });
});
