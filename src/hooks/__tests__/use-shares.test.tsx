/**
 * Hooks de compartir actividades (RF-S4, RF-S5, RF-S10).
 *
 * Responder una invitacion no solo cambia el share: al aceptar, la actividad
 * entra en el calendario y se heredan sus recordatorios. Por eso las mutaciones
 * invalidan tambien actividades y recordatorios, no solo shares.
 */
import { renderHook, waitFor } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { shareKeys, useActivityShares, useInvitations, useShareMutations } from '@/hooks/use-shares';

const mockListShares = jest.fn();
const mockListInvitations = jest.fn();
const mockShare = jest.fn();
const mockRespond = jest.fn();
const mockRemove = jest.fn();
let mockUserId: string | null = 'u1';

jest.mock('@/providers', () => ({ useAuth: () => ({ userId: mockUserId }) }));
jest.mock('@/services/shares', () => ({
  listActivityShares: (...a: unknown[]) => mockListShares(...a),
  listInvitations: (...a: unknown[]) => mockListInvitations(...a),
  shareActivity: (...a: unknown[]) => mockShare(...a),
  respondInvitation: (...a: unknown[]) => mockRespond(...a),
  removeActivityShare: (...a: unknown[]) => mockRemove(...a),
}));

beforeEach(() => {
  mockUserId = 'u1';
  for (const m of [mockListShares, mockListInvitations, mockShare, mockRespond, mockRemove]) m.mockReset();
  mockListShares.mockResolvedValue([]);
  mockListInvitations.mockResolvedValue([]);
});

describe('claves', () => {
  it('separan por actividad y por usuario', () => {
    expect(shareKeys.byActivity('a1')).toEqual(['shares', 'activity', 'a1']);
    expect(shareKeys.invitations('u1')).toEqual(['shares', 'invitations', 'u1']);
  });
});

describe('useActivityShares', () => {
  it('consulta los de esa actividad', async () => {
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useActivityShares('a1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListShares).toHaveBeenCalledWith('a1');
  });

  it('sin actividad no consulta', async () => {
    const { Wrapper } = crearWrapper();
    await renderHook(() => useActivityShares(undefined), { wrapper: Wrapper });

    expect(mockListShares).not.toHaveBeenCalled();
  });

  it('se puede desactivar a mano: solo el dueno ve los shares', async () => {
    const { Wrapper } = crearWrapper();
    await renderHook(() => useActivityShares('a1', false), { wrapper: Wrapper });

    expect(mockListShares).not.toHaveBeenCalled();
  });
});

describe('useInvitations', () => {
  it('consulta las del usuario', async () => {
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useInvitations(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListInvitations).toHaveBeenCalledWith('u1');
  });

  it('sin sesion no consulta', async () => {
    mockUserId = null;
    const { Wrapper } = crearWrapper();
    await renderHook(() => useInvitations(), { wrapper: Wrapper });

    expect(mockListInvitations).not.toHaveBeenCalled();
  });
});

describe('useShareMutations', () => {
  const montar = async () => {
    const { Wrapper, queryClient } = crearWrapper();
    const { result } = await renderHook(() => useShareMutations(), { wrapper: Wrapper });
    return { result, queryClient };
  };

  it('compartir pasa usuario, actividad y contactos', async () => {
    mockShare.mockResolvedValue(undefined);
    const { result } = await montar();

    await result.current.share.mutateAsync({ activityId: 'a1', contactUserIds: ['u2', 'u3'] });

    expect(mockShare).toHaveBeenCalledWith('u1', 'a1', ['u2', 'u3']);
  });

  it('responder pasa la invitacion y la decision', async () => {
    mockRespond.mockResolvedValue(undefined);
    const { result } = await montar();

    await result.current.respond.mutateAsync({ shareId: 's1', respuesta: 'accepted' });

    expect(mockRespond).toHaveBeenCalledWith('u1', 's1', 'accepted');
  });

  it('revocar pasa el share', async () => {
    mockRemove.mockResolvedValue(undefined);
    const { result } = await montar();

    await result.current.remove.mutateAsync('s1');

    expect(mockRemove).toHaveBeenCalledWith('u1', 's1');
  });

  it('aceptar invalida tambien actividades y recordatorios (RF-S10)', async () => {
    mockRespond.mockResolvedValue(undefined);
    const { result, queryClient } = await montar();
    const espia = jest.spyOn(queryClient, 'invalidateQueries');

    await result.current.respond.mutateAsync({ shareId: 's1', respuesta: 'accepted' });

    const claves = espia.mock.calls.map((c) => JSON.stringify(c[0]));
    for (const familia of ['shares', 'activities', 'reminders']) {
      expect(claves.some((k) => k.includes(familia))).toBe(true);
    }
  });

  it('un fallo al compartir se propaga', async () => {
    mockShare.mockRejectedValue(new Error('Solo puedes compartir con contactos aceptados.'));
    const { result } = await montar();

    await expect(
      result.current.share.mutateAsync({ activityId: 'a1', contactUserIds: ['u9'] }),
    ).rejects.toThrow(/contactos aceptados/i);
  });
});
