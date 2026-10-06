# Spec 07 — Fitness v2: gym tracker (F5)

> **Nota de alcance.** La v1 de esta spec fue un "mini gym tracker" de campos libres, sin
> catálogo ni estadísticas, como pedían P2 y P8 para la entrega del 26 de septiembre de 2026.
> Esta v2 la reemplaza ya entregado V1: hay catálogo, series estructuradas, PRs y métricas. La
> constitución no se modificó (decisión D1 de `docs/gym/AUDITORIA.md`); la tensión con P2/P8
> queda reconocida y aceptada aquí. Lo que P2 protege —registrar sin fricción— sigue siendo
> regla: **una serie normal se registra en dos toques o menos.**

## Objetivo
Un gym tracker al nivel de las mejores apps de registro, que sigue entrando **desde el
calendario** (P1, P6). Registra con detalle lo que de verdad pasó en la serie —drops,
rest-pause, parciales, RIR, notas— sin que capturarlo cueste más que hacerlo. Y lo hace
divertido para quien vive en el gym, sin que la diversión agregue un solo paso.

## Historias de usuario
- HU-F1. Abrir el registro desde mi actividad de gimnasio del calendario.
- HU-F2. Registrar una serie con las manos ocupadas: un toque si repetí lo de la vez anterior.
- HU-F3. Anotar exactamente lo que pasó: un drop set triple, un rest-pause, reps parciales, a qué RIR.
- HU-F4. Corregir después cualquier sesión pasada con la misma pantalla, y que mis PRs se recalculen.
- HU-F5. Encontrar cualquier ejercicio escribiendo como yo le digo ("RDL", "jalón", "banca").
- HU-F6. Ver mi progreso: PRs, e1RM, volumen por músculo.
- HU-F7. Que mi sesión no se pierda si se cierra la app a media serie.
- HU-F8. Decidir yo si una semana sin gym rompe mi racha.

---

## 1. Se conserva de v1

- RF-F1. En el detalle de una actividad con `is_gym=true`, botón **"Registrar entrenamiento"**
  (sin workout) o **"Ver entrenamiento"** (con workout). Relación 1:1 entre actividad y workout.
- RF-F2. Fitness ofrece el historial y **"Entrenamiento libre"** sin actividad (`activity_id` null).
- RF-F7. Historial cronológico descendente con nombre, fecha, número de ejercicios y duración. Además, volumen y PRs de la sesión (RF-F40).
- RF-F8. **Duplicar en…** una actividad de gym futura o como sesión libre, con o sin valores.
  **Corrección:** se copia también el nombre propio de la sesión (bug de v1: se perdía).
- RF-F9. Al activar "Actividad de gimnasio" en el formulario de actividad aparece el editor de
  ejercicios. Desde v2 usa **el mismo componente que el logger** (RF-F27), no una segunda tarjeta.
- RF-F10. Las sesiones sin actividad se pintan en el calendario como bloques derivados, ocultables desde Perfil.
- **Privacidad:** los workouts nunca se comparten, aunque la actividad sí. Borrar la actividad
  deja el workout como sesión libre (`set null`).
- **El texto libre de v1 no se pierde** (ver §9).

## 2. Modelo de datos

Jerarquía: **Sesión → (Grupo) → Ejercicio en sesión → Serie → Segmento.** El SQL vive en la
migración de la Fase G1; aquí las reglas.

- RF-F11. **Sesión** (`workouts`, tabla existente, extendida): `status` (`active | completed | discarded`),
  `ended_at`, `bodyweight_kg`, `energy` y `pump` (1–5), `tags[]`, `updated_at`, `edited_at` y `deleted_at`.
  `performed_at` es el inicio.
- RF-F12. **Grupo** (`exercise_groups`, nueva): superserie, biserie, triserie, serie gigante, circuito,
  pre-fatiga, post-fatiga, contraste y series pareadas, con `rounds` y `rest_after_round_sec`.
- RF-F13. **Ejercicio en sesión** (`workout_exercises`, existente, extendida): `exercise_id` (catálogo),
  `group_id` + `group_position` (A1, A2…), `protocol` + `protocol_config`, `rest_target_sec`, `notes`,
  `updated_at` y `deleted_at`. Las columnas de v1 (`name`, `sets`, `reps`, `weight`, `duration_minutes`)
  **se quedan** como texto original.
