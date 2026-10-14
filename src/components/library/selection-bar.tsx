import { BookA, Copy, Highlighter, Strikethrough, Underline, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ColorSwatch, IconButton } from '@/components/ui';
import { COLORES_DE_ANOTACION, type EstiloDeSubrayado, ESTILOS_DE_SUBRAYADO } from '@/lib/library/annotations';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

const ICONO_DE_ESTILO = { highlight: Highlighter, underline: Underline, strike: Strikethrough } as const;

type Props = {
  colores: readonly string[];
  estilo: EstiloDeSubrayado;
  onEstilo: (estilo: EstiloDeSubrayado) => void;
  onColor: (hex: string) => void;
  /** La palabra a definir, si lo seleccionado es una (RF-BH8). */
  puedeDefinir: boolean;
  onDefinir: () => void;
  copiable: boolean;
  onCopiar: () => void;
  onCerrar: () => void;
};

/**
 * Lo que se hace con el texto seleccionado (spec 13c, RF-BH7 – RF-BH9; decisión B5), en el lugar de las
 * herramientas: subrayar con uno de los colores a la mano (el último primero) en el estilo elegido, definir
 * una palabra y copiar (si el libro lo deja).
 */
export function SelectionBar(p: Props) {
  const theme = useTheme();
  const tx = useT();
  const a = tx.library.annotations;
  const nombre = (hex: string) => {
    const c = COLORES_DE_ANOTACION.find((x) => x.hex.toUpperCase() === hex.toUpperCase());
    return c ? (tx.colors[c.id] ?? c.label) : hex;
  };
  const siguiente = ESTILOS_DE_SUBRAYADO[(ESTILOS_DE_SUBRAYADO.indexOf(p.estilo) + 1) % ESTILOS_DE_SUBRAYADO.length];
  const IconoEstilo = ICONO_DE_ESTILO[p.estilo];
  const icono = (activo = true) => ({ size: IconSize.action, strokeWidth: IconStroke, color: activo ? theme.text : theme.textTertiary });

  return (
    <View style={styles.fila} accessibilityRole="toolbar" accessibilityLabel={a.selectionBar}>
      {p.colores.map((hex) => (
        <ColorSwatch
          key={hex}
          hex={hex}
          size={26}
          selected={false}
          background={theme.background}
          label={a.highlightWith(nombre(hex), a.styles[p.estilo])}
          onPress={() => p.onColor(hex)}
        />
      ))}
      <IconButton label={a.styleNext(a.styles[p.estilo])} onPress={() => p.onEstilo(siguiente)}>
        <IconoEstilo {...icono()} />
      </IconButton>
      <View style={[styles.separador, { backgroundColor: theme.border }]} />
      {p.puedeDefinir ? (
        <IconButton label={a.define} onPress={p.onDefinir}>
          <BookA {...icono()} />
        </IconButton>
      ) : null}
      <IconButton label={p.copiable ? a.copy : a.copyBlocked} onPress={p.onCopiar} disabled={!p.copiable}>
        <Copy {...icono(p.copiable)} />
      </IconButton>
      <IconButton label={a.clearSelection} onPress={p.onCerrar}>
        <X {...icono()} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, flexWrap: 'wrap' },
  separador: { width: 1, height: 24, marginHorizontal: Spacing.xs },
});
