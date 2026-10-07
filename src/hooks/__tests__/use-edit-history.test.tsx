/**
 * Deshacer y rehacer al editar una sesión (spec 07 v2, RF-F40).
 */
import { act, renderHook } from '@testing-library/react-native';

import { useEditHistory } from '@/hooks/use-edit-history';

const paso = (log: string[], nombre: string) => ({ undo: () => log.push(`-${nombre}`), redo: () => log.push(`+${nombre}`) });

describe('useEditHistory', () => {
  it('deshace en orden inverso y rehace en orden', async () => {
    const log: string[] = [];
    const { result } = await renderHook(() => useEditHistory());
    await act(() => {
      result.current.record(paso(log, 'a'));
      result.current.record(paso(log, 'b'));
    });
    await act(() => result.current.undo());
    await act(() => result.current.undo());
    await act(() => result.current.redo());
    expect(log).toEqual(['-b', '-a', '+a']);
  });

  it('un lote (unir, partir, calentamiento) es un solo paso', async () => {
    const log: string[] = [];
    const { result } = await renderHook(() => useEditHistory());
    await act(() =>
      result.current.batch(() => {
        result.current.record(paso(log, 'a'));
        result.current.record(paso(log, 'b'));
      }),
    );
    await act(() => result.current.undo());
    expect(log).toEqual(['-b', '-a']);
    expect(result.current.canUndo).toBe(false);
  });

  it('una acción nueva borra lo que se podía rehacer', async () => {
    const log: string[] = [];
    const { result } = await renderHook(() => useEditHistory());
    await act(() => result.current.record(paso(log, 'a')));
    await act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);
    await act(() => result.current.record(paso(log, 'c')));
    expect(result.current.canRedo).toBe(false);
  });

  it('un lote vacío no deja un paso fantasma', async () => {
    const { result } = await renderHook(() => useEditHistory());
    await act(() => result.current.batch(() => undefined));
    expect(result.current.canUndo).toBe(false);
  });
});