- RF-F14. **Serie** (`workout_sets`, nueva):
  - tipo de serie (§6.1) e intensificadores componibles (`text[]`, §6.2);
  - `target` (objetivo planeado), `rpe`, `rir`, tipo de fallo, tempo, ROM y lateralidad;
  - `load_mods` (lastre, asistencia, bandas, cadenas, déficit, pines), `gear[]` y `spotter`;
  - `rest_after_sec` (medido), `completed_at`, `notes` y `tags[]`.
- RF-F15. **Segmento** (`set_segments`, nueva): `kind`, `weight_kg`, `input_unit`, reps (más izquierda y derecha),
  reps parciales, forzadas y con trampa, `duration_sec`, `distance_m`, `rest_before_sec`, `variant_exercise_id` y `notes`.
  **Una serie normal es un segmento `main`; un drop set triple es una serie con cuatro segmentos.**
- RF-F16. Reglas transversales:
  - **Peso canónico en kg** (numérico con decimales) más la unidad en que se capturó. Se muestra en kg o lb según el ajuste.
  - **Volumen, e1RM y PRs se calculan**, no se capturan ni se guardan.
  - Borrado suave (`deleted_at`) y `updated_at` en todo.
  - Cada tabla hija lleva `owner_id` denormalizado, que un trigger copia del padre, para que **toda** política RLS sea `owner_id = auth.uid()`.
  - Los IDs se generan en el cliente (UUID v4) para crear sin esperar al servidor.

## 3. Sin esperar al servidor (local-first de la sesión activa)

- RF-F17. Durante una sesión activa, cada cambio se aplica **primero en el dispositivo**, guardado
  en el almacenamiento asíncrono (`lib/storage`), y se envía al servidor en segundo plano con `upsert` por id.
  La pantalla nunca espera la respuesta para avanzar.
- RF-F18. **A prueba de cierres:** si la app se cierra, al reabrirla se recupera la sesión activa con
  todo lo registrado y se reenvía lo pendiente. Reenviar no duplica nada, porque los IDs ya existen.
- RF-F19. Si el envío falla, la serie queda marcada como "pendiente de guardar" con un indicador discreto,
  y se reintenta sola. Esto aplica **solo a la sesión activa**: no es un modo offline general (NFR-17 sigue vigente para el resto de la app).

## 4. Catálogo de ejercicios

- RF-F20. Catálogo del sistema con **≥ 530 ejercicios** (Apéndice A de `prompt-gym-tracker-upgrade.md`), sembrado
  con `upsert` por `slug` (idempotente). Una sola fuente en el repo alimenta al demo y a la migración SQL.
- RF-F21. Campos: `slug`, `name_es`, `name_en`, `aliases[]`, `family`, músculos primarios y secundarios, equipo,
  patrón de movimiento, mecánica (compuesto o aislamiento), lateralidad y `tracking_type`
  (`weight_reps`, `bodyweight_reps`, `weighted_bodyweight`, `assisted_bodyweight`, `reps_only`,
  `duration`, `weight_duration`, `distance_duration`, `weight_distance`).
- RF-F22. **Búsqueda** tolerante a acentos, mayúsculas, alias y slang ("RDL", "hack", "jalón", "banca",
  "vuelos posteriores"). Orden: recientes > favoritos > coincidencia.
- RF-F23. Filtros por músculo, equipo, patrón y tipo. Lista virtualizada.
- RF-F24. **Personalizados**: crear, editar y archivar. **Escribir un nombre que no existe crea un
  ejercicio personalizado al vuelo**, para que siga siendo posible registrar "a tu manera".
- RF-F25. Favoritos y recientes por persona.
- RF-F26. Detalle del ejercicio: historial, mejor serie, gráfica de e1RM y de volumen, y nota fija (RF-F52).

## 5. Logger en vivo y edición

- RF-F27. Fila de serie: `# · Anterior · kg · Reps · RIR/RPE · ✓`. "Anterior" muestra la vez pasada en gris;
  tocarla la copia. **Registrar una serie normal: ✓ (si repites) o Anterior + ✓.**
- RF-F28. Reps con stepper ± y **teclado numérico propio** que no tapa la fila. **Modo contador:** botón grande
  que suma una rep por toque.
- RF-F29. Objetivo contra realizado: si el rango era 8–12 y hiciste 13, sugiere subir peso la próxima (doble progresión).
- RF-F30. Unilaterales con reps izquierda y derecha y aviso de desbalance. Parciales aparte (`10 + 4p`).
  Cronómetro para los ejercicios de tiempo o distancia.
