# 🏋️ Prompt para Claude Code — Upgrade del módulo Gym Tracker

> **Cómo usarlo:** guarda este archivo en el repo (ej. `docs/prompts/gym-tracker-upgrade.md`) y en Claude Code escribe:
> `Lee @docs/prompts/gym-tracker-upgrade.md y ejecútalo desde la Fase 0.`
> Recomendado: arrancar en **Plan Mode**.

---

## 0. Rol, misión y vibra

Eres un **senior full-stack engineer + product designer que además vive en el gym**. Sabes qué es un myo-rep match, por qué nadie quiere 4 taps para registrar una serie con las manos llenas de magnesio, y por qué el día de pierna no se negocia.

**Misión:** llevar el módulo Gym Tracker al nivel de las mejores apps de logging, pero con un **registro y edición de logs ultra detallado** (intensificadores, notas, reps dinámicas) y una experiencia **divertida para un gymrat**.

**Contexto clave:** la app **no es una app de gym per se**. El Gym Tracker es un módulo dentro de una app más amplia que **ya existe y ya funciona**. Todo lo que hagas se integra a su arquitectura, navegación, design system y convenciones. No es un proyecto nuevo ni un rewrite.

---

## 1. Reglas de oro (no negociables)

1. **Contexto antes que código.** No escribes una sola línea hasta completar Fase 0 y Fase 1.
2. **No rompes lo que funciona.** Los logs existentes quedan intactos. Migraciones compatibles hacia atrás, idempotentes y sin borrar datos.
3. **Plan → aprobación → código.** Al terminar la Fase 1 presentas el plan y **esperas mi OK**.
4. **Respeta el stack y convenciones documentadas** (tipado, estructura de carpetas, manejo de estado, estilos, naming). Si un `.md` contradice el código, me lo señalas y preguntas.
5. **Cero dependencias nuevas sin justificar** (qué, por qué, peso, alternativa sin dependencia).
6. **Registrar una serie normal en ≤ 2 taps.** Si una feature agrega fricción al logging en vivo, va a un bottom sheet/modal secundario.
7. **Checkpoints por fase:** al cerrar cada fase corre typecheck + lint + tests y dame un resumen corto (qué cambió, archivos tocados, pendientes).
8. **Decisiones irreversibles** (esquema, renombrar/borrar tablas, cambiar contratos de API): pregunta antes.
9. El modelo de datos de la Fase 2 debe soportar **todo** lo de la Fase 5 desde el diseño, aunque la UI se construya después.

---

## 2. Fase 0 — Absorber el contexto (obligatorio)

1. Localiza **todos** los `.md` del repo, excluyendo `node_modules`, `.git` y carpetas de build (`dist`, `build`, `.expo`, `.next`, `ios/Pods`, `android/build`, etc.). Incluye: `CLAUDE.md` (raíz y subcarpetas), `README*`, `docs/**`, `.claude/**`, `AGENTS.md`, `CONTRIBUTING.md`, ADRs, specs y changelogs.
2. Léelos completos. Prioridad: `CLAUDE.md` → docs de arquitectura/datos → docs del módulo gym → resto.
3. Entrégame un **resumen de contexto** (máx. ~25 bullets):
   - Stack y versiones.
   - Arquitectura y estructura de carpetas.
   - Estado, data fetching, persistencia y soporte offline.
   - Backend: esquema, migraciones, seguridad (ej. RLS si es Supabase).
   - Design system: componentes, tokens, tipografía, dark mode, i18n.
   - Convenciones de código, testing y commits.
   - Reglas explícitas o prohibiciones.
   - Contradicciones entre docs y código.

---

## 3. Fase 1 — Auditoría a fondo del módulo gym actual

Analiza **con cuidado y detalle** el código que hoy funciona. No asumas: lee.

Mapea:
- **Archivos:** pantallas, componentes, hooks, stores, servicios, tipos, utils, migraciones/tablas, seeds.
- **Modelo de datos actual:** tablas/tipos, relaciones, índices, constraints → diagrama en Mermaid.
- **Flujos:** crear sesión → agregar ejercicio → registrar serie → terminar → historial → editar.
- **Estado y persistencia:** cuándo se guarda, qué pasa si la app se cierra a media sesión, sync, optimistic updates.
- **Catálogo actual de ejercicios:** dónde vive, cuántos hay, cómo se busca.
- **Diagnóstico:** qué funciona bien (se conserva), bugs, deuda técnica, riesgos de performance, huecos de UX.

**Entregables:**
- `docs/gym/AUDITORIA.md` (o la ruta de docs que use el proyecto).
- Plan de implementación por fases con archivos a tocar e impacto.
- Estrategia de migración de los datos existentes.

🛑 **Detente aquí y espera mi aprobación.**

---

## 4. Fase 2 — Modelo de datos ultra detallado

Jerarquía:

```
Sesión (workout)
 └─ Grupo (opcional: superserie, circuito, serie gigante…)
 └─ Ejercicio en sesión (exercise entry)
     └─ Serie (set)          ← tipo de serie + intensificadores + métricas de esfuerzo
         └─ Segmento         ← drops, mini-series rest-pause/myo, clusters, isométricos…
```

Tipos de referencia (**adapta nombres y formato a la convención del proyecto**; snake_case en DB si aplica):

