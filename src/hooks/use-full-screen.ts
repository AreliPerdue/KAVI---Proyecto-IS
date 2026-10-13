import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Pantalla completa para el libro real (spec 13b, RF-BR5; T284). En Android esconde la barra de
 * navegación del sistema (se asoma deslizando desde el borde); la barra de estado la esconde quien lo usa
 * con `<StatusBar hidden />`, igual en iPhone y Android.
 */
export function usePantallaCompleta(activa: boolean) {
  useEffect(() => {
    if (Platform.OS !== 'android' || !activa) return;
    void NavigationBar.setVisibilityAsync('hidden').catch(() => undefined);
    return () => {
      void NavigationBar.setVisibilityAsync('visible').catch(() => undefined);
    };
  }, [activa]);
}
