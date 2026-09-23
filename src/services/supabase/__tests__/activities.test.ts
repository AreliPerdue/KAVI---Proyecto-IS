/**
 * Actividades contra Supabase (RF-C1, RF-C5, RF-C8, RF-S5).
 *
 * La decision de diseno que mas importa aqui: la recurrencia se materializa en el
 * cliente con `lib/recurrence`, no con una RPC en PL/pgSQL. Duplicar la expansion
 * de la RRULE en dos lenguajes habria abierto la puerta a que demo y Supabase se
 * comportaran distinto (plan §4).
 */
import { fakeSupabase } from '@/services/supabase/__tests__/fake-supabase';

const mockSb = fakeSupabase();
jest.mock('@/lib/supabase', () => ({ getSupabase: () => mockSb.client }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { supabaseActivities } = require('@/services/supabase/activities') as typeof import('@/services/supabase/activities');

const BASE = new Date(2026, 8, 7, 9, 0, 0, 0);
const fin = (h: number) => new Date(BASE.getTime() + h * 3_600_000);

const fila = (over = {}) => ({
  id: 'a1', owner_id: 'u1', title: 'Junta', description: null, theme_id: null,
  dimension: null, color: null, icon: null,
  start_at: BASE.toISOString(), end_at: fin(1).toISOString(),
  all_day: false, is_gym: false, recurrence_rule: null, recurrence_parent_id: null,
  created_at: 'x', updated_at: 'x', ...over,
});

beforeEach(() => {
  mockSb.llamadas.length = 0;
  mockSb.responder({ data: [], error: null });
});

describe('listByRange', () => {
  it('usa traslape, no contencion: start < to AND end > from (NFR-1)', async () => {
    mockSb.encolar({ data: [], error: null });
    await supabaseActivities.listByRange('u1', 'FROM', 'TO');
    expect(mockSb.argsDe('lt')).toEqual(['start_at', 'TO']);
    expect(mockSb.argsDe('gt')).toEqual(['end_at', 'FROM']);
  });

  it('ordena por hora de inicio', async () => {
    mockSb.encolar({ data: [], error: null });
    await supabaseActivities.listByRange('u1', 'a', 'b');
    expect(mockSb.argsDe('order')).toEqual(['start_at']);
  });

  /**
   * Esta prueba afirmaba lo contrario —que no filtrar era intencionado porque «de
   * eso se encarga la RLS»— y con ello dejaba pasar un fallo real. La RLS permite
   * leer todas las actividades de quien te comparte su calendario en modo detalles,
   * porque lo necesita la pantalla de disponibilidad. Apoyarse solo en ella metía
   * las actividades de los contactos en el calendario propio sin haberlas pedido.
   */
  it('sin nada compartido conmigo pide solo lo mio', async () => {
    mockSb.encolar({ data: [], error: null });
    await supabaseActivities.listByRange('u1', 'a', 'b');
    expect(mockSb.llamadas.some((l) => l[0] === 'eq' && l[1] === 'owner_id' && l[2] === 'u1')).toBe(true);
  });

  it('busca primero que actividades me han compartido y aceptado', async () => {
    mockSb.encolar({ data: [], error: null });
    await supabaseActivities.listByRange('u1', 'a', 'b');
    expect(mockSb.llamadas.some((l) => l[0] === 'from' && l[1] === 'activity_shares')).toBe(true);
    expect(mockSb.llamadas.some((l) => l[0] === 'eq' && l[1] === 'shared_with_id' && l[2] === 'u1')).toBe(true);
    expect(mockSb.llamadas.some((l) => l[0] === 'eq' && l[1] === 'status' && l[2] === 'accepted')).toBe(true);
  });

  it('con actividades compartidas pide las mias O esas, no todo lo legible', async () => {
    mockSb.encolar({ data: [{ activity_id: 'a9' }, { activity_id: 'a8' }], error: null });
    await supabaseActivities.listByRange('u1', 'a', 'b');
    expect(mockSb.argsDe('or')).toEqual(['owner_id.eq.u1,id.in.(a9,a8)']);
  });

  /** `in.()` con la lista vacia no es sintaxis valida en PostgREST. */
  it('sin compartidas no construye un in() vacio', async () => {
    mockSb.encolar({ data: [], error: null });
    await supabaseActivities.listByRange('u1', 'a', 'b');
    expect(mockSb.argsDe('or')).toBeUndefined();
  });

  it('una invitacion pendiente no entra en el calendario', async () => {
    mockSb.encolar({ data: [], error: null });
    await supabaseActivities.listByRange('u1', 'a', 'b');
    // El filtro por `accepted` es lo que la deja fuera; vive en la lista de invitaciones.
    expect(mockSb.llamadas.some((l) => l[0] === 'eq' && l[2] === 'accepted')).toBe(true);
  });

  it('en una actividad propia no anade el nombre del dueno', async () => {
    mockSb.encolar({ data: [], error: null }, { data: [fila()], error: null });
    expect((await supabaseActivities.listByRange('u1', 'a', 'b'))[0]?.owner_name).toBeUndefined();
  });

  it('en una actividad ajena anade el nombre visible (RF-S5)', async () => {
    mockSb.responder({ data: [fila({ owner_id: 'otro', owner: { display_name: 'Ana Torres', username: 'ana' } })], error: null });
    expect((await supabaseActivities.listByRange('u1', 'a', 'b'))[0]?.owner_name).toBe('Ana Torres');
  });

  it('sin nombre visible cae al username', async () => {
    mockSb.responder({ data: [fila({ owner_id: 'otro', owner: { display_name: null, username: 'ana' } })], error: null });
    expect((await supabaseActivities.listByRange('u1', 'a', 'b'))[0]?.owner_name).toBe('ana');
  });

  it('sin perfil del dueno usa un texto neutro', async () => {
    mockSb.responder({ data: [fila({ owner_id: 'otro', owner: null })], error: null });
    expect((await supabaseActivities.listByRange('u1', 'a', 'b'))[0]?.owner_name).toBe('Contacto');
  });

  it('traduce el error', async () => {
    mockSb.responder({ data: null, error: { message: 'x', code: '42501' } });
    await expect(supabaseActivities.listByRange('u1', 'a', 'b')).rejects.toThrow(/permiso/i);
  });
});

describe('getById', () => {
  it('filtra por id', async () => {
    mockSb.responder({ data: fila(), error: null });
    await supabaseActivities.getById('a1');
    expect(mockSb.argsDe('eq')).toEqual(['id', 'a1']);
  });

  it('avisa si ya no existe', async () => {
    mockSb.responder({ data: null, error: null });
    await expect(supabaseActivities.getById('a9')).rejects.toThrow(/ya no existe/i);
  });

  it('traduce el error', async () => {
    mockSb.responder({ data: null, error: { message: 'x' } });
    await expect(supabaseActivities.getById('a1')).rejects.toThrow();
  });
});

describe('create', () => {
  it('marca al dueno y no escribe regla si no hay recurrencia', async () => {
    mockSb.responder({ data: fila(), error: null });

    await supabaseActivities.create('u1', { title: 'Junta', start_at: BASE.toISOString(), end_at: fin(1).toISOString() });

    const insert = mockSb.argsDe('insert')?.[0] as Record<string, unknown>;
    expect(insert.owner_id).toBe('u1');
    expect(insert.recurrence_rule).toBeNull();
  });

  it('con recurrencia guarda la RRULE en la madre', async () => {
    mockSb.encolar(
      { data: fila({ recurrence_rule: 'FREQ=DAILY' }), error: null },
      { data: [], error: null },
      { data: null, error: null },
    );

    await supabaseActivities.create('u1', {
      title: 'Diaria', start_at: BASE.toISOString(), end_at: fin(1).toISOString(),
      recurrence: { freq: 'DAILY', byDay: [], until: '2026-09-11' },
    });

    expect((mockSb.argsDe('insert')?.[0] as { recurrence_rule: string }).recurrence_rule).toContain('FREQ=DAILY');
  });

  it('materializa las instancias en el cliente (plan §4)', async () => {
    mockSb.encolar(
      { data: fila({ recurrence_rule: 'FREQ=DAILY' }), error: null },
      { data: [], error: null },
      { data: null, error: null },
    );

    await supabaseActivities.create('u1', {
      title: 'Diaria', start_at: BASE.toISOString(), end_at: fin(1).toISOString(),
      recurrence: { freq: 'DAILY', byDay: [], until: '2026-09-11' },
    });

    const inserts = mockSb.llamadas.filter((l) => l[0] === 'insert');
    const instancias = inserts.at(-1)?.[1] as { recurrence_parent_id: string; recurrence_rule: null }[];
    expect(instancias.length).toBeGreaterThan(0);
    expect(instancias[0]?.recurrence_parent_id).toBe('a1');
    expect(instancias[0]?.recurrence_rule).toBeNull();
  });

  it('no usa ninguna RPC de recurrencia', async () => {
    mockSb.encolar(
      { data: fila({ recurrence_rule: 'FREQ=DAILY' }), error: null },
      { data: [], error: null },
      { data: null, error: null },
    );

    await supabaseActivities.create('u1', {
      title: 'D', start_at: BASE.toISOString(), end_at: fin(1).toISOString(),
      recurrence: { freq: 'DAILY', byDay: [], until: '2026-09-09' },
    });

    expect(mockSb.llamadas.filter((l) => l[0] === 'rpc')).toHaveLength(0);
  });

  it('no reinserta las instancias que ya existen', async () => {
    const yaExiste = new Date(BASE.getTime() + 86_400_000).toISOString();
    mockSb.encolar(
      { data: fila({ recurrence_rule: 'FREQ=DAILY' }), error: null },
      { data: [{ start_at: yaExiste }], error: null },
      { data: null, error: null },
    );

    await supabaseActivities.create('u1', {
      title: 'D', start_at: BASE.toISOString(), end_at: fin(1).toISOString(),
      recurrence: { freq: 'DAILY', byDay: [], until: '2026-09-09' },
    });

    const instancias = mockSb.llamadas.filter((l) => l[0] === 'insert').at(-1)?.[1] as { start_at: string }[];
    expect(instancias.map((r) => r.start_at)).not.toContain(yaExiste);
  });
});

describe('update con alcance "this"', () => {
  it('actualiza solo esa fila', async () => {
    mockSb.encolar({ data: fila(), error: null }, { data: fila({ title: 'Otro' }), error: null }, { data: null, error: null });

    await supabaseActivities.update('a1', { title: 'Otro' }, 'this');

    expect(mockSb.argsDe('update')).toEqual([{ title: 'Otro' }]);
  });

  it('resincroniza los destinatarios de recordatorios', async () => {
    mockSb.encolar({ data: fila(), error: null }, { data: fila(), error: null }, { data: null, error: null });

    await supabaseActivities.update('a1', { title: 'Otro' }, 'this');

    expect(mockSb.argsDe('rpc')).toEqual(['add_reminder_recipients', { p_activity: 'a1' }]);
  });

  it('una actividad suelta se trata como "this" aunque se pida la serie', async () => {
    mockSb.encolar({ data: fila(), error: null }, { data: fila(), error: null }, { data: null, error: null });

    await supabaseActivities.update('a1', { title: 'Otro' }, 'series');

    expect(mockSb.argsDe('eq')).toEqual(['id', 'a1']);
  });

  it('falla si la actividad ya no existe', async () => {
    mockSb.responder({ data: null, error: null });
    await expect(supabaseActivities.update('a9', { title: 'X' })).rejects.toThrow(/ya no existe/i);
  });
});

describe('remove', () => {
  it('falla si ya no existe', async () => {
    mockSb.responder({ data: null, error: null });
    await expect(supabaseActivities.remove('a9')).rejects.toThrow(/ya no existe/i);
  });

  it('una actividad suelta se borra por id', async () => {
    mockSb.encolar({ data: fila(), error: null }, { data: null, error: null });

    await supabaseActivities.remove('a1');

    expect(mockSb.secuencia).toContain('delete');
  });
});

describe('extendRecurrenceHorizon', () => {
  it('no hace nada si no hay series', async () => {
    mockSb.responder({ data: [], error: null });
    await supabaseActivities.extendRecurrenceHorizon('u1');
    expect(mockSb.secuencia).not.toContain('insert');
  });
});

describe('update con alcance "series"', () => {
  /** Secuencia: leer la actual, leer la madre, actualizarla, borrar futuras, leer existentes, insertar, releer. */
  const secuenciaSerie = () => {
    mockSb.encolar(
      { data: fila({ recurrence_rule: 'FREQ=DAILY' }), error: null },   // fetchOne
      { data: fila({ recurrence_rule: 'FREQ=DAILY' }), error: null },   // update de la madre
      { data: null, error: null },                                       // delete de futuras
      { data: [], error: null },                                         // instancias existentes
      { data: null, error: null },                                       // insert de nuevas
      { data: fila(), error: null },                                     // relectura
    );
  };

  it('actualiza la madre, no la instancia', async () => {
    secuenciaSerie();

    await supabaseActivities.update('a1', { title: 'Nuevo' }, 'series');

    const eqs = mockSb.llamadas.filter((l) => l[0] === 'eq');
    expect(eqs.some((e) => e[1] === 'id' && e[2] === 'a1')).toBe(true);
  });

  it('borra las instancias futuras antes de regenerarlas', async () => {
    secuenciaSerie();

    await supabaseActivities.update('a1', { title: 'Nuevo' }, 'series');

    expect(mockSb.secuencia).toContain('delete');
    expect(mockSb.llamadas.filter((l) => l[0] === 'eq')).toContainEqual(['eq', 'recurrence_parent_id', 'a1']);
  });

  it('acota el borrado a las que empiezan desde la ocurrencia editada', async () => {
    secuenciaSerie();

    await supabaseActivities.update('a1', { title: 'Nuevo' }, 'series');

    expect(mockSb.secuencia).toContain('gte');
  });

  it('conserva la regla cuando el parche no la menciona', async () => {
    secuenciaSerie();

    await supabaseActivities.update('a1', { title: 'Nuevo' }, 'series');

    const patch = mockSb.llamadas.find((l) => l[0] === 'update')?.[1] as { recurrence_rule: string | null };
    expect(patch.recurrence_rule).toContain('FREQ=DAILY');
  });

  it('quitar la recurrencia deja la regla en null', async () => {
    mockSb.encolar(
      { data: fila({ recurrence_rule: 'FREQ=DAILY' }), error: null },
      { data: fila(), error: null },
      { data: null, error: null },
      { data: fila(), error: null },
    );

    await supabaseActivities.update('a1', { recurrence: null }, 'series');

    const patch = mockSb.llamadas.find((l) => l[0] === 'update')?.[1] as { recurrence_rule: string | null };
    expect(patch.recurrence_rule).toBeNull();
  });
});

describe('remove con alcance "series"', () => {
  it('borra la madre y sus instancias', async () => {
    mockSb.encolar(
      { data: fila({ recurrence_rule: 'FREQ=DAILY' }), error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    await supabaseActivities.remove('a1', 'series');

    expect(mockSb.secuencia.filter((m) => m === 'delete').length).toBeGreaterThan(0);
  });

  it('falla si la actividad ya no existe', async () => {
    mockSb.responder({ data: null, error: null });
    await expect(supabaseActivities.remove('a9', 'series')).rejects.toThrow(/ya no existe/i);
  });
});

describe('extendRecurrenceHorizon', () => {
  it('consulta las series de esa persona', async () => {
    mockSb.responder({ data: [], error: null });

    await supabaseActivities.extendRecurrenceHorizon('u1');

    expect(mockSb.argsDe('from')).toEqual(['activities']);
  });

  it('con una serie vigente no reinserta nada', async () => {
    const futuro = new Date(Date.now() + 80 * 86_400_000).toISOString();
    mockSb.encolar(
      { data: [fila({ recurrence_rule: 'FREQ=DAILY' })], error: null },
      { data: [{ start_at: futuro }], error: null },
    );

    await supabaseActivities.extendRecurrenceHorizon('u1');

    expect(mockSb.secuencia).not.toContain('insert');
  });
});
