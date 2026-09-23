/**
 * Traduccion entre la actividad guardada y el formulario (RF-C5, RF-T1, RF-T6).
 *
 * Esta capa es donde se cruzan las dos representaciones del tiempo que usa KAVI: la
 * base guarda instantes en UTC y el formulario trabaja con "dia + minutos desde la
 * medianoche" en hora local. Los casos raros —una actividad que cruza la medianoche,
 * una de todo el dia, una que empieza a las 23:50— viven aqui, no en la UI.
 */
import { defaultFormValues, activityToFormValues, formValuesToInput } from '@/components/calendar/activity-form-mapping';
import { fromIso, minutesSinceMidnight, toDayKey } from '@/lib/dates';
import type { ActivityFormValues } from '@/lib/schemas/activity';
import type { Activity, Theme } from '@/types/domain';

const actividad = (over: Partial<Activity> = {}): Activity =>
  ({
    id: 'a1', owner_id: 'u1', title: 'Junta', description: null, theme_id: null,
    dimension: null, color: null, icon: null, all_day: false, is_gym: false,
    recurrence_rule: null, recurrence_parent_id: null, created_at: 'x', updated_at: 'x',
    start_at: new Date(2026, 8, 7, 9, 30).toISOString(),
    end_at: new Date(2026, 8, 7, 10, 30).toISOString(),
    ...over,
  }) as Activity;

const tema: Theme = {
  id: 't1', name: 'Gimnasio', dimension: 'fisica', color: '#4CAF50', icon: 'dumbbell',
  owner_id: null, is_system: true, created_at: 'x',
} as Theme;

const valores = (over: Partial<ActivityFormValues> = {}): ActivityFormValues => ({
  title: 'Junta', description: '', dayKey: '2026-09-07',
  startMinutes: 570, endMinutes: 630,
  allDay: false, isGym: false, isPrivate: false, shareWith: 'none', shareContactIds: [],
  themeId: null, recurrence: null, reminderOffsets: [],
  ...over,
});

describe('valores por defecto', () => {
  it('propone una hora de duracion', async () => {
    const v = defaultFormValues();
    expect(v.endMinutes - v.startMinutes).toBe(60);
  });

  it('arranca vacio y sin nada activado', async () => {
    const v = defaultFormValues();
    expect(v.title).toBe('');
    expect(v.description).toBe('');
    expect(v.allDay).toBe(false);
    expect(v.isGym).toBe(false);
    expect(v.themeId).toBeNull();
    expect(v.recurrence).toBeNull();
    expect(v.reminderOffsets).toEqual([]);
  });

  it('respeta el dia, la hora y el titulo que le pasen', async () => {
    const v = defaultFormValues({ dayKey: '2026-12-25', startMinutes: 600, endMinutes: 660, title: 'Cena' });
    expect(v).toMatchObject({ dayKey: '2026-12-25', startMinutes: 600, endMinutes: 660, title: 'Cena' });
  });

  /**
   * 1380 = 23:00. Es el ultimo inicio que deja caber una hora dentro del mismo dia,
   * asi que una actividad creada a las 23:50 se recoloca en vez de desbordar.
   */
  it('no deja empezar tan tarde que la actividad se salga del dia', async () => {
    expect(defaultFormValues({ startMinutes: 1430 }).startMinutes).toBe(1380);
  });

  it('el final nunca pasa de la medianoche', async () => {
    expect(defaultFormValues({ startMinutes: 1380 }).endMinutes).toBe(1440);
  });

  it('un fin explicito por encima de la medianoche tambien se recorta', async () => {
    expect(defaultFormValues({ startMinutes: 600, endMinutes: 1500 }).endMinutes).toBe(1440);
  });
});

