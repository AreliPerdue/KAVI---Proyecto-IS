import { ErrorFallback } from "@/components/error-fallback";
import { type ErrorBoundaryProps } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useSharedBadgeCount } from "@/hooks/use-shared-badge";
import { useTheme } from "@/hooks/use-theme";

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorFallback {...props} />;
}

/** Tabs nativos (iOS/Android). La versión web vive en _layout.web.tsx. */
export default function TabsLayout() {
  const theme = useTheme();
  const badge = useSharedBadgeCount();

  return (
    <NativeTabs
      backgroundColor={theme.surface}
      tintColor={theme.ink}
      iconColor={{ default: theme.textTertiary, selected: theme.surface }}
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
