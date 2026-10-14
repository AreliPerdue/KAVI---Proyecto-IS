import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, IconButton, TextField } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { LibraryLayout, LibraryLayoutView } from '@/types/domain';

/**
 * Los acomodos guardados (spec 13a, RF-BL7b; T331), dentro de "Ordenar y filtrar" con "Como los acomodé":
 * guardar el de ahora con un nombre, usar uno (vuelve a acomodar todo como estaba) o borrarlo. Son de la
 * vista (portadas o lomos) y del lugar (Todos o el librero) donde se está.
 */
export function LayoutsSection({
  vista,
  lugar,
  acomodos,
  guardando,
  onGuardar,
  onUsar,
  onBorrar,
}: {
  vista: LibraryLayoutView;
  /** "Todos" o el nombre del librero. */
  lugar: string;
  acomodos: readonly LibraryLayout[];
  guardando: boolean;
  onGuardar: (nombre: string) => void;
  onUsar: (acomodo: LibraryLayout) => void;
  onBorrar: (acomodo: LibraryLayout) => void;
}) {
  const theme = useTheme();
  const a = useT().library.layouts;
  const [nombre, setNombre] = useState('');
  const limpio = nombre.trim();

  return (
    <View style={styles.seccion}>
      <AppText variant="label" color="textSecondary">
        {a.title(vista === 'spines' ? a.spines : a.covers, lugar)}
      </AppText>
      {acomodos.length === 0 ? (
        <AppText variant="caption" color="textTertiary">
          {a.empty}
        </AppText>
      ) : (
        acomodos.map((x) => (
          <View key={x.id} style={[styles.fila, { borderColor: theme.border }]}>
            <View style={styles.texto}>
              <AppText variant="body" numberOfLines={1}>
                {x.name}
              </AppText>
              <AppText variant="caption" color="textTertiary">
                {a.count(x.item_ids.length)}
              </AppText>
            </View>
            <Button title={a.use} variant="secondary" onPress={() => onUsar(x)} accessibilityLabel={a.useA11y(x.name)} />
            <IconButton label={a.remove(x.name)} onPress={() => onBorrar(x)}>
              <Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />
            </IconButton>
          </View>
        ))
      )}
      <TextField label={a.nameLabel} value={nombre} onChangeText={setNombre} placeholder={a.namePlaceholder} maxLength={60} returnKeyType="done" />
      <Button
        title={a.save}
        variant="secondary"
        disabled={!limpio || guardando}
        onPress={() => {
          onGuardar(limpio);
          setNombre('');
        }}
      />
      <AppText variant="caption" color="textTertiary">
        {a.hint}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: Spacing.sm },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  texto: { flex: 1, gap: 2 },
});
