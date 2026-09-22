/**
 * Debounce del buscador de personas (RF-S1). Sin el, escribir "ana_torres"
 * dispara nueve consultas y las respuestas pueden llegar desordenadas, pintando
 * un resultado viejo sobre uno nuevo.
 */
import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from '@/hooks/use-debounced-value';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useDebouncedValue', () => {
  it('devuelve el valor inicial de inmediato', async () => {
    const { result } = await renderHook(() => useDebouncedValue('ana'));
    expect(result.current).toBe('ana');
  });

  it('no propaga el cambio antes del retardo', async () => {
    const { result, rerender } = await renderHook(({ v }: { v: string }) => useDebouncedValue(v), {
      initialProps: { v: 'a' },
    });

    await rerender({ v: 'an' });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe('a');
  });

  it('propaga el valor pasado el retardo', async () => {
    const { result, rerender } = await renderHook(({ v }: { v: string }) => useDebouncedValue(v), {
      initialProps: { v: 'a' },
    });

    await rerender({ v: 'ana' });
    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    expect(result.current).toBe('ana');
  });

  it('teclear seguido solo deja pasar el ultimo valor', async () => {
    const { result, rerender } = await renderHook(({ v }: { v: string }) => useDebouncedValue(v), {
      initialProps: { v: 'a' },
    });

    for (const v of ['an', 'ana', 'ana_', 'ana_t']) {
      await rerender({ v });
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
    }
    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    expect(result.current).toBe('ana_t');
  });

  it('acepta un retardo propio', async () => {
    const { result, rerender } = await renderHook(({ v }: { v: string }) => useDebouncedValue(v, 1000), {
      initialProps: { v: 'a' },
    });

    await rerender({ v: 'b' });
    await act(async () => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current).toBe('a');

    await act(async () => {
      jest.advanceTimersByTime(750);
    });
    expect(result.current).toBe('b');
  });

  it('funciona con valores que no son texto', async () => {
    const { result, rerender } = await renderHook(({ v }: { v: number }) => useDebouncedValue(v), {
      initialProps: { v: 0 },
    });

    await rerender({ v: 42 });
    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    expect(result.current).toBe(42);
  });
});
