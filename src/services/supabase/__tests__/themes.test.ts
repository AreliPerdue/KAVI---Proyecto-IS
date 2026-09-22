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
    const temas = [{ id: 't1', name: 'Gimnasio' }];
    mockSb.responder({ data: temas, error: null });
    expect(await supabaseThemes.list('u1')).toEqual(temas);
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

describe('update', () => {
  it('filtra por el id del tema', async () => {
    mockSb.responder({ data: { id: 't1' }, error: null });
    await supabaseThemes.update('t1', { name: 'Nuevo' });
    expect(mockSb.argsDe('eq')).toEqual(['id', 't1']);
  });

  it('envia solo el parche', async () => {
    mockSb.responder({ data: { id: 't1' }, error: null });
    await supabaseThemes.update('t1', { color: '#FF0000' });
    expect(mockSb.argsDe('update')).toEqual([{ color: '#FF0000' }]);
  });

  it('un tema del sistema lo rechaza la RLS (RF-T3)', async () => {
    mockSb.responder({ data: null, error: { message: 'rls', code: '42501' } });
    await expect(supabaseThemes.update('sys-1', { name: 'X' })).rejects.toThrow(/permiso/i);
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
