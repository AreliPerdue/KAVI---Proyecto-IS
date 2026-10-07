/**
 * El botón + encoge al bajar y vuelve al subir (T193c).
 */
import { act, renderHook } from '@testing-library/react-native';

import { useShrinkOnScroll } from '@/hooks/use-shrink-on-scroll';

const scroll = (y: number) => ({ nativeEvent: { contentOffset: { x: 0, y } } }) as never;

describe('useShrinkOnScroll', () => {
  it('encoge al bajar y vuelve al subir', async () => {
    const { result } = await renderHook(() => useShrinkOnScroll());
    await act(() => result.current.onScroll(scroll(100)));
    expect(result.current.shrunk).toBe(true);
    await act(() => result.current.onScroll(scroll(60)));
    expect(result.current.shrunk).toBe(false);
  });

  it('no reacciona dentro de la zona de arriba ni al temblor del dedo', async () => {
    const { result } = await renderHook(() => useShrinkOnScroll());
    await act(() => result.current.onScroll(scroll(20)));
    expect(result.current.shrunk).toBe(false);
    await act(() => result.current.onScroll(scroll(100)));
    await act(() => result.current.onScroll(scroll(97)));
    expect(result.current.shrunk).toBe(true);
  });
});
