import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Segmented, Sheet, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { E1rmFormula } from '@/lib/gym/e1rm';
import { DEFAULT_BAR, oneRmTable, PLATES, platesPerSide, warmupRamp, type WarmupStep } from '@/lib/gym/tools';
import type { WeightUnit } from '@/types/domain';
import { useT } from '@/i18n';

type Herramienta = 'discos' | 'calentamiento' | '1rm';

const OPCIONES = [
  { value: 'discos' as const },
  { value: 'calentamiento' as const },
  { value: '1rm' as const },
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
  const h = useT().fitness.sheets;
  const [vista, setVista] = useState<Herramienta>('discos');
  const [peso, setPeso] = useState(topWeight ? String(topWeight) : '');
  const [reps, setReps] = useState('5');
  const barra = DEFAULT_BAR[unit];
  const objetivo = aNumero(peso);

  const discos = objetivo ? platesPerSide(objetivo, barra, PLATES[unit]) : null;
  const rampa = objetivo ? warmupRamp(objetivo, barra, unit === 'kg' ? 2.5 : 5) : [];
  const tabla = objetivo && aNumero(reps) ? oneRmTable(objetivo, aNumero(reps) as number, formula) : null;

  return (
    <Sheet visible={visible} onClose={onClose} title={h.toolsTitle}>
      <Segmented options={OPCIONES.map((o) => ({ value: o.value, label: h.tools[o.value] }))} value={vista} onChange={setVista} fullWidth />
      <View style={styles.fila}>
        <View style={styles.flex}>
          <TextField label={vista === 'calentamiento' ? h.topSet(unit) : h.weight(unit)} value={peso} onChangeText={setPeso} keyboardType="decimal-pad" placeholder={String(barra * 3)} />
        </View>
        {vista === '1rm' ? (
          <View style={styles.flex}>
            <TextField label={h.reps} value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="5" />
          </View>
        ) : null}
      </View>

      {vista === 'discos' && discos ? (
        <View style={[styles.caja, { backgroundColor: theme.surfaceAlt }]}>
          <AppText variant="label" color="textSecondary">
            {h.perSide(barra, unit)}
          </AppText>
          <AppText variant="heading" tabular>
            {discos.perSide.length > 0 ? discos.perSide.join(' + ') : h.barOnly}
          </AppText>
          {discos.remainder > 0 ? (
            <AppText variant="caption" color="today">
              {h.remainder(`${discos.achieved} ${unit}`, `${discos.remainder} ${unit}`)}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {vista === 'calentamiento' ? (
        rampa.length > 0 ? (
          <View style={[styles.caja, { backgroundColor: theme.surfaceAlt }]}>
            {rampa.map((p, i) => (
              <View key={i} style={styles.paso}>
                <AppText color="textSecondary">{h.setN(i + 1)}</AppText>
                <AppText variant="bodyStrong" tabular>
                  {p.weight} {unit} × {p.reps}
                </AppText>
              </View>
            ))}
            {onAddWarmup ? <Button title={h.addAsWarmup} variant="secondary" onPress={() => onAddWarmup(rampa)} /> : null}
          </View>
        ) : (
          <AppText color="textSecondary">{h.warmupHint}</AppText>
        )
      ) : null}

      {vista === '1rm' && tabla ? (
        <View style={[styles.caja, { backgroundColor: theme.surfaceAlt }]}>
          <AppText variant="label" color="textSecondary">
            {h.estimatedMax(formula === 'epley' ? 'Epley' : 'Brzycki')}
          </AppText>
          <AppText variant="title" tabular>
            ≈ {tabla.e1rm} {unit}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {h.estimatedMaxExplain}
          </AppText>
          {Number(reps) > 12 ? (
            <AppText variant="caption" color="today">
              {h.lowPrecision}
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
