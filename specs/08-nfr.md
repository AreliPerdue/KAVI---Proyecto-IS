# Spec 08 — Requisitos no funcionales (F6)

## Rendimiento
- NFR-1. Vistas del calendario renderizan actividades en ≤ 3 s con conexión normal (P9). Estrategia: query por rango visible (`start_at` entre inicio/fin de vista ± buffer), índice `(owner_id, start_at)`, cache en memoria por rango, prefetch del mes anterior/siguiente.
- NFR-2. Navegar entre meses/semanas ya cacheados: sin spinner bloqueante.
- NFR-3. Listas largas (historial, contactos) virtualizadas (FlatList).

## Seguridad y privacidad
- NFR-4. RLS en el 100% de las tablas; tests de RLS automatizados que verifican los criterios de la spec 02 con dos usuarios de prueba.
- NFR-5. El cliente usa solo la anon key; nunca la service key. Claves vía variables `EXPO_PUBLIC_*` en `.env` (fuera del repo).
- NFR-6. Toda mutación pasa por `src/services/` (un solo lugar auditable).
- NFR-7. Datos sensibles de sesión en SecureStore (nativo).

## Compatibilidad (P5)
- NFR-8. iOS, Android y web con paridad funcional. Matriz de pruebas por feature en las 3 plataformas antes de cerrar cada fase.
- NFR-9. Web responsive: el calendario aprovecha pantallas anchas (semana visible completa); móvil prioriza vista diaria/mensual.
- NFR-10. Notificaciones: locales en iOS/Android; en web, degradación documentada a banner in-app (RF-C10).

## UX y estados
- NFR-11. Todos los fetch muestran carga (skeleton/spinner), vacío con mensaje útil, y error con botón reintentar.
- NFR-12. Acciones destructivas con confirmación o undo (snackbar).
- NFR-13. Textos 100% en español; formatos de fecha/hora en es-MX, con **hora en formato de 24 h** (`14:30`).
- NFR-18. **Apariencia oscura por defecto**: la app se entrega en tema oscuro en las 3 plataformas (`userInterfaceStyle: "dark"` en `app.json` y `useResolvedScheme()` fijo en `dark`), sin seguir la preferencia del sistema. El sistema de color se deriva de dos anclas — tinta `#131313` y blanco contrastante `#F2F2F2` — que se intercambian entre temas; los tokens claros quedan definidos para un futuro ajuste de apariencia en Perfil. Todo par texto/fondo cumple ≥ 4.5:1 en ambos temas (ver `kavi-design`).
- NFR-19. **Identidad de marca**: el ícono de la app, el splash y el wordmark salen del logo oficial (`src/assets/icons/`). El ícono de launcher es la marca KAVI sobre tinta `#131313`; el splash es el logo con eslogan ("Plan more. be more.") sobre el mismo `#131313`, de modo que el splash nativo y `SplashView` se releven sin salto visible. El wordmark se escribe **KAVI** en **Moirai One** y el eslogan en **Poiret One** (`components/ui/Wordmark`), cargadas por partida doble: embebidas por el config plugin de `expo-font` y además en runtime por `useBrandFonts`, de modo que la marca se vea correcta sin recompilar; el eslogan solo aparece en el splash y en la pantalla de inicio de sesión. Ambas fuentes son exclusivas de la marca: el texto de interfaz sigue en la fuente del sistema (NFR-13). El splash se sostiene un mínimo de **3 s contados desde el arranque** (`SplashMinDuration`), aunque la sesión se haya restaurado antes; el splash nativo y `SplashView` se retiran en el mismo instante. Este piso aplica al arranque de la app y no afecta a NFR-1/P9, que miden el render del calendario ya dentro de la app.

## Calidad de código
- NFR-14. TypeScript strict sin `any` (salvo justificado con comentario). `npx tsc --noEmit` limpio antes de cada merge.
- NFR-15. Tipos de BD generados con `supabase gen types typescript` y usados en services.
- NFR-16. Migraciones SQL versionadas en `supabase/migrations/`; `db reset` reproducible con seeds.

## Tolerancia a fallos
- NFR-17. Sin conexión: la app abre, muestra el último rango cacheado en memoria de la sesión y avisa "Sin conexión"; mutaciones fallan con error claro (sin cola offline en V1).
