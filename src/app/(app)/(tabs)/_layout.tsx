import { ErrorFallback } from "@/components/error-fallback";
import { type ErrorBoundaryProps } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useSharedBadgeCount } from "@/hooks/use-shared-badge";
import { useTheme } from "@/hooks/use-theme";

/**
 * Sin esto, Expo Router elige por su cuenta qué pestaña abre y no siempre es la
 * primera declarada: la app arrancaba en Perfil o en Compartido. El calendario es
 * la pantalla principal del producto y es donde debe abrir (RF-C1).
 */
export const unstable_settings = { initialRouteName: 'calendar' };

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorFallback {...props} />;
}

/** Tabs nativos (iOS/Android). La versión web vive en _layout.web.tsx. */
export default function TabsLayout() {
  const theme = useTheme();
  const badge = useSharedBadgeCount();

  return (
    /*
     * Los tres colores de Android van explicitos. Sin `indicatorColor`, la pildora de
     * la pestana activa la elige Material 3 por su cuenta y salia casi negra: con el
     * icono en `ink` encima quedaba negro sobre negro, invisible al tocar. Aqui es un
     * gris del tema, que contrasta con el icono en los dos esquemas.
     */
    <NativeTabs
      backgroundColor={theme.background}
      tintColor={theme.ink}
      iconColor={{ default: theme.textTertiary, selected: theme.ink }}
      indicatorColor={theme.surfaceAlt}
      rippleColor={theme.surfaceAlt}
      labelVisibilityMode="labeled"
      labelStyle={{
        default: { color: theme.textTertiary },
        selected: { color: theme.ink },
      }}
    >
      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendario</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "calendar", selected: "calendar" }}
          md="calendar_month"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="shared">
        <NativeTabs.Trigger.Label>Compartido</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.2", selected: "person.2.fill" }}
          md="group"
        />
        {badge > 0 ? (
          <NativeTabs.Trigger.Badge>{String(badge)}</NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="fitness">
        <NativeTabs.Trigger.Label>Fitness</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "dumbbell", selected: "dumbbell.fill" }}
          md="fitness_center"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: "person.crop.circle",
            selected: "person.crop.circle.fill",
          }}
          md="person"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
