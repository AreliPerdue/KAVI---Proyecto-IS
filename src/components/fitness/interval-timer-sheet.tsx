import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Sheet } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { success, tap } from '@/lib/haptics';
import { formatDuration } from '@/lib/gym/sets';
import { playSound } from '@/lib/sounds';
import { useGymStore } from '@/store/gym-store';

export type IntervalConfig = { workSec: number; restSec: number; rounds: number };

/**
 * Timer de intervalos para EMOM, Tabata, AMRAP por tiempo y densidad (RF-F46).
 *
 * Como el de descanso, se calcula desde la hora de inicio y no restando segundos: si la
 * pantalla se apaga, al volver marca bien. Cada cambio de fase vibra y pita (si los sonidos
 * están prendidos); el fin, con un aviso distinto.
 */
export function IntervalTimerSheet({ visible, title, config, onClose }: { visible: boolean; title: string; config: IntervalConfig | null; onClose: () => void }) {
  if (!config) return null;
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <Reloj config={config} />
    </Sheet>
  );
}

function Reloj({ config }: { config: IntervalConfig }) {
  const theme = useTheme();
  const [inicio, setInicio] = useState<number | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const fasePrevia = useRef<string | null>(null);
  const sonido = useGymStore((s) => s.timerSound);

  useEffect(() => {
    if (inicio === null) return;
    const t = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(t);
  }, [inicio]);

  const ciclo = config.workSec + config.restSec;
  const total = ciclo * config.rounds - config.restSec;
  const transcurrido = inicio === null ? 0 : Math.max(0, (ahora - inicio) / 1000);
  const terminado = inicio !== null && transcurrido >= total;
  const ronda = Math.min(config.rounds, Math.floor(transcurrido / ciclo) + 1);
  const enCiclo = transcurrido % ciclo;
  const trabajando = enCiclo < config.workSec || config.restSec === 0;
  const restante = terminado ? 0 : Math.ceil(trabajando ? config.workSec - enCiclo : ciclo - enCiclo);
  const fase = terminado ? 'fin' : `${ronda}-${trabajando ? 't' : 'd'}`;

  useEffect(() => {
    if (inicio === null) return;
    if (fasePrevia.current !== null && fasePrevia.current !== fase) {
      if (fase === 'fin') success();
      else tap();
      if (sonido) playSound(fase === 'fin' ? 'done' : 'tick');
    }
    fasePrevia.current = fase;
  }, [fase, inicio, sonido]);

  return (
    <>
      <View
        accessibilityRole="timer"
        accessibilityLabel={terminado ? 'Terminado' : `Ronda ${ronda} de ${config.rounds}, ${trabajando ? 'trabajo' : 'descanso'}, faltan ${restante} segundos`}
        style={[styles.reloj, { backgroundColor: trabajando && !terminado && inicio !== null ? theme.ink : theme.surfaceAlt }]}>
        <AppText variant="label" color={trabajando && !terminado && inicio !== null ? 'onInk' : 'textSecondary'}>
          {inicio === null ? 'Listo para empezar' : terminado ? 'Terminado' : trabajando ? 'Trabajo' : 'Descanso'}
        </AppText>
        <AppText variant="display" tabular color={trabajando && !terminado && inicio !== null ? 'onInk' : 'text'}>
          {formatDuration(inicio === null ? config.workSec : restante)}
        </AppText>
        {config.rounds > 1 ? (
          <AppText variant="caption" color={trabajando && !terminado && inicio !== null ? 'onInk' : 'textSecondary'} tabular>
            Ronda {inicio === null ? 1 : ronda} de {config.rounds}
          </AppText>
        ) : null}
      </View>
      {inicio === null || terminado ? (
        <Button
          title={terminado ? 'Otra vez' : 'Empezar'}
          onPress={() => {
            fasePrevia.current = null;
            setAhora(Date.now());
            setInicio(Date.now());
          }}
        />
      ) : (
        <Button title="Detener" variant="secondary" onPress={() => setInicio(null)} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  reloj: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xl, borderRadius: Radius.lg, borderCurve: 'continuous' },
});