- RF-F31. **Al marcar ✓:** guarda (RF-F17), arranca el descanso, detecta un PR (RF-F56) y precarga la siguiente serie.
- RF-F32. Sin salir de la fila: agregar, duplicar, `+ drop` y `+ mini-serie`.
- RF-F33. Deslizar a la izquierda borra (con deshacer) y a la derecha duplica. En web, los mismos comandos
  con botones visibles al final de cada serie; en una ventana angosta, un "⋮" que abre el menú de la serie (T265). Arrastrar reordena series y ejercicios.
- RF-F34. **Timer de descanso** guardado como hora de fin, no como cuenta regresiva: sobrevive a cambiar
  de pantalla y a bloquear el teléfono. Notificación local al terminar (en web, aviso dentro de la app, P5),
  ±15 s, y en superseries arranca al terminar la ronda. Pitidos en los últimos 3 s y al terminar, encima de
  la música y respetando el modo silencio; se apagan en Perfil ("Sonido de los timers").
- RF-F35. Herramientas: calculadora de discos, rampa de calentamiento a partir del top set y calculadora de 1RM.
- RF-F36. Peso corporal del día (opcional), para el volumen de dominadas lastradas o asistidas y de fondos.
- RF-F37. **Háptico** (`expo-haptics`) en iOS y Android al marcar ✓, contar una rep, cambiar de fase en un
  timer o lograr un PR. En web, nada.
- RF-F38. "Terminar sesión" la pasa a `completed` y muestra el resumen (RF-F59). "Descartar" la pasa a `discarded`.
- RF-F39. **Editar cualquier sesión pasada con la misma pantalla del logger.** Todo es editable: fecha y hora,
  duración, ejercicio (cambiarlo conserva las series), orden, tipo de serie, segmentos, intensificadores y notas.
  También convertir después del hecho: serie normal a drop set o rest-pause, partir o unir series, mover una
  serie a otro ejercicio, agrupar o desagrupar.
- RF-F40. Deshacer y rehacer mientras se edita. Borrar una sesión completa pide confirmación.
  Al guardar se recalculan volumen, e1RM, PRs y logros: **un PR editado a la baja deja de serlo.**
- RF-F41. Validaciones que no bloquean casos reales: peso 0 en máquina asistida, 0 reps en una serie fallida.
- RF-F42. Se guarda `edited_at` y se muestra "editado". En conflictos gana la última escritura, por serie.

## 6. Intensificadores

La interfaz es una hoja por serie con buscador, icono, una línea de descripción y "cómo se hace".
**Al elegir uno, la fila se transforma sola** en la estructura correcta (21s crea tres segmentos 7/7/7).
Las tablas completas (claves, cómo se registra, UX) son las de la §7 de `prompt-gym-tracker-upgrade.md`,
que se copian a `docs/gym/intensificadores.md` en la Fase G5. Aquí, las claves.

- RF-F43. **Tipos de serie** (uno por serie): `warmup` (no cuenta para volumen efectivo ni PR), `feeder`,
  `working` (por omisión), `top_set`, `backoff`, `failure`, `amrap`, `technique` y `max_test`.
- RF-F44. **Extensiones** (componibles, generan segmentos): `drop_set`, `strip_set`, `mechanical_drop`,
  `rest_pause`, `myo_reps`, `myo_match`, `dc_rest_pause`, `cluster`, `forced_reps`, `negatives`, `partials`,
  `one_and_half`, `twenty_ones`, `paused_reps`, `iso_hold`, `loaded_stretch`, `peak_contraction`, `tempo`,
  `super_slow`, `cheat_reps`, `burns`, `bfr`, `accommodating` y `dynamic_effort`.
  - Drop mecánico: al aplicarlo se elige la variante del tramo (mismo peso, otra variante). Se sugieren
    las del mismo grupo muscular y mecánica, primero con el mismo equipo y lo mejor de cada familia;
    cualquier otra, desde el catálogo. Tocar el tramo la cambia o la quita.
- RF-F45. **Agrupaciones:** `superset`, `compound_set`, `tri_set`, `giant_set`, `circuit`, `pre_exhaust`,
  `post_exhaust`, `contrast` y `paired_sets`. Se eligen varios ejercicios y se toca "Agrupar como…".
  Llevan etiquetas A1/A2 con color, el logger salta solo al siguiente del grupo y el descanso corre al terminar la ronda.
