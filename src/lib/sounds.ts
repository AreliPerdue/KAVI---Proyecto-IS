import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Avisos sonoros de los timers (spec 07 v2, RF-F34, RF-F46): un pitido corto por cambio de
 * fase y otro de fin. Suenan **encima** de la música de la persona, sin pausarla, y respetan
 * el modo silencio del teléfono. Se cargan la primera vez que hacen falta.
 */
type Sonido = 'tick' | 'done';

const FUENTES: Record<Sonido, number> = {
  tick: require('../../assets/sounds/tick.wav'),
  done: require('../../assets/sounds/done.wav'),
};

const players = new Map<Sonido, AudioPlayer>();
let modoListo = false;

export function playSound(sonido: Sonido): void {
  try {
    if (!modoListo) {
      modoListo = true;
      void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    }
    let player = players.get(sonido);
    if (!player) {
      player = createAudioPlayer(FUENTES[sonido]);
      players.set(sonido, player);
    }
    void player.seekTo(0).then(() => player.play()).catch(() => undefined);
  } catch {
    // Sin audio (navegador que bloquea la reproducción, por ejemplo) el aviso visual basta.
  }
}
