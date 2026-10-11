import { ArrowLeft, Minus, Plus, Timer } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, IconButton, Sheet } from '@/components/ui';
import { PROTOCOLS, protocolParam, type ProtocolGoal, type ProtocolKey, type ProtocolParam, type ProtocolParams } from '@/constants/intensifiers';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { protocolPreview, protocolSets } from '@/lib/gym/transforms';
import { formatWeight, fromKg, round, toKg } from '@/lib/gym/units';
import type { WeightUnit, WorkoutSet } from '@/types/domain';
import { useT } from '@/i18n';

export type ProtocolSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Peso de trabajo de partida: el de la última serie o el de la vez pasada, en kg. */
  baseKg: number | null;
  unit: WeightUnit;
  /** Cuántas series pendientes del ejercicio se van a reemplazar. */
  pendingCount: number;
  onApply: (key: ProtocolKey, params: ProtocolParams, baseKg: number | null) => void;
};

const METAS: (ProtocolGoal | 'all')[] = ['all', 'strength', 'hypertrophy', 'endurance', 'timed'];

/**
 * Aplicar un protocolo en dos pasos (RF-F46, T303).
 *
 * Antes era una lista plana de catorce renglones que se aplicaban al tocarlos, sin ver qué
 * series iban a salir ni poder cambiar nada. Ahora: (1) se elige entre protocolos agrupados por
 * objetivo, cada uno con su vista previa; (2) se ven las series que va a crear y se ajusta con
 * − / + lo que ese protocolo admite, y el peso base. Nada se escribe hasta "Aplicar".
 */
export function ProtocolSheet({ visible, onClose, ...rest }: ProtocolSheetProps) {
  const tx = useT();
  return (
    <Sheet visible={visible} onClose={onClose} title={tx.fitness.workout.protocolTitle} maxHeightRatio={0.92}>
      {visible ? <Contenido onClose={onClose} {...rest} /> : null}
    </Sheet>
  );
}

function Contenido({ onClose, baseKg, unit, pendingCount, onApply }: Omit<ProtocolSheetProps, 'visible'>) {
  const tx = useT();
  const theme = useTheme();
  const pr = tx.fitness.protocol;
  const [meta, setMeta] = useState<ProtocolGoal | 'all'>('all');
  const [elegido, setElegido] = useState<ProtocolKey | null>(null);
  const [params, setParams] = useState<ProtocolParams>({});
  const [base, setBase] = useState<number | null>(baseKg);

  const lista = useMemo(() => PROTOCOLS.filter((p) => meta === 'all' || p.goal === meta), [meta]);

  if (!elegido) {
    return (
      <>
        <AppText variant="caption" color="textSecondary">
          {tx.fitness.workout.protocolIntro}
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metas}>
          {METAS.map((m) => (
            <Chip key={m} compact label={pr.goals[m]} selected={meta === m} onPress={() => setMeta(m)} />
          ))}
        </ScrollView>
        {lista.map((p) => {
          const texto = tx.training.protocols[p.key];
          const vista = protocolPreview(p.key);
          return (
            <Pressable
              key={p.key}
              accessibilityRole="button"
              accessibilityLabel={pr.choose(texto.label, vista)}
              onPress={() => {
                setElegido(p.key);
                setParams({});
              }}
              style={({ pressed }) => [styles.tarjeta, { borderColor: theme.border }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
              <View style={styles.tarjetaCabeza}>
                <AppText variant="bodyStrong" style={styles.flex}>
                  {texto.label}
                </AppText>
                {p.timer ? <Timer size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} accessibilityLabel={pr.timed} /> : null}
                <AppText variant="label" color="textSecondary" tabular>
                  {vista}
                </AppText>
              </View>
              <AppText variant="caption" color="textSecondary">
                {texto.description}
              </AppText>
            </Pressable>
          );
        })}
      </>
    );
  }

  const info = PROTOCOLS.find((p) => p.key === elegido)!;
  const texto = tx.training.protocols[elegido];
  const series = protocolSets(elegido, 'vista', 1, base, unit, params);
  const ajustar = (param: ProtocolParam, delta: number) =>
    setParams((previos) => ({ ...previos, [param]: protocolParam(elegido, param, { [param]: protocolParam(elegido, param, previos) + delta }) }));
  // El peso base se mueve en lo que se puede cargar: 2.5 kg o 5 lb.
  const pasoBase = unit === 'kg' ? 2.5 : toKg(5, 'lb');
  const moverBase = (signo: 1 | -1) =>
    setBase((b) => {
      const actual = b ?? (signo > 0 ? 20 - pasoBase : 0);
      const siguiente = round(actual + signo * pasoBase, 2);
      return siguiente <= 0 ? null : siguiente;
    });

  return (
    <>
      <View style={styles.cabeza}>
        <IconButton label={pr.change} onPress={() => setElegido(null)}>
          <ArrowLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        <AppText variant="heading" style={styles.flex}>
          {texto.label}
        </AppText>
      </View>
      <AppText variant="caption" color="textSecondary">
        {texto.description}
      </AppText>

      <Ajuste
        etiqueta={elegido === 'five_three_one' ? pr.baseTrainingMax : pr.base}
        valor={base === null ? '—' : formatWeight(base, unit)}
        onMenos={() => moverBase(-1)}
        onMas={() => moverBase(1)}
        puedeMenos={base !== null}
        puedeMas
      />
      <AppText variant="caption" color="textTertiary">
        {base === null ? pr.noBase : pr.baseHint}
      </AppText>

      {info.params.map((d) => {
        const valor = protocolParam(elegido, d.key, params);
        return (
          <Ajuste
            key={d.key}
            etiqueta={pr.params[d.key]}
            valor={String(valor)}
            onMenos={() => ajustar(d.key, -d.step)}
            onMas={() => ajustar(d.key, d.step)}
            puedeMenos={valor > d.min}
            puedeMas={valor < d.max}
          />
        );
      })}

      <View style={[styles.vista, { backgroundColor: theme.surfaceAlt }]}>
        <AppText variant="label" color="textSecondary">
          {pr.preview}
        </AppText>
        {series.map((s, i) => (
          <View key={s.id} style={styles.filaSerie}>
            <AppText variant="caption" color="textTertiary" style={styles.numero}>
              {pr.setRow(i + 1)}
            </AppText>
            <AppText variant="body" tabular>
              {resumenSerie(s, unit)}
            </AppText>
          </View>
        ))}
        {info.timer ? (
          <View style={styles.filaSerie}>
            <Timer size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
            <AppText variant="caption" color="textSecondary" tabular>
              {protocolPreview(elegido, params)}
            </AppText>
          </View>
        ) : null}
      </View>

      <AppText variant="caption" color="textTertiary">
        {pr.replaces(pendingCount)}
      </AppText>
      <Button
        title={pr.apply}
        onPress={() => {
          onApply(elegido, params, base);
          onClose();
        }}
      />
    </>
  );
}