- RF-F46. **Protocolos:** `straight_sets`, `pyramid`, `reverse_pyramid`, `wave_loading`, `ladder`, `emom`,
  `amrap_time`, `tabata`, `density`, `fst7`, `gvt`, `widowmaker`, `heavy_light` y `hit`. Aplicar uno genera
  las series con objetivos y timers. EMOM y Tabata llevan cuenta regresiva y aviso.
- RF-F47. **Modificadores** en cualquier serie: RPE (1–10 en medios) o RIR (0–5+), según el ajuste y con
  conversión RIR ≈ 10 − RPE; tipo de fallo; ROM; lateralidad; carga (lastre, asistencia, déficit, pines);
  equipo (cinturón, straps, rodilleras, muñequeras, sleeves, coderas, zapatos); spotter.
- RF-F48. Las combinaciones raras muestran una advertencia suave y nunca bloquean.

## 7. Notas

- RF-F49. **Sesión:** nota libre y chips rápidos (energía 1–5, pump 1–5, "en ayunas", "con pre-entreno", "poco sueño").
- RF-F50. **Ejercicio en la sesión:** nota libre.
- RF-F51. **Serie:** nota corta y tags (técnica rota, dolor, con spotter, se sintió fácil, intento de PR).
- RF-F52. **Nota fija por ejercicio:** persiste entre sesiones y se muestra siempre arriba
  ("asiento en 4, respaldo en 2").
- RF-F53. Indicador visual donde hay nota y búsqueda de notas desde el historial.

## 8. Modo Gymrat

Regla: **la diversión nunca agrega pasos** al registro.

- RF-F54. Ajuste **"Modo serio"** que apaga el humor: sin microcopy de broma, sin animaciones de celebración
  y sin emojis. Los datos (PRs, logros) siguen visibles.
- RF-F55. Ajuste **"Cómo te hablo"**: rey, reina o neutral (neutral por omisión). El microcopy tiene variantes
  para cada trato y rota sin repetir la misma frase dos veces seguidas.
- RF-F56. **PRs en vivo:** peso máximo, reps a un peso, e1RM (Epley `w·(1+r/30)` o Brzycki `w·36/(37−r)`,
  configurable y confiable hasta unas 12 reps) y volumen por serie y por sesión. Celebración corta con
  badge en la serie; en Modo serio, solo el badge. Las series `warmup` no cuentan.
- RF-F57. **Logros:** Rey o Reina del Drop Set (50 drops; el nombre sigue el trato elegido), Myo-maníaco,
  Leg Day Survivor, Club 100/140/180 kg (banca, sentadilla, peso muerto), Racha de Hierro, Madrugador
  (antes de las 6) y Titán del Tonelaje.
  - Metas: 50 drops; 25 series de myo-reps; 10 sesiones de pierna (6 series efectivas de pierna o más);
    100 kg en banca, 140 kg en sentadilla y 180 kg en peso muerto, con barra y al menos una rep;
    12 semanas de racha; 5 sesiones empezadas antes de las 6 a. m.; 100,000 kg en total. En neutral, el
    primero se llama "Realeza del Drop Set".
  - Se calculan del historial y no se guardan: editar una sesión los recalcula, igual que los PRs.
- RF-F58. **Racha de Hierro: la racha no se pierde sola.**
  - La unidad es la **semana** (lunes a domingo) con al menos un entreno completado. No se cuentan días, porque el descanso es parte del entrenamiento y una racha diaria lo castigaría.
  - Cuando termina una semana sin entreno, la racha queda **en pausa**, no en cero. La próxima vez que abras Fitness, una tarjeta pregunta: *"La semana del 5 de octubre no registraste entreno. ¿Qué pasó?"*.
  - La tarjeta ofrece una nota libre opcional, chips (ocupada/o, enfermedad, viaje, descanso planeado, otro) y dos botones: **"Mi racha sigue"** y **"Reiniciar racha"**.
  - "Mi racha sigue" conserva la racha. La semana justificada no suma, pero tampoco rompe. "Reiniciar" la pone en cero.
  - **Decide la persona**, porque solo ella sabe si fue un mal día o si la racha dejó de motivarla. Sin respuesta, la racha sigue en pausa indefinidamente.
  - Las notas de semanas justificadas se ven en el calendario de entrenos.
  - Se guarda en `workout_streak_events` (semana, decisión, nota y chips), con RLS por dueño.
  - Las semanas vacías seguidas forman un solo hueco y se deciden juntas: tres semanas de vacaciones son
    una pregunta, no tres.
  - Cuenta una sesión que ya pasó y tiene al menos una serie marcada (o que es de v1, sin series
    estructuradas). Un plan del formulario de actividad (RF-F9) no cuenta antes de su hora ni si nunca
    se marcó nada. La misma regla vale para los logros.
  - La racha nace con la función: los huecos que terminaron antes de la semana del 28 de septiembre de
    2026 cuentan como reinicio y no se preguntan, para no abrir Fitness con meses de preguntas viejas.
