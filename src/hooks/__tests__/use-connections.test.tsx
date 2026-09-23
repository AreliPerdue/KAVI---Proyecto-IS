/**
 * Hooks de contactos (RF-S1, RF-S2, RF-S15).
 *
 * Lo que mas se rompe aqui: invalidar solo la lista de contactos no basta. Al
 * aceptar o eliminar tambien cambian el calendario, la disponibilidad y las
 * invitaciones, y por eso la lista de claves esta centralizada.
 */
import { renderHook, waitFor } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import {
  SEARCH_MIN_LENGTH,
  useConnectionMutations,
  useContacts,
  usePeopleColors,
  useUserSearch,
} from '@/hooks/use-connections';
import { DEFAULT_SELF_COLOR, PEOPLE_COLORS } from '@/constants/people-colors';

const mockListContacts = jest.fn();
const mockSearchUsers = jest.fn();
const mockRequest = jest.fn();
const mockAccept = jest.fn();
const mockRemove = jest.fn();
const mockSetVisibility = jest.fn();
const mockSetColor = jest.fn();
let mockUserId: string | null = 'u1';

jest.mock('@/providers', () => ({ useAuth: () => ({ userId: mockUserId }) }));
jest.mock('@/services/connections', () => ({
  listContacts: (...a: unknown[]) => mockListContacts(...a),
  searchUsers: (...a: unknown[]) => mockSearchUsers(...a),
  requestConnection: (...a: unknown[]) => mockRequest(...a),
  acceptConnection: (...a: unknown[]) => mockAccept(...a),
  removeConnection: (...a: unknown[]) => mockRemove(...a),
  setCalendarVisibility: (...a: unknown[]) => mockSetVisibility(...a),
  setContactColor: (...a: unknown[]) => mockSetColor(...a),
}));

const contacto = (id: string, over = {}) => ({
  connection: { id: `c-${id}` },
  profile: { id, username: id, display_name: null },
  kind: 'accepted',
  color: null,
  ...over,
});

beforeEach(() => {
  mockUserId = 'u1';
  for (const m of [mockListContacts, mockSearchUsers, mockRequest, mockAccept, mockRemove, mockSetVisibility, mockSetColor]) m.mockReset();
});

