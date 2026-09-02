import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const subscribe = () => () => {};

/**
 * En web con render estático el esquema debe recalcularse en el cliente:
 * durante la hidratación devolvemos 'light' para que el HTML coincida.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const colorScheme = useRNColorScheme();
  return hasHydrated ? colorScheme : 'light';
}