- RF-F59. **Resumen al terminar:** duración, volumen, PRs, músculos trabajados y una equivalencia de tonelaje
  ("14,320 kg = 2.4 elefantes africanos"). "Compartir" manda la tarjeta del resumen como imagen con la hoja
  del sistema; en web, la del navegador o, si no acepta archivos, se descarga. Si la captura falla, se
  comparte como texto.
- RF-F60. **Volumen semanal por músculo** (series efectivas) con zonas de referencia visual, y calendario de entrenos.
  - Por grupo muscular (pecho, espalda, hombro…): una serie cuenta 1 para sus músculos primarios y ½ para los
    secundarios. La franja de referencia es 10–20 series por semana: orientación, no receta.
  - El calendario muestra las últimas 12 semanas, con las notas y motivos de las semanas justificadas.

## 9. Datos de v1

- RF-F61. Nada de v1 se borra ni se reescribe. Las columnas de texto quedan intactas.
- RF-F62. **Conversión en el cliente** con un único parser en TypeScript. Por cada ejercicio con texto y sin
  series, convierte lo inequívoco: `4 × "8/8/6/6" @ "80 kg"` da cuatro series de 80 kg; `"al fallo"` da series
  `failure`; `"corporal"` marca el ejercicio como de peso corporal. **Lo ambiguo no se adivina**
  (`"25 lb por lado"`, `"40kg + cadena"`): se crea lo seguro y el texto original queda visible con un botón "Revisar".
  Es idempotente y se puede revertir borrando las series convertidas.
- RF-F63. El nombre libre se liga al catálogo si la coincidencia es única; si no, se crea un ejercicio
  personalizado con ese nombre. Lo que no se pudo ligar se reporta en el detalle, no se descarta en silencio.

## 10. Ajustes del módulo (Fitness → ⚙ Ajustes, por dispositivo)
Unidad (kg o lb) · esfuerzo en RPE o RIR · cálculo del peso máximo estimado (Epley o Brzycki) · "Modo serio" ·
"Cómo te hablo" · % del drop por omisión (−20 %) · descanso por omisión · sonido de los timers · datos de salud
(spec 11).

- RF-F67. **Los ajustes viven en Fitness, no en Perfil** (feedback del 5 oct 2026: saturaban Perfil). Un ⚙ en
  el encabezado de Fitness abre "Ajustes de Fitness" con todo lo de arriba; Perfil ya no los muestra. Lo único
  que se queda en Perfil es "Entrenamientos en el calendario", porque es un ajuste del calendario (RF-F10).

## 10b. Pantalla de Fitness: bento

- RF-F66. **La pestaña Ejercicio arranca con un mosaico (bento)** en vez de una columna de botones, con lo que
  KAVI ya calcula del historial (nada se guarda aparte):
  - **Empezar:** la tarjeta más grande. "Entrenamiento libre" o, si hay una sesión abierta, "Sesión en curso"
    para retomarla.
  - **Racha de Hierro:** semanas que lleva; abre Progreso. Si la racha está en pausa, la tarjeta que pregunta qué
    pasó (RF-F58) va arriba del mosaico, a todo lo ancho, porque pide una decisión.
  - **Esta semana:** sesiones y volumen de la semana (lunes a domingo).
  - **Músculos de la semana:** los tres grupos con más series efectivas (RF-F60); abre Progreso.
  - **Logros:** cuántos lleva de cuántos; abre Progreso.
  - **Glosario:** abre el glosario (RF-F64).

  Debajo siguen la búsqueda de notas y el historial (RF-F7). En celular el mosaico va en 2 columnas; en pantallas
  anchas, en 4, y desde 1024 px el mosaico y el historial van lado a lado. Cada tarjeta se puede tocar y dice qué
  abre a quien usa lector de pantalla.