/** "80 kg × 12", "100 kg × 8–12", "20 s", "— × 5". */
function resumenSerie(s: WorkoutSet, unit: WeightUnit): string {
  const kg = s.segments[0]?.weight_kg ?? null;
  const t = s.target;
  const reps = t?.reps_min ? (t.reps_max && t.reps_max !== t.reps_min ? `${t.reps_min}–${t.reps_max}` : String(t.reps_min)) : null;
  const tiempo = t?.duration_sec ? (t.duration_sec >= 60 && t.duration_sec % 60 === 0 ? `${t.duration_sec / 60} min` : `${t.duration_sec} s`) : null;
  const peso = kg === null ? '—' : `${round(fromKg(kg, unit), unit === 'kg' ? 1 : 0)} ${unit}`;
  return [peso, reps ?? tiempo].filter(Boolean).join(' × ');
}

function Ajuste({
  etiqueta,
  valor,
  onMenos,
  onMas,
  puedeMenos,
  puedeMas,
}: {
  etiqueta: string;
  valor: string;
  onMenos: () => void;
  onMas: () => void;
  puedeMenos: boolean;
  puedeMas: boolean;
}) {
  const theme = useTheme();
  const pr = useT().fitness.protocol;
  return (
    <View style={styles.ajuste}>
      <AppText variant="body" style={styles.flex}>
        {etiqueta}
      </AppText>
      <IconButton label={pr.less(etiqueta)} onPress={onMenos} disabled={!puedeMenos}>
        <Minus size={IconSize.action} strokeWidth={IconStroke} color={puedeMenos ? theme.text : theme.textTertiary} />
      </IconButton>
      <AppText variant="bodyStrong" tabular style={styles.valor} accessibilityLabel={`${etiqueta}: ${valor}`}>
        {valor}
      </AppText>
      <IconButton label={pr.more(etiqueta)} onPress={onMas} disabled={!puedeMas}>
        <Plus size={IconSize.action} strokeWidth={IconStroke} color={puedeMas ? theme.text : theme.textTertiary} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  metas: { gap: Spacing.xs, paddingVertical: Spacing.xs },
  tarjeta: { gap: 2, padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  tarjetaCabeza: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: -Spacing.sm },
  ajuste: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, minHeight: 48 },
  valor: { minWidth: 72, textAlign: 'center' },
  vista: { gap: Spacing.xs, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous' },
  filaSerie: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  numero: { width: 56 },
});
