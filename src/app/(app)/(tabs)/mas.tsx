import { StyleSheet, View } from 'react-native';

import { AppText, Screen, Segmented, SettingsGroup, SettingsRow } from '@/components/ui';
import { type Accesos, elegirAcceso, MODULES, type ModuleId, moduleInfo } from '@/constants/modules';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useModuleNav } from '@/hooks/use-modules';
import { useSharedBadgeCount } from '@/hooks/use-shared-badge';
import { useTheme } from '@/hooks/use-theme';
import { usePreferencesStore } from '@/store/preferences-store';

const OPCIONES = MODULES.map((m) => ({ value: m.id, label: m.label }));

/**
 * Más (spec 01, RF-N1, RF-N3): el cuarto lugar fijo de la barra del teléfono. Lista todos los
 * módulos y es donde se eligen los dos accesos de la barra.
 */
export default function MasScreen() {
  const theme = useTheme();
  const { accesos, abrir } = useModuleNav();
  const setAccesos = usePreferencesStore((s) => s.setAccesos);
  const badge = useSharedBadgeCount();

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
              label={lugar === 0 ? 'Segundo lugar' : 'Tercer lugar'}
              below={<Segmented fullWidth options={OPCIONES} value={accesos[lugar]} onChange={(id) => elegir(lugar, id)} />}
            />
          );
        })}
      </SettingsGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: Spacing.xs + 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
