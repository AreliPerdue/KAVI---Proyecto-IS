# Propuesta · Fitness con datos de salud (HealthKit y Health Connect)

> **Estado: PROPUESTA, sin aprobar.** No se implementa nada de esto hasta que Areli apruebe las
> decisiones de la §9. Al aprobarse, la parte de producto pasa a `specs/11-fitness-salud.md`, la
> enmienda a `specs/00-constitution.md` y las tareas a `tasks.md`.
>
> Base: "KAVI Fitness · Arquitectura, desarrollo conceptual y glosario práctico" (oct 2026). Lo que
> ese documento pide y no requiere datos de salud ya está hecho (glosario RF-F64, estimaciones
> marcadas RF-F65, todo el Gym Tracker). Esta propuesta cubre lo que falta: leer actividad del
> teléfono o del reloj.

## 1. Qué cambia para la persona

Hoy Fitness es el Gym Tracker. Con esta propuesta, Fitness tendría dos partes:

- **Actividad:** lo que el teléfono o el reloj ya miden: pasos, distancia y calorías activas del día,
  y los entrenamientos que otras apps registraron (una caminata del reloj, una clase de spinning).
- **Ejercicio:** el Gym Tracker de siempre, sin cambios.

Cada número dice de dónde viene: "Health Connect", "Registrado en KAVI" o "Estimación de KAVI". Nada se
presenta como medición si es un cálculo (RF-F65).

**Recuperación** (sueño, frecuencia cardiaca, carga) queda fuera de esta versión: ver §7.

## 2. Enmienda a la constitución

Igual que con el upgrade del gym (decisión D1 de `docs/gym/AUDITORIA.md`), hace falta enmendar dos
principios. Texto propuesto:

- **P8 (alcance).** Agregar al alcance V2: *"Fitness amplio: lectura, con permiso explícito, de datos de
  actividad desde la plataforma de salud del dispositivo (Health Connect en Android y HealthKit en iOS).
  Solo lectura; sin escritura hacia esas plataformas ni métricas de recuperación en esta versión."*
- **P5 (multiplataforma).** Agregar una excepción documentada, como la de las notificaciones: *"La
  lectura de datos de salud existe solo en iOS y Android, porque la web no tiene acceso a ellos. En web,
  Fitness muestra el Gym Tracker completo y un aviso de que la actividad del teléfono se ve en la app."*

## 3. Requisitos funcionales propuestos

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

## 4. Privacidad y almacenamiento (la decisión más importante)

En México los datos de salud son **datos personales sensibles**: tratarlos pide consentimiento expreso y
un aviso de privacidad. Además, las dos tiendas exigen política de privacidad para estos permisos. KAVI
todavía no tiene ninguna. Dos caminos:

| | A · Solo en el dispositivo (recomendado) | B · Resúmenes diarios en Supabase |
|---|---|---|
| Qué se guarda | Nada en el servidor. Se lee de la plataforma al abrir Actividad; se guarda una copia local por día para no releer | Pasos, distancia y kcal activas **por día**, con su fuente, en una tabla con RLS por dueño |
| Se ve en web y en otros dispositivos | No | Sí |
| Carga legal y de seguridad | Mínima: los datos no salen del teléfono | Alta: datos sensibles en nuestra base; consentimiento expreso, derechos de acceso y borrado, y más revisión de las tiendas |
| Esfuerzo | Menor | Mayor (tabla, sincronización, borrado) |

Recomiendo **A** para la primera versión. Si después hace falta verlo en web, se puede pasar a B con su
propio aviso y consentimiento.

En cualquiera de los dos, hace falta publicar antes un **aviso de privacidad** de KAVI, que también sirve
para el resto de la app.

## 5. Lo técnico

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

## 6. Requisitos externos y tiempos

- **Google Play:** declaración de acceso a Health Connect en Play Console. Tarda hasta 7 días en
  aprobarse, más 5–7 días hábiles hasta que el acceso se habilita. Pide la política de privacidad
  publicada y justificar cada permiso.
- **Apple:** cuenta de Apple Developer (pendiente), permiso de HealthKit en el perfil de la app, textos que
  explican el uso y revisión con las reglas de datos de salud (no usarlos para publicidad ni guardarlos en
  iCloud).
- **Recompilar** la app nativa, igual que en G8.

## 7. Fuera de esta versión

Frecuencia cardiaca, sueño, recuperación y "carga de entrenamiento" (el documento base admite que no hay
metodología definida) · calorías estimadas por MET para sesiones de pesas (falsa precisión en pesas) ·
calorías por serie · escribir en HealthKit o Health Connect (por ejemplo, mandar las sesiones de KAVI) ·
crear sesiones de KAVI a partir de datos externos · cualquier afirmación médica.

## 8. Criterios de aceptación

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

## 9. Decisiones para Areli

| # | Decisión | Recomendación |
|---|---|---|
| S1 | Enmendar P8 y P5 como en §2 | Sí |
| S2 | Plataforma primero | Android (Health Connect); iOS cuando exista la cuenta de Apple Developer |
| S3 | Métricas de la primera versión | Pasos, distancia, kcal activas y sesiones de otras apps |
| S4 | Dónde se guardan | A · solo en el dispositivo |
| S5 | Sesiones externas que coinciden con una de KAVI | Se muestran como la misma; KAVI gana |
| S6 | Escribir hacia HealthKit o Health Connect | No en esta versión |
| S7 | Aviso de privacidad | Redactarlo y publicarlo antes de pedir la declaración en Play Console |

## 10. Tareas propuestas (al aprobarse)

1. Aviso de privacidad de KAVI publicado y enlazado desde Perfil.
2. Spec 11 y enmienda a la constitución.
3. Contrato `HealthApi`, implementación web y demo; pantalla Actividad con estados vacío, sin permisos y
   con datos (se puede hacer y probar en web con el demo).
4. Health Connect en Android: dependencias, permisos en contexto, lectura de totales y sesiones;
   recompilar.
5. Relación con sesiones de KAVI (RF-H6) y procedencia en cada valor.
6. Declaración en Play Console (la hace Areli; aquí se prepara el texto de cada permiso).
7. HealthKit en iOS, cuando exista la cuenta.
