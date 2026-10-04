import { Check, Info, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, type TextStyle, View } from 'react-native';

import { AppText, IconButton, Sheet } from '@/components/ui';
import { INTENSIFIERS, type IntensifierKey } from '@/constants/intensifiers';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { normalizar } from '@/lib/gym/search';

const SIN_ANILLO: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle) : {};

export type IntensifierSheetProps = {
  visible: boolean;
  /** Los que ya tiene la serie: tocarlos los quita. */
  active: readonly string[];
  onClose: () => void;
  onToggle: (key: IntensifierKey, activo: boolean) => void;
};

/**
 * Intensificadores de una serie (RF-F44). Buscador, una línea de descripción y "cómo se
 * hace" a un toque. Elegir uno transforma la fila al momento; los que ya tiene la serie
 * aparecen marcados y se quitan con el mismo toque. Son componibles: una serie puede ser
 * rest-pause con parciales al final.
 */
export function IntensifierSheet({ visible, active, onClose, onToggle }: IntensifierSheetProps) {
  const theme = useTheme();
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);

  const lista = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return INTENSIFIERS;
    return INTENSIFIERS.filter((i) => [i.label, i.description, ...i.aliases].some((t) => normalizar(t).includes(q)));
  }, [busqueda]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Intensificador">
      <View style={[styles.buscador, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
        <Search size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Drop, myo, 21s, tempo…"
          placeholderTextColor={theme.textTertiary}
          accessibilityLabel="Buscar intensificador"
          autoCorrect={false}
          style={[styles.input, SIN_ANILLO, { color: theme.text }]}
        />
        {busqueda ? (
          <IconButton label="Limpiar búsqueda" onPress={() => setBusqueda('')}>
            <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
          </IconButton>
        ) : null}
      </View>

      {lista.map((i) => {
        const activo = active.includes(i.key);
        return (
          <View key={i.key} style={[styles.fila, { borderColor: activo ? theme.ink : theme.border, backgroundColor: activo ? theme.surfaceAlt : 'transparent' }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={activo ? `Quitar ${i.label}` : `Aplicar ${i.label}`}
              onPress={() => onToggle(i.key, !activo)}
              style={({ pressed }) => [styles.cuerpo, pressed ? styles.pressed : null]}>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{i.label}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {i.description}
                </AppText>
                {abierto === i.key ? (
                  <AppText variant="caption" color="textTertiary" style={styles.como}>
                    {i.howTo}
                  </AppText>
                ) : null}
              </View>
              {activo ? <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} /> : null}
            </Pressable>
            <IconButton label={`Cómo se hace ${i.label}`} onPress={() => setAbierto((a) => (a === i.key ? null : i.key))}>
              <Info size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
            </IconButton>
          </View>
        );
      })}
      {lista.length === 0 ? (
        <AppText color="textSecondary" style={styles.vacio}>
          Ninguno se llama así.
        </AppText>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  buscador: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48, paddingLeft: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  input: { flex: 1, fontSize: 16, paddingVertical: Spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', paddingLeft: Spacing.md },
  cuerpo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 56, paddingVertical: Spacing.sm },
  flex: { flex: 1, gap: 2 },
  como: { marginTop: Spacing.xs },
  vacio: { textAlign: 'center', padding: Spacing.lg },
  pressed: { opacity: 0.75 },
});