```ts
type SetType =
  | 'warmup' | 'feeder' | 'working' | 'top_set' | 'backoff'
  | 'failure' | 'amrap' | 'technique' | 'max_test';

interface WorkoutSession {
  id: string; userId: string;
  name?: string; templateId?: string;
  startedAt: string; endedAt?: string;
  status: 'active' | 'completed' | 'discarded';
  bodyweightKg?: number;
  notes?: string; tags?: string[];
  energy?: 1 | 2 | 3 | 4 | 5; pump?: 1 | 2 | 3 | 4 | 5;
  createdAt: string; updatedAt: string; editedAt?: string; deletedAt?: string;
}

interface ExerciseGroup {
  id: string; sessionId: string;
  type: 'superset' | 'compound_set' | 'tri_set' | 'giant_set' | 'circuit'
      | 'pre_exhaust' | 'post_exhaust' | 'contrast' | 'paired_sets';
  rounds?: number; restAfterRoundSec?: number;
}

interface ExerciseEntry {
  id: string; sessionId: string; exerciseId: string;
  order: number;
  groupId?: string; groupPosition?: number;      // A1, A2, A3…
  protocol?: string;                             // pyramid, fst7, gvt, emom… (ver Fase 5.4)
  protocolConfig?: Record<string, unknown>;
  restTargetSec?: number;
  notes?: string;
}

interface SetEntry {
  id: string; exerciseEntryId: string; order: number;
  setType: SetType;
  intensifiers: string[];                        // claves de la Fase 5, componibles
  target?: { repsMin?: number; repsMax?: number; weightKg?: number; rir?: number; rpe?: number; durationSec?: number };
  rpe?: number; rir?: number;
  failure?: 'technical' | 'muscular' | 'absolute';
  tempo?: string;                                // "3-1-X-0"
  rom?: 'full' | 'partial' | 'lengthened' | 'shortened';
  side?: 'both' | 'left' | 'right' | 'alternating';
  loadMods?: { addedKg?: number; assistanceKg?: number; bands?: string; chainsKg?: number; deficitCm?: number; pinHeight?: string };
  gear?: string[];                               // cinturón, straps, rodilleras…
  spotter?: boolean;
  restAfterSec?: number;                         // descanso real medido por el timer
  isCompleted: boolean; completedAt?: string;
  notes?: string; tags?: string[];
  createdAt: string; updatedAt: string; deletedAt?: string;
}

interface SetSegment {
  id: string; setId: string; order: number;
  kind: 'main' | 'drop' | 'rest_pause' | 'myo_activation' | 'myo_mini' | 'cluster'
      | 'forced' | 'negative' | 'partials' | 'iso_hold' | 'loaded_stretch'
      | 'twenty_ones_bottom' | 'twenty_ones_top' | 'twenty_ones_full' | 'bfr';
  weightKg?: number; inputUnit?: 'kg' | 'lb';
  reps?: number; repsLeft?: number; repsRight?: number;
  partialReps?: number; forcedReps?: number; cheatReps?: number;
  durationSec?: number; distanceM?: number;
  restBeforeSec?: number;
  variantExerciseId?: string;                    // drop set mecánico
  notes?: string;
}
```

Reglas del modelo:
- **Serie normal = 1 segmento `main`.** Drop set triple = 1 serie con 4 segmentos. Así volumen, PRs y edición son consistentes.
- **Intensificadores componibles:** una serie puede ser "rest-pause + parciales al final".
- **Peso canónico en kg** (decimales, ej. 1.25) + unidad de captura original. Se muestra en kg o lb según preferencia.
- **Derivados calculados, no capturados:** volumen, e1RM, PRs. Si se cachean (ej. tabla `personal_records`), se recalculan al editar.
- **Soft delete** (`deleted_at`) + `updated_at` en todo.
- **Migración:** cada serie existente → serie con 1 segmento `main`. Idempotente y con plan de rollback.
- **Plantillas/rutinas:** si existen, extiéndelas para guardar el objetivo (series, rango de reps, RIR, intensificador planeado).

---

## 5. Fase 3 — Logger en vivo (aquí se gana el pump)

- **Fila de serie:** `# | Anterior | kg | Reps | RIR/RPE | ✓`. "Anterior" muestra la última vez en gris; tap = copiar.
- **Reps dinámicas:**
  - Stepper ± y teclado numérico propio (sin que el teclado del sistema tape la pantalla).
  - **Modo contador:** botón grande que suma 1 rep por tap con háptico, para contar en vivo.
  - **Objetivo vs realizado:** si el plan era 8–12 y hiciste 13, sugiere subir peso la próxima (doble progresión).
  - **Unilaterales:** reps I/D por separado, con aviso visual si hay desbalance.
  - **Parciales aparte** de las completas: se ve como `10 + 4p`.
  - **Tiempo/distancia:** cronómetro integrado según `tracking_type` del ejercicio.
- **Al marcar ✓:** guarda (optimista), arranca timer de descanso, detecta PR, precarga la siguiente serie.
- **Inline, sin salir de la pantalla:** agregar serie, duplicar, `+ drop`, `+ mini-serie`.
- **Gestos:** swipe izquierda = borrar (con deshacer), swipe derecha = duplicar. Drag para reordenar series y ejercicios.
- **Timer de descanso:** sobrevive a cambiar de pantalla y bloquear el teléfono; notificación local al terminar; ±15 s; en superseries arranca al terminar la ronda.
- **Sesión activa a prueba de crashes:** se persiste localmente y se recupera al reabrir la app.
- **Herramientas:** calculadora de discos, rampa de calentamiento automática según top set, calculadora de 1RM.
- **Peso corporal del día** (opcional) para calcular bien volumen en dominadas lastradas/asistidas y fondos.

---

## 6. Fase 4 — Edición de logs históricos

