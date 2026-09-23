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
  getTimeFormat,
  MINUTES_PER_DAY,
  minutesSinceMidnight,
  monthGridDays,
  nextHalfHour,
  rangeForView,
  setTimeFormat,
  setTimeOfDay,
  shiftAnchor,
  SLOT_MINUTES,
  SLOTS_PER_DAY,
  toDayKey,
  toIso,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
  weekDays,
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

/**
 * Formato de reloj (preferencia del usuario).
 *
 * La preferencia vive en el modulo, asi que cada prueba la devuelve a 24 h al
 * terminar: si se filtrara, las demas pruebas de este archivo empezarian a ver
 * horas en 12 h sin haberlo pedido.
 */
describe('formato de 12 y 24 horas', () => {
  afterEach(() => setTimeFormat('24h'));

  it('por omision el reloj es de 24 h', () => {
    expect(getTimeFormat()).toBe('24h');
    expect(formatMinutes(14 * 60 + 30)).toBe('14:30');
  });

  it('en 12 h la tarde lleva p.m.', () => {
    setTimeFormat('12h');
    expect(formatMinutes(14 * 60 + 30)).toBe('2:30 p.m.');
  });

  it('en 12 h la manana lleva a.m.', () => {
    setTimeFormat('12h');
    expect(formatMinutes(9 * 60 + 5)).toBe('9:05 a.m.');
  });

  /** Las 00:00 son las 12 a.m., no las 0 a.m. */
  it('la medianoche es 12 a.m.', () => {
    setTimeFormat('12h');
    expect(formatMinutes(0)).toBe('12:00 a.m.');
  });

  /** Y las 12:00 siguen siendo las 12, pero p.m. */
  it('el mediodia es 12 p.m.', () => {
    setTimeFormat('12h');
    expect(formatMinutes(12 * 60)).toBe('12:00 p.m.');
  });

  it('las 12:59 aun son p.m., no a.m.', () => {
    setTimeFormat('12h');
    expect(formatMinutes(12 * 60 + 59)).toBe('12:59 p.m.');
  });

  it('las 23:59 son las 11:59 p.m.', () => {
    setTimeFormat('12h');
    expect(formatMinutes(23 * 60 + 59)).toBe('11:59 p.m.');
  });

  it('los minutos siguen llevando dos digitos', () => {
    setTimeFormat('12h');
    expect(formatMinutes(13 * 60 + 5)).toBe('1:05 p.m.');
  });

  /** La columna de horas del timeline es estrecha: el ":00" no aporta nada. */
  it('la etiqueta de hora omite los minutos en 12 h', () => {
    setTimeFormat('12h');
    expect(formatHourLabel(14)).toBe('2 p.m.');
    expect(formatHourLabel(0)).toBe('12 a.m.');
    expect(formatHourLabel(12)).toBe('12 p.m.');
  });

  it('en 24 h la etiqueta conserva los minutos', () => {
    expect(formatHourLabel(14)).toBe('14:00');
  });

  it('formatTime respeta la preferencia', () => {
    setTimeFormat('12h');
    expect(formatTime(new Date(2026, 8, 7, 18, 45))).toBe('6:45 p.m.');
  });

  it('el rango de horas tambien', () => {
    setTimeFormat('12h');
    const inicio = new Date(2026, 8, 7, 9).toISOString();
    const fin = new Date(2026, 8, 7, 10, 30).toISOString();
    expect(formatTimeRange(inicio, fin, false)).toBe('9:00 a.m. – 10:30 a.m.');
  });

  it('una actividad de todo el dia no cambia con el reloj', () => {
    setTimeFormat('12h');
    expect(formatTimeRange('x', 'y', true)).toBe('Todo el día');
  });

  it('cambiar de vuelta a 24 h restaura el formato', () => {
    setTimeFormat('12h');
    setTimeFormat('24h');
    expect(formatMinutes(14 * 60 + 30)).toBe('14:30');
  });
});
