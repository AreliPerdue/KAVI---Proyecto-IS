import { BringToFront, Check, Lock, LockOpen, Pencil, Redo2, SendToBack, StickyNote, Trash2, Undo2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { Herramienta } from '@/lib/library/reader-protocol';
import type { LibraryAnnotation } from '@/types/domain';

type Props = {
  seleccionada: LibraryAnnotation | null;
  herramienta: Herramienta;
  /** En el libro real lo pegado solo se ve (T286). */
  enLibro: boolean;
  puedeDeshacer: boolean;
  puedeRehacer: boolean;
  onHerramienta: (h: Herramienta) => void;
  onDeshacer: () => void;
  onRehacer: () => void;
  onEscribir: () => void;
  onFrente: () => void;
  onAtras: () => void;
  onBloquear: () => void;
  onQuitar: () => void;
  onListo: () => void;
};

/**
 * Las herramientas sobre la página (spec 13c; T286), abajo del lector. Sin nada elegido: pegar un post-it,
 * deshacer y rehacer (RF-BH18). Con algo pegado elegido: escribir, traer al frente, mandar atrás, bloquear
 * (RF-BH16) y quitar.
 */
export function AnnotationToolbar(p: Props) {
  const theme = useTheme();
  const a = useT().library.annotations;
  const icono = (activo = true) => ({ size: IconSize.action, strokeWidth: IconStroke, color: activo ? theme.text : theme.textTertiary });

  if (p.seleccionada) {
    const bloqueada = p.seleccionada.locked;
    return (
      <View style={styles.contenedor}>
        {bloqueada ? (
          <AppText variant="caption" color="textSecondary" style={styles.aviso}>
            {a.lockedHint}
          </AppText>
        ) : null}
        <View style={styles.fila} accessibilityRole="toolbar">
          <IconButton label={a.write} onPress={p.onEscribir}>
            <Pencil {...icono()} />
          </IconButton>
          <IconButton label={a.toFront} onPress={p.onFrente}>
            <BringToFront {...icono()} />
          </IconButton>
          <IconButton label={a.toBack} onPress={p.onAtras}>
            <SendToBack {...icono()} />
          </IconButton>
          <IconButton label={bloqueada ? a.unlock : a.lock} onPress={p.onBloquear}>
            {bloqueada ? <Lock {...icono()} /> : <LockOpen {...icono()} />}
          </IconButton>
          <IconButton label={a.remove} onPress={p.onQuitar}>
            <Trash2 size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />
          </IconButton>
          <IconButton label={a.done} onPress={p.onListo}>
            <Check {...icono()} />
          </IconButton>
        </View>
      </View>
    );
  }

  const pegando = p.herramienta === 'postit';
  return (
    <View style={styles.contenedor}>
      {pegando || p.enLibro ? (
        <AppText variant="caption" color="textSecondary" style={styles.aviso}>
          {p.enLibro ? a.postitBook : a.postitOn}
        </AppText>
      ) : null}
      <View style={styles.fila} accessibilityRole="toolbar">
        <IconButton
          label={pegando ? a.cancelTool : a.postit}
          onPress={() => p.onHerramienta(pegando ? null : 'postit')}
          disabled={p.enLibro}
          style={pegando ? { backgroundColor: theme.ink } : null}>
          <StickyNote size={IconSize.action} strokeWidth={IconStroke} color={pegando ? theme.onInk : p.enLibro ? theme.textTertiary : theme.text} />
        </IconButton>
        <View style={[styles.separador, { backgroundColor: theme.border }]} />
        <IconButton label={a.undo} onPress={p.onDeshacer} disabled={!p.puedeDeshacer}>
          <Undo2 {...icono(p.puedeDeshacer)} />
        </IconButton>
        <IconButton label={a.redo} onPress={p.onRehacer} disabled={!p.puedeRehacer}>
          <Redo2 {...icono(p.puedeRehacer)} />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.lg },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderRadius: Radius.full, borderCurve: 'continuous' },
  separador: { width: 1, height: 24, marginHorizontal: Spacing.xs },
  aviso: { textAlign: 'center' },
});
