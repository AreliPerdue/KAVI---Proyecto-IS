import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';
import { t } from '@/i18n';

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

/**
 * Comparte una imagen (RF-F59). En iOS y Android, un archivo temporal con la hoja del
 * sistema; en web, la hoja del navegador si acepta archivos y, si no, se descarga.
 */
export async function shareImage(uri: string, fileName: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (Platform.OS !== 'web') {
    if (!(await Sharing.isAvailableAsync())) throw new Error(t().errors.cantShareFiles);
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t().fitness.summary.shareDialog });
    return 'shared';
  }
  const blob = await (await fetch(uri)).blob();
  const file = new File([blob], fileName, { type: 'image/png' });
  const nav = globalThis.navigator as Navigator | undefined;
  if (nav?.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = uri;
  a.download = fileName;
  a.click();
  return 'downloaded';
}
