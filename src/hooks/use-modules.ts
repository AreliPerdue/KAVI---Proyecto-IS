import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { type ModuleId, moduleHref } from '@/constants/modules';
import { usePreferencesStore } from '@/store/preferences-store';

const WEB = Platform.OS === 'web';

/** Abrir un módulo donde le toca: su lugar en la barra, su pestaña en web o apilado (RF-N3). */
export function useModuleNav() {
  const router = useRouter();
  const accesos = usePreferencesStore((s) => s.accesos);
  const href = useCallback((id: ModuleId) => moduleHref(id, accesos, WEB), [accesos]);
  const abrir = useCallback((id: ModuleId) => router.navigate(href(id)), [router, href]);
  return { accesos, href, abrir, web: WEB };
}
