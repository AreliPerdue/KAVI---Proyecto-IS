import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, DatePickerSheet, FieldButton, Sheet, SwitchRow } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatHour, fromDayKey, toDayKey, weekdayLabels, weekdayShort } from '@/lib/dates';
import { HORA_CIERRE_VUELTA } from '@/lib/list-runs';
import { parseRRule, type RecurrenceRule, toRRule } from '@/lib/recurrence';
import { useLanguage, useT } from '@/i18n';

type Opcion = { id: 'none' | 'daily' | 'weekdays' | 'monthly'; regla: RecurrenceRule | null };

const OPCIONES: Opcion[] = [
  { id: 'none', regla: null },
  { id: 'daily', regla: { freq: 'DAILY', byDay: [], until: null } },
  { id: 'weekdays', regla: { freq: 'WEEKLY', byDay: [0, 1, 2, 3, 4], until: null } },
  { id: 'monthly', regla: { freq: 'MONTHLY', byDay: [], until: null } },
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
  /** Día desde el que cuenta la regla (`recurrence_start`). */
  start: string | null;
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
export function ListRepeatSheet({ visible, onClose, rule, start, onChange }: ListRepeatSheetProps) {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const actual = rule ?? null;
  const reglaGuardada = parseRRule(actual);
  /*
   * Inicio y fin se conservan al cambiar de frecuencia: pasar de "todos los días" a
   * "lunes, miércoles y jueves" no tendría por qué olvidar que la rutina acaba con el
   * semestre. Sin inicio guardado, cuenta desde hoy.
   */
  const inicio = start ?? toDayKey(new Date());
  const hasta = reglaGuardada?.until ?? null;

  /** Qué selector de fecha está abierto, si alguno. */
  const [eligiendo, setEligiendo] = useState<'inicio' | 'fin' | null>(null);

  /** Guarda la regla con su inicio y su fin; la frecuencia viene de quien llama. */
  const guardar = (regla: RecurrenceRule, nuevoInicio = inicio, nuevoFin = hasta) => {
    // Terminar antes de empezar no significa nada: el fin se empuja al inicio.
    const fin = nuevoFin && nuevoFin < nuevoInicio ? nuevoInicio : nuevoFin;
    onChange(toRRule({ ...regla, until: fin }), nuevoInicio);
  };

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
    guardar({ freq: 'WEEKLY', byDay: siguientes, until: null });
  };

  /*
   * Elegir una opción ya no cierra la hoja, salvo "No se repite": debajo quedan el inicio
   * y el fin, y cerrar al primer toque los escondía justo cuando tocaba ajustarlos.
   */
  const elegir = (opcion: Opcion) => {
    setDiasElegidos(opcion.regla?.freq === 'WEEKLY' ? opcion.regla.byDay : []);
    if (!opcion.regla) {
      onChange(null, null);
      onClose();
      return;
    }
    guardar(opcion.regla);
  };

  /** Se compara sin el fin: "todos los días hasta diciembre" sigue siendo "todos los días". */
  const esActual = (opcion: Opcion) => {
    if (!opcion.regla) return actual === null;
    if (!reglaGuardada) return false;
    return toRRule({ ...reglaGuardada, until: null }) === toRRule(opcion.regla);
  };

  return (
    <>
    {/*
      La hoja se esconde mientras hay un selector de fecha abierto: dos `Modal` de React
      Native apilados se pelean por el frente y el de abajo puede tapar al de arriba.
    */}
    <Sheet visible={visible && eligiendo === null} onClose={onClose} title={tx.lists.repeatTitle}>
      <ScrollView contentContainerStyle={styles.cuerpo} showsVerticalScrollIndicator={false}>
        <AppText variant="caption" color="textTertiary">
          {tx.lists.repeatIntro}
        </AppText>

        {OPCIONES.map((o) => {
          const activa = esActual(o);
          return (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={tx.lists.repeatOptions[o.id]}
              onPress={() => elegir(o)}
              style={({ pressed }) => [
                styles.fila,
                activa ? { backgroundColor: theme.surfaceAlt, borderColor: theme.ink } : { borderColor: theme.border },
                pressed ? styles.pressed : null,
              ]}>
              <AppText variant="body" color={activa ? 'text' : 'textSecondary'}>
                {tx.lists.repeatOptions[o.id]}
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
            {tx.lists.orPickDays}
          </AppText>
          <View style={styles.dias}>
            {weekdayLabels(lang).map((etiqueta, i) => {
              const activo = diasElegidos.includes(i);
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={weekdayShort(lang)[i]}
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

        {/*
          Inicio y fin, igual que en las actividades (RF-L19b). Solo con la rutina puesta:
          sin regla no hay nada que empiece ni que termine.
        */}
        {reglaGuardada ? (
          <View style={styles.seccionDias}>
            <FieldButton label={tx.lists.starts} value={formatDate(fromDayKey(inicio), lang)} onPress={() => setEligiendo('inicio')} />
            <SwitchRow
              label={tx.lists.endsOnDate}
              hint={hasta ? undefined : tx.lists.endsHint}
              value={hasta !== null}
              onValueChange={(on) => guardar(reglaGuardada, inicio, on ? inicio : null)}
            />
            {hasta ? (
              <FieldButton label={tx.lists.until} value={formatDate(fromDayKey(hasta), lang)} onPress={() => setEligiendo('fin')} />
            ) : null}
          </View>
        ) : null}

        <AppText variant="caption" color="textTertiary">
          {tx.lists.runEditableUntil(formatHour(HORA_CIERRE_VUELTA, lang))}
        </AppText>
      </ScrollView>
    </Sheet>

    {reglaGuardada && eligiendo ? (
      <DatePickerSheet
        visible
        value={fromDayKey(eligiendo === 'inicio' ? inicio : (hasta ?? inicio))}
        title={eligiendo === 'inicio' ? tx.lists.startsOn : tx.lists.repeatsUntil}
        onClose={() => setEligiendo(null)}
        onSelect={(fecha) => {
          const dia = toDayKey(fecha);
          if (eligiendo === 'inicio') guardar(reglaGuardada, dia, hasta);
          else guardar(reglaGuardada, inicio, dia);
          setEligiendo(null);
        }}
      />
    ) : null}
    </>
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
