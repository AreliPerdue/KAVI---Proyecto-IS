import { Crown, Dumbbell, Gauge, HeartPulse, Smile, Timer, Volume2, Weight } from 'lucide-react-native';
import type { ReactNode } from 'react';

import { Button, Segmented, SettingsGroup, SettingsRow, Toggle } from '@/components/ui';
import { TRATOS } from '@/constants/gymrat';
import { IconSize, IconStroke } from '@/constants/theme';
import { anyPermission, useHealthAvailability, useHealthConnection, useHealthPermissions } from '@/hooks/use-health';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { useConfirm, useSnackbar } from '@/providers';
import { HEALTH_METRICS } from '@/services/health';
import { useGymStore } from '@/store/gym-store';

/**
 * Ajustes del gym tracker (spec 07 v2, §10, RF-F67). Viven en Fitness (⚙) y no en Perfil desde
 * el 5 oct 2026. Son del dispositivo, como la apariencia: cada quien entrena en kg o en lb según el
 * gimnasio donde esté, no según su cuenta.
 */
export function FitnessSettings() {
  const theme = useTheme();
  const tx = useT();
  const weightUnit = useGymStore((s) => s.weightUnit);
  const effortScale = useGymStore((s) => s.effortScale);
  const e1rmFormula = useGymStore((s) => s.e1rmFormula);
  const restDefaultSec = useGymStore((s) => s.restDefaultSec);
  const dropPercent = useGymStore((s) => s.dropPercent);
  const seriousMode = useGymStore((s) => s.seriousMode);
  const trato = useGymStore((s) => s.trato);
  const timerSound = useGymStore((s) => s.timerSound);
  const setPref = useGymStore((s) => s.setPref);
  const icono = (Icono: typeof Weight) => <Icono size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />;

  return (
    <>
    <SettingsGroup title={tx.fitness.settings.logging}>
      <SettingsRow
        icon={icono(Weight)}
        label={tx.fitness.settings.weightUnit}
        hint={tx.fitness.settings.weightUnitHint}
        below={
          <Segmented
            fullWidth
            options={[{ value: 'kg', label: tx.fitness.settings.kilos }, { value: 'lb', label: tx.fitness.settings.pounds }]}
            value={weightUnit}
            onChange={(v) => setPref('weightUnit', v)}
          />
        }
      />
      <SettingsRow
        icon={icono(Gauge)}
        label={tx.fitness.settings.effort}
        hint={tx.fitness.settings.effortHint}
        below={
          <Segmented
            fullWidth
            options={[{ value: 'rir', label: tx.fitness.settings.rir }, { value: 'rpe', label: tx.fitness.settings.rpe }]}
            value={effortScale}
            onChange={(v) => setPref('effortScale', v)}
          />
        }
      />
      <SettingsRow
        icon={icono(Dumbbell)}
        label={tx.fitness.settings.e1rm}
        hint={tx.fitness.settings.e1rmHint}
        below={
          <Segmented
            fullWidth
            options={[{ value: 'epley', label: tx.fitness.settings.epley }, { value: 'brzycki', label: tx.fitness.settings.brzycki }]}
            value={e1rmFormula}
            onChange={(v) => setPref('e1rmFormula', v)}
          />
        }
      />
      <SettingsRow
        icon={icono(Timer)}
        label={tx.fitness.settings.rest}
        hint={tx.fitness.settings.restHint}
        below={
          <Segmented
            fullWidth
            options={[{ value: '60', label: '1 min' }, { value: '90', label: '1:30' }, { value: '120', label: '2 min' }, { value: '180', label: '3 min' }]}
            value={String(restDefaultSec) as '60' | '90' | '120' | '180'}
            onChange={(v) => setPref('restDefaultSec', Number(v))}
          />
        }
      />
      <SettingsRow
        icon={icono(Dumbbell)}
        label={tx.fitness.settings.drop}
        hint={tx.fitness.settings.dropHint}
        below={
          <Segmented
            fullWidth
            options={[{ value: '10', label: '10 %' }, { value: '20', label: '20 %' }, { value: '25', label: '25 %' }]}
            value={String(dropPercent) as '10' | '20' | '25'}
            onChange={(v) => setPref('dropPercent', Number(v))}
          />
        }
      />
      <SettingsRow
        icon={icono(Volume2)}
        label={tx.fitness.settings.timerSound}
        hint={tx.fitness.settings.timerSoundHint}
        right={<Toggle label={tx.fitness.settings.timerSound} value={timerSound} onValueChange={(v) => setPref('timerSound', v)} />}
      />
    </SettingsGroup>
    <SettingsGroup title={tx.fitness.settings.humor}>
      <SettingsRow
        icon={icono(Smile)}
        label={tx.fitness.settings.serious}
        hint={tx.fitness.settings.seriousHint}
        right={<Toggle label={tx.fitness.settings.serious} value={seriousMode} onValueChange={(v) => setPref('seriousMode', v)} />}
      />
      {seriousMode ? null : (
        <SettingsRow
          icon={icono(Crown)}
          label={tx.fitness.settings.voice}
          hint={tx.fitness.settings.voiceHint}
          below={<Segmented fullWidth options={TRATOS.map((o) => ({ value: o.value, label: tx.fitness.settings.voiceOptions[o.value] }))} value={trato} onChange={(v) => setPref('trato', v)} />}
        />
      )}
    </SettingsGroup>
    <SettingsGroup title={tx.fitness.tab.activity}>
      <DatosDeSalud icono={icono(HeartPulse)} />
    </SettingsGroup>
    </>
  );
}

/**
 * Datos de salud (spec 11, RF-H8): qué está conectado y desconectar. Desconectar olvida lo
 * leído; los permisos de la plataforma se quitan desde sus propios ajustes.
 */
function DatosDeSalud({ icono }: { icono: ReactNode }) {
  const tx = useT();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const disponible = useHealthAvailability();
  const estado = disponible.data;
  const permisos = useHealthPermissions(estado?.status === 'available');
  const { connect, disconnect } = useHealthConnection();

  if (!estado) return null;
  if (estado.status !== 'available') {
    return <SettingsRow icon={icono} label={tx.fitness.health.title} hint={tx.fitness.health.unavailable[estado.reason]} />;
  }
  const conectado = anyPermission(permisos.data);
  const que = HEALTH_METRICS.filter((m) => permisos.data?.[m.id]).map((m) => tx.fitness.health.metrics[m.id].toLowerCase());
  return (
    <SettingsRow
      icon={icono}
      label={tx.fitness.health.title}
      hint={
        conectado
          ? tx.fitness.health.connectedTo(tx.fitness.health.sources[estado.source], que.join(', '))
          : tx.fitness.health.notConnected
      }
      below={
        conectado ? (
          <Button
            title={tx.fitness.health.disconnect}
            variant="secondary"
            loading={disconnect.isPending}
            onPress={async () => {
              const ok = await confirm({
                title: tx.fitness.health.disconnectTitle,
                message: tx.fitness.health.disconnectMessage,
                confirmLabel: tx.fitness.health.disconnect,
              });
              if (ok) disconnect.mutate(undefined, { onSuccess: () => showSnackbar({ message: tx.fitness.health.disconnected }) });
            }}
          />
        ) : (
          <Button title={tx.fitness.health.connect} variant="secondary" loading={connect.isPending} onPress={() => connect.mutate(HEALTH_METRICS.map((m) => m.id))} />
        )
      }
    />
  );
}
