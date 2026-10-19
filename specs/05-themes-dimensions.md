# Spec 05 — Temas predefinidos y dimensiones del bienestar (F3)

## Objetivo
Clasificar actividades en un toque mediante temas predefinidos, cada uno ligado a una de las 7 dimensiones, con color e icono ya asignados (P3).

## Las 7 dimensiones (fijas)
| Dimensión | Color base | Icono |
|---|---|---|
| Física | #4CAF50 | dumbbell |
| Emocional | #E91E63 | heart |
| Social | #FF9800 | users |
| Intelectual | #2196F3 | book-open |
| Espiritual | #9C27B0 | sparkles |
| Financiera | #009688 | wallet |
| Ocupacional | #607D8B | briefcase |

## Temas predefinidos (seed `is_system=true`)
| Tema | Dimensión | Icono |
|---|---|---|
| Gimnasio | física | dumbbell |
| Caminata/Correr | física | footprints |
| Deporte | física | trophy |
| Cita médica | física | stethoscope |
| Descanso | emocional | moon |
| Journaling/Terapia | emocional | notebook-pen |
| Familia | social | house-heart |
| Amigos | social | users |
| Cita/Pareja | social | heart |
| Estudio | intelectual | graduation-cap |
| Lectura | intelectual | book-open |
| Curso/Clase | intelectual | school |
| Meditación | espiritual | flower-2 |
| Iglesia/Práctica | espiritual | church |
| Finanzas/Pagos | financiera | wallet |
| Presupuesto | financiera | calculator |
| Trabajo | ocupacional | briefcase |
| Junta/Reunión | ocupacional | video |
| Proyecto personal | ocupacional | rocket |

(Los nombres de icono son de `lucide-react-native`; ajustar al set final en implementación.)

## Requerimientos funcionales
- RF-T1. Picker de temas en el formulario de actividad: grid agrupado por dimensión, con búsqueda simple; seleccionar asigna dimensión, color e icono.
- RF-T2. El usuario puede crear temas propios: nombre + dimensión + color (paleta fija de 12) + icono (set curado ~30). CRUD solo de los suyos.
- RF-T3. **Los temas del sistema se pueden personalizar, pero no borrar.** Cada persona
  puede cambiarles el nombre, la dimensión, el color y el icono. Eliminarlos no: son el
  catálogo de partida y quedarse sin él dejaría la app sin forma de clasificar.

  La personalización es **de quien la hace y solo la ve esa persona**. La fila del tema
  del sistema es una sola y la comparten todas las cuentas, así que editarla en sitio le
  cambiaría el tema a todo el mundo: lo que se guarda es una fila aparte por persona y
  tema (`theme_overrides`), y la lista se compone al leer. Los campos que no se tocan
  heredan del tema original.

  **Restablecer los temas del sistema** borra esas personalizaciones y los devuelve a
  como vienen. No alcanza a los temas propios —viven en otra tabla— ni reescribe las
  actividades ya creadas, que conservan el color y el icono que se les copió (RF-T6).
  Pide confirmación, porque deshace trabajo y no se puede deshacer a su vez (NFR-12).

  **Criterio.** *Dado* que cambio el nombre del tema «Gimnasio» a «Gym», *cuando* otra
  persona abre sus temas, *entonces* sigue viendo «Gimnasio»; *y cuando* restablezco los
  temas del sistema, *entonces* el mío vuelve a «Gimnasio» y mis temas propios siguen
  intactos.
- RF-T4. Actividad sin tema es válida (P3): usa color neutro y sin dimensión, y puede clasificarse después.
- RF-T5. Los filtros del calendario usan dimensión y tema (ver RF-C11).
- RF-T6. Si se elimina un tema propio, sus actividades conservan color/icono copiados y quedan sin tema (FK `on delete set null` + copia de estilo al guardar).

### Modo daltonismo — propuesta del 19 oct 2026, falta aprobarla
Pedido de Areli: que toda la app tenga colores amigables para personas con daltonismo.

- RF-T7. **Interruptor "Colores para daltonismo"** en Perfil → Presentación, junto a claro/oscuro. Es del
  dispositivo y aplica en toda la app (iOS, Android y web). Apagado por omisión.
- RF-T8. **Las 7 dimensiones con una paleta segura para los tres tipos de daltonismo** (rojo-verde y azul-amarillo):
  la "bright" de Paul Tol, que conserva el tono de cada dimensión:

  | Dimensión | Normal | Daltonismo |
  |---|---|---|
  | Física | `#4CAF50` | `#228833` verde |
  | Emocional | `#E91E63` | `#EE6677` rojo rosado |
  | Social | `#FF9800` | `#CCBB44` amarillo ocre |
  | Intelectual | `#2196F3` | `#4477AA` azul |
  | Espiritual | `#9C27B0` | `#AA3377` morado |
  | Financiera | `#009688` | `#66CCEE` cian |
  | Ocupacional | `#607D8B` | `#BBBBBB` gris claro |

  Con el modo encendido, **cada actividad se pinta con el color de su dimensión** (los temas de una misma
  dimensión comparten color y se distinguen por su icono), en todas las vistas, filtros, leyendas y gráficas de
  Fitness. Una actividad sin dimensión sigue en el neutro (RF-T4). La letra sobre cada color se elige por contraste.
- RF-T9. **Colores de estado:** éxito en azul (`#4477AA`) en lugar de verde; peligro y aviso conservan rojo y
  ámbar pero **siempre con icono o texto** (✓, ⚠, ✕), nunca solo el color.
- RF-T10. **Personas en el calendario compartido:** sus colores (los 24 de los Nobi) no alcanzan a distinguirse;
  con el modo encendido, cada bloque de otra persona lleva además **su inicial** y la leyenda de personas muestra
  nombre y color juntos.
- RF-T11. **No se toca lo que la persona eligió:** portadas, stickers, colores de post-its, subrayados, cuadros de
  texto y lienzos (13c, 13h) se ven como se pintaron.
- **Criterio.** *Dado* el modo encendido, *cuando* veo una semana con actividades física y emocional, *entonces*
  se pintan `#228833` y `#EE6677` y cada bloque lleva el icono de su tema; *y cuando* lo apago, *entonces* vuelven
  a los colores de su tema.

## Criterios de aceptación
- Given el formulario de actividad, When elijo "Gimnasio", Then la actividad queda con dimensión física, color/icono del tema e `is_gym=true`.
- Given un tema propio usado por 5 actividades, When lo elimino, Then las 5 actividades mantienen su apariencia y quedan sin tema, sin errores.
- Given el seed inicial, When un usuario nuevo abre el picker, Then ve los ~19 temas del sistema agrupados por las 7 dimensiones.
- Given un intento de editar un tema del sistema, Then la UI no lo permite y la RLS lo rechaza.