describe('useContacts', () => {
  it('pide los contactos del usuario', async () => {
    mockListContacts.mockResolvedValue([contacto('u2')]);
    const { Wrapper } = crearWrapper();

    const { result } = await renderHook(() => useContacts(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListContacts).toHaveBeenCalledWith('u1');
  });

  it('no consulta sin sesion', async () => {
    mockUserId = null;
    const { Wrapper } = crearWrapper();
    await renderHook(() => useContacts(), { wrapper: Wrapper });
    expect(mockListContacts).not.toHaveBeenCalled();
  });
});

describe('usePeopleColors (RF-S15)', () => {
  it('incluye mi propio color bajo mi id', async () => {
    mockListContacts.mockResolvedValue([]);
    const { Wrapper } = crearWrapper();

    const { result } = await renderHook(() => usePeopleColors(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.get('u1')).toBe(DEFAULT_SELF_COLOR));
  });

  /**
   * Mi color sale de lo elegido en Compartido, si no del Nobi que tenga puesto, y si no
   * del azul. Lo que importa es que sea el mismo en todas partes: el mapa lo usan tanto
   * las pestanas de personas como los bloques del calendario.
   */
  it('si elegi un color a mano, ese manda', async () => {
    mockListContacts.mockResolvedValue([]);
    const mio = PEOPLE_COLORS[7].hex;
    /* eslint-disable-next-line @typescript-eslint/no-require-imports -- store del dispositivo */
    const { usePreferencesStore } = require('@/store/preferences-store') as typeof import('@/store/preferences-store');
    usePreferencesStore.setState({ selfColor: mio });
    const { Wrapper } = crearWrapper();

    const { result } = await renderHook(() => usePeopleColors(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.get('u1')).toBe(mio));
    usePreferencesStore.setState({ selfColor: null });
  });

  it('asigna color a los contactos aceptados', async () => {
    mockListContacts.mockResolvedValue([contacto('u2'), contacto('u3')]);
    const { Wrapper } = crearWrapper();

    const { result } = await renderHook(() => usePeopleColors(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.size).toBe(3));
    expect(result.current.get('u2')).toMatch(/^#/);
  });

  it('ignora las solicitudes pendientes', async () => {
    mockListContacts.mockResolvedValue([contacto('u2', { kind: 'incoming' })]);
    const { Wrapper } = crearWrapper();

    const { result } = await renderHook(() => usePeopleColors(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.get('u1')).toBe(DEFAULT_SELF_COLOR));
    expect(result.current.has('u2')).toBe(false);
  });

  it('respeta el color elegido a mano', async () => {
    mockListContacts.mockResolvedValue([contacto('u2', { color: '#B06BFF' })]);
    const { Wrapper } = crearWrapper();

    const { result } = await renderHook(() => usePeopleColors(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.get('u2')).toBe('#B06BFF'));
  });
});

describe('useUserSearch (RF-S1)', () => {
  it('no busca por debajo del minimo', async () => {
    const { Wrapper } = crearWrapper();

    await renderHook(() => useUserSearch('an'), { wrapper: Wrapper });

    expect(mockSearchUsers).not.toHaveBeenCalled();
    expect(SEARCH_MIN_LENGTH).toBe(3);
  });

  it('la arroba no cuenta para el minimo', async () => {
    const { Wrapper } = crearWrapper();

    await renderHook(() => useUserSearch('@an'), { wrapper: Wrapper });

    expect(mockSearchUsers).not.toHaveBeenCalled();
  });

  it('busca en minusculas y sin espacios', async () => {
    mockSearchUsers.mockResolvedValue([]);
    const { Wrapper } = crearWrapper();

    const { result } = await renderHook(() => useUserSearch('  ANA  '), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSearchUsers).toHaveBeenCalledWith('u1', 'ana');
  });

  it('sin sesion no busca', async () => {
    mockUserId = null;
    const { Wrapper } = crearWrapper();

    await renderHook(() => useUserSearch('ana'), { wrapper: Wrapper });

    expect(mockSearchUsers).not.toHaveBeenCalled();
  });
});

describe('useConnectionMutations', () => {
  const montar = async () => {
    const { Wrapper, queryClient } = crearWrapper();
    const { result } = await renderHook(() => useConnectionMutations(), { wrapper: Wrapper });
    return { result, queryClient };
  };

  it('solicitar pasa usuario y destinatario', async () => {
    mockRequest.mockResolvedValue(undefined);
    const { result } = await montar();

    await result.current.request.mutateAsync('u2');

    expect(mockRequest).toHaveBeenCalledWith('u1', 'u2');
  });

  it('aceptar pasa el id de la conexion', async () => {
    mockAccept.mockResolvedValue(undefined);
    const { result } = await montar();

    await result.current.accept.mutateAsync('c1');

    expect(mockAccept).toHaveBeenCalledWith('u1', 'c1');
  });

  it('eliminar pasa el id', async () => {
    mockRemove.mockResolvedValue(undefined);
    const { result } = await montar();

    await result.current.remove.mutateAsync('c1');

    expect(mockRemove).toHaveBeenCalledWith('u1', 'c1');
  });

  it('cambiar visibilidad propaga el nivel', async () => {
    mockSetVisibility.mockResolvedValue(undefined);
    const { result } = await montar();

    await result.current.setVisibility.mutateAsync({ contactUserId: 'u2', visibility: 'details' });

    expect(mockSetVisibility).toHaveBeenCalledWith('u1', 'u2', 'details');
  });

  it('quitar color pasa null', async () => {
    mockSetColor.mockResolvedValue(undefined);
    const { result } = await montar();

    await result.current.setColor.mutateAsync({ contactUserId: 'u2', color: null });

    expect(mockSetColor).toHaveBeenCalledWith('u1', 'u2', null);
  });

  it('aceptar invalida tambien calendario, disponibilidad e invitaciones', async () => {
    mockAccept.mockResolvedValue(undefined);
    const { result, queryClient } = await montar();
    const espia = jest.spyOn(queryClient, 'invalidateQueries');

    await result.current.accept.mutateAsync('c1');

    const claves = espia.mock.calls.map((c) => JSON.stringify(c[0]));
    for (const familia of ['connections', 'activities', 'shares', 'reminders', 'availability']) {
      expect(claves.some((k) => k.includes(familia))).toBe(true);
    }
  });

  it('eliminar invalida lo mismo: la cascada afecta a todo', async () => {
    mockRemove.mockResolvedValue(undefined);
    const { result, queryClient } = await montar();
    const espia = jest.spyOn(queryClient, 'invalidateQueries');

    await result.current.remove.mutateAsync('c1');

    const claves = espia.mock.calls.map((c) => JSON.stringify(c[0]));
    expect(claves.some((k) => k.includes('activities'))).toBe(true);
  });
});