- Cualquier sesión pasada se edita **con la misma UI del logger** (no un formulario aparte).
- Todo es editable: fecha/hora, duración, ejercicio (cambiarlo conservando series), orden, tipo de serie, segmentos, intensificadores, notas.
- **Convertir después del hecho:** serie normal → drop set / rest-pause (agregar segmentos), separar/unir series, mover una serie a otro ejercicio, agrupar/desagrupar superseries.
- Deshacer/rehacer durante la edición; confirmación para borrar una sesión completa.
- **Recalcular al guardar:** volumen, e1RM, PRs y logros afectados (un PR editado a la baja deja de ser PR).
- Validaciones claras sin bloquear casos reales (peso 0 en máquina asistida, 0 reps en serie fallida).
- Guardar `edited_at` y mostrar un indicador "editado".
- Si hay sync/offline: estrategia de conflictos documentada (mínimo last-write-wins por serie).

---

## 7. Fase 5 — Intensificadores (TODOS)

**UX general:** picker por serie en bottom sheet con buscador, ícono, descripción de 1 línea y "cómo se hace". Al elegir uno, la fila **se transforma sola** en la estructura correcta (ej. 21s crea 3 segmentos 7/7/7).

### 7.1 Tipos de serie (uno por serie)

| Tipo | Clave | Notas |
|---|---|---|
| Calentamiento | `warmup` | No cuenta para volumen efectivo ni PR |
| Aproximación | `feeder` | Rampa hacia el top set |
| Efectiva / de trabajo | `working` | Default |
| Top set | `top_set` | La serie pesada del día |
| Back-off | `backoff` | % del top set configurable |
| Al fallo | `failure` | Pide tipo de fallo |
| AMRAP | `amrap` | Máximas reps posibles |
| Técnica / deload | `technique` | Ligera, enfocada en forma |
| Test de máximo | `max_test` | 1RM o RM a n reps |

### 7.2 Extensiones dentro de la serie (generan segmentos)

| Intensificador | Clave | Cómo se registra | UX |
|---|---|---|---|
| Drop set (simple, doble, triple) | `drop_set` | Segmentos `drop` [{peso, reps}], descanso ~0 | Botón `+ drop` precarga −20/−25 % (configurable) |
| Strip set / running the rack | `strip_set` | Igual que drop, quitando discos o bajando mancuernas | Sugiere el siguiente par de mancuernas |
| Drop set mecánico | `mechanical_drop` | Segmentos con `variantExerciseId`, mismo peso | Cambiar variante por segmento (inclinado→plano→declinado) |
| Rest-pause | `rest_pause` | `main` + mini-series con `restBeforeSec` (10–20 s) | Mini-timer entre mini-series |
| Myo-reps | `myo_reps` | `myo_activation` (12–20) + `myo_mini` (3–5 reps, 3–5 respiraciones) | Contador de mini-series + "reps efectivas" |
| Myo-rep match | `myo_match` | Igualar reps de la activación en mini-series | Barra de progreso hacia el total |
| DC rest-pause (DoggCrapp) | `dc_rest_pause` | 3 segmentos (ej. 8+4+2), 15 respiraciones | Opción de estiramiento extremo con timer |
| Cluster set | `cluster` | N clusters con descanso intra-serie | Config reps/cluster y segundos |
| Reps forzadas | `forced_reps` | `forcedReps` aparte | Chip "+ forzadas" |
| Negativas / excéntrica acentuada | `negatives` | Segmento `negative`, tiempo excéntrico; subopción 2/1 | Selector de segundos excéntricos |
| Parciales | `partials` | `partialReps` + rango: alargada / media / acortada | Se ve `10 + 5p (alargadas)` |
| Reps y media (1½) | `one_and_half` | Cada rep = completa + media | Etiqueta en la serie |
| 21s | `twenty_ones` | 3 segmentos: 7 abajo / 7 arriba / 7 completas | Autollenado |
| Reps con pausa | `paused_reps` | Segundos y posición de la pausa | Chips 1 s / 2 s / 3 s |
| Isométrico (iso-hold) | `iso_hold` | `durationSec` + posición (estirado, medio, contraído) | Cronómetro |
| Estiramiento cargado post-serie | `loaded_stretch` | `durationSec` | Cronómetro |
| Contracción pico | `peak_contraction` | Segundos de squeeze por rep | Chip de segundos |
| Tempo | `tempo` | Formato excéntrica-pausa-concéntrica-pausa (3-1-X-0) | Input con máscara + chips comunes |
| Superlento | `super_slow` | Tempo lento predefinido | Preset de tempo |
| Reps con trampa | `cheat_reps` | `cheatReps` aparte | Chip "+ trampa" |
| Burns / pulsos | `burns` | Pulsos cortos al final, contados aparte | Chip "+ burns" |
| BFR / oclusión | `bfr` | Nivel de presión; protocolo 30-15-15-15 | Prefill de 4 segmentos |
| Resistencia acomodada | `accommodating` | Bandas (tensión/color) o cadenas (kg) en `loadMods` | Selector de banda/cadena |
| Series dinámicas / de velocidad | `dynamic_effort` | % de 1RM, velocidad opcional | Preset de % |

### 7.3 Agrupaciones entre ejercicios

| Agrupación | Clave | Notas |
|---|---|---|
| Superserie (antagonistas) | `superset` | Ej. bíceps + tríceps |
| Serie compuesta / biserie | `compound_set` | Mismo músculo |
| Triserie | `tri_set` | 3 ejercicios |
| Serie gigante | `giant_set` | 4+ ejercicios |
| Circuito | `circuit` | Con rondas |
| Pre-fatiga | `pre_exhaust` | Aislamiento → compuesto |
| Post-fatiga | `post_exhaust` | Compuesto → aislamiento |
| Contraste / complejo (PAP) | `contrast` | Pesado + pliométrico |
| Series pareadas (jump sets) | `paired_sets` | Alternar ejercicios no relacionados con descanso |

