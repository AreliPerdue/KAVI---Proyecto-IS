/**
 * Recurrencia (RF-C8, plan §4). Es la logica mas delicada del calendario:
 * un error aqui materializa ocurrencias de mas o de menos en la base.
 */
import { addDays, startOfDay } from 'date-fns';

import { toIso } from '@/lib/dates';
import {
  describeRecurrence,
  expandOccurrences,
  parseRRule,
  toRRule,
  type RecurrenceRule,
} from '@/lib/recurrence';

const rule = (over: Partial<RecurrenceRule> = {}): RecurrenceRule => ({
  freq: 'DAILY',
  byDay: [],
  until: null,
  ...over,
});

/** Lunes 7 de septiembre de 2026, 09:00 hora local. */
const MONDAY = new Date(2026, 8, 7, 9, 0, 0, 0);

describe('toRRule', () => {
  it('serializa la frecuencia sola', () => {
    expect(toRRule(rule({ freq: 'DAILY' }))).toBe('FREQ=DAILY');
    expect(toRRule(rule({ freq: 'MONTHLY' }))).toBe('FREQ=MONTHLY');
  });

  it('traduce byDay a codigos RFC 5545 con lunes = 0', () => {
    expect(toRRule(rule({ freq: 'WEEKLY', byDay: [0, 2, 4] }))).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
  });

  it('ordena byDay aunque llegue desordenado', () => {
    expect(toRRule(rule({ freq: 'WEEKLY', byDay: [4, 0, 2] }))).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
  });

  it('omite BYDAY cuando no es semanal', () => {
    expect(toRRule(rule({ freq: 'DAILY', byDay: [1, 3] }))).toBe('FREQ=DAILY');
  });

  it('escribe UNTIL sin guiones', () => {
    expect(toRRule(rule({ until: '2026-09-30' }))).toBe('FREQ=DAILY;UNTIL=20260930');
  });
});

describe('parseRRule', () => {
  it('devuelve null sin texto', () => {
    expect(parseRRule(null)).toBeNull();
    expect(parseRRule(undefined)).toBeNull();
    expect(parseRRule('')).toBeNull();
  });

  it('devuelve null con una frecuencia que no soportamos', () => {
    expect(parseRRule('FREQ=YEARLY')).toBeNull();
    expect(parseRRule('BYDAY=MO')).toBeNull();
  });

  it('es la inversa de toRRule', () => {
    for (const original of [
      rule({ freq: 'DAILY' }),
      rule({ freq: 'MONTHLY', until: '2026-12-01' }),
      rule({ freq: 'WEEKLY', byDay: [0, 3], until: '2026-10-15' }),
    ]) {
      expect(parseRRule(toRRule(original))).toEqual(original);
    }
  });

  it('ignora codigos de dia desconocidos', () => {
    expect(parseRRule('FREQ=WEEKLY;BYDAY=MO,XX,FR')?.byDay).toEqual([0, 4]);
  });
});

describe('expandOccurrences', () => {
  it('excluye la madre y devuelve una ocurrencia por dia', () => {
    const result = expandOccurrences(rule(), toIso(MONDAY), MONDAY, addDays(startOfDay(MONDAY), 5));
    expect(result).toHaveLength(4);
    expect(result.map((d) => d.getDate())).toEqual([8, 9, 10, 11]);
  });

  it('conserva la hora del dia de la madre', () => {
    const result = expandOccurrences(rule(), toIso(MONDAY), MONDAY, addDays(startOfDay(MONDAY), 3));
    for (const date of result) {
      expect(date.getHours()).toBe(9);
      expect(date.getMinutes()).toBe(0);
    }
  });

  it('semanal solo cae en los dias pedidos', () => {
    // Lunes y miercoles durante dos semanas.
    const result = expandOccurrences(
      rule({ freq: 'WEEKLY', byDay: [0, 2] }),
      toIso(MONDAY),
      MONDAY,
      addDays(startOfDay(MONDAY), 14),
    );
    // getDay: 1 = lunes, 3 = miercoles.
    expect(new Set(result.map((d) => d.getDay()))).toEqual(new Set([1, 3]));
  });

  it('semanal sin byDay repite el dia de la madre', () => {
    const result = expandOccurrences(
      rule({ freq: 'WEEKLY' }),
      toIso(MONDAY),
      MONDAY,
      addDays(startOfDay(MONDAY), 21),
    );
    expect(result.every((d) => d.getDay() === 1)).toBe(true);
  });

  it('UNTIL corta la serie e incluye ese mismo dia', () => {
    const result = expandOccurrences(
      rule({ until: '2026-09-09' }),
      toIso(MONDAY),
      MONDAY,
      addDays(startOfDay(MONDAY), 60),
    );
    expect(result.map((d) => d.getDate())).toEqual([8, 9]);
  });

  it('no devuelve nada si el horizonte no pasa de la madre', () => {
    expect(expandOccurrences(rule(), toIso(MONDAY), MONDAY, MONDAY)).toEqual([]);
  });

  it('mensual salta los meses que no tienen ese dia', () => {
    // 31 de enero: febrero, abril, junio... no tienen 31.
    const jan31 = new Date(2026, 0, 31, 8, 0, 0, 0);
    const result = expandOccurrences(rule({ freq: 'MONTHLY' }), toIso(jan31), jan31, new Date(2026, 6, 1));
    expect(result.map((d) => d.getMonth())).toEqual([2, 4]); // marzo y mayo
  });
});

describe('describeRecurrence', () => {
  it('describe la ausencia de regla', () => {
    expect(describeRecurrence(null)).toBe('No se repite');
  });

  it('describe cada frecuencia en es-MX', () => {
    expect(describeRecurrence(rule({ freq: 'DAILY' }))).toBe('Cada día');
    expect(describeRecurrence(rule({ freq: 'MONTHLY' }))).toBe('Cada mes');
    expect(describeRecurrence(rule({ freq: 'WEEKLY' }))).toBe('Cada semana');
    expect(describeRecurrence(rule({ freq: 'WEEKLY', byDay: [0, 4] }))).toBe('Cada semana: lun, vie');
  });

  it('anade el limite en formato dd/mm/aaaa', () => {
    expect(describeRecurrence(rule({ until: '2026-09-30' }))).toBe('Cada día · hasta 30/09/2026');
  });
});
