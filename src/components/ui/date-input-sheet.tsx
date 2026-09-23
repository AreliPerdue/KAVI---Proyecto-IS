import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Button } from './button';
import { Sheet } from './sheet';
import { TextField } from './text-field';

import { Spacing } from '@/constants/theme';
import { formatDate, toDayKey } from '@/lib/dates';

/** Interpreta día, mes y año sueltos. `null` si no forman una fecha real. */
export function fechaDesde(dia: string, mes: string, anio: string): Date | null {
  const d = Number.parseInt(dia, 10);
  const m = Number.parseInt(mes, 10);
  const a = Number.parseInt(anio, 10);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(a)) return null;
  if (a < 1900 || a > 2200) return null;
  const fecha = new Date(a, m - 1, d);
  // `new Date(2026, 1, 31)` no falla: se desborda al 3 de marzo. Se comprueba que
  // los tres componentes sobrevivan, que es lo que descarta el 31 de febrero.
  if (fecha.getFullYear() !== a || fecha.getMonth() !== m - 1 || fecha.getDate() !== d) return null;
  return fecha;
}

/**
 * Selector de fecha escribiéndola, para cuando la fecha está lejos de hoy.
 *
 * El calendario mensual sirve para elegir un día cercano, pero exige tantos toques
 * como meses de distancia: para una fecha de nacimiento son cientos. Aquí se teclea.
 */
export function DateInputSheet({
  visible,
  value,
  title,
  onClose,
  onSelect,
  maxDate,
}: {
  visible: boolean;
  value: Date | null;
  title: string;
  onClose: () => void;
  onSelect: (date: Date) => void;
  /** Tope superior, p. ej. hoy para una fecha de nacimiento. */
  maxDate?: Date;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {/*
        La `key` remonta el formulario cada vez que se abre, que es la forma de
        partir del valor guardado sin sincronizar estado dentro de un efecto.
      */}
      <Campos key={String(visible)} value={value} maxDate={maxDate} onSelect={onSelect} />
    </Sheet>
  );
}

function Campos({
  value,
  maxDate,
  onSelect,
}: {
  value: Date | null;
  maxDate?: Date;
  onSelect: (date: Date) => void;
}) {
  const [dia, setDia] = useState(value ? String(value.getDate()) : '');
  const [mes, setMes] = useState(value ? String(value.getMonth() + 1) : '');
  const [anio, setAnio] = useState(value ? String(value.getFullYear()) : '');

  const fecha = fechaDesde(dia, mes, anio);
  const fueraDeRango = fecha !== null && maxDate !== undefined && toDayKey(fecha) > toDayKey(maxDate);
  const listo = fecha !== null && !fueraDeRango;
  const escribiendo = [dia, mes, anio].some((x) => x.trim().length > 0);

  return (
    <>
      <View style={styles.fila}>
        <View style={styles.celda}>
          <TextField label="Día" value={dia} onChangeText={setDia} keyboardType="number-pad" placeholder="15" maxLength={2} autoFocus />
        </View>
        <View style={styles.celda}>
          <TextField label="Mes" value={mes} onChangeText={setMes} keyboardType="number-pad" placeholder="9" maxLength={2} />
        </View>
        <View style={styles.celdaAnio}>
          <TextField label="Año" value={anio} onChangeText={setAnio} keyboardType="number-pad" placeholder="1998" maxLength={4} />
        </View>
      </View>

      {listo ? (
        <AppText variant="label">{formatDate(fecha)}</AppText>
      ) : escribiendo ? (
        <AppText variant="label" color="danger">
          {fueraDeRango ? 'Esa fecha todavía no ha llegado.' : 'Esa fecha no existe. Revisa el día, el mes y el año.'}
        </AppText>
      ) : null}

      <Button title="Guardar" disabled={!listo} onPress={() => fecha && onSelect(fecha)} />
    </>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: Spacing.md },
  celda: { flex: 1 },
  celdaAnio: { flex: 1.4 },
});