**UX:** seleccionar varios ejercicios → "Agrupar como…". Etiquetas A1/A2/A3 con color. El logger salta solo al siguiente ejercicio del grupo y el descanso corre al terminar la ronda.

### 7.4 Esquemas y protocolos (nivel ejercicio o bloque)

| Protocolo | Clave |
|---|---|
| Series rectas (default) | `straight_sets` |
| Pirámide ascendente / descendente / triángulo | `pyramid` |
| Pirámide inversa (RPT) | `reverse_pyramid` |
| Wave loading | `wave_loading` |
| Escaleras (ladders) | `ladder` |
| EMOM / E2MOM | `emom` |
| AMRAP por tiempo | `amrap_time` |
| Tabata | `tabata` |
| Densidad (EDT) | `density` |
| FST-7 | `fst7` |
| German Volume Training 10×10 | `gvt` |
| Widowmaker (20 reps) | `widowmaker` |
| Heavy-light | `heavy_light` |
| HIT (una serie al fallo total) | `hit` |

**UX:** al aplicar un protocolo se generan las series con objetivos (peso/%, reps, descanso) y timers correctos. EMOM/Tabata con cuenta regresiva, beep y háptico.

### 7.5 Modificadores y métricas de esfuerzo (cualquier serie)

- **RPE (1–10 en medios) o RIR (0–5+)**: el usuario elige en ajustes; conversión automática (RIR ≈ 10 − RPE).
- **Tipo de fallo:** técnico, muscular, absoluto.
- **ROM:** completo, parcial, profundidad (ej. "debajo del paralelo").
- **Lateralidad:** bilateral, unilateral I/D, alternado.
- **Carga:** lastre (cinturón, chaleco), asistencia (máquina, banda), déficit (cm), altura de pines/bloques.
- **Equipo usado:** cinturón, straps, rodilleras, muñequeras, sleeves, coderas, zapatos de halterofilia.
- **Spotter:** sí/no.

Combinaciones raras → advertencia suave, nunca bloqueo.

---

## 8. Fase 6 — Notas en todos los niveles

- **Sesión:** nota libre + chips rápidos (energía 1–5, pump 1–5, "en ayunas", "con pre-entreno", "poco sueño").
- **Ejercicio en sesión:** nota libre ("agarre más cerrado", "molestia en codo").
- **Nota fija por ejercicio (sticky):** persiste entre sesiones y se muestra siempre arriba. Ideal para ajustes de máquina ("asiento en 4, respaldo en 2") y cues técnicos.
- **Serie:** nota corta + tags (técnica rota, dolor, con spotter, se sintió fácil, intento de PR).
- Indicador visual en series/ejercicios con nota y búsqueda de notas desde el historial.

---

## 9. Fase 7 — Catálogo de ejercicios (≥ 500)

- **Seed** con el Apéndice A. Formato según stack (migración SQL, JSON o TS), **idempotente** (upsert por `slug`).
- **Campos:** `slug`, `name_es`, `name_en`, `aliases[]`, `family` (= `variant_of`), `primary_muscles[]`, `secondary_muscles[]`, `equipment[]`, `movement_pattern`, `mechanic` (compound/isolation), `laterality`, `tracking_type`, `is_custom`, `created_by`.
- **tracking_type:** `weight_reps`, `bodyweight_reps`, `weighted_bodyweight`, `assisted_bodyweight`, `reps_only`, `duration`, `weight_duration`, `distance_duration`, `weight_distance`.
- **Taxonomía de músculos:** pecho (superior/medio/inferior), dorsal, trapecio (superior/medio), romboides, erectores, deltoide (anterior/lateral/posterior), manguito rotador, bíceps, braquial, braquiorradial, flexores/extensores de antebrazo, tríceps (cabeza larga/lateral/medial), cuádriceps, isquiotibiales, glúteo mayor, glúteo medio, aductores, pantorrilla (gastrocnemio/sóleo), tibial, recto abdominal, oblicuos, transverso, cuello, cardio.
- **Equipo:** barra, barra EZ, trap bar, SSB, mancuernas, kettlebell, disco, máquina, polea, Smith, landmine, banda, cadenas, anillas, TRX, peso corporal, balón medicinal, trineo, máquina de cardio, otro.
- **Búsqueda:** tolerante a acentos, mayúsculas, alias y slang ("RDL", "hack", "jalón", "lat pulldown", "banca", "vuelos posteriores"). Ranking: recientes > favoritos > coincidencia.
- **Filtros:** músculo, equipo, patrón, tipo.
- **Personalizados** (crear, editar, archivar) + favoritos + recientes.
- **Detalle del ejercicio:** historial, mejor serie, gráfica de e1RM y volumen, nota fija.
- **Lista virtualizada** (performance con 500+).
- **Mapeo** de ejercicios existentes al nuevo catálogo sin perder historial; reporta los que no mapean.

---

## 10. Fase 8 — Modo Gymrat 🦍

Toggle **"Modo serio"** en ajustes para quien quiera cero memes. Regla: la diversión **nunca agrega pasos** al logging.

- **PRs en vivo:** peso máximo, reps a un peso, e1RM (Epley `w·(1+r/30)` / Brzycki `w·36/(37−r)`, configurable, confiable hasta ~12 reps), volumen por serie y por sesión. Celebración corta: animación + háptico + badge en la serie.
- **Microcopy ES-MX** con rotación aleatoria (sin repetir seguido). Ejemplos de tono:
  - PR: "¡PR, mi rey! 👑 Eso no lo levanta cualquiera."
  - Drop set terminado: "Ese músculo ya pidió su liquidación."
  - Myo-reps: "Mini-series, máximo sufrimiento."
  - Fin del descanso: "Se acabó el descanso, suelta el cel 👀"
  - Terminó pierna: "Sobreviviste al leg day. Las escaleras te odian."
  - 7+ días sin pierna: "Bro… ¿y la pierna?"