describe('de actividad a formulario', () => {
  it('traduce el instante UTC a dia y minutos locales', async () => {
    const v = activityToFormValues(actividad());
    expect(v.dayKey).toBe('2026-09-07');
    expect(v.startMinutes).toBe(9 * 60 + 30);
    expect(v.endMinutes).toBe(10 * 60 + 30);
  });

  it('una descripcion ausente llega como cadena vacia, no como null', async () => {
    expect(activityToFormValues(actividad({ description: null })).description).toBe('');
  });

  it('conserva la descripcion cuando la hay', async () => {
    expect(activityToFormValues(actividad({ description: 'Traer laptop' })).description).toBe('Traer laptop');
  });

  it('arrastra tema, gimnasio y todo el dia', async () => {
    const v = activityToFormValues(actividad({ theme_id: 't1', is_gym: true, all_day: true }));
    expect(v).toMatchObject({ themeId: 't1', isGym: true, allDay: true });
  });

  /**
   * Una actividad que termina al dia siguiente no cabe en un formulario de un solo
   * dia, asi que el fin se ancla a la medianoche en vez de mostrar una hora que
   * pertenece a otra fecha.
   */
  it('si cruza la medianoche el fin se ancla a las 24:00', async () => {
    const v = activityToFormValues(actividad({
      start_at: new Date(2026, 8, 7, 22).toISOString(),
      end_at: new Date(2026, 8, 8, 2).toISOString(),
    }));
    expect(v.dayKey).toBe('2026-09-07');
    expect(v.endMinutes).toBe(1440);
  });

  it('lee la recurrencia de la propia actividad por omision', async () => {
    const v = activityToFormValues(actividad({ recurrence_rule: 'FREQ=DAILY' }));
    expect(v.recurrence).toMatchObject({ freq: 'DAILY' });
  });

  /**
   * Al editar una ocurrencia suelta la regla vive en la actividad madre, no en ella:
   * por eso se puede pasar aparte.
   */
  it('acepta la regla de la serie por separado', async () => {
    const v = activityToFormValues(actividad({ recurrence_rule: null }), 'FREQ=WEEKLY;BYDAY=MO');
    expect(v.recurrence).toMatchObject({ freq: 'WEEKLY', byDay: [0] });
  });

  it('sin regla en ningun lado la recurrencia es nula', async () => {
    expect(activityToFormValues(actividad(), null).recurrence).toBeNull();
  });

  it('los recordatorios se inyectan desde fuera', async () => {
    expect(activityToFormValues(actividad(), null, [10, 60]).reminderOffsets).toEqual([10, 60]);
  });
});

describe('de formulario a alta', () => {
  it('convierte dia y minutos a instantes UTC', async () => {
    const input = formValuesToInput(valores(), null);
    expect(toDayKey(fromIso(input.start_at))).toBe('2026-09-07');
    expect(minutesSinceMidnight(fromIso(input.start_at))).toBe(570);
    expect(minutesSinceMidnight(fromIso(input.end_at))).toBe(630);
  });

  it('una descripcion vacia se guarda como null, no como cadena', async () => {
    expect(formValuesToInput(valores({ description: '' }), null).description).toBeNull();
  });

  it('una descripcion con texto se conserva', async () => {
    expect(formValuesToInput(valores({ description: 'Traer laptop' }), null).description).toBe('Traer laptop');
  });

  /**
   * El estilo del tema se copia al alta en vez de referenciarse (RF-T6): si despues
   * alguien edita el tema, las actividades ya creadas no cambian de color.
   */
  it('copia el estilo del tema en la actividad', async () => {
    const input = formValuesToInput(valores(), tema);
    expect(input).toMatchObject({ theme_id: 't1', dimension: 'fisica', color: '#4CAF50', icon: 'dumbbell' });
  });

  it('sin tema la actividad nace neutra (RF-T4)', async () => {
    const input = formValuesToInput(valores(), null);
    expect(input).toMatchObject({ theme_id: null, dimension: null, color: null, icon: null });
  });

  it('todo el dia ocupa de medianoche a medianoche e ignora las horas del formulario', async () => {
    const input = formValuesToInput(valores({ allDay: true, startMinutes: 570, endMinutes: 630 }), null);
    expect(minutesSinceMidnight(fromIso(input.start_at))).toBe(0);
    expect(toDayKey(fromIso(input.start_at))).toBe('2026-09-07');
    expect(toDayKey(fromIso(input.end_at))).toBe('2026-09-08');
    expect(input.all_day).toBe(true);
  });

  it('arrastra titulo, gimnasio y recurrencia', async () => {
    const input = formValuesToInput(valores({ title: 'Pierna', isGym: true, recurrence: { freq: 'WEEKLY', byDay: [0, 2], until: null } }), null);
    expect(input.title).toBe('Pierna');
    expect(input.is_gym).toBe(true);
    expect(input.recurrence).toMatchObject({ freq: 'WEEKLY', byDay: [0, 2] });
  });
});

describe('ida y vuelta', () => {
  it('actividad -> formulario -> alta conserva las horas', async () => {
    const original = actividad();
    const input = formValuesToInput(activityToFormValues(original), null);
    expect(input.start_at).toBe(original.start_at);
    expect(input.end_at).toBe(original.end_at);
  });
});
