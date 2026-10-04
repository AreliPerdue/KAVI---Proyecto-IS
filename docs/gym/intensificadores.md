# Intensificadores, agrupaciones y protocolos

Referencia de cómo se **registra** cada uno en el modelo de datos (spec 07 v2, §6). Los textos
que ve la persona viven en `src/constants/intensifiers.ts`; las transformaciones, en
`src/lib/gym/transforms.ts`.

Recordatorio del modelo: una serie (`workout_sets`) tiene uno o más tramos (`set_segments`).
Una serie normal es un tramo `main`. Los intensificadores van en `workout_sets.intensifiers`
(componibles) y, cuando cambian la estructura, agregan o reemplazan tramos.

## Tipos de serie (`set_type`, uno por serie)

| Tipo | Clave | Efecto |
|---|---|---|
| Calentamiento | `warmup` | No cuenta para volumen efectivo ni para PRs; no suma en la numeración |
| Aproximación | `feeder` | Etiqueta A |
| Efectiva | `working` | Por omisión |
| Top set | `top_set` | Etiqueta T; RPT y pesado-ligero la usan |
| Back-off | `backoff` | Etiqueta B |
| Al fallo | `failure` | Etiqueta F; el tipo de fallo va en `failure` |
| AMRAP | `amrap` | Etiqueta M |
| Técnica | `technique` | Etiqueta Té |
| Test de máximo | `max_test` | Etiqueta 1RM |

## Extensiones (`intensifiers`)

| Intensificador | Clave | Cómo queda registrado |
|---|---|---|
| Drop set | `drop_set` | + tramo `drop`, peso −% configurable (20 % por omisión), descanso 0 |
| Strip set | `strip_set` | + tramo `drop` con nota `strip` |
| Drop mecánico | `mechanical_drop` | + tramo `drop` con el mismo peso; `variant_exercise_id` para la variante. Al aplicarlo se pregunta la variante: sugerencias de `suggestVariants` (mismo grupo y mecánica; pesa más el mismo equipo) o el catálogo completo; se cambia tocando el tramo |
| Rest-pause | `rest_pause` | + 2 tramos `rest_pause`, mismo peso, 15 s antes de cada uno |
| Myo-reps | `myo_reps` | el principal pasa a `myo_activation` + 3 tramos `myo_mini` (15 s) |
| Myo-rep match | `myo_match` | igual que myo-reps; la meta es igualar las reps de la activación |
| Rest-pause DC | `dc_rest_pause` | principal + 2 tramos `rest_pause` con 20 s (15 respiraciones) |
| Cluster | `cluster` | 4 tramos `cluster`, 15 s entre ellos, reps repartidas |
| Reps forzadas | `forced_reps` | `forced_reps` en el tramo principal (menú de la fila) |
| Negativas | `negatives` | + tramo `negative` |
| Parciales | `partials` | `partial_reps` en el tramo; se ve `10 + 4p` |
| Reps y media | `one_and_half` | solo la etiqueta |
| 21s | `twenty_ones` | 3 tramos de 7: `twenty_ones_bottom`, `_top`, `_full` |
| Reps con pausa | `paused_reps` | `tempo` = `X-2-X-0` (editable en Detalles) |
| Isométrico | `iso_hold` | + tramo `iso_hold` con `duration_sec` = 30 |
| Estiramiento cargado | `loaded_stretch` | + tramo `loaded_stretch` con 30 s |
| Contracción pico | `peak_contraction` | `tempo` = `X-0-X-2` |
| Tempo | `tempo` | `tempo` = `3-1-X-0` (editable) |
| Superlento | `super_slow` | `tempo` = `10-0-10-0` |
| Reps con trampa | `cheat_reps` | `cheat_reps` en el tramo principal |
| Burns | `burns` | + tramo `partials` con nota `burns` |
| BFR | `bfr` | 4 tramos `bfr` de 30-15-15-15 con 30 s |
| Resistencia acomodada | `accommodating` | bandas o cadenas en `load_mods` (Detalles) |
| Esfuerzo dinámico | `dynamic_effort` | `tempo` = `X-0-X-0`; % del 1RM como objetivo |

Quitar un intensificador quita los tramos que trajo y deja el principal como `main`.

## Agrupaciones (`exercise_groups`)

`superset`, `compound_set`, `tri_set`, `giant_set`, `circuit` (con `rounds`), `pre_exhaust`,
`post_exhaust`, `contrast`, `paired_sets`. Cada ejercicio del grupo lleva `group_id` y
`group_position` (A1, A2…); quedan seguidos en la sesión. En vivo, marcar una serie de un
ejercicio que no es el último del grupo no arranca descanso: avisa cuál sigue. Al terminar el
último arranca el descanso de la ronda (`rest_after_round_sec`).

## Protocolos (`workout_exercises.protocol`)

| Protocolo | Clave | Series que genera |
|---|---|---|
| Series rectas | `straight_sets` | 3 × objetivo 8–12 |
| Pirámide | `pyramid` | 12/10/8/6 al 80/87/93/100 % del peso de trabajo |
| Pirámide inversa | `reverse_pyramid` | top set de 6, back-offs de 8 y 10 al 90 y 80 % |
| Ondas | `wave_loading` | 3-2-1-3-2-1, la segunda ola un poco más pesada |
| Escalera | `ladder` | 1, 2, 3, 4, 5 reps |
| EMOM | `emom` | 10 series de 5; timer 60 s × 10 |
| AMRAP por tiempo | `amrap_time` | 1 serie AMRAP; timer de 10 min |
| Tabata | `tabata` | 8 series de 20 s; timer 20/10 × 8 |
| Densidad | `density` | 1 bloque; timer de 15 min |
| FST-7 | `fst7` | 7 × 10–12, descanso 40 s |
| GVT | `gvt` | 10 × 10, descanso 75 s |
| Widowmaker | `widowmaker` | 1 × 20 |
| Pesado-ligero | `heavy_light` | top set de 5 y back-off de 15 al 60 % |
| HIT | `hit` | 1 serie al fallo muscular, objetivo 6–10 |

Aplicar un protocolo reemplaza las series **pendientes** del ejercicio y conserva las hechas.
Los pesos relativos se redondean a 2.5 kg. El objetivo de reps se ve en "Anterior" cuando no
hay historial (`obj. 8–12`).

## Modificadores (Detalles de la serie)

Fallo (técnico, muscular, absoluto), ROM (completo, parcial, alargado, acortado), lado,
tempo, `load_mods` (lastre, asistencia, cadenas, déficit, bandas, pines), equipo (`gear`) y
spotter. Las combinaciones raras muestran un aviso y nunca bloquean (`unusualCombination`).