- **Logros:** Rey del Drop Set (50 drops), Myo-maníaco, Leg Day Survivor, Club 100/140/180 kg (banca/sentadilla/peso muerto), Racha de Hierro (semanas seguidas), Madrugador (antes de 6 am), Titán del Tonelaje.
- **Equivalencias de tonelaje** al terminar: "Hoy moviste 14,320 kg = 2.4 elefantes africanos 🐘" (tabla graciosa: autos, pianos, T-rex, ballenas).
- **Resumen post-entreno compartible:** volumen, PRs, duración, músculos trabajados (mapa corporal si el design system lo permite).
- **Volumen semanal por músculo** (series efectivas) con zonas de referencia visual.
- **Racha y calendario** de entrenos.

---

## 11. Fase 9 — Calidad, docs y entrega

- **Tests unitarios:** volumen, e1RM, detección de PR, kg↔lb, RPE↔RIR, migración.
- **Tests de flujo:** registrar drop set triple; editar serie pasada → PR recalculado; superserie con descanso por ronda; recuperar sesión tras cerrar la app.
- **Accesibilidad y uso real:** targets ≥ 44 pt, usable con una mano y manos sudadas, labels y contraste.
- **Performance:** sin re-renders innecesarios en la lista de series, memoización, listas virtualizadas.
- **i18n** si la app ya lo tiene (ES por defecto).
- **Docs:** crea/actualiza `docs/gym/` (modelo de datos, intensificadores, catálogo, decisiones) y agrega a `CLAUDE.md` lo que otro agente necesita saber del módulo.
- **Entrega final:** resumen de cambios, migraciones a correr, cómo probar, pendientes e ideas v2.

---

## 12. Criterios de aceptación

- [ ] Leí todos los `.md` y respeté convenciones
- [ ] Auditoría y plan aprobados antes de codificar
- [ ] Logs históricos migrados sin pérdida
- [ ] Serie normal registrada en ≤ 2 taps
- [ ] Todos los intensificadores de la Fase 5 registrables **y** editables
- [ ] Drop set triple = 1 serie con 4 segmentos; volumen y PR correctos
- [ ] Superseries/circuitos con navegación y descanso correctos
- [ ] Notas en sesión, ejercicio y serie + nota fija por ejercicio
- [ ] Edición completa de sesiones pasadas con recálculo de PRs
- [ ] Catálogo ≥ 500 buscable por alias y sin acentos
- [ ] Sesión activa sobrevive a cerrar la app
- [ ] Modo Gymrat con toggle "Modo serio"
- [ ] Typecheck, lint y tests en verde
- [ ] Docs actualizados

---

## Apéndice A — Catálogo base de ejercicios (530 ejercicios y variantes)

**Cómo leerlo:** cada `###` es grupo muscular, cada `####` es la familia (`family` / `variant_of`) y cada línea es un ejercicio. Infiere equipo, músculos, patrón y `tracking_type` a partir del nombre y la sección. Agrega `name_en` y alias comunes (inglés y slang). Puedes ampliar la lista; no quites ejercicios.

### Pecho

#### Press plano
- Press de banca plano con barra
- Press de banca con pausa
- Spoto press
- Larsen press
- Press de banca con pies arriba
- Press de banca con barra multiagarre (Swiss bar)
- Press de banca con cadenas
- Press de banca con bandas
- Board press
- Press guillotina
- Press de banca plano con mancuernas
- Press de banca con mancuernas agarre neutro
- Press de banca con mancuerna a una mano
- Press de banca plano en Smith
- Press de pecho en máquina sentado
- Press de pecho en máquina convergente (Hammer Strength)
- Press de pecho unilateral en máquina
- Floor press con barra
- Floor press con mancuernas

#### Press inclinado
- Press inclinado con barra
- Press inclinado con mancuernas
- Press inclinado bajo (15–30°) con mancuernas
- Press inclinado con mancuernas agarre neutro
- Press inclinado en Smith
- Press inclinado en máquina
- Press inclinado en máquina convergente (Hammer Strength)
- Press landmine para pecho

#### Press declinado
- Press declinado con barra
- Press declinado con mancuernas
- Press declinado en Smith
- Press declinado en máquina

#### Aperturas y cruces
- Aperturas planas con mancuernas
- Aperturas inclinadas con mancuernas
- Aperturas declinadas con mancuernas
- Aperturas en piso (floor fly)
- Pec deck
- Aperturas en banco con poleas
- Cruce de poleas alto a bajo
- Cruce de poleas a media altura
- Cruce de poleas bajo a alto
- Aperturas en polea unilateral
- Squeeze press con mancuernas
- Svend press

#### Fondos y lagartijas
- Fondos en paralelas para pecho
- Fondos lastrados
- Fondos asistidos en máquina
- Lagartijas (push-ups)
- Lagartijas con déficit
- Lagartijas declinadas (pies elevados)
- Lagartijas inclinadas (manos elevadas)
- Lagartijas con lastre o chaleco
- Lagartijas con palmada
- Lagartijas en anillas
- Lagartijas arqueras

#### Pullover
- Pullover con mancuerna
- Pullover con barra
- Pullover en máquina

### Espalda

