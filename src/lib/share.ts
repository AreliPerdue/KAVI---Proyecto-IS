import { Platform, Share } from 'react-native';

/**
 * Comparte un texto con la hoja del sistema. En web usa la del navegador si existe y, si
 * no, lo copia al portapapeles. Devuelve qué pasó para avisarlo ("Copiado").
 */
export async function shareText(text: string): Promise<'shared' | 'copied' | 'cancelled'> {
  if (Platform.OS !== 'web') {
    const r = await Share.share({ message: text });
    return r.action === Share.dismissedAction ? 'cancelled' : 'shared';
  }
  const nav = globalThis.navigator as Navigator | undefined;
  if (nav?.share) {
    try {
      await nav.share({ text });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  await nav?.clipboard?.writeText(text);
  return 'copied';
}
