import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Sheet } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toDayKey } from '@/lib/dates';
import { type RecurrenceRule, toRRule } from '@/lib/recurrence';

type Opcion = { id: string; label: string; regla: RecurrenceRule | null };

const OPCIONES: Opcion[] = [
  { id: 'none', label: 'No se repite', regla: null },
  { id: 'daily', label: 'Todos los días', regla: { freq: 'DAILY', byDay: [], until: null } },
  { id: 'weekdays', label: 'De lunes a viernes', regla: { freq: 'WEEKLY', byDay: [0, 1, 2, 3, 4], until: null } },
  { id: 'weekly', label: 'Una vez por semana', regla: { freq: 'WEEKLY', byDay: [], until: null } },
  { id: 'monthly', label: 'Una vez al mes', regla: { freq: 'MONTHLY', byDay: [], until: null } },
];

export type ListRepeatSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** RRULE actual de la lista, o `null` si no se repite. */
  rule: string | null;
  onChange: (rule: string | null, start: string | null) => void;
};

/**
 * Cada cuándo se repite una lista (RF-L19).
 *
 * Una lista que se repite deja de ser "cosas por hacer" y pasa a ser una **rutina**: cada
 * vuelta se registra y los elementos se despaloman para la siguiente. Por eso la hoja lo
 * dice con todas sus letras en vez de presentarlo como un ajuste más.
 *
 * Se ofrecen cinco opciones y no un constructor de reglas: las rutinas reales caen casi
 * siempre en una de ellas, y un selector de frecuencia, intervalo y días sería más
 * configuración de la que nadie quiere para "lavarme los dientes".
 */
export function ListRepeatSheet({ visible, onClose, rule, onChange }: ListRepeatSheetProps) {
  const theme = useTheme();
  const actual = rule ?? null;

  const elegir = (opcion: Opcion) => {
    if (!opcion.regla) {
      onChange(null, null);
    } else {
      // El ancla es hoy: "cada lunes" necesita saber desde qué lunes cuenta.
      onChange(toRRule(opcion.regla), toDayKey(new Date()));
    }
    onClose();
  };

  const esActual = (opcion: Opcion) =>
    opcion.regla ? actual === toRRule(opcion.regla) : actual === null;

  return (
    <Sheet visible={visible} onClose={onClose} title="¿Se repite?">
      <ScrollView contentContainerStyle={styles.cuerpo} showsVerticalScrollIndicator={false}>
        <AppText variant="caption" color="textTertiary">
          Una lista que se repite se vuelve una rutina: cada vuelta queda registrada y los
          elementos se despaloman para la siguiente.
        </AppText>

        {OPCIONES.map((o) => {
          const activa = esActual(o);
          return (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={o.label}
              onPress={() => elegir(o)}
              style={({ pressed }) => [
                styles.fila,
                activa ? { backgroundColor: theme.surfaceAlt, borderColor: theme.ink } : { borderColor: theme.border },
                pressed ? styles.pressed : null,
              ]}>
              <AppText variant="body" color={activa ? 'text' : 'textSecondary'}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}

        <AppText variant="caption" color="textTertiary">
          Una vuelta sigue editable hasta las 15:00 del día siguiente, por si apuntas lo de
          ayer en la mañana.
        </AppText>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.sm, paddingBottom: Spacing.md },
  fila: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  pressed: { opacity: 0.75 },
});
