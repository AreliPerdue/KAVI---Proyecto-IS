import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Segmented, Sheet, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { E1rmFormula } from '@/lib/gym/e1rm';
import { DEFAULT_BAR, oneRmTable, PLATES, platesPerSide, warmupRamp, type WarmupStep } from '@/lib/gym/tools';
import type { WeightUnit } from '@/types/domain';

type Herramienta = 'discos' | 'calentamiento' | '1rm';

const OPCIONES = [
  { value: 'discos' as const, label: 'Discos' },
  { value: 'calentamiento' as const, label: 'Calentar' },
  { value: '1rm' as const, label: 'Máximo' },
];

export type ToolsSheetProps = {
  visible: boolean;
  onClose: () => void;
  unit: WeightUnit;
  formula: E1rmFormula;
  /** El peso más alto de este ejercicio en la sesión, para partir de ahí. */
  topWeight: number | null;
  /** Inserta la rampa como series de calentamiento antes de la primera. */
  onAddWarmup?: (steps: WarmupStep[]) => void;
};

const aNumero = (t: string) => {
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Herramientas del ejercicio (RF-F35): calculadora de discos, rampa de calentamiento y
 * calculadora de 1RM. Están en una hoja aparte porque no son parte del registro en vivo
 * (regla 6 del prompt: lo que agrega fricción, fuera de la fila).
 */
export function ToolsSheet({ visible, onClose, unit, formula, topWeight, onAddWarmup }: ToolsSheetProps) {
  const theme = useTheme();
  const [vista, setVista] = useState<Herramienta>('discos');
  const [peso, setPeso] = useState(topWeight ? String(topWeight) : '');
  const [reps, setReps] = useState('5');
  const barra = DEFAULT_BAR[unit];
  const objetivo = aNumero(peso);

  const discos = objetivo ? platesPerSide(objetivo, barra, PLATES[unit]) : null;
  const rampa = objetivo ? warmupRamp(objetivo, barra, unit === 'kg' ? 2.5 : 5) : [];
  const tabla = objetivo && aNumero(reps) ? oneRmTable(objetivo, aNumero(reps) as number, formula) : null;

  return (
    <Sheet visible={visible} onClose={onClose} title="Herramientas">
      <Segmented options={OPCIONES} value={vista} onChange={setVista} fullWidth />
      <View style={styles.fila}>
        <View style={styles.flex}>
          <TextField label={vista === 'calentamiento' ? `Top set (${unit})` : `Peso (${unit})`} value={peso} onChangeText={setPeso} keyboardType="decimal-pad" placeholder={String(barra * 3)} />
        </View>
        {vista === '1rm' ? (
          <View style={styles.flex}>
            <TextField label="Reps" value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="5" />
          </View>
        ) : null}
      </View>

      {vista === 'discos' && discos ? (
        <View style={[styles.caja, { backgroundColor: theme.surfaceAlt }]}>
          <AppText variant="label" color="textSecondary">
            Por lado, con barra de {barra} {unit}
          </AppText>
          <AppText variant="heading" tabular>
            {discos.perSide.length > 0 ? discos.perSide.join(' + ') : 'Solo la barra'}
          </AppText>
          {discos.remainder > 0 ? (
            <AppText variant="caption" color="today">
              Llega a {discos.achieved} {unit}; faltan {discos.remainder} {unit} que no salen con discos estándar.
            </AppText>
          ) : null}
        </View>
      ) : null}

      {vista === 'calentamiento' ? (
        rampa.length > 0 ? (
          <View style={[styles.caja, { backgroundColor: theme.surfaceAlt }]}>
            {rampa.map((p, i) => (
              <View key={i} style={styles.paso}>
                <AppText color="textSecondary">Serie {i + 1}</AppText>
                <AppText variant="bodyStrong" tabular>
                  {p.weight} {unit} × {p.reps}
                </AppText>
              </View>
            ))}
            {onAddWarmup ? <Button title="Agregar como calentamiento" variant="secondary" onPress={() => onAddWarmup(rampa)} /> : null}
          </View>
        ) : (
          <AppText color="textSecondary">Escribe el peso de tu serie fuerte para armar la rampa.</AppText>
        )
      ) : null}

      {vista === '1rm' && tabla ? (
        <View style={[styles.caja, { backgroundColor: theme.surfaceAlt }]}>
          <AppText variant="label" color="textSecondary">
            1RM estimado ({formula === 'epley' ? 'Epley' : 'Brzycki'})
          </AppText>
          <AppText variant="title" tabular>
            {tabla.e1rm} {unit}
          </AppText>
          {Number(reps) > 12 ? (
            <AppText variant="caption" color="today">
              Con más de 12 reps la estimación pierde precisión.
            </AppText>
          ) : null}
          {tabla.rows.map((r) => (
            <View key={r.pct} style={styles.paso}>
              <AppText color="textSecondary">{r.pct} %</AppText>
              <AppText tabular>
                {r.weight} {unit}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: Spacing.sm },
  flex: { flex: 1 },
  caja: { padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous', gap: Spacing.xs },
  paso: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 28, alignItems: 'center' },
});