#### Dominadas
- Dominadas pronas
- Dominadas agarre ancho
- Dominadas supinas (chin-ups)
- Dominadas agarre neutro
- Dominadas lastradas
- Dominadas asistidas en máquina
- Dominadas asistidas con banda
- Dominadas negativas
- Dominadas en anillas

#### Jalones
- Jalón al pecho agarre ancho
- Jalón al pecho agarre medio
- Jalón con triángulo (agarre cerrado neutro)
- Jalón supino
- Jalón tras nuca
- Jalón unilateral en polea
- Jalón de rodillas en polea
- Jalón en máquina convergente (Hammer Strength)
- Jalón unilateral en máquina
- Pulldown con brazos rectos con barra
- Pulldown con brazos rectos con cuerda
- Pulldown con brazo recto unilateral

#### Remos con barra
- Remo con barra inclinado
- Remo Pendlay
- Remo Yates (agarre supino)
- Remo en Smith
- Remo en T con barra (landmine)
- Remo Meadows
- Remo Seal con barra

#### Remos con mancuerna
- Remo con mancuerna a una mano
- Remo Kroc
- Remo con mancuernas inclinado (bilateral)
- Remo con mancuernas con pecho apoyado
- Remo Helms
- Remo Seal con mancuernas
- Remo gorila con kettlebells

#### Remos en polea y máquina
- Remo sentado en polea agarre cerrado
- Remo sentado en polea agarre ancho
- Remo en polea unilateral
- Remo en polea de pie
- Remo en T con soporte de pecho (máquina)
- Remo en máquina convergente (Hammer Strength)
- Remo en máquina con soporte de pecho
- Remo invertido (australian pull-up)
- Remo en TRX

#### Trapecio
- Encogimientos con barra
- Encogimientos con barra por detrás
- Encogimientos con mancuernas
- Encogimientos en Smith
- Encogimientos en máquina
- Encogimientos con trap bar
- Encogimientos en banco inclinado (Kelso shrug)
- Encogimientos en polea

#### Lumbar y cadena posterior
- Hiperextensiones a 45°
- Hiperextensiones a 90° (banco romano)
- Hiperextensiones inversas (reverse hyper)
- Extensión lumbar en máquina
- Superman en piso
- Jefferson curl

#### Peso muerto
- Peso muerto convencional
- Peso muerto sumo
- Peso muerto con trap bar
- Peso muerto con déficit
- Peso muerto con pausa
- Rack pull
- Peso muerto con agarre de arranque (snatch grip)
- Peso muerto con bandas o cadenas
- Peso muerto con mancuernas
- Peso muerto en Smith
- Peso muerto con kettlebell

### Hombro

#### Press vertical
- Press militar de pie con barra
- Press militar sentado con barra
- Press tras nuca
- Press de hombro sentado con mancuernas
- Press de hombro de pie con mancuernas
- Press de hombro con mancuernas agarre neutro
- Press de hombro unilateral con mancuerna
- Press Arnold
- Press de hombro en Smith
- Press de hombro en máquina
- Press de hombro en máquina convergente (Hammer Strength)
- Push press
- Z press
- Press Bradford
- Press landmine a una mano
- Press Viking
- Press con kettlebell
- Lagartijas pike

#### Elevaciones laterales
- Elevaciones laterales con mancuernas
- Elevaciones laterales sentado
- Elevaciones laterales unilateral con mancuerna
- Elevaciones laterales inclinado (lean-away)
- Elevaciones laterales en polea
- Elevaciones laterales en polea por detrás
- Y-raise en polea
- Elevaciones laterales en máquina
- Y-raise en banco inclinado
- Lu raises

#### Remo al mentón
- Remo al mentón con barra
- Remo al mentón con mancuernas
- Remo al mentón en polea

#### Elevaciones frontales
- Elevaciones frontales con mancuernas
- Elevaciones frontales con barra
- Elevaciones frontales con disco
- Elevaciones frontales en polea
- Elevaciones frontales en banco inclinado

#### Deltoide posterior
- Pájaros con mancuernas (vuelos posteriores)
- Pájaros en banco inclinado boca abajo
- Pec deck inverso
- Cruces inversos en polea
- Pájaros en polea unilateral
- Face pull con cuerda
- Remo para deltoide posterior con mancuernas
- Remo para deltoide posterior en polea

#### Manguito rotador y salud de hombro
- Rotación externa en polea
- Rotación externa con mancuerna acostado de lado
- Rotación interna en polea
- Cuban press
- Band pull-apart
- YTW en banco inclinado

### Bíceps

#### Curl con barra
- Curl con barra recta
- Curl con barra EZ
- Curl con barra agarre ancho
- Curl con barra agarre cerrado
- Curl de arrastre (drag curl)
- Curl estricto contra la pared
- Curl inverso con barra

#### Curl con mancuernas
- Curl con mancuernas alterno
- Curl con mancuernas simultáneo
- Curl martillo
- Curl martillo cruzado
- Curl inclinado con mancuernas
- Curl concentrado
- Curl araña (spider curl)
- Curl Zottman
- Curl Waiter
- Curl con mancuernas acostado en banco plano

#### Curl predicador
- Curl predicador con barra EZ
- Curl predicador con mancuerna
- Curl predicador en máquina
- Curl predicador en polea
- Curl predicador inverso
- Curl martillo en predicador

#### Curl en polea y máquina
- Curl en polea baja con barra
- Curl en polea unilateral
- Curl Bayesian
- Curl en polea alta (doble bíceps)
- Curl martillo en polea con cuerda
- Curl acostado en polea
- Curl en máquina

### Tríceps

