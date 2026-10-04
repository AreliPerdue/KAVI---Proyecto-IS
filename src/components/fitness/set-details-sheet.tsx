import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, Sheet, SwitchRow, TextField } from '@/components/ui';
import { GEAR } from '@/constants/intensifiers';
import { Spacing } from '@/constants/theme';
import { unusualCombination } from '@/lib/gym/transforms';
import { fromKg, round, toKg } from '@/lib/gym/units';
import type { LoadMods, WeightUnit, WorkoutSet } from '@/types/domain';

type Opcion<T> = { value: T; label: string };

const FALLOS: Opcion<WorkoutSet['failure']>[] = [
  { value: null, label: 'Sin fallo' },
  { value: 'technical', label: 'Técnico' },
  { value: 'muscular', label: 'Muscular' },
  { value: 'absolute', label: 'Absoluto' },
];
const ROMS: Opcion<WorkoutSet['rom']>[] = [
  { value: null, label: 'Completo' },
  { value: 'partial', label: 'Parcial' },
  { value: 'lengthened', label: 'Alargado' },
  { value: 'shortened', label: 'Acortado' },
];
const LADOS: Opcion<WorkoutSet['side']>[] = [
  { value: null, label: 'Bilateral' },
  { value: 'left', label: 'Izquierdo' },
  { value: 'right', label: 'Derecho' },
  { value: 'alternating', label: 'Alternado' },
];

const aNumero = (t: string): number | undefined => {
  const n = Number(t.replace(',', '.'));
  return t.trim() && Number.isFinite(n) && n >= 0 ? n : undefined;
};

export type SetDetailsSheetProps = {
  visible: boolean;
  set: WorkoutSet | null;
  unit: WeightUnit;
  onClose: () => void;
  onSave: (set: WorkoutSet) => void;
};

/**
 * Detalles de una serie (RF-F47): tipo de fallo, ROM, lado, tempo, carga extra, equipo y
 * spotter. Nada de esto está en la fila porque no se captura en cada serie: vive aquí, a
 * un toque, y se guarda al cerrar. Las combinaciones raras se avisan sin bloquear (RF-F48).
 */
export function SetDetailsSheet({ visible, set, unit, onClose, onSave }: SetDetailsSheetProps) {
  if (!set) return null;
  return (
    <Sheet visible={visible} onClose={onClose} title="Detalles de la serie">
      <Detalles key={set.id} set={set} unit={unit} onClose={onClose} onSave={onSave} />
    </Sheet>
  );
}

function Detalles({ set, unit, onClose, onSave }: Omit<SetDetailsSheetProps, 'visible' | 'set'> & { set: WorkoutSet }) {
  const [borrador, setBorrador] = useState(set);
  const mods = borrador.load_mods ?? {};
  const kg = (v: number | undefined) => (v === undefined ? '' : String(round(fromKg(v, unit), 1)));
  const [lastre, setLastre] = useState(kg(mods.added_kg));
  const [asistencia, setAsistencia] = useState(kg(mods.assistance_kg));
  const [cadenas, setCadenas] = useState(kg(mods.chains_kg));
  const [deficit, setDeficit] = useState(mods.deficit_cm === undefined ? '' : String(mods.deficit_cm));

  const cambiar = (patch: Partial<WorkoutSet>) => setBorrador((b) => ({ ...b, ...patch }));
  const cambiarMods = (patch: Partial<LoadMods>) => setBorrador((b) => ({ ...b, load_mods: { ...(b.load_mods ?? {}), ...patch } }));

  const guardar = () => {
    const enKg = (t: string) => {
      const n = aNumero(t);
      return n === undefined ? undefined : toKg(n, unit);
    };
    const load: LoadMods = {
      ...(borrador.load_mods ?? {}),
      added_kg: enKg(lastre),
      assistance_kg: enKg(asistencia),
      chains_kg: enKg(cadenas),
      deficit_cm: aNumero(deficit),
    };
    const limpio = Object.fromEntries(Object.entries(load).filter(([, v]) => v !== undefined && v !== '')) as LoadMods;
    onSave({ ...borrador, load_mods: Object.keys(limpio).length > 0 ? limpio : null });
    onClose();
  };

  const aviso = unusualCombination(borrador);

  const fila = <T,>(titulo: string, opciones: Opcion<T>[], valor: T, alElegir: (v: T) => void) => (
    <View style={styles.grupo}>
      <AppText variant="label" color="textSecondary">
        {titulo}
      </AppText>
      <View style={styles.chips}>
        {opciones.map((o) => (
          <Chip key={o.label} compact label={o.label} selected={valor === o.value} onPress={() => alElegir(o.value)} />
        ))}
      </View>
    </View>
  );

  return (
    <>
      {aviso ? (
        <AppText variant="caption" color="today">
          {aviso}
        </AppText>
      ) : null}
      {fila('Fallo', FALLOS, borrador.failure, (v) => cambiar({ failure: v }))}
      {fila('Rango de movimiento', ROMS, borrador.rom, (v) => cambiar({ rom: v }))}
      {fila('Lado', LADOS, borrador.side, (v) => cambiar({ side: v }))}
      <TextField
        label="Tempo"
        value={borrador.tempo ?? ''}
        onChangeText={(t) => cambiar({ tempo: t.trim() ? t.toUpperCase().slice(0, 20) : null })}
        placeholder="3-1-X-0"
        autoCapitalize="characters"
      />
      <View style={styles.dos}>
        <View style={styles.flex}>
          <TextField label={`Lastre (${unit})`} value={lastre} onChangeText={setLastre} keyboardType="decimal-pad" placeholder="0" />
        </View>
        <View style={styles.flex}>
          <TextField label={`Asistencia (${unit})`} value={asistencia} onChangeText={setAsistencia} keyboardType="decimal-pad" placeholder="0" />
        </View>
      </View>
      <View style={styles.dos}>
        <View style={styles.flex}>
          <TextField label={`Cadenas (${unit})`} value={cadenas} onChangeText={setCadenas} keyboardType="decimal-pad" placeholder="0" />
        </View>
        <View style={styles.flex}>
          <TextField label="Déficit (cm)" value={deficit} onChangeText={setDeficit} keyboardType="decimal-pad" placeholder="0" />
        </View>
      </View>
      <View style={styles.dos}>
        <View style={styles.flex}>
          <TextField label="Bandas" value={mods.bands ?? ''} onChangeText={(t) => cambiarMods({ bands: t.trim() ? t : undefined })} placeholder="Roja, ligera…" />
        </View>
        <View style={styles.flex}>
          <TextField label="Pines / bloques" value={mods.pin_height ?? ''} onChangeText={(t) => cambiarMods({ pin_height: t.trim() ? t : undefined })} placeholder="Altura 4" />
        </View>
      </View>
      <View style={styles.grupo}>
        <AppText variant="label" color="textSecondary">
          Equipo
        </AppText>
        <View style={styles.chips}>
          {GEAR.map((g) => {
            const puesto = borrador.gear.includes(g.value);
            return (
              <Chip
                key={g.value}
                compact
                label={g.label}
                selected={puesto}
                onPress={() => cambiar({ gear: puesto ? borrador.gear.filter((x) => x !== g.value) : [...borrador.gear, g.value] })}
              />
            );
          })}
        </View>
      </View>
      <SwitchRow label="Con spotter" value={borrador.spotter} onValueChange={(v) => cambiar({ spotter: v })} />
      <Button title="Guardar" onPress={guardar} />
    </>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  dos: { flexDirection: 'row', gap: Spacing.sm },
  flex: { flex: 1 },
});
