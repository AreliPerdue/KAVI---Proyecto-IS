import { Timer, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '@/components/ui';
import { IconSize, IconStroke, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { success } from '@/lib/haptics';
import { formatDuration } from '@/lib/gym/sets';
import { playSound } from '@/lib/sounds';
import { useGymStore } from '@/store/gym-store';
import { useT } from '@/i18n';

/**
 * Descanso en curso (RF-F34).
 *
 * El tiempo restante se **calcula** cada segundo desde la hora de fin guardada, en vez de
 * restar uno a un contador: así sigue bien tras bloquear el teléfono, cambiar de pantalla o
 * cerrar la app. Al llegar a cero vibra (Android), avisa y se queda un momento; la
 * notificación del sistema cubre el caso de la pantalla apagada (en web no existe y este
 * aviso es el único, P5).
 */
export function RestTimerBar({ workoutId }: { workoutId: string }) {
  const theme = useTheme();
  const h = useT().fitness.sheets;
  const rest = useGymStore((s) => s.rest);
  const adjustRest = useGymStore((s) => s.adjustRest);
  const stopRest = useGymStore((s) => s.stopRest);
  const sonido = useGymStore((s) => s.timerSound);
  const [ahora, setAhora] = useState(() => Date.now());

  const activo = rest && rest.workoutId === workoutId;

  useEffect(() => {
    if (!activo) return;
    const t = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(t);
  }, [activo]);

  const restante = activo ? Math.max(0, Math.ceil((rest.endsAt - ahora) / 1000)) : 0;
  const termino = activo && restante === 0;

  // Cuenta regresiva audible: 3, 2, 1 (RF-F34).
  useEffect(() => {
    if (sonido && activo && restante >= 1 && restante <= 3) playSound('tick');
  }, [sonido, activo, restante]);

  useEffect(() => {
    if (!termino || !rest) return;
    // Si el descanso terminó hace rato (la app estaba cerrada), no se celebra al abrir.
    if (Date.now() - rest.endsAt < 3000) {
      success();
      if (sonido) playSound('done');
    }
    // Se queda unos segundos para que se vea, y luego se va solo.
    const t = setTimeout(stopRest, 8000);
    return () => clearTimeout(t);
  }, [termino, stopRest, rest, sonido]);

  if (!activo) return null;

  const progreso = rest.durationSec > 0 ? 1 - restante / rest.durationSec : 1;

  return (
    <View
      accessibilityRole="timer"
      accessibilityLabel={termino ? h.restOver : h.restLeft(formatDuration(restante))}
      style={[styles.barra, { backgroundColor: termino ? theme.ink : theme.surface, borderColor: theme.border, boxShadow: Shadow.floating }]}>
      <View style={[styles.progreso, { width: `${Math.min(100, progreso * 100)}%`, backgroundColor: theme.surfaceAlt }]} />
      <Timer size={IconSize.inline} strokeWidth={IconStroke} color={termino ? theme.onInk : theme.text} />
      <View style={styles.texto}>
        <AppText variant="bodyStrong" color={termino ? 'onInk' : 'text'} tabular>
          {termino ? h.restOver : formatDuration(restante)}
        </AppText>
        {rest.label ? (
          <AppText variant="caption" color={termino ? 'onInk' : 'textTertiary'} numberOfLines={1}>
            {h.nextUp(rest.label)}
          </AppText>
        ) : null}
      </View>
      {termino ? null : (
        <>
          <Boton etiqueta="−15" descripcion={h.minus15} onPress={() => adjustRest(-15)} />
          <Boton etiqueta="+15" descripcion={h.plus15} onPress={() => adjustRest(15)} />
        </>
      )}
      <IconButton label={h.endRest} onPress={stopRest}>
        <X size={IconSize.inline} strokeWidth={IconStroke} color={termino ? theme.onInk : theme.textSecondary} />
      </IconButton>
    </View>
  );
}

function Boton({ etiqueta, descripcion, onPress }: { etiqueta: string; descripcion: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={descripcion}
      onPress={onPress}
      style={({ pressed }) => [styles.boton, { backgroundColor: pressed ? theme.border : theme.surfaceAlt }]}>
      <AppText variant="label" tabular>
        {etiqueta}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 60,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  progreso: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  texto: { flex: 1 },
  boton: { minWidth: 48, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderCurve: 'continuous' },
});
