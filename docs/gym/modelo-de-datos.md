# Gym tracker · modelo de datos

Lo que vive en Supabase para el módulo de fitness (spec 07 v2, §3). El esquema está en
`supabase/migrations/20261004100000_gym_v2.sql` y el catálogo en
`supabase/migrations/20261004110000_exercise_catalog.sql`. Los tipos de TypeScript están en
`src/types/domain.ts`.

## Jerarquía

```
workouts (sesión)
├── exercise_groups (superserie, circuito…)
└── workout_exercises (ejercicio en la sesión) ──→ exercises (catálogo)
    └── workout_sets (serie)
        └── set_segments (tramo: main, drop, rest_pause, myo…)

exercises ←── user_exercise_prefs (favorito, nota fija, último uso)
workout_streak_events (decisiones de la Racha de Hierro, una por semana)
```

`workouts` y `workout_exercises` vienen de v1 y se **extendieron**: ninguna columna de v1 se
renombró ni se borró. El texto libre de v1 (`sets`, `reps`, `weight`, `duration_minutes`) sigue
ahí y sigue visible.

## Tablas

| Tabla | Qué guarda | Notas |
|---|---|---|
| `workouts` | Sesión. v2 agrega `status` (`active`, `completed`, `discarded`), `ended_at`, `bodyweight_kg`, `energy` y `pump` (1–5), `tags`, `edited_at`, `deleted_at` | La duración es `ended_at − performed_at`; sin `ended_at` (v1), la suma por ejercicio |
| `exercise_groups` | Agrupación: tipo, rondas y descanso al terminar la ronda | Los miembros la referencian con `group_id` y `group_position` (A1, A2…) |
| `workout_exercises` | Ejercicio en la sesión. v2 agrega `owner_id`, `exercise_id`, `group_id`, `group_position`, `protocol`, `protocol_config`, `rest_target_sec`, `legacy_converted_at`, `deleted_at` | `exercise_id` null = ejercicio por nombre libre (v1 o sin catálogo) |
| `workout_sets` | Serie: `set_type`, `intensifiers[]`, `target`, RPE/RIR, fallo, tempo, ROM, lado, `load_mods`, `gear[]`, spotter, `completed_at`, `notes`, `tags[]`, `from_legacy` | `completed_at` null = pendiente. `sort_order` es `numeric`: mover una serie es escribir una fila |
| `set_segments` | Tramo de una serie: `kind`, `weight_kg` + `input_unit`, reps (y por lado), parciales, forzadas, con trampa, duración, distancia, descanso previo | Una serie normal es un tramo `main`; un drop triple, cuatro tramos |
| `exercises` | Catálogo: 530 del sistema (`created_by` null) y personalizados | `slug` único; el id del sistema se deriva del slug; `archived_at` oculta un personalizado |
| `user_exercise_prefs` | Por persona y ejercicio: `is_favorite`, `sticky_note`, `last_used_at` | La nota fija (RF-F52) vive aquí |
| `workout_streak_events` | `week_start` (lunes), `decision` (`kept`/`reset`), nota y motivos | Única por persona y semana |

## Reglas transversales

- **Pesos en kg siempre.** `input_unit` recuerda en qué se escribió; la unidad de la app solo
  cambia cómo se ve.
- **Fechas en UTC** (`timestamptz`), salvo `week_start`, que es una fecha local flotante.
- **Borrado suave** con `deleted_at` en sesiones, ejercicios, series y tramos. Lo borrado se
  filtra en el cliente, con la misma regla en Supabase y en el demo. "Deshacer" es volver a
  guardar la misma fila.
- **Ids generados en el cliente** (UUID v4 de `src/lib/gym/ids.ts`): la serie existe en
  pantalla antes de que el servidor conteste, y reenviarla es un `upsert`, no un duplicado.

## RLS

Toda tabla del módulo tiene RLS desde su creación y una sola política:
`owner_id = auth.uid()` sobre la propia fila.

Las tablas hijas (`exercise_groups`, `workout_exercises`, `workout_sets`, `set_segments`) no
reciben `owner_id` del cliente: el trigger `gym_inherit_owner()` lo copia del padre al
insertar o actualizar. Corre con los permisos de quien escribe (no es `security definer`): si
el padre es de otra persona, la RLS lo esconde, no se encuentra y la escritura falla con
`42501`. Así nadie puede colgar una serie de una sesión ajena, y ninguna política tiene que
subir con `exists` por la jerarquía (eso fue lo que rompió `INSERT … RETURNING` en `lists`).

`exercises` es la excepción: los del sistema los lee cualquiera autenticado; los
personalizados, solo su dueño.

## Lo que no se guarda

PRs, e1RM, volumen, logros, racha y series por músculo **se calculan** del historial cada vez
(`src/lib/gym/`). Editar una sesión pasada los recalcula solos; no hay contadores que se
queden viejos.

## Sin conexión

Las series de la sesión activa se escriben primero en una cola local (`src/lib/gym/outbox.ts`,
AsyncStorage o localStorage) y se envían por detrás. La pantalla une servidor + cola, así que
marcar ✓ se ve al instante y una sesión sobrevive a cerrar la app (RF-F17).
