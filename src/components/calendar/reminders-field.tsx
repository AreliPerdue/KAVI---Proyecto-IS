import { Bell, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, Segmented, Sheet, TextField } from '@/components/ui';
import { describeOffset, REMINDER_PRESETS } from '@/constants/reminders';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';

type Unidad = 'min' | 'h' | 'd' | 'sem';

const UNIDADES: { value: Unidad; minutos: number }[] = [
  { value: 'min', minutos: 1 },
  { value: 'h', minutos: 60 },
  { value: 'd', minutos: 1440 },
  { value: 'sem', minutos: 10080 },
];

/** Un mes de antelación; más allá el recordatorio deja de tener sentido práctico. */
const MAX_OFFSET = 60 * 24 * 31;

export function offsetDesde(cantidad: string, unidad: Unidad): number | null {
  const n = Number.parseInt(cantidad, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const minutos = n * (UNIDADES.find((u) => u.value === unidad)?.minutos ?? 1);
  return minutos > MAX_OFFSET ? null : minutos;
}

/**
 * Recordatorios de una actividad (RF-C9).
 *
 * Los presets cubren lo habitual, pero no todo: alguien puede querer el aviso dos
 * minutos antes de una llamada o una semana antes de un vuelo. Por eso además de los
 * cinco atajos hay una opción de antelación libre, y los valores propios elegidos se
 * muestran como un chip más para poder quitarlos igual que los demás.
 */
export function RemindersField({ value, onChange }: { value: number[]; onChange: (offsets: number[]) => void }) {
  const tx = useT();
  const lang = useLanguage();
  const theme = useTheme();
  const [abierto, setAbierto] = useState(false);
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState<Unidad>('min');

  const alternar = (offset: number) =>
    onChange(value.includes(offset) ? value.filter((o) => o !== offset) : [...value, offset].sort((a, b) => a - b));

  /** Los que no son preset se pintan aparte para que también se puedan quitar. */
  const propios = value.filter((o) => !REMINDER_PRESETS.some((p) => p.offset === o));

  const propuesto = offsetDesde(cantidad, unidad);
  const yaEstaba = propuesto !== null && value.includes(propuesto);

  const confirmar = () => {
    if (propuesto === null) return;
    if (!value.includes(propuesto)) onChange([...value, propuesto].sort((a, b) => a - b));
    setCantidad('');
    setAbierto(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Bell size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        <AppText variant="label" color="textSecondary">
          {tx.calendar.reminders}
        </AppText>
      </View>
      <View style={styles.chips}>
        {REMINDER_PRESETS.map((preset) => (
          <Chip
            key={preset.offset}
            label={describeOffset(preset.offset, lang)}
            selected={value.includes(preset.offset)}
            onPress={() => alternar(preset.offset)}
          />
        ))}
        {propios.map((offset) => (
          <Chip key={offset} label={describeOffset(offset, lang)} selected onPress={() => alternar(offset)} />
        ))}
        <Chip
          label={tx.calendar.customize}
          selected={false}
          icon={<Plus size={14} strokeWidth={IconStroke} color={theme.textSecondary} />}
          onPress={() => setAbierto(true)}
        />
      </View>

      <Sheet visible={abierto} onClose={() => setAbierto(false)} title={tx.calendar.customReminderTitle}>
        <AppText color="textSecondary">{tx.calendar.customReminderQuestion}</AppText>
        <View style={styles.fila}>
          <View style={styles.cantidad}>
            <TextField
              label={tx.calendar.amount}
              value={cantidad}
              onChangeText={setCantidad}
              keyboardType="number-pad"
              placeholder="2"
              autoFocus
            />
          </View>
        </View>
        <Segmented options={UNIDADES.map((u) => ({ value: u.value, label: tx.calendar.units[u.value] }))} value={unidad} onChange={setUnidad} />
        {propuesto !== null ? (
          <AppText variant="label" color={yaEstaba ? 'textTertiary' : 'text'}>
            {yaEstaba ? tx.calendar.alreadyHaveReminder(describeOffset(propuesto, lang).toLowerCase()) : tx.calendar.willRemind(describeOffset(propuesto, lang).toLowerCase())}
          </AppText>
        ) : cantidad.trim() ? (
          <AppText variant="label" color="danger">
            {tx.calendar.reminderRange}
          </AppText>
        ) : null}
        <Button title={tx.calendar.add} onPress={confirmar} disabled={propuesto === null || yaEstaba} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  fila: { flexDirection: 'row', gap: Spacing.md },
  cantidad: { flex: 1 },
});
