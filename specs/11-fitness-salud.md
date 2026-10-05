# Spec 11 · Fitness: actividad desde la plataforma de salud

> Aprobada el 4 oct 2026 (decisiones S1–S7 de `docs/fitness/propuesta-salud.md`, todas como se
> recomendaron). Amplía la spec 07 (Fitness v2); no la reemplaza: el Gym Tracker queda igual.

## 1. Qué cambia para la persona

Fitness tiene dos partes:

- **Actividad:** lo que el teléfono o el reloj ya miden: pasos, distancia y calorías activas del día,
  y los entrenamientos que otras apps registraron (una caminata del reloj, una clase de spinning).
- **Ejercicio:** el Gym Tracker de siempre, sin cambios.

Cada número dice de dónde viene: "Health Connect", "Registrado en KAVI" o "Estimación de KAVI". Nada se
presenta como medición si es un cálculo (RF-F65).

**Recuperación** (sueño, frecuencia cardiaca, carga) queda fuera de esta versión: ver §6.

## 2. Requisitos funcionales

- **RF-H1. Fuente por plataforma.** Android: Health Connect (Android 8 o superior; viene integrado desde
  Android 14). iOS: HealthKit, cuando exista la cuenta de Apple Developer. Web: no hay fuente.
- **RF-H2. Métricas de la primera versión, solo lectura:** pasos, distancia y calorías activas por día,
  y sesiones de ejercicio de otras apps (tipo, inicio, fin y, si la fuente lo da, calorías activas de esa
  sesión). Nada más.
- **RF-H3. Permisos en contexto.** Nada se pide al abrir la app. En Fitness → Actividad hay una tarjeta
  "Conecta tu actividad" que explica qué se lee y para qué ("Tus pasos y distancia, para verlos junto a tus
  entrenamientos. KAVI no los comparte ni los sube a internet"). Se pide un permiso por métrica, y la
  persona puede aceptar solo algunos.
- **RF-H4. Negar no rompe nada.** Sin permisos, o en un teléfono sin Health Connect, Actividad muestra un
  estado vacío con el porqué y cómo activarlo; el Gym Tracker funciona igual.
- **RF-H5. Procedencia visible.** Cada valor importado dice su fuente. Si la fuente reporta datos de varias
  apps (por ejemplo, el reloj y el teléfono), se usa el total que la propia plataforma ya consolida; KAVI
  no suma por su cuenta.
- **RF-H6. Relación con sesiones de KAVI.** Una sesión de ejercicio externa que se traslapa al menos la
  mitad con una sesión de KAVI se muestra **como la misma**: la sesión de KAVI gana y se le anexan, como
  dato importado, las calorías activas de la fuente si existen. No se duplica en la lista. KAVI nunca crea
  sesiones propias a partir de datos externos en esta versión.
- **RF-H7. Lo de otras apps se ve, no se edita.** Las sesiones externas aparecen en Actividad con su fuente
  y se pueden abrir para ver detalle, pero no se convierten en sesiones de KAVI.
- **RF-H8. Desconectar.** En Perfil → Gimnasio, "Datos de salud" muestra qué está conectado, lleva a los
  ajustes de la plataforma para quitar permisos y borra lo que KAVI tenga guardado en el dispositivo.

## 3. Privacidad y almacenamiento (decisión S4: solo en el dispositivo)

- **Nada de la plataforma de salud se guarda en Supabase.** KAVI lee al abrir Actividad y conserva solo la
  caché de la sesión de la app; "Desconectar" la borra (RF-H8).
- En México los datos de salud son datos personales sensibles: antes de pedir los permisos en producción
  debe estar publicado el **aviso de privacidad** de KAVI (decisión S7), enlazado desde Perfil.
- Pasar a guardar resúmenes diarios en el servidor (opción B de la propuesta) requiere otra decisión, con
  su propio consentimiento expreso.

## 4. Lo técnico

- **Dependencias** (gratuitas, nativas, piden recompilar): `react-native-health-connect` con
  `expo-build-properties` (sube `minSdkVersion` a 26) para Android; `@kingstinct/react-native-healthkit`
  para iOS, cuando exista la cuenta. Ninguna funciona en Expo Go.
- **Capa de datos** en `src/services/health/`, con la misma regla que el resto: los componentes no llaman a
  la plataforma directo. Un contrato `HealthApi` (`availability`, `requestPermissions`, `dailyTotals`,
  `exerciseSessions`) con tres implementaciones por extensión de Metro: `.android.ts` (Health Connect),
  `.ios.ts` (HealthKit; mientras no haya cuenta, "no disponible") y `.web.ts` (siempre "no disponible").
- **Modo demo:** una implementación con datos de ejemplo, para poder ver y probar Actividad en web sin un
  teléfono.
- **Relación con sesiones (RF-H6):** función pura en `src/lib/` que recibe sesiones de KAVI y externas y
  devuelve los pares; así se prueba sin teléfono.

## 5. Requisitos externos y tiempos

- **Google Play:** declaración de acceso a Health Connect en Play Console. Tarda hasta 7 días en
  aprobarse, más 5–7 días hábiles hasta que el acceso se habilita. Pide la política de privacidad
  publicada y justificar cada permiso.
- **Apple:** cuenta de Apple Developer (pendiente), permiso de HealthKit en el perfil de la app, textos que
  explican el uso y revisión con las reglas de datos de salud (no usarlos para publicidad ni guardarlos en
  iCloud).
- **Recompilar** la app nativa, igual que en G8.

## 6. Fuera de esta versión

Frecuencia cardiaca, sueño, recuperación y "carga de entrenamiento" (el documento base admite que no hay
metodología definida) · calorías estimadas por MET para sesiones de pesas (falsa precisión en pesas) ·
calorías por serie · escribir en HealthKit o Health Connect (por ejemplo, mandar las sesiones de KAVI) ·
crear sesiones de KAVI a partir de datos externos · cualquier afirmación médica.

## 7. Criterios de aceptación

- *Dado* que no di permisos, *cuando* abro Fitness → Actividad, *entonces* veo por qué está vacío y cómo
  conectarlo, y el Gym Tracker funciona igual.
- *Dado* que acepto solo pasos, *cuando* abro Actividad, *entonces* veo mis pasos con "Fuente: Health
  Connect" y no se piden otros datos.
- *Dado* una sesión de KAVI de 18:00 a 19:00 y una del reloj de 18:05 a 19:10, *cuando* abro el día,
  *entonces* veo una sola sesión, la de KAVI, con las calorías activas del reloj marcadas con su fuente.
- *Dado* que estoy en web, *cuando* abro Fitness, *entonces* veo el Gym Tracker y un aviso de que la
  actividad del teléfono se ve en la app.
- *Dado* que desconecto los datos de salud, *cuando* vuelvo a Actividad, *entonces* no queda nada guardado
  de la plataforma en el dispositivo.

## 8. Decisiones aprobadas

S1 enmienda de P5 y P8 · S2 Android primero, iOS con la cuenta de Apple Developer · S3 pasos, distancia,
kcal activas y sesiones de otras apps · S4 solo en el dispositivo · S5 la sesión de KAVI gana sobre la
externa que coincide · S6 sin escritura hacia las plataformas · S7 aviso de privacidad antes de la
declaración en Play Console.
