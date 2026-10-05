import { ErrorFallback } from "@/components/error-fallback";
import { type ErrorBoundaryProps } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { moduleInfo } from "@/constants/modules";
import { useSharedBadgeCount } from "@/hooks/use-shared-badge";
import { useTheme } from "@/hooks/use-theme";
import { usePreferencesStore } from "@/store/preferences-store";

/**
 * Sin esto, Expo Router elige por su cuenta qué pestaña abre y no siempre es la
 * primera declarada: la app arrancaba en Perfil o en Compartido. El calendario es
 * la pantalla principal del producto y es donde debe abrir (RF-C1).
 */
export const unstable_settings = { initialRouteName: 'calendar' };

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorFallback {...props} />;
}

/**
 * Tabs nativos (iOS/Android). La versión web vive en _layout.web.tsx.
 *
 * Cuatro lugares fijos (spec 01, RF-N1): Calendario, dos accesos y Más. Los accesos son
 * rutas propias que pintan el módulo elegido, en vez de mostrar u ocultar las pestañas de
 * cada módulo: en `NativeTabs` ocultar una pestaña en caliente reinicia el navegador y
 * una pestaña oculta no se puede abrir. Cambiar de módulo solo cambia etiqueta, icono y
 * contenido (RF-N4).
 */
export default function TabsLayout() {
  const theme = useTheme();
  const badge = useSharedBadgeCount();
  const accesos = usePreferencesStore((s) => s.accesos);

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
      {accesos.map((id, lugar) => {
        const modulo = moduleInfo(id);
        return (
          <NativeTabs.Trigger key={lugar} name={`acceso-${lugar + 1}`}>
            <NativeTabs.Trigger.Label>{modulo.label}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={modulo.sf as never} md={modulo.md as never} />
            {id === "shared" && badge > 0 ? (
              <NativeTabs.Trigger.Badge>{String(badge)}</NativeTabs.Trigger.Badge>
            ) : null}
          </NativeTabs.Trigger>
        );
      })}
      <NativeTabs.Trigger name="mas">
        <NativeTabs.Trigger.Label>Más</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }}
          md="apps"
        />
        {/* Si Compartido salió de la barra, sus pendientes se anuncian aquí (RF-N3). */}
        {!accesos.includes("shared") && badge > 0 ? (
          <NativeTabs.Trigger.Badge>{String(badge)}</NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>
      {/*
        * Las pantallas de cada módulo siguen en `(tabs)/` porque la web las usa como
        * pestañas. Aquí van siempre ocultas —nunca cambian, así que no reinician el
        * navegador— y se pintan dentro de `acceso-1`/`acceso-2` o apiladas desde Más.
        */}
      <NativeTabs.Trigger name="shared" hidden />
      <NativeTabs.Trigger name="fitness" hidden />
      <NativeTabs.Trigger name="profile" hidden />
    </NativeTabs>
  );
}
