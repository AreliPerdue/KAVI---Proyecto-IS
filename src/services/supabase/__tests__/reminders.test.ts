/**
 * Recordatorios contra Supabase (RF-C9, RF-S12, plan §3.4).
 *
 * `setForActivity` no reescribe la tabla: calcula el delta contra lo existente,
 * borra lo sobrante e inserta lo que falta. Eso evita regenerar ids —y con ellos
 * las copias de cada invitado— en cada guardado.
 */
import { fakeSupabase } from '@/services/supabase/__tests__/fake-supabase';

const mockSb = fakeSupabase();
jest.mock('@/lib/supabase', () => ({ getSupabase: () => mockSb.client }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { supabaseReminders } = require('@/services/supabase/reminders') as typeof import('@/services/supabase/reminders');

beforeEach(() => {
  mockSb.llamadas.length = 0;
  mockSb.responder({ data: [], error: null });
});

describe('listByActivity', () => {
  it('filtra por actividad y ordena por antelacion', async () => {
    await supabaseReminders.listByActivity('a1', 'u1');
    expect(mockSb.argsDe('from')).toEqual(['reminders']);
    expect(mockSb.argsDe('eq')).toEqual(['activity_id', 'a1']);
    expect(mockSb.argsDe('order')).toEqual(['offset_minutes']);
  });

  it('pide las copias de destinatario junto al recordatorio', async () => {
    await supabaseReminders.listByActivity('a1', 'u1');
    expect(String(mockSb.argsDe('select')?.[0])).toContain('reminder_recipients');
  });

  it('resuelve `enabled` desde mi propia copia', async () => {
    mockSb.responder({
      data: [{ id: 'r1', activity_id: 'a1', offset_minutes: 10, created_by: 'u1', created_at: 'x', recipients: [{ user_id: 'u1', enabled: false }] }],
      error: null,
    });

    const r = await supabaseReminders.listByActivity('a1', 'u1');

    expect(r[0]?.enabled).toBe(false);
  });

  it('sin copia propia se asume habilitado', async () => {
    mockSb.responder({
      data: [{ id: 'r1', activity_id: 'a1', offset_minutes: 10, created_by: 'u1', created_at: 'x', recipients: [] }],
      error: null,
    });

    expect((await supabaseReminders.listByActivity('a1', 'u1'))[0]?.enabled).toBe(true);
  });

  it('no filtra por la copia de otra persona', async () => {
    mockSb.responder({
      data: [{ id: 'r1', activity_id: 'a1', offset_minutes: 10, created_by: 'u1', created_at: 'x', recipients: [{ user_id: 'otro', enabled: false }] }],
      error: null,
    });

    expect((await supabaseReminders.listByActivity('a1', 'u1'))[0]?.enabled).toBe(true);
  });

  it('traduce el error', async () => {
    mockSb.responder({ data: null, error: { message: 'x', code: '42501' } });
    await expect(supabaseReminders.listByActivity('a1', 'u1')).rejects.toThrow(/permiso/i);
  });
});

describe('setForActivity', () => {
  it('lee primero lo que ya existe', async () => {
    mockSb.encolar({ data: [], error: null }, { data: null, error: null }, { data: [], error: null });
    await supabaseReminders.setForActivity('a1', 'u1', [10]);
    expect(String(mockSb.argsDe('select')?.[0])).toContain('offset_minutes');
  });

  it('inserta solo los offsets que faltan', async () => {
    mockSb.encolar(
      { data: [{ id: 'r1', offset_minutes: 10 }], error: null },
      { data: null, error: null },
      { data: [], error: null },
    );

    await supabaseReminders.setForActivity('a1', 'u1', [10, 30]);

    const insert = mockSb.argsDe('insert')?.[0] as { offset_minutes: number }[];
    expect(insert.map((r) => r.offset_minutes)).toEqual([30]);
  });

  it('no inserta nada si no falta ninguno', async () => {
    mockSb.encolar({ data: [{ id: 'r1', offset_minutes: 10 }], error: null }, { data: [], error: null });

    await supabaseReminders.setForActivity('a1', 'u1', [10]);

    expect(mockSb.secuencia).not.toContain('insert');
  });

  it('borra por id los que sobran', async () => {
    mockSb.encolar(
      { data: [{ id: 'r1', offset_minutes: 10 }, { id: 'r2', offset_minutes: 60 }], error: null },
      { data: null, error: null },
      { data: [], error: null },
    );

    await supabaseReminders.setForActivity('a1', 'u1', [10]);

    expect(mockSb.argsDe('in')).toEqual(['id', ['r2']]);
  });

  it('una lista vacia borra todos', async () => {
    mockSb.encolar(
      { data: [{ id: 'r1', offset_minutes: 10 }], error: null },
      { data: null, error: null },
      { data: [], error: null },
    );

    await supabaseReminders.setForActivity('a1', 'u1', []);

    expect(mockSb.argsDe('in')).toEqual(['id', ['r1']]);
  });

  it('conserva los offsets que se repiten: no los borra ni reinserta', async () => {
    mockSb.encolar(
      { data: [{ id: 'r1', offset_minutes: 10 }], error: null },
      { data: null, error: null },
      { data: [], error: null },
    );

    await supabaseReminders.setForActivity('a1', 'u1', [10, 30]);

    expect(mockSb.secuencia).not.toContain('delete');
  });

  it('sincroniza las copias con la RPC, incluso si solo se borro', async () => {
    mockSb.encolar(
      { data: [{ id: 'r1', offset_minutes: 10 }], error: null },
      { data: null, error: null },
      { data: [], error: null },
    );

    await supabaseReminders.setForActivity('a1', 'u1', []);

    expect(mockSb.argsDe('rpc')).toEqual(['add_reminder_recipients', { p_activity: 'a1' }]);
  });

  it('propaga el rechazo de la RLS al insertar', async () => {
    mockSb.encolar({ data: [], error: null }, { data: null, error: { message: 'rls', code: '42501' } });
    await expect(supabaseReminders.setForActivity('a1', 'u1', [10])).rejects.toThrow(/permiso/i);
  });
});

describe('setEnabled (RF-S12)', () => {
  it('actualiza solo mi copia', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseReminders.setEnabled('r1', 'u1', false);

    expect(mockSb.argsDe('from')).toEqual(['reminder_recipients']);
    expect(mockSb.argsDe('update')).toEqual([{ enabled: false }]);
    const eqs = mockSb.llamadas.filter((l) => l[0] === 'eq');
    expect(eqs).toEqual([['eq', 'reminder_id', 'r1'], ['eq', 'user_id', 'u1']]);
  });

  it('traduce el error', async () => {
    mockSb.responder({ data: null, error: { message: 'x', code: '42501' } });
    await expect(supabaseReminders.setEnabled('r1', 'u1', true)).rejects.toThrow(/permiso/i);
  });
});

describe('listUpcoming', () => {
  const fila = (over = {}) => ({
    reminder: {
      id: 'r1',
      offset_minutes: 30,
      activity: {
        id: 'a1',
        title: 'Junta',
        start_at: new Date(2026, 8, 7, 10, 0).toISOString(),
        all_day: false,
        owner_id: 'u1',
        owner: { display_name: 'Areli', username: 'areli' },
        ...over,
      },
    },
  });

  it('pide solo las copias habilitadas de esta persona', async () => {
    mockSb.responder({ data: [], error: null });
    await supabaseReminders.listUpcoming('u1', 7);

    const eqs = mockSb.llamadas.filter((l) => l[0] === 'eq');
    expect(eqs).toContainEqual(['eq', 'user_id', 'u1']);
    expect(eqs).toContainEqual(['eq', 'enabled', true]);
  });

  it('acota la ventana al horizonte pedido', async () => {
    mockSb.responder({ data: [], error: null });
    await supabaseReminders.listUpcoming('u1', 7);

    expect(mockSb.secuencia).toContain('gte');
    expect(mockSb.secuencia).toContain('lte');
  });

  it('calcula el disparo restando la antelacion', async () => {
    mockSb.responder({ data: [fila()], error: null });

    const r = await supabaseReminders.listUpcoming('u1', 7);

    const inicio = new Date(2026, 8, 7, 10, 0).getTime();
    expect(new Date(r[0]!.fireAt).getTime()).toBe(inicio - 30 * 60_000);
  });

  it('el cuerpo lleva la hora de inicio', async () => {
    mockSb.responder({ data: [fila()], error: null });
    expect((await supabaseReminders.listUpcoming('u1', 7))[0]?.body).toBe('Empieza a las 10:00');
  });

  it('en todo el dia dice "Hoy"', async () => {
    mockSb.responder({ data: [fila({ all_day: true })], error: null });
    expect((await supabaseReminders.listUpcoming('u1', 7))[0]?.body).toBe('Hoy');
  });

  it('en actividad ajena indica quien la comparte', async () => {
    mockSb.responder({ data: [fila({ owner_id: 'otro' })], error: null });
    expect((await supabaseReminders.listUpcoming('u1', 7))[0]?.body).toContain('Compartida por Areli');
  });

  it('sin nombre visible del dueno cae al username', async () => {
    mockSb.responder({ data: [fila({ owner_id: 'otro', owner: { display_name: null, username: 'pedro' } })], error: null });
    expect((await supabaseReminders.listUpcoming('u1', 7))[0]?.body).toContain('pedro');
  });

  it('sin perfil del dueno usa un texto neutro', async () => {
    mockSb.responder({ data: [fila({ owner_id: 'otro', owner: null })], error: null });
    expect((await supabaseReminders.listUpcoming('u1', 7))[0]?.body).toContain('un contacto');
  });

  it('vienen ordenados por cuando se disparan', async () => {
    const tarde = { reminder: { id: 'r2', offset_minutes: 0, activity: { ...fila().reminder.activity, id: 'a2', start_at: new Date(2026, 8, 9, 10, 0).toISOString() } } };
    mockSb.responder({ data: [tarde, fila()], error: null });

    const fechas = (await supabaseReminders.listUpcoming('u1', 7)).map((x) => x.fireAt);

    expect([...fechas].sort()).toEqual(fechas);
  });
});
