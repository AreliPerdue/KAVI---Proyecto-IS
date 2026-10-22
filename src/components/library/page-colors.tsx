import { StyleSheet, View } from 'react-native';

import { ActionRow, AppText } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export type RolDeColor = 'papel' | 'tinta' | 'acento';
export type ColoresElegidos = Partial<Record<RolDeColor, string | null>>;

/**
 * Las tres filas de "Colores de la página" (spec 13h, RF-CC12; T368): papel, tinta y acento, cada una con su muestra
 * (o "Como viene" si no se ha elegido). Tocar una pide el color; quien las usa abre el selector.
 */
export function PageColorRows({ valores, sinPapel = false, onElegir }: { valores: ColoresElegidos; sinPapel?: boolean; onElegir: (rol: RolDeColor) => void }) {
  const theme = useTheme();
  const c = useT().library.canvas.pageColors;
  const muestra = (hex: string | null | undefined) =>
    hex ? <View style={[styles.muestra, { backgroundColor: hex, borderColor: theme.border }]} /> : <View style={[styles.muestra, styles.vacia, { borderColor: theme.textTertiary }]} />;
  const fila = (rol: RolDeColor, nombre: string) => {
    const hex = valores[rol];
    return <ActionRow key={rol} icon={muestra(hex)} label={`${nombre} · ${hex ?? c.asIs}`} onPress={() => onElegir(rol)} />;
  };
  return (
    <View style={styles.cuerpo}>
      <AppText variant="caption" color="textSecondary">
        {c.hint}
      </AppText>
      {sinPapel ? null : fila('papel', c.paper)}
      {fila('tinta', c.ink)}
      {fila('acento', c.accent)}
    </View>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.xs },
  muestra: { width: 24, height: 24, borderRadius: 12, borderWidth: 1 },
  vacia: { borderStyle: 'dashed' },
});
