/**
 * Sesiones de otras apps contra sesiones de KAVI (spec 11, RF-H6).
 */
import { kaviSpan, matchSessions, overlapRatio } from '@/lib/health/match';

const s = (id: string, desde: string, hasta: string) => ({ id, startAt: `2026-10-05T${desde}:00Z`, endAt: `2026-10-05T${hasta}:00Z` });

describe('overlapRatio', () => {
  it('mide el traslape contra la más corta', () => {
    expect(overlapRatio(s('a', '10:00', '11:00'), s('b', '10:30', '10:45'))).toBe(1);
    expect(overlapRatio(s('a', '10:00', '11:00'), s('b', '10:30', '11:30'))).toBe(0.5);
  });

  it('sin traslape es cero', () => {
    expect(overlapRatio(s('a', '10:00', '11:00'), s('b', '12:00', '13:00'))).toBe(0);
  });
});

describe('matchSessions', () => {
  it('con la mitad o más de traslape son la misma sesión', () => {
    const r = matchSessions([s('k', '10:00', '11:00')], [s('e', '10:30', '11:30')]);
    expect(r.byKavi.get('k')?.id).toBe('e');
    expect(r.unmatched).toEqual([]);
  });

  it('con menos de la mitad son distintas', () => {
    const r = matchSessions([s('k', '10:00', '11:00')], [s('e', '10:45', '11:45')]);
    expect(r.byKavi.size).toBe(0);
    expect(r.unmatched.map((x) => x.id)).toEqual(['e']);
  });

  it('cada externa va con una sola de KAVI: la de mayor traslape', () => {
    // k1 se traslapa la mitad; k2, completa.
    const r = matchSessions([s('k1', '10:00', '10:40'), s('k2', '10:20', '11:00')], [s('e', '10:20', '11:00')]);
    expect(r.byKavi.get('k2')?.id).toBe('e');
    expect(r.byKavi.has('k1')).toBe(false);
  });
});

describe('kaviSpan', () => {
  it('con hora de fin usa esa', () => {
    expect(kaviSpan({ id: 'w', performed_at: '2026-10-05T10:00:00.000Z', ended_at: '2026-10-05T11:30:00.000Z' }).endAt).toBe('2026-10-05T11:30:00.000Z');
  });

  it('sin fin usa la duración anotada, y sin nada una hora', () => {
    expect(kaviSpan({ id: 'w', performed_at: '2026-10-05T10:00:00.000Z', duration_minutes: 45 }).endAt).toBe('2026-10-05T10:45:00.000Z');
    expect(kaviSpan({ id: 'w', performed_at: '2026-10-05T10:00:00.000Z' }).endAt).toBe('2026-10-05T11:00:00.000Z');
  });
});
