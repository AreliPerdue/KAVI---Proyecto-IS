/**
 * Hooks de temas (spec 05). Ademas del ciclo de consulta, se fija que las
 * mutaciones invaliden tambien las actividades: al editar un tema su estilo se
 * copia a las actividades que lo usan, asi que el calendario queda obsoleto.
 */
import { renderHook, waitFor } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { useThemeMutations, useThemes, useThemesByDimension } from '@/hooks/use-themes';
import { DIMENSIONS } from '@/constants/dimensions';
import type { Theme } from '@/types/domain';

const mockListThemes = jest.fn();
const mockCreateTheme = jest.fn();
const mockUpdateTheme = jest.fn();
const mockRemoveTheme = jest.fn();
let mockUserId: string | null = 'u1';

jest.mock('@/providers', () => ({ useAuth: () => ({ userId: mockUserId }) }));
jest.mock('@/services/themes', () => ({
  listThemes: (...a: unknown[]) => mockListThemes(...a),
  createTheme: (...a: unknown[]) => mockCreateTheme(...a),
  updateTheme: (...a: unknown[]) => mockUpdateTheme(...a),
  removeTheme: (...a: unknown[]) => mockRemoveTheme(...a),
}));

const tema = (over: Partial<Theme> = {}): Theme =>
  ({ id: 't1', name: 'Gimnasio', dimension: 'fisica', color: '#4CAF50', icon: 'dumbbell', is_system: true, owner_id: null, ...over }) as Theme;

beforeEach(() => {
  mockUserId = 'u1';
  for (const m of [mockListThemes, mockCreateTheme, mockUpdateTheme, mockRemoveTheme]) m.mockReset();
});

describe('useThemes', () => {
  it('pide los temas del usuario', async () => {
    mockListThemes.mockResolvedValue([tema()]);
    const { Wrapper } = crearWrapper();

    const { result } = await renderHook(() => useThemes(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListThemes).toHaveBeenCalledWith('u1');
    expect(result.current.data).toHaveLength(1);
  });

  it('no consulta sin sesion', async () => {
    mockUserId = null;
    const { Wrapper } = crearWrapper();

    await renderHook(() => useThemes(), { wrapper: Wrapper });

    expect(mockListThemes).not.toHaveBeenCalled();
  });

  it('expone el error si la consulta falla', async () => {
    mockListThemes.mockRejectedValue(new Error('boom'));
    const { Wrapper } = crearWrapper();

    const { result } = await renderHook(() => useThemes(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useThemesByDimension', () => {
  it('devuelve un grupo por cada dimension, en el orden de la spec', async () => {
    const { result } = await renderHook(() => useThemesByDimension([]));
    expect(result.current).toHaveLength(DIMENSIONS.length);
    expect(result.current.map((g) => g.dimension.key)).toEqual(DIMENSIONS.map((d) => d.key));
  });

  it('coloca cada tema en su dimension', async () => {
    const temas = [tema({ id: 'a', dimension: 'fisica' }), tema({ id: 'b', dimension: 'social' })];
    const { result } = await renderHook(() => useThemesByDimension(temas));

    const fisica = result.current.find((g) => g.dimension.key === 'fisica');
    const social = result.current.find((g) => g.dimension.key === 'social');
    expect(fisica?.themes.map((t) => t.id)).toEqual(['a']);
    expect(social?.themes.map((t) => t.id)).toEqual(['b']);
  });

  it('las dimensiones sin temas quedan vacias, no ausentes', async () => {
    const { result } = await renderHook(() => useThemesByDimension([tema({ dimension: 'fisica' })]));
    const vacias = result.current.filter((g) => g.themes.length === 0);
    expect(vacias).toHaveLength(DIMENSIONS.length - 1);
  });

  it('tolera undefined', async () => {
    const { result } = await renderHook(() => useThemesByDimension(undefined));
    expect(result.current).toHaveLength(DIMENSIONS.length);
  });
});

describe('useThemeMutations', () => {
  it('crear pasa el usuario y la entrada', async () => {
    mockCreateTheme.mockResolvedValue(tema());
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useThemeMutations(), { wrapper: Wrapper });

    const input = { name: 'Repaso', dimension: 'intelectual' as const, color: '#2196F3', icon: 'book-open' };
    await result.current.create.mutateAsync(input);

    expect(mockCreateTheme).toHaveBeenCalledWith('u1', input);
  });

  it('actualizar pasa id y parche', async () => {
    mockUpdateTheme.mockResolvedValue(tema());
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useThemeMutations(), { wrapper: Wrapper });

    await result.current.update.mutateAsync({ id: 't1', patch: { name: 'Otro' } });

    expect(mockUpdateTheme).toHaveBeenCalledWith('t1', { name: 'Otro' });
  });

  it('eliminar pasa el id', async () => {
    mockRemoveTheme.mockResolvedValue(undefined);
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useThemeMutations(), { wrapper: Wrapper });

    await result.current.remove.mutateAsync('t1');

    expect(mockRemoveTheme).toHaveBeenCalledWith('t1');
  });

  it('editar un tema invalida tambien las actividades (copia de estilo)', async () => {
    mockUpdateTheme.mockResolvedValue(tema());
    const { Wrapper, queryClient } = crearWrapper();
    const espia = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = await renderHook(() => useThemeMutations(), { wrapper: Wrapper });

    await result.current.update.mutateAsync({ id: 't1', patch: { color: '#000000' } });

    const claves = espia.mock.calls.map((c) => JSON.stringify(c[0]));
    expect(claves.some((k) => k.includes('themes'))).toBe(true);
    expect(claves.some((k) => k.includes('activities'))).toBe(true);
  });

  it('un fallo al crear se propaga', async () => {
    mockCreateTheme.mockRejectedValue(new Error('Eso ya existe.'));
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useThemeMutations(), { wrapper: Wrapper });

    await expect(
      result.current.create.mutateAsync({ name: 'X', dimension: 'fisica', color: '#000', icon: 'tag' }),
    ).rejects.toThrow('Eso ya existe.');
  });
});
