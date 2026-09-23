/**
 * Esquema de color activo (NFR-18).
 *
 * Lo que hay que fijar aqui es la resolucion: la preferencia manda sobre el
 * sistema, y cuando el sistema no dice nada —en web antes de hidratar, o en un
 * dispositivo sin ajuste— se cae a oscuro en vez de parpadear a claro.
 */
import { renderHook } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';
import { useResolvedScheme, useTheme } from '@/hooks/use-theme';
import { usePreferencesStore } from '@/store/preferences-store';

let mockDelSistema: 'light' | 'dark' | null = 'dark';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockDelSistema,
}));

beforeEach(() => {
  mockDelSistema = 'dark';
  usePreferencesStore.setState({ appearance: 'dark' });
});

describe('preferencia fijada', () => {
  it('«Oscuro» manda aunque el sistema este en claro', async () => {
    mockDelSistema = 'light';
    usePreferencesStore.setState({ appearance: 'dark' });

    expect((await renderHook(() => useResolvedScheme())).result.current).toBe('dark');
  });

  it('«Claro» manda aunque el sistema este en oscuro', async () => {
    mockDelSistema = 'dark';
    usePreferencesStore.setState({ appearance: 'light' });

    expect((await renderHook(() => useResolvedScheme())).result.current).toBe('light');
  });
});

describe('«Sistema»', () => {
  it('sigue al sistema en claro', async () => {
    mockDelSistema = 'light';
    usePreferencesStore.setState({ appearance: 'system' });

    expect((await renderHook(() => useResolvedScheme())).result.current).toBe('light');
  });

  it('sigue al sistema en oscuro', async () => {
    mockDelSistema = 'dark';
    usePreferencesStore.setState({ appearance: 'system' });

    expect((await renderHook(() => useResolvedScheme())).result.current).toBe('dark');
  });

  /**
   * En web `useColorScheme()` devuelve `null` en el primer render. Caer a claro ahi
   * seria un destello blanco en cada recarga de quien usa la app en oscuro.
   */
  it('si el sistema no dice nada se queda en oscuro', async () => {
    mockDelSistema = null;
    usePreferencesStore.setState({ appearance: 'system' });

    expect((await renderHook(() => useResolvedScheme())).result.current).toBe('dark');
  });
});

describe('useTheme', () => {
  it('devuelve los tokens claros cuando el esquema es claro', async () => {
    usePreferencesStore.setState({ appearance: 'light' });

    expect((await renderHook(() => useTheme())).result.current).toBe(Colors.light);
  });

  it('y los oscuros cuando es oscuro', async () => {
    usePreferencesStore.setState({ appearance: 'dark' });

    expect((await renderHook(() => useTheme())).result.current).toBe(Colors.dark);
  });
});
