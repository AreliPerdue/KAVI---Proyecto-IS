/**
 * Contactos, shares y disponibilidad contra Supabase (spec 06).
 *
 * El hilo conductor: aqui el cliente hace muy poco a proposito. Revocar shares al
 * romper un contacto lo hace un trigger, heredar recordatorios al aceptar tambien,
 * y la disponibilidad va por RPC porque con visibilidad `busy` las filas de
 * `activities` ni siquiera son visibles por RLS.
 */
import { fakeSupabase } from '@/services/supabase/__tests__/fake-supabase';

const mockSb = fakeSupabase();
jest.mock('@/lib/supabase', () => ({ getSupabase: () => mockSb.client }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const shared = require('@/services/supabase/shared') as typeof import('@/services/supabase/shared');
const { supabaseConnections, supabaseShares, supabaseAvailability } = shared;

const perfil = (id: string, over = {}) => ({ id, username: id, display_name: null, avatar_url: null, created_at: 'x', role: 'user', ...over });

beforeEach(() => {
  mockSb.llamadas.length = 0;
  mockSb.responder({ data: [], error: null });
});

describe('searchUsers (RF-S1)', () => {
  it('va por RPC, no leyendo profiles', async () => {
    await supabaseConnections.searchUsers('u1', 'ana');
    expect(mockSb.argsDe('rpc')?.[0]).toBe('search_profiles');
    expect(mockSb.secuencia).not.toContain('from');
  });

  it('pasa el termino y el tope de 8', async () => {
    await supabaseConnections.searchUsers('u1', 'ana');
    expect(mockSb.argsDe('rpc')?.[1]).toEqual({ p_query: 'ana', p_limit: 8 });
  });

  it('una busqueda vacia no consulta', async () => {
    await supabaseConnections.searchUsers('u1', '   ');
    expect(mockSb.llamadas).toHaveLength(0);
  });

  it('solo una arroba tampoco consulta', async () => {
    await supabaseConnections.searchUsers('u1', '@');
    expect(mockSb.llamadas).toHaveLength(0);
  });

  it('sin resultados devuelve lista vacia', async () => {
    mockSb.responder({ data: null, error: null });
    expect(await supabaseConnections.searchUsers('u1', 'zzz')).toEqual([]);
  });
});

describe('listContacts (RF-S3)', () => {
  const conexion = (over = {}) => ({
    id: 'c1', requester_id: 'u1', addressee_id: 'u2', status: 'accepted', created_at: 'x', responded_at: 'x',
    requester: perfil('u1'), addressee: perfil('u2', { display_name: 'Ana' }), ...over,
  });

  it('clasifica una solicitud que envie como saliente', async () => {
    mockSb.encolar(
      { data: [conexion({ status: 'pending' })], error: null },
      { data: [], error: null },
      { data: [], error: null },
    );
    expect((await supabaseConnections.listContacts('u1'))[0]?.kind).toBe('outgoing');
  });

  it('clasifica una solicitud que recibi como entrante', async () => {
    mockSb.encolar(
      { data: [conexion({ status: 'pending', requester_id: 'u2', addressee_id: 'u1' })], error: null },
      { data: [], error: null },
      { data: [], error: null },
    );
    expect((await supabaseConnections.listContacts('u1'))[0]?.kind).toBe('incoming');
  });

  it('muestra el perfil de la otra persona, no el mio', async () => {
    mockSb.encolar({ data: [conexion()], error: null }, { data: [], error: null }, { data: [], error: null });
    expect((await supabaseConnections.listContacts('u1'))[0]?.profile.id).toBe('u2');
  });

  it('separa lo que yo comparto de lo que me comparten', async () => {
    mockSb.encolar(
      { data: [conexion()], error: null },
      { data: [{ owner_id: 'u2', shared_with_id: 'u1', visibility: 'busy' }], error: null },
      { data: [], error: null },
    );
    const c = (await supabaseConnections.listContacts('u1'))[0];
    expect(c?.theirCalendarVisibility).toBe('busy');
    expect(c?.myCalendarVisibility).toBeNull();
  });

  it('incluye el color asignado a mano (RF-S15)', async () => {
    mockSb.encolar(
      { data: [conexion()], error: null },
      { data: [], error: null },
      { data: [{ contact_id: 'u2', color: '#4C8DFF' }], error: null },
    );
    expect((await supabaseConnections.listContacts('u1'))[0]?.color).toBe('#4C8DFF');
  });

  it('los colores se piden solo los mios', async () => {
    mockSb.encolar({ data: [], error: null }, { data: [], error: null }, { data: [], error: null });
    await supabaseConnections.listContacts('u1');
    expect(mockSb.llamadas.filter((l) => l[0] === 'eq')).toContainEqual(['eq', 'owner_id', 'u1']);
  });
});

describe('request', () => {
  it('rechaza enviarse una solicitud a uno mismo sin tocar la base', async () => {
    await expect(supabaseConnections.request('u1', 'u1')).rejects.toThrow(/a ti mismo/i);
    expect(mockSb.llamadas).toHaveLength(0);
  });

  it('inserta la conexion', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseConnections.request('u1', 'u2');
    expect(mockSb.argsDe('insert')).toEqual([{ requester_id: 'u1', addressee_id: 'u2' }]);
  });

  it('el indice unico cubre las dos direcciones y se explica en espanol', async () => {
    mockSb.responder({ data: null, error: { message: 'dup', code: '23505' } });
    await expect(supabaseConnections.request('u1', 'u2')).rejects.toThrow(/ya hay una solicitud o un contacto/i);
  });

  it('otro error se traduce igual', async () => {
    mockSb.responder({ data: null, error: { message: 'x', code: '42501' } });
    await expect(supabaseConnections.request('u1', 'u2')).rejects.toThrow(/permiso/i);
  });
});

describe('accept', () => {
  it('solo actualiza si soy la destinataria', async () => {
    mockSb.responder({ data: [{ id: 'c1' }], error: null });
    await supabaseConnections.accept('u1', 'c1');

    const eqs = mockSb.llamadas.filter((l) => l[0] === 'eq');
    expect(eqs).toContainEqual(['eq', 'id', 'c1']);
    expect(eqs).toContainEqual(['eq', 'addressee_id', 'u1']);
  });

  it('marca la fecha de respuesta', async () => {
    mockSb.responder({ data: [{ id: 'c1' }], error: null });
    await supabaseConnections.accept('u1', 'c1');
    const patch = mockSb.argsDe('update')?.[0] as { status: string; responded_at: string };
    expect(patch.status).toBe('accepted');
    expect(patch.responded_at).toEqual(expect.any(String));
  });

  it('si no actualizo ninguna fila, la solicitud ya no esta', async () => {
    mockSb.responder({ data: [], error: null });
    await expect(supabaseConnections.accept('u1', 'c1')).rejects.toThrow(/ya no está disponible/i);
  });
});

describe('remove (RF-S2)', () => {
  it('borra la conexion y deja la cascada al trigger', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseConnections.remove('u1', 'c1');

    expect(mockSb.secuencia).toContain('delete');
    // No toca calendar_shares ni activity_shares: eso lo hace connections_revoke_shares.
    expect(mockSb.llamadas.filter((l) => l[0] === 'from')).toHaveLength(1);
  });
});

