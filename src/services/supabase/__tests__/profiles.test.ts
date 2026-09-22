/**
 * Perfil contra Supabase (RF-A9). Lo relevante son los codigos de Postgres que
 * produce el username: `23505` es el indice unico sobre `lower(username)` y
 * `23514` el check de formato; cada uno tiene su propio mensaje.
 */
import { AUTH_MESSAGES } from '@/lib/auth-errors';
import { fakeSupabase } from '@/services/supabase/__tests__/fake-supabase';

const mockSb = fakeSupabase();
jest.mock('@/lib/supabase', () => ({ getSupabase: () => mockSb.client }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { supabaseProfiles } = require('@/services/supabase/profiles') as typeof import('@/services/supabase/profiles');

beforeEach(() => {
  mockSb.llamadas.length = 0;
  mockSb.responder({ data: null, error: null });
});

describe('getMyProfile', () => {
  it('consulta profiles filtrando por id', async () => {
    mockSb.responder({ data: { id: 'u1' }, error: null });
    await supabaseProfiles.getMyProfile('u1');
    expect(mockSb.argsDe('from')).toEqual(['profiles']);
    expect(mockSb.argsDe('eq')).toEqual(['id', 'u1']);
  });

  it('pide columnas explicitas, no select(*)', async () => {
    mockSb.responder({ data: { id: 'u1' }, error: null });
    await supabaseProfiles.getMyProfile('u1');
    const columnas = String(mockSb.argsDe('select')?.[0]);
    expect(columnas).toContain('username');
    expect(columnas).toContain('role');
    expect(columnas).not.toBe('*');
  });

  it('devuelve el perfil', async () => {
    const perfil = { id: 'u1', username: 'areli', role: 'user' };
    mockSb.responder({ data: perfil, error: null });
    expect(await supabaseProfiles.getMyProfile('u1')).toEqual(perfil);
  });

  it('traduce el error', async () => {
    mockSb.responder({ data: null, error: { message: 'x' } });
    await expect(supabaseProfiles.getMyProfile('u1')).rejects.toThrow(AUTH_MESSAGES.generic);
  });
});

describe('updateMyProfile', () => {
  it('envia el parche y filtra por id', async () => {
    mockSb.responder({ data: { id: 'u1' }, error: null });
    await supabaseProfiles.updateMyProfile('u1', { display_name: 'Areli' });
    expect(mockSb.argsDe('update')).toEqual([{ display_name: 'Areli' }]);
    expect(mockSb.argsDe('eq')).toEqual(['id', 'u1']);
  });

  it('un username ocupado se reporta como tal, no como error generico', async () => {
    mockSb.responder({ data: null, error: { message: 'dup', code: '23505' } });
    await expect(supabaseProfiles.updateMyProfile('u1', { username: 'ana' })).rejects.toThrow(
      AUTH_MESSAGES.usernameTaken,
    );
  });

  it('un username con formato invalido explica la regla', async () => {
    mockSb.responder({ data: null, error: { message: 'check', code: '23514' } });
    await expect(supabaseProfiles.updateMyProfile('u1', { username: 'Ana Pérez' })).rejects.toThrow(
      /solo letras minúsculas, números y guion bajo/i,
    );
  });

  it('otro error cae al generico', async () => {
    mockSb.responder({ data: null, error: { message: 'boom', code: 'XX000' } });
    await expect(supabaseProfiles.updateMyProfile('u1', {})).rejects.toThrow(AUTH_MESSAGES.generic);
  });
});
