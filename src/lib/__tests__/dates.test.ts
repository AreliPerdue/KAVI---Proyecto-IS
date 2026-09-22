/**
 * Helpers de fechas (plan §1). Sostienen las tres vistas del calendario, el
 * posicionamiento de bloques en el timeline y los textos es-MX, asi que un error
 * aqui se ve en pantalla en todas las pantallas a la vez.
 *
 * La semana empieza en lunes en todo el producto; varias pruebas lo fijan.
 */
import {
  clampToDay,
  durationMinutes,
  findFreeSlots,
  formatDate,
  formatDayTitle,
  formatHourLabel,
  formatMinutes,
  formatMonthTitle,
  formatShortDate,
  formatTime,
  formatTimeRange,
  formatWeekTitle,
  fromDayKey,
  fromIso,
  minutesSinceMidnight,
  monthGridDays,
  nextHalfHour,
  rangeForView,
  setTimeOfDay,
  shiftAnchor,
  toDayKey,
  toIso,
  weekDays,
  MINUTES_PER_DAY,
  SLOTS_PER_DAY,
  SLOT_MINUTES,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
} from '@/lib/dates';

/** Lunes 7 de septiembre de 2026, 14:30 hora local. */
const LUNES = new Date(2026, 8, 7, 14, 30, 0, 0);

describe('constantes', () => {
  it('el dia se divide en slots de 30 minutos', () => {
    expect(MINUTES_PER_DAY).toBe(1440);
    expect(SLOT_MINUTES).toBe(30);
    expect(SLOTS_PER_DAY).toBe(48);
  });

  it('las etiquetas de dia empiezan en lunes', () => {
    expect(WEEKDAY_LABELS[0]).toBe('L');
    expect(WEEKDAY_SHORT[0]).toBe('lun');
    expect(WEEKDAY_SHORT[6]).toBe('dom');
    expect(WEEKDAY_LABELS).toHaveLength(7);
  });
});

describe('claves de dia', () => {
  it('toDayKey usa el formato estable yyyy-MM-dd', () => {
    expect(toDayKey(LUNES)).toBe('2026-09-07');
  });

  it('fromDayKey es su inversa', () => {
    expect(toDayKey(fromDayKey('2026-09-07'))).toBe('2026-09-07');
  });

  it('fromDayKey devuelve el dia a medianoche local', () => {
    const d = fromDayKey('2026-09-07');
    expect(d.getHours()).toBe(0);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(7);
  });

  it('fromDayKey tolera una clave incompleta sin romperse', () => {
    expect(fromDayKey('')).toBeInstanceOf(Date);
  });
});

describe('ISO', () => {
  it('toIso y fromIso conservan el instante', () => {
    expect(fromIso(toIso(LUNES)).getTime()).toBe(LUNES.getTime());
  });

  it('toIso emite UTC, como se guarda en la base', () => {
    expect(toIso(LUNES)).toMatch(/Z$/);
  });
});

describe('rangeForView', () => {
  it('mes abarca semanas completas de lunes a domingo', () => {
    const { from, to } = rangeForView('month', LUNES);
    expect(from.getDay()).toBe(1); // lunes
    expect(to.getDay()).toBe(1); // exclusivo: el lunes siguiente
    expect(from <= LUNES && LUNES < to).toBe(true);
  });

  it('semana empieza en lunes y dura 7 dias', () => {
    const { from, to } = rangeForView('week', LUNES);
    expect(from.getDay()).toBe(1);
    expect((to.getTime() - from.getTime()) / 86_400_000).toBeCloseTo(7, 0);
  });

  it('dia es exactamente [medianoche, medianoche siguiente)', () => {
    const { from, to } = rangeForView('day', LUNES);
    expect(from.getHours()).toBe(0);
    expect(toDayKey(from)).toBe('2026-09-07');
    expect(toDayKey(to)).toBe('2026-09-08');
  });

  it('los tres rangos arrancan a medianoche', () => {
    for (const view of ['month', 'week', 'day'] as const) {
      expect(rangeForView(view, LUNES).from.getHours()).toBe(0);
    }
  });
});

