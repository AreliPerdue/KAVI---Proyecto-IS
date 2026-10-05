import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Screen, SettingsGroup, SettingsRow, Sheet } from '@/components/ui';
import { type Accesos, elegirAcceso, MODULES, type ModuleId, moduleInfo } from '@/constants/modules';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useModuleNav } from '@/hooks/use-modules';
import { useSharedBadgeCount } from '@/hooks/use-shared-badge';
import { useTheme } from '@/hooks/use-theme';
import { usePreferencesStore } from '@/store/preferences-store';

const LUGARES = ['Segundo lugar', 'Tercer lugar'] as const;

/**
 * Más (spec 01, RF-N1, RF-N3): el cuarto lugar fijo de la barra del teléfono. Lista todos los
 * módulos y es donde se eligen los dos accesos de la barra.
 */
export default function MasScreen() {
  const theme = useTheme();
  const { accesos, abrir } = useModuleNav();
  const setAccesos = usePreferencesStore((s) => s.setAccesos);
  const badge = useSharedBadgeCount();
  /** Lugar de la barra cuyo módulo se está eligiendo, o `null` con la hoja cerrada. */
  const [eligiendo, setEligiendo] = useState<0 | 1 | null>(null);

  const elegir = (lugar: 0 | 1, id: ModuleId) => setAccesos(elegirAcceso(accesos, lugar, id));
  const enBarra = (id: ModuleId) => (accesos as Accesos).includes(id);

  return (
    <Screen scroll maxWidth={640}>
      <AppText variant="title" accessibilityRole="header">
        Más
      </AppText>

      <SettingsGroup title="Módulos">
        {MODULES.map(({ id, label, Icon }) => {
          const pendientes = id === 'shared' ? badge : 0;
          return (
            <SettingsRow
              key={id}
              icon={<Icon size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
              label={label}
              hint={enBarra(id) ? 'En la barra' : undefined}
              right={
                pendientes > 0 ? (
                  <View style={[styles.badge, { backgroundColor: theme.today }]} accessibilityLabel={`${pendientes} pendientes`}>
                    <AppText variant="caption" color="onInk">
                      {pendientes}
                    </AppText>
                  </View>
                ) : undefined
              }
              onPress={() => abrir(id)}
            />
          );
        })}
      </SettingsGroup>

      <SettingsGroup
        title="Barra"
        footer="El Calendario siempre va primero y Más siempre al final. Si eliges un módulo que ya está en el otro lugar, se intercambian."
      >
        {([0, 1] as const).map((lugar) => {
          const { Icon } = moduleInfo(accesos[lugar]);
          return (
            <SettingsRow
              key={lugar}
              icon={<Icon size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
              label={LUGARES[lugar]}
              value={moduleInfo(accesos[lugar]).label}
              onPress={() => setEligiendo(lugar)}
            />
          );
        })}
      </SettingsGroup>

      {/*
        Hoja y no un control segmentado: con cuatro módulos "Compartido" ya no cabía y se
        partía en dos líneas, y con los que vengan cabrían menos.
      */}
      <Sheet visible={eligiendo !== null} onClose={() => setEligiendo(null)} title={eligiendo === null ? '' : LUGARES[eligiendo]}>
        {eligiendo !== null
          ? MODULES.map(({ id, label, Icon }) => {
              const elegido = accesos[eligiendo] === id;
              const otro = accesos[eligiendo === 0 ? 1 : 0] === id;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: elegido }}
                  accessibilityLabel={otro ? `${label}, está en el otro lugar; se intercambian` : label}
                  onPress={() => {
                    elegir(eligiendo, id);
                    setEligiendo(null);
                  }}
                  style={({ pressed }) => [styles.opcion, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
                  <Icon size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
                  <View style={styles.opcionTexto}>
                    <AppText>{label}</AppText>
                    {otro ? (
                      <AppText variant="caption" color="textTertiary">
                        Está en el otro lugar: se intercambian
                      </AppText>
                    ) : null}
                  </View>
                  {elegido ? <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.ink} /> : null}
                </Pressable>
              );
            })
          : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 52,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  opcionTexto: { flex: 1, gap: 2 },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: Spacing.xs + 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
