/**
 * 42501 tiene dos causas que Postgres contesta igual: una operación ajena o una sesión caducada.
 * Si es lo segundo, la app cierra la sesión local en vez de seguir fallando en silencio (T231).
 */
const mockSesion = jest.fn();
const mockSalir = jest.fn();
jest.mock('@/lib/supabase', () => ({
  getSupabase: () => ({ auth: { getSession: () => mockSesion(), signOut: () => mockSalir() } }),
}));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { toError } = require('@/services/supabase/errors') as typeof import('@/services/supabase/errors');

const espera = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  mockSesion.mockReset();
  mockSalir.mockReset();
});

describe('42501', () => {
  it('sin sesión viva: cierra la sesión local', async () => {
    mockSesion.mockResolvedValue({ data: { session: null } });
    toError({ message: 'permission denied', code: '42501' });
    await espera();
    expect(mockSalir).toHaveBeenCalled();
  });

  it('con sesión viva: es una operación ajena y no se toca la sesión', async () => {
    mockSesion.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    toError({ message: 'permission denied', code: '42501' });
    await espera();
    expect(mockSalir).not.toHaveBeenCalled();
  });
});
