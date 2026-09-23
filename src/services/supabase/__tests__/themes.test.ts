/**
 * Servicio de temas contra Supabase (RF-T1, RF-T3, RF-T6). Se comprueba tanto la
 * consulta que se construye como el tratamiento de la respuesta.
 */
import { fakeSupabase } from '@/services/supabase/__tests__/fake-supabase';

/** El nombre debe empezar por `mock`: Jest eleva las fabricas de `jest.mock`
 *  y solo les permite referenciar variables con ese prefijo. */
const mockSb = fakeSupabase();
jest.mock('@/lib/supabase', () => ({ getSupabase: () => mockSb.client }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { supabaseThemes } = require('@/services/supabase/themes') as typeof import('@/services/supabase/themes');

beforeEach(() => {
  mockSb.llamadas.length = 0;
  mockSb.responder({ data: null, error: null });
});

describe('list', () => {
  it('consulta la tabla themes', async () => {
    mockSb.responder({ data: [], error: null });
    await supabaseThemes.list('u1');
    expect(mockSb.argsDe('from')).toEqual(['themes']);
  });

  it('ordena los del sistema primero y luego por nombre', async () => {
    mockSb.responder({ data: [], error: null });
    await supabaseThemes.list('u1');
    const orden = mockSb.llamadas.filter((l) => l[0] === 'order');
    expect(orden[0]).toEqual(['order', 'is_system', { ascending: false }]);
    expect(orden[1]).toEqual(['order', 'name']);
  });

  it('devuelve lo que responde la base', async () => {
    const temas = [{ id: 't1', name: 'Gimnasio', is_system: false }];
    mockSb.encolar({ data: temas, error: null }, { data: [], error: null });
    expect(await supabaseThemes.list('u1')).toEqual(temas);
  });

  /**
   * La fila del tema del sistema es global; lo que cada persona cambio vive en
   * `theme_overrides` y se compone aqui al leer (RF-T3).
   */
  it('aplica la personalizacion sobre los temas del sistema', async () => {
    mockSb.encolar(
      { data: [{ id: 't1', name: 'Gimnasio', color: '#4CAF50', icon: 'dumbbell', dimension: 'fisica', is_system: true }], error: null },
      { data: [{ theme_id: 't1', name: 'Gym', color: '#FF9800', dimension: null, icon: null }], error: null },
    );

    const [tema] = await supabaseThemes.list('u1');

    expect(tema.name).toBe('Gym');
    expect(tema.color).toBe('#FF9800');
    // Lo que no se personalizo se hereda del original.
    expect(tema.icon).toBe('dumbbell');
  });

  it('pide solo las personalizaciones de esa persona', async () => {
    mockSb.encolar({ data: [], error: null }, { data: [], error: null });
    await supabaseThemes.list('u1');
    expect(mockSb.argsDe('eq')).toEqual(['user_id', 'u1']);
  });

  it('un tema propio no se toca aunque haya personalizaciones', async () => {
    mockSb.encolar(
      { data: [{ id: 't9', name: 'Mio', is_system: false }], error: null },
      { data: [{ theme_id: 't9', name: 'Pisado' }], error: null },
    );

    expect((await supabaseThemes.list('u1'))[0].name).toBe('Mio');
  });

  it('traduce el error de la base', async () => {
    mockSb.responder({ data: null, error: { message: 'x', code: '42501' } });
    await expect(supabaseThemes.list('u1')).rejects.toThrow('No tienes permiso para hacer eso.');
  });
});

describe('create', () => {
  const input = { name: 'Repaso', dimension: 'intelectual' as const, color: '#2196F3', icon: 'book-open' };

  it('marca el tema como propio y no del sistema', async () => {
    mockSb.responder({ data: { id: 't9' }, error: null });
    await supabaseThemes.create('u1', input);
    expect(mockSb.argsDe('insert')).toEqual([{ ...input, owner_id: 'u1', is_system: false }]);
  });

  it('pide una sola fila de vuelta', async () => {
    mockSb.responder({ data: { id: 't9' }, error: null });
    await supabaseThemes.create('u1', input);
    expect(mockSb.secuencia).toContain('single');
  });

  it('propaga un nombre duplicado como "ya existe"', async () => {
    mockSb.responder({ data: null, error: { message: 'dup', code: '23505' } });
    await expect(supabaseThemes.create('u1', input)).rejects.toThrow('Eso ya existe.');
  });
});

describe('update de un tema propio', () => {
  it('filtra por el id del tema', async () => {
    mockSb.encolar({ data: { id: 't1', is_system: false }, error: null }, { data: { id: 't1' }, error: null });
    await supabaseThemes.update('t1', { name: 'Nuevo' }, 'u1');
    expect(mockSb.argsDe('eq')).toEqual(['id', 't1']);
  });

  it('envia solo el parche', async () => {
    mockSb.encolar({ data: { id: 't1', is_system: false }, error: null }, { data: { id: 't1' }, error: null });
    await supabaseThemes.update('t1', { color: '#FF0000' }, 'u1');
    expect(mockSb.argsDe('update')).toEqual([{ color: '#FF0000' }]);
  });
});

/**
 * Esa fila la comparten todas las cuentas: escribir en ella le cambiaria el tema a
 * todo el mundo. El cambio se guarda como personalizacion de quien lo hace (RF-T3).
 */
describe('update de un tema del sistema', () => {
  const original = { id: 'sys-1', name: 'Gimnasio', color: '#4CAF50', icon: 'dumbbell', dimension: 'fisica', is_system: true };

  it('no escribe en la tabla de temas', async () => {
    mockSb.encolar({ data: original, error: null }, { data: { theme_id: 'sys-1', name: 'Gym' }, error: null });

    await supabaseThemes.update('sys-1', { name: 'Gym' }, 'u1');

    expect(mockSb.llamadas.some((l) => l[0] === 'update')).toBe(false);
  });

  it('guarda la personalizacion a nombre de quien la hace', async () => {
    mockSb.encolar({ data: original, error: null }, { data: { theme_id: 'sys-1', name: 'Gym' }, error: null });

    await supabaseThemes.update('sys-1', { name: 'Gym' }, 'u1');

    expect(mockSb.argsDe('upsert')?.[0]).toEqual({ user_id: 'u1', theme_id: 'sys-1', name: 'Gym' });
  });

  it('devuelve el tema ya compuesto', async () => {
    mockSb.encolar({ data: original, error: null }, { data: { theme_id: 'sys-1', name: 'Gym', color: null }, error: null });

    const tema = await supabaseThemes.update('sys-1', { name: 'Gym' }, 'u1');

    expect(tema.name).toBe('Gym');
    expect(tema.color).toBe('#4CAF50');
  });
});

describe('restablecer los temas del sistema', () => {
  it('borra solo las personalizaciones de esa persona', async () => {
    mockSb.responder({ data: null, error: null });

    await supabaseThemes.resetSystemThemes('u1');

    expect(mockSb.argsDe('from')).toEqual(['theme_overrides']);
    expect(mockSb.argsDe('eq')).toEqual(['user_id', 'u1']);
  });

  it('propaga el error si falla', async () => {
    mockSb.responder({ data: null, error: { message: 'boom', code: '42501' } });
    await expect(supabaseThemes.resetSystemThemes('u1')).rejects.toThrow(/permiso/i);
  });
});

describe('remove', () => {
  it('borra por id', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseThemes.remove('t1');
    expect(mockSb.secuencia).toContain('delete');
    expect(mockSb.argsDe('eq')).toEqual(['id', 't1']);
  });

  it('no devuelve nada al tener exito', async () => {
    mockSb.responder({ data: null, error: null });
    expect(await supabaseThemes.remove('t1')).toBeUndefined();
  });

  it('traduce el error', async () => {
    mockSb.responder({ data: null, error: { message: 'rls', code: '42501' } });
    await expect(supabaseThemes.remove('t1')).rejects.toThrow(/permiso/i);
  });
});