describe('setCalendarVisibility (RF-S7)', () => {
  it('compartir hace upsert sobre el par', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseConnections.setCalendarVisibility('u1', 'u2', 'details');

    const [fila, opciones] = mockSb.argsDe('upsert') as [Record<string, unknown>, Record<string, unknown>];
    expect(fila.visibility).toBe('details');
    expect(opciones.onConflict).toBe('owner_id,shared_with_id');
  });

  it('null borra la fila en vez de guardar un estado', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseConnections.setCalendarVisibility('u1', 'u2', null);

    expect(mockSb.secuencia).toContain('delete');
    expect(mockSb.secuencia).not.toContain('upsert');
  });
});

describe('setContactColor (RF-S15)', () => {
  it('guardar hace upsert', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseConnections.setContactColor('u1', 'u2', '#B06BFF');
    expect((mockSb.argsDe('upsert') as [Record<string, unknown>])[0].color).toBe('#B06BFF');
  });

  it('null vuelve a automatico borrando la fila', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseConnections.setContactColor('u1', 'u2', null);
    expect(mockSb.secuencia).toContain('delete');
  });
});

describe('shareActivity (RF-S4)', () => {
  it('sin contactos no consulta', async () => {
    await supabaseShares.shareActivity('u1', 'a1', []);
    expect(mockSb.llamadas).toHaveLength(0);
  });

  it('upsert deja pendiente a quien habia rechazado', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseShares.shareActivity('u1', 'a1', ['u2', 'u3']);

    const [filas, opciones] = mockSb.argsDe('upsert') as [{ status: string }[], Record<string, unknown>];
    expect(filas).toHaveLength(2);
    expect(filas[0]?.status).toBe('pending');
    expect(opciones.onConflict).toBe('activity_id,shared_with_id');
  });
});