## 11. Glosario y estimaciones

Principio (documento "KAVI Fitness · Arquitectura, glosario y desarrollo conceptual", oct 2026): la
complejidad vive en el sistema, no en la experiencia. Entrenar en KAVI no debe exigir saber jerga de
gimnasio.

- RF-F64. **Glosario contextual.** Una sola fuente de términos (`src/constants/glossary.ts`), cada uno con
  *qué significa*, *un ejemplo* y *en pocas palabras*, en español latinoamericano; el término en inglés solo
  cuando ayuda a reconocerlo en otras apps. Tocar un término técnico abre su explicación: la columna de
  esfuerzo del logger (RIR/RPE), el peso máximo estimado del detalle del ejercicio, la Racha de Hierro y las
  series por músculo en Progreso. Dentro de una hoja la explicación se despliega en el sitio (sin modales
  anidados). Fitness tiene una pantalla **Glosario** con búsqueda sin acentos, agrupada por temas.
- RF-F65. **Las estimaciones se marcan.** Todo valor calculado y no registrado se muestra con "≈" y la palabra
  "estimado" o "estimación" (hoy: el peso máximo estimado). Lo registrado —peso, reps, volumen, PR— va sin
  marca. Nada se presenta como medición si es un cálculo.

## Reglas de negocio
- Los workouts y todo lo que cuelga de ellos (series, segmentos, grupos, notas, racha) son **privados**.
- Volumen efectivo: series no `warmup`, peso × reps del segmento, sumando todos los segmentos de la serie.
  En ejercicios de peso corporal se usa el peso del día (RF-F36) si existe.
- Un PR se calcula contra el historial **sin** la serie misma, y se recalcula al editar o borrar.
- Ningún cálculo bloquea un guardado.

## Criterios de aceptación
- *Dado* una serie con "Anterior" de 80 kg × 8, *cuando* toco ✓, *entonces* queda registrada 80 × 8 con un toque y arranca el descanso.
- *Dado* una serie de 100 kg × 8, *cuando* agrego tres drops, *entonces* es **una** serie con cuatro segmentos y el volumen suma los cuatro.
- *Dado* que la app se cierra con tres series sin confirmar por el servidor, *cuando* la reabro, *entonces* las tres siguen ahí y se guardan sin duplicarse.
- *Dado* un PR de 120 kg en sentadilla, *cuando* edito esa serie a 110 kg, *entonces* deja de ser PR y el anterior vuelve a serlo.
- *Dado* una superserie A1/A2, *cuando* termino A2, *entonces* el descanso arranca y el logger vuelve a A1.
- *Dado* que busco "rdl" o "peso muerto rumano", *cuando* escribo, *entonces* aparece "Peso muerto rumano con barra".
- *Dado* un ejercicio de v1 con reps "12/10/8" y peso "40kg + cadena", *cuando* se convierte, *entonces* hay tres series de 12, 10 y 8 reps y el texto "40kg + cadena" se sigue viendo tal cual.
- *Dado* una semana sin entrenos, *cuando* abro Fitness, *entonces* mi racha está en pausa y no en cero, y puedo escribir por qué y elegir si sigue o se reinicia.
- *Dado* que entrené dos veces esta semana, *cuando* abro Fitness en el celular, *entonces* veo el mosaico con
  "2 sesiones" y su volumen, mi racha y mis músculos de la semana, y el historial debajo.
- *Dado* que busco cambiar kg por lb, *cuando* abro Perfil, *entonces* ya no está ahí; *cuando* toco ⚙ en
  Fitness, *entonces* está en "Ajustes de Fitness".
- *Dado* "Modo serio" activo, *cuando* logro un PR, *entonces* veo el badge sin animación ni broma.
- *Dado* una actividad de gym compartida con B, *cuando* B abre el detalle, *entonces* B no ve el entrenamiento de A.

## Fuera de alcance de esta versión
Plantillas de rutina (los objetivos por serie y "Duplicar" cubren el caso) · dependencias nuevas, incluidas
háptico en iOS e IDs criptográficos · modo offline general · compartir entrenamientos con otras personas.

## UI
- Rutas: historial en `/(app)/fitness`; sesión, logger y edición en `/(app)/workout/[id]`; detalle del ejercicio en `/(app)/exercise/[id]`.
- Hojas para todo lo secundario (intensificadores, herramientas, notas), sin modales anidados.
- Toques de 48 px o más, usable con una mano.
