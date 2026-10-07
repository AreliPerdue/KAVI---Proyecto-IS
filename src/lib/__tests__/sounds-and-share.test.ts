/**
 * Pitidos de los timers y compartir el resumen (spec 07 v2, RF-F34, RF-F46, RF-F59).
 */
import { Platform } from 'react-native';

describe('playSound', () => {
  const cargar = () => {
    jest.resetModules();
    /* eslint-disable @typescript-eslint/no-require-imports -- módulo fresco por prueba */
    const audio = require('expo-audio') as { createAudioPlayer: jest.Mock; setAudioModeAsync: jest.Mock };
    const { playSound } = require('@/lib/sounds') as typeof import('@/lib/sounds');
    /* eslint-enable @typescript-eslint/no-require-imports */
    return { audio, playSound };
  };

  it('crea un reproductor por sonido una sola vez y suena encima de la música', () => {
    const { audio, playSound } = cargar();
    playSound('tick');
    playSound('tick');
    playSound('done');
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(2);
    expect(audio.setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(audio.setAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
  });

  it('un error de audio no rompe: el aviso visual basta', () => {
    const { audio, playSound } = cargar();
    audio.createAudioPlayer.mockImplementationOnce(() => {
      throw new Error('sin audio');
    });
    expect(() => playSound('done')).not.toThrow();
  });
});

describe('shareImage', () => {
  const original = Platform.OS;
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
  });

  it('en el teléfono usa la hoja del sistema con el archivo PNG', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    /* eslint-disable-next-line @typescript-eslint/no-require-imports -- el mock global de jest.setup */
    const Sharing = require('expo-sharing') as { isAvailableAsync: jest.Mock; shareAsync: jest.Mock };
    Sharing.isAvailableAsync.mockResolvedValueOnce(true);
    /* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras cambiar la plataforma */
    const { shareImage } = require('@/lib/share') as typeof import('@/lib/share');
    await expect(shareImage('file://tarjeta.png', 'kavi.png')).resolves.toBe('shared');
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file://tarjeta.png', expect.objectContaining({ mimeType: 'image/png' }));
  });

  it('si el teléfono no puede compartir archivos, lo dice (y el resumen cae a texto)', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    /* eslint-disable-next-line @typescript-eslint/no-require-imports -- el mock global de jest.setup */
    const Sharing = require('expo-sharing') as { isAvailableAsync: jest.Mock };
    Sharing.isAvailableAsync.mockResolvedValueOnce(false);
    /* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras cambiar la plataforma */
    const { shareImage } = require('@/lib/share') as typeof import('@/lib/share');
    await expect(shareImage('file://tarjeta.png', 'kavi.png')).rejects.toThrow();
  });
});