describe('shiftAnchor', () => {
  it('avanza y retrocede un mes', () => {
    expect(shiftAnchor('month', LUNES, 1).getMonth()).toBe(9);
    expect(shiftAnchor('month', LUNES, -1).getMonth()).toBe(7);
  });

  it('avanza una semana', () => {
    expect(toDayKey(shiftAnchor('week', LUNES, 1))).toBe('2026-09-14');
  });

  it('avanza un dia', () => {
    expect(toDayKey(shiftAnchor('day', LUNES, 1))).toBe('2026-09-08');
  });

  it('ir y volver deja la fecha igual', () => {
    for (const view of ['month', 'week', 'day'] as const) {
      const ida = shiftAnchor(view, LUNES, 1);
      expect(toDayKey(shiftAnchor(view, ida, -1))).toBe(toDayKey(LUNES));
    }
  });
});

describe('rejillas', () => {
  it('el grid mensual son siempre 6 semanas', () => {
    const dias = monthGridDays(LUNES);
    expect(dias).toHaveLength(42);
    expect(dias[0]?.getDay()).toBe(1);
  });

  it('el grid mensual no repite dias', () => {
    const claves = monthGridDays(LUNES).map(toDayKey);
    expect(new Set(claves).size).toBe(42);
  });

  it('weekDays devuelve 7 dias consecutivos desde el lunes', () => {
    const dias = weekDays(LUNES);
    expect(dias).toHaveLength(7);
    expect(dias.map((d) => d.getDay())).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});

describe('horas', () => {
  it('nextHalfHour salta a y media si aun no pasa', () => {
    expect(formatTime(nextHalfHour(new Date(2026, 8, 7, 9, 5)))).toBe('09:30');
  });

  it('nextHalfHour salta a la hora en punto si ya paso la media', () => {
    expect(formatTime(nextHalfHour(new Date(2026, 8, 7, 9, 45)))).toBe('10:00');
  });

  it('minutesSinceMidnight cuenta desde las 00:00', () => {
    expect(minutesSinceMidnight(LUNES)).toBe(14 * 60 + 30);
    expect(minutesSinceMidnight(new Date(2026, 8, 7, 0, 0))).toBe(0);
  });

  it('setTimeOfDay y minutesSinceMidnight son inversas', () => {
    expect(minutesSinceMidnight(setTimeOfDay(LUNES, 8 * 60 + 15))).toBe(8 * 60 + 15);
  });

  it('durationMinutes mide entre dos ISO', () => {
    const fin = new Date(LUNES.getTime() + 90 * 60_000);
    expect(durationMinutes(toIso(LUNES), toIso(fin))).toBe(90);
  });

  it('durationMinutes es negativa si el fin precede al inicio', () => {
    const antes = new Date(LUNES.getTime() - 60 * 60_000);
    expect(durationMinutes(toIso(LUNES), toIso(antes))).toBe(-60);
  });
});

describe('formatos es-MX', () => {
  it('titulo de mes capitalizado', () => {
    expect(formatMonthTitle(LUNES)).toBe('Septiembre 2026');
  });

  it('titulo de semana dentro del mismo mes', () => {
    expect(formatWeekTitle(LUNES)).toBe('7 – 13 sep 2026');
  });

  it('titulo de semana a caballo entre dos meses', () => {
    expect(formatWeekTitle(new Date(2026, 8, 30))).toBe('28 sep – 4 oct 2026');
  });

  it('titulo de dia capitalizado', () => {
    expect(formatDayTitle(LUNES)).toBe('Lunes 7 de septiembre');
  });

  it('fecha corta en minusculas', () => {
    expect(formatShortDate(LUNES)).toBe('lun 7 sep');
  });

  it('fecha con ano', () => {
    expect(formatDate(LUNES)).toBe('7 sep 2026');
  });

  it('formatMinutes usa 24 h con dos digitos', () => {
    expect(formatMinutes(0)).toBe('00:00');
    expect(formatMinutes(90)).toBe('01:30');
    expect(formatMinutes(14 * 60 + 5)).toBe('14:05');
  });

  it('formatMinutes envuelve valores fuera del dia', () => {
    expect(formatMinutes(MINUTES_PER_DAY)).toBe('00:00');
    expect(formatMinutes(-30)).toBe('23:30');
  });

  it('formatHourLabel envuelve las horas', () => {
    expect(formatHourLabel(0)).toBe('00:00');
    expect(formatHourLabel(14)).toBe('14:00');
    expect(formatHourLabel(24)).toBe('00:00');
    expect(formatHourLabel(-1)).toBe('23:00');
  });

  it('formatTime toma la hora local del Date', () => {
    expect(formatTime(LUNES)).toBe('14:30');
  });

  it('formatTimeRange une inicio y fin', () => {
    const fin = new Date(LUNES.getTime() + 60 * 60_000);
    expect(formatTimeRange(toIso(LUNES), toIso(fin), false)).toBe('14:30 – 15:30');
  });

  it('formatTimeRange ignora las horas si es de todo el dia', () => {
    expect(formatTimeRange(toIso(LUNES), toIso(LUNES), true)).toBe('Todo el día');
  });
});

describe('clampToDay', () => {
  const dia = new Date(2026, 8, 7);

  it('recorta una actividad contenida en el dia', () => {
    const inicio = new Date(2026, 8, 7, 9, 0);
    const fin = new Date(2026, 8, 7, 10, 30);
    expect(clampToDay(toIso(inicio), toIso(fin), dia)).toEqual({ start: 540, end: 630 });
  });

  it('devuelve null si la actividad es de otro dia', () => {
    const inicio = new Date(2026, 8, 9, 9, 0);
    const fin = new Date(2026, 8, 9, 10, 0);
    expect(clampToDay(toIso(inicio), toIso(fin), dia)).toBeNull();
  });

  it('recorta por la izquierda cuando viene del dia anterior', () => {
    const inicio = new Date(2026, 8, 6, 22, 0);
    const fin = new Date(2026, 8, 7, 2, 0);
    expect(clampToDay(toIso(inicio), toIso(fin), dia)).toEqual({ start: 0, end: 120 });
  });

  it('recorta por la derecha cuando sigue al dia siguiente', () => {
    const inicio = new Date(2026, 8, 7, 22, 0);
    const fin = new Date(2026, 8, 8, 3, 0);
    expect(clampToDay(toIso(inicio), toIso(fin), dia)).toEqual({ start: 1320, end: MINUTES_PER_DAY });
  });

  it('garantiza 15 minutos de alto para que el bloque sea visible', () => {
    const inicio = new Date(2026, 8, 7, 9, 0);
    const fin = new Date(2026, 8, 7, 9, 1);
    expect(clampToDay(toIso(inicio), toIso(fin), dia)).toEqual({ start: 540, end: 555 });
  });
});

describe('findFreeSlots (RF-S9)', () => {
  const dia = new Date(2026, 8, 7);
  const a = (h: number, m = 0) => new Date(2026, 8, 7, h, m);

  it('sin ocupaciones ofrece huecos dentro de la franja util', () => {
    const slots = findFreeSlots([], a(0), new Date(2026, 8, 8), 60);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]?.start.getHours()).toBeGreaterThanOrEqual(7);
    for (const s of slots) expect(s.end.getHours()).toBeLessThanOrEqual(22);
  });

  it('respeta la duracion pedida', () => {
    const slots = findFreeSlots([], a(0), new Date(2026, 8, 8), 90);
    for (const s of slots) {
      expect((s.end.getTime() - s.start.getTime()) / 60_000).toBe(90);
    }
  });

  it('no propone huecos que choquen con lo ocupado', () => {
    const ocupado = [{ start: a(9), end: a(12) }];
    const slots = findFreeSlots(ocupado, a(0), new Date(2026, 8, 8), 60);
    for (const s of slots) {
      const choca = s.start < ocupado[0]!.end && s.end > ocupado[0]!.start;
      expect(choca).toBe(false);
    }
  });

  it('devuelve vacio si el dia esta ocupado por completo', () => {
    const slots = findFreeSlots([{ start: a(0), end: new Date(2026, 8, 8) }], a(0), new Date(2026, 8, 8), 60);
    expect(slots).toEqual([]);
  });

  it('devuelve vacio si la duracion no cabe en la franja', () => {
    const slots = findFreeSlots([], a(0), new Date(2026, 8, 8), 20 * 60);
    expect(slots).toEqual([]);
  });

  it('acepta una franja horaria personalizada', () => {
    const slots = findFreeSlots([], a(0), new Date(2026, 8, 8), 60, 10, 12);
    for (const s of slots) {
      expect(s.start.getHours()).toBeGreaterThanOrEqual(10);
      expect(s.end.getHours()).toBeLessThanOrEqual(12);
    }
  });

  it('recorre varios dias', () => {
    const slots = findFreeSlots([], dia, new Date(2026, 8, 10), 60);
    const dias = new Set(slots.map((s) => toDayKey(s.start)));
    expect(dias.size).toBeGreaterThan(1);
  });
});
