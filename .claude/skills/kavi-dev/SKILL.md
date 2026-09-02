---
name: kavi-dev
description: Reglas de ingeniería de KAVI (Expo SDK 57 + Expo Router + Supabase + TypeScript strict). Úsala SIEMPRE al crear o modificar código de la app: pantallas, componentes, hooks, services, migraciones. Incorpora las reglas de vercel-react-native-skills adaptadas al proyecto.
---

# kavi-dev — Cómo se escribe código en KAVI

Skill de proyecto. Complementa `CLAUDE.md`, `plan.md` y las specs. Si algo aquí contradice una spec, gana la spec.
Para decisiones visuales usa además la skill `kavi-design`.

## 0. Flujo de trabajo por tarea (SDD)
1. Localiza la tarea en `tasks.md` y su spec (RF/NFR). Léela antes de tocar código.
2. Consulta la doc versionada de Expo (`https://docs.expo.dev/versions/v57.0.0/`) para cualquier módulo `expo-*` que uses por primera vez.
3. Implementa el cambio mínimo que cumple los criterios Given/When/Then.
4. Ejecuta `pnpm typecheck` (= `tsc --noEmit`). Debe quedar limpio.
5. Marca `[x]` en `tasks.md` y haz commit `[Txxx] descripción en español`.

## 1. Estructura y capas
- Rutas Expo Router viven en `src/app/` (tiene precedencia sobre `app/` raíz en SDK 57). Grupos `(auth)` y `(app)`.
- `src/services/*.ts` son fachadas (auth, profiles, activities, themes…) sobre `services/backend.ts`, que elige la implementación: `services/supabase/*` (real) o `services/demo/*` (memoria, modo demo). Solo `services/supabase/*` importa `@/lib/supabase`. Componentes, hooks y pantallas nunca llaman a Supabase directo (NFR-6).
- Toda función nueva de datos se declara en `services/contracts.ts` y se implementa de inmediato en `services/demo/*`. Mientras dure la etapa frontend-first (Fases 1–7), la implementación Supabase puede ser un stub `notImplemented('nombre')` en `services/supabase/*`; la Fase 8 (T031) los sustituye. Nunca se deja un contrato sin al menos la implementación demo.
- `src/hooks/*` envuelven services con TanStack Query (`useQuery`/`useMutation`), claves de cache por rango de fechas y filtros.
- `src/lib/*` utilidades sin React: cliente Supabase, fechas (`date-fns` + `date-fns-tz`), notificaciones.
- `src/components/ui/*` primitivas del sistema de diseño (Button, Chip, Sheet, EmptyState, ErrorState…). `src/components/calendar/*` piezas del calendario.
- `src/constants/*` tokens de diseño, dimensiones, temas, iconos.
- `src/types/database.ts` se genera con `supabase gen types`; no se edita a mano.
- Importa el sistema de diseño desde un solo lugar: `@/components/ui` y `@/constants/theme` (regla `imports-design-system-folder`).

## 2. TypeScript
- `strict` sin `any`. Si es inevitable, `// justificación:` en la misma línea.
- Tipos de filas de BD vienen de `Database['public']['Tables'][...]`; los services exponen tipos de dominio (`Activity`, `Theme`…) derivados de ahí.
- Errores de services: lanzar `Error` con mensaje en español listo para UI, o devolver `{ data, error }` tipado; nunca `console.log` como manejo de error.

## 3. React Native / Expo (de vercel-react-native-skills)
Prioridad CRÍTICA → BAJA. Aplica todas.

### Listas (CRÍTICO)
- Listas largas (historial, contactos, ejercicios) virtualizadas: `FlatList`/`FlashList`, nunca `ScrollView` + `map` para >20 ítems.
- Items memoizados (`React.memo`), callbacks estables (`useCallback`), sin objetos/estilos inline dentro del item, `keyExtractor` estable.
- Trabajo caro (formateo de fechas, cálculos) fuera del render del item; hoistear `Intl.DateTimeFormat`/`Intl.NumberFormat` a módulo.

### Animación (ALTA)
- Solo `transform` y `opacity` con Reanimated; nunca animar `width/height/top/left` en layout.
- `useDerivedValue` para valores computados; gestos con `GestureDetector` cuando haya animación de press.
- Respetar `useReducedMotion()` (Reanimated) y acortar/omitir animaciones.

### Navegación (ALTA)
- Solo navegadores nativos: `Stack` de expo-router (native-stack) y `NativeTabs` (`expo-router/unstable-native-tabs`) en nativo; en web, `Tabs` de `expo-router/ui` (archivo `.web.tsx`).
- Preferir opciones nativas de header (`title`, `headerLargeTitleEnabled`, `headerSearchBarOptions`) sobre headers custom.
- Rutas tipadas (`typedRoutes` activo): usa `Href` tipado, nunca strings sin tipar.

