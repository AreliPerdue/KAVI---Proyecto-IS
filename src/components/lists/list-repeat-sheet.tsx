import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Sheet } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toDayKey, WEEKDAY_LABELS, WEEKDAY_SHORT } from '@/lib/dates';
import { parseRRule, type RecurrenceRule, toRRule } from '@/lib/recurrence';

type Opcion = { id: string; label: string; regla: RecurrenceRule | null };

const OPCIONES: Opcion[] = [
  { id: 'none', label: 'No se repite', regla: null },
  { id: 'daily', label: 'Todos los días', regla: { freq: 'DAILY', byDay: [], until: null } },
  { id: 'weekdays', label: 'De lunes a viernes', regla: { freq: 'WEEKLY', byDay: [0, 1, 2, 3, 4], until: null } },
  { id: 'monthly', label: 'Una vez al mes', regla: { freq: 'MONTHLY', byDay: [], until: null } },
];

/** Qué días trae puesta una regla ya guardada; solo las semanales tienen. */
function diasDe(rule: string | null): readonly number[] {
  const regla = parseRRule(rule);
  return regla?.freq === 'WEEKLY' ? regla.byDay : [];
}

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

  /*
   * Los días se llevan en estado propio **mientras la hoja está abierta**, y se vuelven a
   * leer de la regla guardada cada vez que se abre.
   *
   * Leerlos de la regla en cada render parecía más limpio, pero perdía días: entre el toque
   * y la regla nueva hay un guardado de por medio, así que tocar "lun, mié, jue" seguido
   * calculaba el segundo y el tercero sobre una regla vieja y acababa con dos días. El
   * estado local no es una copia que se quede atrás: es lo que la persona lleva elegido en
   * esta sesión, y cada toque guarda el conjunto completo.
   */
  const [diasElegidos, setDiasElegidos] = useState<readonly number[]>(() => diasDe(actual));
  const estabaVisible = useRef(visible);
  useEffect(() => {
    if (visible && !estabaVisible.current) setDiasElegidos(diasDe(actual));
    estabaVisible.current = visible;
  }, [visible, actual]);

  const alternarDia = (indice: number) => {
    const siguientes = diasElegidos.includes(indice)
      ? diasElegidos.filter((d) => d !== indice)
      : [...diasElegidos, indice].sort((a, b) => a - b);
    setDiasElegidos(siguientes);
    // Sin ningún día no hay regla semanal que valga: equivale a no repetirse.
    if (siguientes.length === 0) return onChange(null, null);
    onChange(toRRule({ freq: 'WEEKLY', byDay: siguientes, until: null }), toDayKey(new Date()));
  };

  const elegir = (opcion: Opcion) => {
    setDiasElegidos(opcion.regla?.freq === 'WEEKLY' ? opcion.regla.byDay : []);
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

        {/*
          Los días sueltos resuelven lo que los presets no: "lunes, miércoles y jueves" no
          es ni diario ni entre semana. Van como chips y no como otra lista de opciones
          porque la combinación es libre y enumerarlas sería imposible.
        */}
        <View style={styles.seccionDias}>
          <AppText variant="label" color="textSecondary">
            O elige los días
          </AppText>
          <View style={styles.dias}>
            {WEEKDAY_LABELS.map((etiqueta, i) => {
              const activo = diasElegidos.includes(i);
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={WEEKDAY_SHORT[i]}
                  onPress={() => alternarDia(i)}
                  style={({ pressed }) => [
                    styles.dia,
                    activo
                      ? { backgroundColor: theme.ink, borderColor: theme.ink }
                      : { borderColor: theme.border },
                    pressed ? styles.pressed : null,
                  ]}>
                  <AppText variant="label" color={activo ? 'onInk' : 'textSecondary'}>
                    {etiqueta}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

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
  seccionDias: { gap: Spacing.sm, marginTop: Spacing.xs },
  dias: { flexDirection: 'row', gap: Spacing.xs },
  dia: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  pressed: { opacity: 0.75 },
});