#### Extensiones en polea
- Pushdown con cuerda
- Pushdown con barra recta
- Pushdown con barra V
- Pushdown unilateral agarre supino
- Pushdown unilateral agarre prono
- Extensión cruzada en polea
- Extensión sobre la cabeza en polea con cuerda
- Extensión sobre la cabeza en polea con barra
- Extensión Katana (unilateral sobre la cabeza en polea)
- Patada de tríceps en polea

#### Press francés y extensiones
- Press francés con barra EZ (skull crusher)
- Press francés con mancuernas
- Press francés en polea
- Press francés inclinado
- Press francés declinado
- Extensión rodante con mancuernas
- Extensión sobre la cabeza con mancuerna a dos manos
- Extensión sobre la cabeza con mancuerna unilateral
- Extensión sobre la cabeza sentado con barra EZ
- Press Tate
- Patada de tríceps con mancuerna
- Extensión de tríceps en máquina

#### Press y fondos para tríceps
- Press de banca agarre cerrado
- Press de banca agarre cerrado en Smith
- Press JM
- Fondos en banco
- Fondos en paralelas para tríceps
- Fondos en máquina
- Lagartijas diamante

### Antebrazo y agarre

#### Muñeca
- Curl de muñeca con barra
- Curl de muñeca inverso con barra
- Curl de muñeca con mancuerna
- Curl de muñeca por detrás de la espalda
- Rodillo de muñeca
- Pronación y supinación con mancuerna
- Desviación radial con mancuerna

#### Agarre
- Colgado en barra (dead hang)
- Colgado con toalla
- Pinza de discos (plate pinch)
- Grippers
- Sostén con barra gruesa
- Extensión de dedos con banda

### Cuádriceps

#### Sentadilla
- Sentadilla trasera barra alta
- Sentadilla trasera barra baja
- Sentadilla frontal
- Sentadilla con safety bar (SSB)
- Sentadilla con pausa
- Sentadilla a caja (box squat)
- Sentadilla Anderson (desde pines)
- Sentadilla Zercher
- Sentadilla overhead
- Sentadilla con talones elevados
- Sentadilla ciclista
- Sentadilla goblet
- Sentadilla con mancuernas
- Sentadilla frontal con kettlebells dobles
- Sentadilla landmine
- Sentadilla en Smith
- Sentadilla con peso corporal

#### Sentadilla en máquina
- Sentadilla hack
- Sentadilla hack inversa
- Sentadilla péndulo
- Sentadilla en V (V-squat)
- Belt squat
- Sentadilla sissy
- Sentadilla sissy en máquina

#### Prensa
- Prensa de pierna 45°
- Prensa de pierna horizontal
- Prensa de pierna vertical
- Prensa unilateral
- Prensa con pies bajos y juntos
- Prensa con pies altos y abiertos

#### Extensión de cuádriceps
- Extensión de cuádriceps en máquina
- Extensión de cuádriceps unilateral
- Extensión de pierna con tobillera
- Reverse Nordic
- Spanish squat

#### Zancadas y unilaterales
- Zancadas caminando con mancuernas
- Zancadas caminando con barra
- Zancada frontal
- Zancada inversa con mancuernas
- Zancada inversa en déficit
- Zancada lateral
- Zancada cruzada (curtsy)
- Zancada en Smith
- Zancada con landmine
- Split squat
- Split squat con pie delantero elevado
- Sentadilla búlgara con mancuernas
- Sentadilla búlgara con barra
- Sentadilla búlgara en Smith
- Step-up con mancuernas
- Step-up con barra
- Peterson step-up
- Sentadilla patinador (skater squat)

### Isquiotibiales y bisagra

#### Peso muerto rumano y bisagra
- Peso muerto rumano con barra (RDL)
- Peso muerto rumano con mancuernas
- Peso muerto rumano con déficit
- Peso muerto rumano en Smith
- Peso muerto rumano con kettlebell
- Peso muerto rumano unilateral
- Peso muerto rumano unilateral con landmine
- Peso muerto rumano B-stance
- Peso muerto piernas rígidas (stiff-leg)
- Buenos días con barra
- Buenos días sentado

#### Curl femoral
- Curl femoral acostado
- Curl femoral acostado unilateral
- Curl femoral sentado
- Curl femoral sentado unilateral
- Curl femoral de pie unilateral
- Curl femoral en polea de pie
- Curl femoral con mancuerna acostado
- Curl femoral con fitball
- Curl femoral con sliders
- Curl nórdico
- Curl nórdico asistido con banda
- Glute-ham raise (GHR)

### Glúteo

#### Hip thrust y puentes
- Hip thrust con barra
- Hip thrust en máquina
- Hip thrust en Smith
- Hip thrust con mancuerna
- Hip thrust unilateral
- Hip thrust B-stance
- Hip thrust con banda
- Puente de glúteo con barra
- Puente de glúteo unilateral
- Puente de glúteo con pies elevados
- Kas glute bridge
- Frog pump

#### Patadas y extensión de cadera
- Patada de glúteo en polea
- Patada de glúteo en máquina
- Patada de glúteo en Smith
- Patada de glúteo en cuadrupedia
- Patada de glúteo con banda
- Pull-through en polea
- Hiperextensión enfocada a glúteo

#### Abducción
- Abducción de cadera en máquina
- Abducción en máquina inclinado hacia adelante
- Abducción de cadera en polea
- Abducción de cadera de pie en máquina multicadera
- Abducción acostado de lado
- Caminata lateral con banda
- Clamshell con banda
- Fire hydrant

#### Sentadilla sumo
- Sentadilla sumo con mancuerna o kettlebell
- Sentadilla sumo con barra

### Aductores

