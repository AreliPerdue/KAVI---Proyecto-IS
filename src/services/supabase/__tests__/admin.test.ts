/**
 * Panel de administracion (spec 09).
 *
 * El detalle importante: aqui NO se comprueba el rol. El control vive en las RPC
 * (`is_admin` en SECURITY DEFINER), porque si estuviera en el cliente bastaria
 * llamar a la API por fuera de la app para saltarselo (RF-AD6). Estas pruebas
 * fijan que el servicio se limite a llamar y traducir el rechazo.
 */
import { fakeSupabase } from '@/services/supabase/__tests__/fake-supabase';

const mockSb = fakeSupabase();
jest.mock('@/lib/supabase', () => ({ getSupabase: () => mockSb.client }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { supabaseAdmin } = require('@/services/supabase/admin') as typeof import('@/services/supabase/admin');

beforeEach(() => {
  mockSb.llamadas.length = 0;
  mockSb.responder({ data: null, error: null });
});

describe('getStats', () => {
  it('llama a la RPC admin_stats', async () => {
    mockSb.responder({ data: [{ accounts: 4 }], error: null });
    await supabaseAdmin.getStats();
    expect(mockSb.argsDe('rpc')?.[0]).toBe('admin_stats');
  });

  it('devuelve la primera fila', async () => {
    mockSb.responder({ data: [{ accounts: 4, activities: 12 }], error: null });
    expect(await supabaseAdmin.getStats()).toEqual({ accounts: 4, activities: 12 });
  });

  it('sin filas avisa en vez de devolver vacio', async () => {
    mockSb.responder({ data: [], error: null });
    await expect(supabaseAdmin.getStats()).rejects.toThrow(/no se pudieron leer/i);
  });

  it('una cuenta sin rol recibe el rechazo de la base (RF-AD6)', async () => {
    mockSb.responder({ data: null, error: { message: 'rls', code: '42501' } });
    await expect(supabaseAdmin.getStats()).rejects.toThrow('No tienes permiso para hacer eso.');
  });

  it('no consulta tablas directamente: solo la RPC', async () => {
    mockSb.responder({ data: [{}], error: null });
    await supabaseAdmin.getStats();
    expect(mockSb.secuencia).not.toContain('from');
  });
});

describe('listAccounts', () => {
  it('llama a admin_accounts con limite y desplazamiento', async () => {
    mockSb.responder({ data: [], error: null });
    await supabaseAdmin.listAccounts();
    const args = mockSb.argsDe('rpc');
    expect(args?.[0]).toBe('admin_accounts');
    expect(args?.[1]).toEqual({ p_limit: 200, p_offset: 0 });
  });

  it('devuelve las cuentas', async () => {
    const cuentas = [{ id: 'u1', email: 'a@b.c' }];
    mockSb.responder({ data: cuentas, error: null });
    expect(await supabaseAdmin.listAccounts()).toEqual(cuentas);
  });

  it('sin datos devuelve lista vacia, no null', async () => {
    mockSb.responder({ data: null, error: null });
    expect(await supabaseAdmin.listAccounts()).toEqual([]);
  });

  it('traduce el rechazo de la RLS', async () => {
    mockSb.responder({ data: null, error: { message: 'rls', code: '42501' } });
    await expect(supabaseAdmin.listAccounts()).rejects.toThrow(/permiso/i);
  });
});