describe('listInvitations (RF-S5)', () => {
  const invitacion = (start_at: string) => ({
    id: 's1', activity_id: 'a1', shared_with_id: 'u1', status: 'pending', created_at: 'x',
    activity: { id: 'a1', title: 'Gym', start_at, owner: perfil('u2') },
  });

  it('pide solo las pendientes dirigidas a mi', async () => {
    await supabaseShares.listInvitations('u1');
    const eqs = mockSb.llamadas.filter((l) => l[0] === 'eq');
    expect(eqs).toContainEqual(['eq', 'shared_with_id', 'u1']);
    expect(eqs).toContainEqual(['eq', 'status', 'pending']);
  });

  it('separa share, actividad y dueno', async () => {
    mockSb.responder({ data: [invitacion('2026-09-07T10:00:00Z')], error: null });
    const inv = (await supabaseShares.listInvitations('u1'))[0];
    expect(inv?.share.id).toBe('s1');
    expect(inv?.activity.title).toBe('Gym');
    expect(inv?.owner.id).toBe('u2');
  });

  it('ordena por la fecha de la actividad', async () => {
    mockSb.responder({
      data: [invitacion('2026-09-09T10:00:00Z'), invitacion('2026-09-07T10:00:00Z')],
      error: null,
    });
    const fechas = (await supabaseShares.listInvitations('u1')).map((i) => i.activity.start_at);
    expect([...fechas].sort()).toEqual(fechas);
  });
});

describe('respond', () => {
  it('aceptar marca accepted solo en mi invitacion', async () => {
    mockSb.responder({ data: [{ id: 's1' }], error: null });
    await supabaseShares.respond('u1', 's1', true);

    expect(mockSb.argsDe('update')).toEqual([{ status: 'accepted' }]);
    expect(mockSb.llamadas.filter((l) => l[0] === 'eq')).toContainEqual(['eq', 'shared_with_id', 'u1']);
  });

  it('rechazar marca declined', async () => {
    mockSb.responder({ data: [{ id: 's1' }], error: null });
    await supabaseShares.respond('u1', 's1', false);
    expect(mockSb.argsDe('update')).toEqual([{ status: 'declined' }]);
  });

  it('si no actualizo nada, la invitacion ya no esta', async () => {
    mockSb.responder({ data: [], error: null });
    await expect(supabaseShares.respond('u1', 's1', true)).rejects.toThrow(/ya no está disponible/i);
  });
});

describe('removeShare (RF-S6)', () => {
  it('borra el share y resincroniza los recordatorios', async () => {
    mockSb.encolar({ data: { activity_id: 'a1' }, error: null }, { data: null, error: null }, { data: null, error: null });

    await supabaseShares.removeShare('u1', 's1');

    expect(mockSb.secuencia).toContain('delete');
    expect(mockSb.argsDe('rpc')).toEqual(['add_reminder_recipients', { p_activity: 'a1' }]);
  });

  it('si el share ya no existe no llama a la RPC', async () => {
    mockSb.encolar({ data: null, error: null }, { data: null, error: null });

    await supabaseShares.removeShare('u1', 's1');

    expect(mockSb.llamadas.filter((l) => l[0] === 'rpc')).toHaveLength(0);
  });
});

describe('getAvailability (RF-S8)', () => {
  it('sin personas no consulta', async () => {
    expect(await supabaseAvailability.getAvailability('u1', [], 'a', 'b')).toEqual([]);
    expect(mockSb.llamadas).toHaveLength(0);
  });

  it('va por RPC y no leyendo activities', async () => {
    mockSb.responder({ data: [], error: null });
    await supabaseAvailability.getAvailability('u1', ['u2'], 'a', 'b');

    expect(mockSb.argsDe('rpc')?.[0]).toBe('get_availability');
    expect(mockSb.secuencia).not.toContain('from');
  });

  it('pasa personas y ventana', async () => {
    mockSb.responder({ data: [], error: null });
    await supabaseAvailability.getAvailability('u1', ['u2', 'u3'], 'FROM', 'TO');

    expect(mockSb.argsDe('rpc')?.[1]).toEqual({ p_user_ids: ['u2', 'u3'], p_from: 'FROM', p_to: 'TO' });
  });

  it('sin datos devuelve lista vacia', async () => {
    mockSb.responder({ data: null, error: null });
    expect(await supabaseAvailability.getAvailability('u1', ['u2'], 'a', 'b')).toEqual([]);
  });

  it('traduce el error', async () => {
    mockSb.responder({ data: null, error: { message: 'x', code: '42501' } });
    await expect(supabaseAvailability.getAvailability('u1', ['u2'], 'a', 'b')).rejects.toThrow(/permiso/i);
  });
});
