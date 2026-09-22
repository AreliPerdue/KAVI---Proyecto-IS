/**
 * Contactos y visibilidad de calendario (RF-S1, RF-S2, RF-S3, RF-S7, RF-S15).
 *
 * Lo critico aqui es la cascada: romper una conexion tiene que revocar shares de
 * calendario, de actividad, colores y copias de recordatorios. En Supabase lo hace
 * el trigger `connections_revoke_shares`; el backend demo debe comportarse igual o
 * la app se veria distinta segun el backend.
 */
import type { ConnectionsApi } from '@/services/contracts';

const YO = 'demo-user';
const ANA = 'demo-ana';
const LUIS = 'demo-luis';
const MARIA = 'demo-maria';
const PEDRO = 'demo-pedro';

type Store = typeof import('@/services/demo/store');

function fresh(): { conexiones: ConnectionsApi; state: Store['demoState'] } {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports -- recarga deliberada del estado demo */
  const store = require('@/services/demo/store') as Store;
  const mod = require('@/services/demo/connections') as typeof import('@/services/demo/connections');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return { conexiones: mod.demoConnections, state: store.demoState };
}

describe('buscar personas (RF-S1)', () => {
  it('encuentra por prefijo de username', async () => {
    const { conexiones } = fresh();
    const r = await conexiones.searchUsers(YO, 'ped');
    expect(r.map((p) => p.id)).toContain(PEDRO);
  });

  it('acepta la arroba inicial', async () => {
    const { conexiones } = fresh();
    expect((await conexiones.searchUsers(YO, '@ana')).map((p) => p.id)).toContain(ANA);
  });

  it('encuentra por correo completo', async () => {
    const { conexiones } = fresh();
    expect((await conexiones.searchUsers(YO, 'luis@kavi.app')).map((p) => p.id)).toContain(LUIS);
  });

  it('el correo exige la cadena completa: un prefijo no basta', async () => {
    const { conexiones } = fresh();
    expect(await conexiones.searchUsers(YO, 'luis@kavi')).toEqual([]);
  });

  it('exige al menos 3 caracteres, para no poder enumerar cuentas', async () => {
    const { conexiones } = fresh();
    expect(await conexiones.searchUsers(YO, 'an')).toEqual([]);
    expect(await conexiones.searchUsers(YO, '')).toEqual([]);
  });

  it('nunca se devuelve a quien busca', async () => {
    const { conexiones } = fresh();
    const r = await conexiones.searchUsers(YO, 'demo');
    expect(r.map((p) => p.id)).not.toContain(YO);
  });

  it('ignora mayusculas y espacios', async () => {
    const { conexiones } = fresh();
    expect((await conexiones.searchUsers(YO, '  ANA  ')).map((p) => p.id)).toContain(ANA);
  });

  it('ordena la coincidencia exacta primero', async () => {
    const { conexiones } = fresh();
    const r = await conexiones.searchUsers(YO, 'ana');
    expect(r[0]?.username).toBe('ana');
  });

  it('tope de 8 resultados', async () => {
    const { conexiones } = fresh();
    expect((await conexiones.searchUsers(YO, 'dem')).length).toBeLessThanOrEqual(8);
  });
});

describe('listar contactos (RF-S3)', () => {
  it('clasifica aceptados, recibidas y enviadas', async () => {
    const { conexiones } = fresh();
    const contactos = await conexiones.listContacts(YO);
    const por = (id: string) => contactos.find((c) => c.profile.id === id);

    expect(por(ANA)?.kind).toBe('accepted');
    expect(por(PEDRO)?.kind).toBe('accepted');
    expect(por(LUIS)?.kind).toBe('incoming');
    expect(por(MARIA)?.kind).toBe('outgoing');
  });

  it('reporta la visibilidad que cada quien concede', async () => {
    const { conexiones } = fresh();
    const contactos = await conexiones.listContacts(YO);
    const ana = contactos.find((c) => c.profile.id === ANA);

    expect(ana?.theirCalendarVisibility).toBe('busy');
    expect(ana?.myCalendarVisibility).toBeNull();
  });

  it('viene ordenado por nombre visible', async () => {
    const { conexiones } = fresh();
    const nombres = (await conexiones.listContacts(YO)).map((c) => c.profile.display_name ?? '');
    expect([...nombres].sort((a, b) => a.localeCompare(b))).toEqual(nombres);
  });

  it('no incluye a quien no tiene conexion conmigo', async () => {
    const { conexiones } = fresh();
    const contactos = await conexiones.listContacts(ANA);
    expect(contactos.map((c) => c.profile.id)).not.toContain(MARIA);
  });
});

describe('solicitar conexion', () => {
  it('crea la solicitud como pendiente', async () => {
    const { conexiones, state } = fresh();
    await conexiones.request(ANA, LUIS);
    const nueva = state.connections.find(
      (c) => c.requester_id === ANA && c.addressee_id === LUIS,
    );
    expect(nueva?.status).toBe('pending');
    expect(nueva?.responded_at).toBeNull();
  });

  it('rechaza enviarsela a uno mismo', async () => {
    const { conexiones } = fresh();
    await expect(conexiones.request(YO, YO)).rejects.toThrow(/a ti mismo/i);
  });

  it('rechaza duplicar una conexion ya aceptada', async () => {
    const { conexiones } = fresh();
    await expect(conexiones.request(YO, ANA)).rejects.toThrow(/ya son contactos/i);
  });

  it('rechaza duplicar una solicitud pendiente, en cualquier direccion', async () => {
    const { conexiones } = fresh();
    await expect(conexiones.request(YO, LUIS)).rejects.toThrow(/pendiente/i);
  });
});

