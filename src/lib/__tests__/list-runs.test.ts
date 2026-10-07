/**
 * Listas que se repiten (spec 10, RF-L19 – RF-L21, RF-L26): en qué días toca, cuándo caduca
 * una vuelta y cómo se resume, contando lo hecho y nunca lo que falta.
 */
import { finDeGracia, graciaVencida, resumirVueltas, rutinasEnRango } from '@/lib/list-runs';
import { missingOccurrences, occursOn, parseRRule, withExdate } from '@/lib/recurrence';
import type { KaviList, ListRun } from '@/types/domain';

const d = (y: number, m: number, dd: number) => new Date(y, m - 1, dd, 12, 0);

describe('occursOn', () => {
  it('DAILY cae todos los días desde el inicio, no antes', () => {
    const r = parseRRule('FREQ=DAILY')!;
    expect(occursOn(r, '2026-10-05', d(2026, 10, 4))).toBe(false);
    expect(occursOn(r, '2026-10-05', d(2026, 10, 5))).toBe(true);
    expect(occursOn(r, '2026-10-05', d(2026, 11, 30))).toBe(true);
  });

  it('WEEKLY con días: solo esos', () => {
    const r = parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,TH')!;
    expect([5, 6, 7, 8, 9].map((x) => occursOn(r, '2026-10-05', d(2026, 10, x)))).toEqual([true, false, true, true, false]);
  });

  it('WEEKLY sin días: el día de la semana del inicio', () => {
    const r = parseRRule('FREQ=WEEKLY')!;
    expect(occursOn(r, '2026-10-07', d(2026, 10, 14))).toBe(true);
    expect(occursOn(r, '2026-10-07', d(2026, 10, 15))).toBe(false);
  });

  it('MONTHLY: el mismo día; los meses que no lo tienen no caen', () => {
    const r = parseRRule('FREQ=MONTHLY')!;
    expect(occursOn(r, '2026-01-31', d(2026, 3, 31))).toBe(true);
    expect([28].map((x) => occursOn(r, '2026-01-31', d(2026, 2, x)))).toEqual([false]);
  });

  it('respeta el fin (UNTIL)', () => {
    const r = parseRRule('FREQ=DAILY;UNTIL=20261010')!;
    expect(occursOn(r, '2026-10-05', d(2026, 10, 10))).toBe(true);
    expect(occursOn(r, '2026-10-05', d(2026, 10, 11))).toBe(false);
  });
});

describe('gracia de una vuelta (RF-L20)', () => {
  it('la vuelta de ayer sigue viva hasta las 15:00 de hoy', () => {
    expect(finDeGracia('2026-10-06').getHours()).toBe(15);
    expect(graciaVencida('2026-10-06', new Date(2026, 9, 7, 14, 59))).toBe(false);
    expect(graciaVencida('2026-10-06', new Date(2026, 9, 7, 15, 0))).toBe(true);
  });
});

describe('resumirVueltas (RF-L21)', () => {
  it('completa solo si se hizo todo', () => {
    const r = resumirVueltas([
      { completed_count: 3, total_count: 3 },
      { completed_count: 2, total_count: 3 },
      { completed_count: 4, total_count: 3 },
    ]);
    expect(r.completas).toBe(2);
    expect(r.registradas).toBe(3);
  });

  it('las vueltas vacías cuentan como registradas pero no entran al promedio', () => {
    const r = resumirVueltas([{ completed_count: 3, total_count: 3 }, { completed_count: 0, total_count: 0 }]);
    expect(r).toEqual({ completas: 1, registradas: 2, promedioHechos: 3, promedioTotal: 3 });
  });

  it('no devuelve porcentaje de incumplimiento, ni racha, ni nada que se rompa', () => {
    const r = resumirVueltas([{ completed_count: 0, total_count: 3 }]);
    expect(Object.keys(r).sort()).toEqual(['completas', 'promedioHechos', 'promedioTotal', 'registradas']);
  });
});

describe('rutinasEnRango (RF-L26)', () => {
  const rutina = (over: Partial<KaviList> = {}): KaviList =>
    ({
      id: 'r1', owner_id: 'u', name: 'Rutina', icon: 'sun', color: '#fff', view: 'checklist', is_pinned: false, is_archived: false,
      sort_order: 1, created_at: 'x', updated_at: 'x', recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', recurrence_start: '2026-10-05',
      due_date: null, pending_count: 3, total_count: 3, tag_ids: [], ...over,
    }) as KaviList;
  const vuelta = (over: Partial<ListRun>): ListRun =>
    ({ id: 'v', list_id: 'r1', run_date: '2026-10-05', closed_at: null, completed_count: 0, total_count: 0, completed_item_ids: [], ...over }) as ListRun;

  it('de lunes a viernes da cinco días en la semana y ninguno el fin de semana', () => {
    const dias = rutinasEnRango([rutina()], [], '2026-10-05', '2026-10-11').map((x) => x.day);
    expect(dias).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']);
  });

  it('el avance sale de la vuelta cerrada (congelado) o de la abierta (lo palomeado)', () => {
    const r = rutinasEnRango(
      [rutina()],
      [
        vuelta({ run_date: '2026-10-05', closed_at: 'x', completed_count: 2, total_count: 4 }),
        vuelta({ run_date: '2026-10-06', completed_item_ids: ['a', 'b', 'c'] }),
      ],
      '2026-10-05',
      '2026-10-07',
    );
    expect(r.map((x) => [x.hechos, x.total, x.completa])).toEqual([
      [2, 4, false],
      [3, 3, true],
      [0, 3, false],
    ]);
  });

  it('una rutina sin elementos nunca cuenta como completa; las archivadas no salen', () => {
    expect(rutinasEnRango([rutina({ total_count: 0 })], [], '2026-10-05', '2026-10-05')[0]?.completa).toBe(false);
    expect(rutinasEnRango([rutina({ is_archived: true })], [], '2026-10-05', '2026-10-05')).toEqual([]);
  });
});

describe('ocurrencias que faltan y días excluidos (T249)', () => {
  const regla = parseRRule('FREQ=DAILY')!;
  const base = new Date(2026, 9, 5, 9, 0).toISOString();
  const desde = new Date(2026, 9, 5, 0, 0);
  const hasta = new Date(2026, 9, 9, 23, 59);

  it('se salta los días que ya tienen instancia, aunque se le haya cambiado la hora', () => {
    const existentes = [new Date(2026, 9, 6, 18, 0).toISOString()];
    const faltan = missingOccurrences(regla, base, desde, hasta, existentes).map((x) => x.getDate());
    expect(faltan).not.toContain(6);
  });

  it('no recrea un día excluido (la ocurrencia borrada no reaparece)', () => {
    const faltan = missingOccurrences(regla, base, desde, hasta, [], ['2026-10-09']).map((x) => x.getDate());
    expect(faltan).not.toContain(9);
    expect(faltan).toContain(8);
  });

  it('withExdate agrega el día sin repetirlo y ordenado', () => {
    const una = withExdate(['2026-10-09'], new Date(2026, 9, 7, 9, 0).toISOString());
    expect(withExdate(una, new Date(2026, 9, 7, 20, 0).toISOString())).toEqual(['2026-10-07', '2026-10-09']);
  });
});
