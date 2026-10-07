/**
 * "Antes de empezar" sin conexión (spec 03, RF-A13; T264). KAVI funciona sin red: una cuenta
 * que ya pasó queda recordada en el dispositivo con la versión del aviso.
 */
import { renderHook, waitFor } from '@testing-library/react-native';

import { PRIVACY_VERSION } from '@/constants/privacy';
import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { useConsentGate } from '@/hooks/use-consent';

const mockEstado = jest.fn();
const mockAlmacen = new Map<string, string>();
jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));
jest.mock('@/hooks/use-auth-actions', () => ({ olvidarDatosDelDispositivo: jest.fn() }));
jest.mock('@/services/consent', () => ({ getConsentStatus: () => mockEstado() }));
jest.mock('@/lib/storage', () => ({
  storage: {
    getItem: async (k: string) => mockAlmacen.get(k) ?? null,
    setItem: async (k: string, v: string) => void mockAlmacen.set(k, v),
    removeItem: async (k: string) => void mockAlmacen.delete(k),
  },
}));

const adulta = { birthDate: '2000-01-01', privacyVersion: PRIVACY_VERSION, guardian: null, guardianApproved: false };

beforeEach(() => {
  mockAlmacen.clear();
  mockEstado.mockReset();
});

async function gate() {
  const { Wrapper } = crearWrapper();
  const { result } = await renderHook(() => useConsentGate(), { wrapper: Wrapper });
  await waitFor(() => expect(result.current.isPending).toBe(false));
  return result.current;
}

describe('useConsentGate', () => {
  it('con red, manda el servidor y recuerda que la cuenta ya pasó', async () => {
    mockEstado.mockResolvedValue(adulta);
    expect((await gate()).data).toEqual({ kind: 'listo' });
    expect(mockAlmacen.get('kavi.consent.u1')).toBe(PRIVACY_VERSION);
  });

  it('sin red y con la versión vigente recordada, abre la app', async () => {
    mockAlmacen.set('kavi.consent.u1', PRIVACY_VERSION);
    mockEstado.mockRejectedValue(new Error('Network request failed'));
    expect((await gate()).data).toEqual({ kind: 'listo' });
  });

  it('sin red y sin nada recordado, muestra el error (no abre a ciegas)', async () => {
    mockEstado.mockRejectedValue(new Error('Network request failed'));
    const r = await gate();
    expect(r.isError).toBe(true);
  });

  it('sin red con una versión vieja recordada tampoco abre', async () => {
    mockAlmacen.set('kavi.consent.u1', 'v0');
    mockEstado.mockRejectedValue(new Error('Network request failed'));
    expect((await gate()).isError).toBe(true);
  });

  it('si el servidor dice que falta aceptar, olvida lo recordado', async () => {
    mockAlmacen.set('kavi.consent.u1', PRIVACY_VERSION);
    mockEstado.mockResolvedValue({ ...adulta, privacyVersion: 'v0' });
    expect((await gate()).data).toEqual({ kind: 'aceptar' });
    expect(mockAlmacen.has('kavi.consent.u1')).toBe(false);
  });
});
