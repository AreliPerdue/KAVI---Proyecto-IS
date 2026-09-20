import { useFonts } from 'expo-font';

import { BrandFonts } from '@/constants/theme';

/**
 * Carga las fuentes de marca y dice si ya se pueden pintar.
 *
 * En una build de producción el config plugin de `expo-font` (app.json) ya las dejó
 * embebidas y esto resuelve de inmediato. En desarrollo —o en cualquier binario
 * anterior a que se añadieran— este cargado en runtime es lo que evita que el
 * wordmark caiga silenciosamente a la fuente del sistema sin recompilar.
 *
 * El costo es nulo: el splash se sostiene `SplashMinDuration` (NFR-19) y la carga
 * termina mucho antes. Si una fuente falla, devuelve `true` igual: mejor degradar a
 * la fuente del sistema que dejar la app atorada en el splash.
 */
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts({
    [BrandFonts.wordmark]: require('../../assets/fonts/MoiraiOne-Regular.ttf'),
    [BrandFonts.slogan]: require('../../assets/fonts/PoiretOne-Regular.ttf'),
  });
  return loaded || !!error;
}