describe('aceptar', () => {
  it('la solicitud recibida pasa a aceptada y queda fechada', async () => {
    const { conexiones, state } = fresh();
    await conexiones.accept(YO, 'con-luis');
    const c = state.connections.find((x) => x.id === 'con-luis');
    expect(c?.status).toBe('accepted');
    expect(c?.responded_at).toEqual(expect.any(String));
  });

  it('solo la puede aceptar quien la recibio, no quien la envio', async () => {
    const { conexiones } = fresh();
    await expect(conexiones.accept(YO, 'con-maria')).rejects.toThrow(/ya no está disponible/i);
  });

  it('falla con una solicitud inexistente', async () => {
    const { conexiones } = fresh();
    await expect(conexiones.accept(YO, 'no-existe')).rejects.toThrow();
  });
});

describe('eliminar contacto y cascada (RF-S2)', () => {
  it('quita la conexion', async () => {
    const { conexiones, state } = fresh();
    await conexiones.remove(YO, 'con-ana');
    expect(state.connections.find((c) => c.id === 'con-ana')).toBeUndefined();
  });

  it('revoca el calendario que esa persona me compartia', async () => {
    const { conexiones, state } = fresh();
    expect(state.calendarShares.some((s) => s.owner_id === ANA && s.shared_with_id === YO)).toBe(true);

    await conexiones.remove(YO, 'con-ana');

    expect(state.calendarShares.some((s) => s.owner_id === ANA && s.shared_with_id === YO)).toBe(false);
  });

  it('revoca las invitaciones a actividades entre ambos', async () => {
    const { conexiones, state } = fresh();
    const antes = state.activityShares.filter((s) => s.shared_with_id === YO).length;
    expect(antes).toBeGreaterThan(0);

    await conexiones.remove(YO, 'con-ana');

    const idsDeAna = new Set(state.activities.filter((a) => a.owner_id === ANA).map((a) => a.id));
    expect(state.activityShares.some((s) => s.shared_with_id === YO && idsDeAna.has(s.activity_id))).toBe(false);
  });

  it('olvida el color que le habia asignado (RF-S15)', async () => {
    const { conexiones, state } = fresh();
    await conexiones.setContactColor(YO, ANA, '#FF0000');
    expect(state.contactColors).toHaveLength(1);

    await conexiones.remove(YO, 'con-ana');

    expect(state.contactColors).toHaveLength(0);
  });

  it('no deja borrar una conexion ajena', async () => {
    const { conexiones, state } = fresh();
    const antes = state.connections.length;
    await conexiones.remove(MARIA, 'con-ana');
    expect(state.connections).toHaveLength(antes);
  });

  it('ignora en silencio una conexion inexistente', async () => {
    const { conexiones } = fresh();
    await expect(conexiones.remove(YO, 'no-existe')).resolves.toBeUndefined();
  });
});

describe('color de contacto (RF-S15)', () => {
  it('guarda el color elegido', async () => {
    const { conexiones, state } = fresh();
    await conexiones.setContactColor(YO, ANA, '#4CAF50');
    expect(state.contactColors[0]).toMatchObject({ owner_id: YO, contact_id: ANA, color: '#4CAF50' });
  });

  it('null vuelve al color automatico y no guarda nada', async () => {
    const { conexiones, state } = fresh();
    await conexiones.setContactColor(YO, ANA, '#4CAF50');
    await conexiones.setContactColor(YO, ANA, null);
    expect(state.contactColors).toHaveLength(0);
  });

  it('reemplaza en vez de acumular', async () => {
    const { conexiones, state } = fresh();
    await conexiones.setContactColor(YO, ANA, '#4CAF50');
    await conexiones.setContactColor(YO, ANA, '#E91E63');
    expect(state.contactColors).toHaveLength(1);
    expect(state.contactColors[0]?.color).toBe('#E91E63');
  });

  it('solo se puede asignar a contactos aceptados', async () => {
    const { conexiones } = fresh();
    await expect(conexiones.setContactColor(YO, LUIS, '#000000')).rejects.toThrow(/aceptados/i);
  });
});

describe('visibilidad del calendario (RF-S7)', () => {
  it('comparte con el nivel elegido', async () => {
    const { conexiones, state } = fresh();
    await conexiones.setCalendarVisibility(YO, ANA, 'details');
    expect(state.calendarShares.find((s) => s.owner_id === YO && s.shared_with_id === ANA)?.visibility).toBe('details');
  });

  it('cambiar el nivel no duplica el share', async () => {
    const { conexiones, state } = fresh();
    await conexiones.setCalendarVisibility(YO, ANA, 'busy');
    await conexiones.setCalendarVisibility(YO, ANA, 'details');
    expect(state.calendarShares.filter((s) => s.owner_id === YO && s.shared_with_id === ANA)).toHaveLength(1);
  });

  it('null deja de compartir', async () => {
    const { conexiones, state } = fresh();
    await conexiones.setCalendarVisibility(YO, ANA, 'details');
    await conexiones.setCalendarVisibility(YO, ANA, null);
    expect(state.calendarShares.some((s) => s.owner_id === YO && s.shared_with_id === ANA)).toBe(false);
  });

  it('no se puede compartir con quien no es contacto aceptado', async () => {
    const { conexiones } = fresh();
    await expect(conexiones.setCalendarVisibility(YO, LUIS, 'busy')).rejects.toThrow(/aceptados/i);
  });

  it('pero si se puede dejar de compartir aunque ya no sean contactos', async () => {
    const { conexiones } = fresh();
    await expect(conexiones.setCalendarVisibility(YO, LUIS, null)).resolves.toBeUndefined();
  });
});