#### Aducción
- Aducción en máquina
- Aducción en polea
- Aducción acostado de lado
- Aducción isométrica con balón
- Plancha Copenhagen
- Sentadilla Cossack

### Pantorrilla y tibial

#### Elevación de talones
- Elevación de talones de pie en máquina
- Elevación de talones sentado
- Elevación de talones en prensa
- Elevación de talones en Smith
- Elevación de talones en hack squat
- Elevación de talones con barra
- Elevación de talones unilateral con mancuerna
- Elevación de talones tipo burro
- Elevación de talones en escalón con peso corporal

#### Tibial
- Elevación de tibial
- Tibial en máquina

### Core

#### Planchas y anti-extensión
- Plancha frontal
- Plancha con lastre
- Plancha RKC
- Plancha con toque de hombro
- Stir the pot
- Body saw
- Rueda abdominal
- Rueda abdominal de pie
- Rollout con barra
- Dead bug
- Bird dog
- Hollow hold
- Hollow rocks
- Vacuum abdominal

#### Flexión de tronco
- Crunch en piso
- Crunch en polea de rodillas
- Crunch en máquina
- Crunch declinado
- Crunch en fitball
- Crunch bicicleta
- Sit-up
- Sit-up con peso
- GHD sit-up
- V-ups
- Jackknife en fitball

#### Elevaciones de piernas
- Crunch inverso
- Elevación de piernas acostado
- Elevación de piernas en silla romana
- Elevación de rodillas colgado
- Elevación de piernas colgado
- Elevación de piernas colgado oblicua
- Toes to bar
- Tijeras (flutter kicks)
- Dragon flag

#### Rotación y anti-rotación
- Plancha lateral
- Pallof press
- Leñador en polea alto a bajo
- Leñador en polea bajo a alto
- Russian twist
- Rotación con landmine
- Windshield wipers
- Flexión lateral con mancuerna
- Crunch oblicuo en polea
- Mountain climbers

### Olímpicos y potencia

#### Arranque
- Arranque (snatch)
- Arranque de potencia (power snatch)
- Arranque colgado (hang snatch)
- Arranque desde bloques
- Muscle snatch
- Snatch balance
- Tirón de arranque (snatch pull)
- Arranque con mancuerna a un brazo

#### Cargada y envión
- Cargada (clean)
- Cargada de potencia (power clean)
- Cargada colgada (hang clean)
- Cargada de potencia colgada (hang power clean)
- Tirón de cargada (clean pull)
- Cargada y envión (clean & jerk)
- Envión dividido (split jerk)
- Push jerk
- High pull
- Cargada con mancuernas
- Thruster con barra
- Thruster con mancuernas

#### Pliometría y balón medicinal
- Salto al cajón (box jump)
- Salto en profundidad (depth jump)
- Salto largo (broad jump)
- Saltos con vallas
- Sentadilla con salto
- Zancadas con salto
- Saltos de pantorrilla (pogo jumps)
- Lanzamiento de balón medicinal al pecho
- Slam de balón medicinal
- Lanzamiento rotacional de balón medicinal
- Wall ball

### Kettlebell y strongman

#### Kettlebell
- Swing con kettlebell a dos manos
- Swing con kettlebell a una mano
- Clean con kettlebell
- Snatch con kettlebell
- Turkish get-up
- Windmill con kettlebell
- Halo con kettlebell
- Bottoms-up press con kettlebell

#### Cargas y acarreos
- Caminata de granjero (farmer's walk)
- Caminata de granjero con trap bar
- Suitcase carry
- Rack carry con kettlebells
- Caminata con peso sobre la cabeza
- Caminata con sandbag
- Yoke walk

#### Strongman
- Volteo de llanta (tire flip)
- Empuje de trineo
- Arrastre de trineo
- Arrastre de trineo hacia atrás
- Atlas stone
- Log press
- Press con barra gruesa (axle)
- Sandbag al hombro
- Martillo en llanta
- Cuerdas de batalla

### Calistenia

#### Empuje
- Muscle-up en barra
- Muscle-up en anillas
- Fondos en anillas
- Dips coreanos
- Handstand push-up
- Handstand push-up con déficit
- Lagartijas pike elevadas
- Lagartijas pseudoplancha
- Lagartijas a una mano
- Lagartijas hindúes

#### Tracción
- Dominada L-sit
- Dominada arquera
- Dominada typewriter
- Dominadas explosivas (chest to bar)
- Remo invertido en anillas
- Skin the cat

#### Estáticos
- Parada de manos (handstand hold)
- Wall walk
- L-sit
- Front lever tuck
- Front lever
- Front lever raises
- Back lever
- Planche lean
- Tuck planche
- Planche
- Human flag

#### Piernas y locomoción
- Pistol squat
- Shrimp squat
- Bear crawl

### Cardio y acondicionamiento

#### Máquinas de cardio
- Caminadora caminando
- Caminadora corriendo
- Caminadora inclinada
- Escaladora (stairmaster)
- Elíptica
- Bicicleta estática
- Spinning
- Bicicleta de aire (assault/echo bike)
- Remo ergómetro
- SkiErg

#### Exterior
- Correr al aire libre
- Caminata al aire libre
- Senderismo
- Ciclismo al aire libre
- Natación
- Rucking (caminata con chaleco)
- Sprints
- Sprints en cuesta

#### Metcon
- Cuerda para saltar
- Burpees
- Devil press
- Jumping jacks
- Rodillas altas
- Saltos laterales (skaters)
- Saco de boxeo
- Shadow boxing

### Cuello

#### Cuello
- Flexión de cuello con disco
- Extensión de cuello con arnés
- Flexión lateral de cuello
- Cuello en máquina 4 vías
