/**
 * Hooks de Listas: la búsqueda espera dos letras (T213) y los pendientes por fecha viajan como
 * día `YYYY-MM-DD`, no como instante (T201, T212).
 */
import { renderHook, waitFor } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { useListItemsByDate, useListSearch } from '@/hooks/use-lists';

const mockBuscar = jest.fn();
const mockPorFecha = jest.fn();
jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));
jest.mock('@/services/lists', () => ({
  ...jest.requireActual('@/services/lists'),
  searchLists: (...a: unknown[]) => mockBuscar(...a),
  listItemsByDateRange: (...a: unknown[]) => mockPorFecha(...a),
}));

beforeEach(() => {
  mockBuscar.mockReset().mockResolvedValue({ lists: [], items: [] });
  mockPorFecha.mockReset().mockResolvedValue([]);
});

describe('useListSearch', () => {
  it('con menos de dos letras no consulta', async () => {
    const { Wrapper } = crearWrapper();
    await renderHook(() => useListSearch(' q '), { wrapper: Wrapper });
    expect(mockBuscar).not.toHaveBeenCalled();
  });

  it('con dos o más, consulta con el texto recortado', async () => {
    const { Wrapper } = crearWrapper();
    await renderHook(() => useListSearch('  qu '), { wrapper: Wrapper });
    await waitFor(() => expect(mockBuscar).toHaveBeenCalledWith('u1', 'qu'));
  });
});

describe('useListItemsByDate', () => {
  it('pide el rango con días YYYY-MM-DD', async () => {
    const { Wrapper } = crearWrapper();
    await renderHook(() => useListItemsByDate('2026-10-05', '2026-10-11'), { wrapper: Wrapper });
    await waitFor(() => expect(mockPorFecha).toHaveBeenCalledWith('u1', '2026-10-05', '2026-10-11'));
  });

  it('apagado no consulta (vistas con rejilla de horas)', async () => {
    const { Wrapper } = crearWrapper();
    await renderHook(() => useListItemsByDate('2026-10-05', '2026-10-11', false), { wrapper: Wrapper });
    expect(mockPorFecha).not.toHaveBeenCalled();
  });
});