### UI (ALTA)
- `Pressable` siempre; prohibido `TouchableOpacity`/`TouchableHighlight`. Dentro de listas con gesture-handler usa el `Pressable` de `react-native-gesture-handler`.
- `expo-image` para toda imagen (avatares). Nunca `Image` de RN.
- Estilos con `StyleSheet.create`. `gap` para separar hermanos, `padding` para espacio interno; nunca cadenas de `marginBottom`.
- `borderRadius` siempre acompañado de `borderCurve: 'continuous'`.
- Sombras con `boxShadow: '0 2px 8px rgba(0,0,0,0.1)'` (sintaxis CSS), no `shadow*`/`elevation`.
- Gradientes con `experimental_backgroundImage`, no librerías extra.
- Safe areas con `react-native-safe-area-context` (`useSafeAreaInsets`/`SafeAreaView`) en headers, barras y CTAs fijos; `contentInsetAdjustmentBehavior="automatic"` en ScrollViews bajo headers nativos.
- Medir con `onLayout`, nunca `measure()`.
- Modales/menús nativos cuando existan (`@expo/ui`, `expo-router` modal presentation) antes que overlays JS.

### Estado (MEDIA)
- Estado de servidor solo en TanStack Query; estado local mínimo en Zustand (vista seleccionada, filtros). Nada duplicado.
- Suscribirse al menor slice posible del store (`useStore(s => s.view)`).
- Mostrar fallback en el primer render (skeleton) en vez de parpadear contenido vacío.
- React Compiler está activo: destructura funciones de props/hook antes de usarlas en callbacks; no mutar shared values de Reanimated durante el render.

### Render (MEDIA)
- Todo texto dentro de `<Text>` (o `ThemedText`).
- Nunca `{valor && <X/>}` cuando `valor` pueda ser `0` o `""`: usa ternario con `null` o `!!valor`.

### Configuración (BAJA)
- Fuentes custom vía config plugin de `expo-font` en `app.json`, no `useFonts` en runtime.
- Dependencias con módulo nativo SOLO con `npx expo install` (versiones compatibles con SDK 57). Tras añadir una, si ya existe `ios/`/`android/` local, `npx expo prebuild --clean` cuando toque probar en nativo.

## 4. Supabase y datos
- Cliente único y perezoso en `src/lib/supabase.ts` (`getSupabase()`); storage `expo-secure-store` en nativo (cargado con `require` en el momento de uso) y storage por defecto en web; `autoRefreshToken` + `persistSession`; `detectSessionInUrl` solo en web.
- Modo demo: `lib/env.ts` expone `env.isDemoMode` (flag `EXPO_PUBLIC_DEMO_MODE=true` o credenciales ausentes). Cuenta demo `demo@kavi.app` / `demo1234`. Los datos viven en `services/demo/store.ts` y se reinician al recargar.
- Módulos nativos nuevos requieren recompilar la app (`npx expo run:ios` / `run:android`); si `ios/` o `android/` son anteriores a la instalación, aparece "Cannot find native module".
- Variables `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` leídas con notación de punto (`process.env.EXPO_PUBLIC_…`), nunca por corchetes ni destructuring (Expo las inyecta estáticamente).
- Toda tabla nueva: migración en `supabase/migrations/` con `enable row level security` + policies en el mismo archivo. Nunca `service_role` en el cliente.
- Fechas: guardar `timestamptz` UTC (`toISOString()`); mostrar con `date-fns` + locale `es`.
- Mutaciones: `useMutation` → `invalidateQueries` del rango afectado → (si aplica) `syncNotifications()`.

## 5. Estados obligatorios en cada pantalla con datos (NFR-11)
Carga (skeleton o spinner no bloqueante) · Vacío con texto útil e invitación a actuar · Error con botón "Reintentar" · Sin conexión ("Sin conexión") · Acciones destructivas con confirmación o undo.

## 6. Checklist antes de marcar una tarea
- [ ] Criterios Given/When/Then de la spec cumplidos
- [ ] `pnpm typecheck` limpio
- [ ] Sin llamadas a Supabase fuera de `src/services/`
- [ ] Textos de UI en español (es-MX), identificadores en inglés
- [ ] Reglas de §3 (Pressable, gap, borderCurve, listas virtualizadas, sin `&&` con falsy)
- [ ] Checklist de `kavi-design` si la tarea tocó UI
- [ ] `[x]` en `tasks.md` y commit `[Txxx] …`
