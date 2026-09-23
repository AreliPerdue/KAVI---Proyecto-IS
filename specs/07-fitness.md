# Spec 07 — Módulo fitness: mini gym tracker (F5)

## Objetivo
Un gym tracker en miniatura, accedido **desde el calendario**: campos abiertos y sencillos donde puedas apuntar todos los detalles de tu entrenamiento sin catálogos rígidos ni fricción (P2, P6).

## Historias de usuario
- HU-F1: Yo como persona usuaria, quiero abrir el registro de entrenamiento desde mi actividad de gimnasio del calendario para capturar lo que hice en esa sesión.
- HU-F2: Yo como persona usuaria, quiero agregar ejercicios con nombre libre y anotar series, reps, peso, duración y notas como yo quiera, para registrar a mi manera.
- HU-F3: Yo como persona usuaria, quiero consultar mi historial de entrenamientos para ver qué hice en sesiones pasadas.
- HU-F4: Yo como persona usuaria, quiero duplicar un entrenamiento anterior para no volver a capturar mi rutina desde cero.

## Punto de entrada (único flujo principal)
- RF-F1. En la hoja de detalle de una actividad con `is_gym=true`: botón primario **"Registrar entrenamiento"** (si no existe workout) o **"Ver entrenamiento"** (si ya existe). Relación 1:1 actividad↔workout.
- RF-F2. Acceso secundario: pestaña/entrada "Historial" dentro del módulo (lista cronológica), también con opción "Entrenamiento libre" sin actividad (activity_id null) para no bloquear a quien no agendó.

## Pantalla de entrenamiento
- RF-F3. Encabezado: **fecha** (solo el día, default: la de la actividad; el selector es de día, así que no se muestra hora), **duración total calculada** y **notas generales** (texto libre). La duración total ya no se escribe a mano: es la suma de la duración de los ejercicios registrados. Si ningún ejercicio la lleva anotada, no se muestra duración — es lo esperado en una sesión de fuerza, donde el dato relevante son series y peso, no los minutos.
- RF-F4. Lista de ejercicios ordenable; botón "+ Ejercicio" agrega una tarjeta con campos **todos opcionales excepto nombre**:
  - Nombre (texto libre con autocompletado de nombres que el usuario ya usó antes)
  - Series (número)
  - Reps (texto libre: "12", "12/10/8", "al fallo")
  - Peso (texto libre: "40 kg", "25 lb por lado", "corporal")
  - Duración (min, para cardio/planchas)
  - Notas (texto libre: "subir 2.5 kg la próxima", "dolió el hombro")
- RF-F5. Guardado incremental: cada tarjeta se guarda al perder foco/confirmar; sin botón "guardar todo" obligatorio. Indicador sutil de guardado.
- RF-F6. Eliminar ejercicio con confirmación ligera (undo snackbar).

## Historial
- RF-F7. Lista cronológica descendente: fecha, título de la actividad ligada (si hay), nº de ejercicios, duración.
- RF-F8. Detalle de un workout pasado en solo lectura con opción "Editar" y **"Duplicar en…"** → elige actividad de gym futura o crea entrenamiento libre con los mismos ejercicios (sin reps/peso o con ellos, preguntar).

## Reglas de negocio
- Los workouts son privados: **no** se comparten aunque la actividad esté compartida (los invitados ven la actividad, no el entrenamiento).
- Borrar la actividad no borra el workout (queda como entrenamiento libre, FK `set null`).
- V1 sin estadísticas/gráficas (P8): solo captura e historial.

## Criterios de aceptación
- Given una actividad "Gimnasio" en el calendario, When toco "Registrar entrenamiento", Then llego a la pantalla con la fecha pre-llenada y puedo agregar un ejercicio con solo escribir su nombre.
- Given un ejercicio con reps "12/10/8" y peso "40kg + cadena", When guardo y reabro, Then el texto se conserva exactamente igual.
- Given una actividad de gym compartida con B, When B abre el detalle, Then B no ve el botón ni el contenido del entrenamiento de A.
- Given un workout de la semana pasada, When lo duplico en la actividad de mañana, Then mañana tengo los mismos ejercicios listos para capturar.
- Given que borro la actividad ligada, Then el workout sigue visible en el historial.

## UI
Rutas: `/(app)/workout/[id]`, historial en `/(app)/fitness`. Diseño de tarjetas grandes, teclado numérico donde aplique, cero modales anidados.

- RF-F10. **Los entrenamientos se ven en el calendario.** Los entrenamientos sin
  actividad asociada se pintan en el calendario como bloques derivados de solo
  lectura, a la hora en que se registraron y con la duración sumada de sus ejercicios
  (una hora si no la tienen). Los que sí tienen actividad no se duplican: ya se ven a
  través de ella.

  Se derivan en lugar de crear actividades reales por dos razones: alcanza también a
  los entrenamientos registrados antes de existir esta vista, y permite ocultarlos con
  un interruptor en Perfil sin borrar nada. Motivo de fondo: haber entrenado es un
  hecho del día y el calendario es el registro de cómo se ocupó el tiempo; un
  entrenamiento que no aparece ahí deja un hueco falso.

  **Criterio.** *Dado* un entrenamiento libre registrado el 21 de septiembre, *cuando*
  abro el calendario en esa semana, *entonces* aparece un bloque a esa hora; y *cuando*
  desactivo "Entrenamientos en el calendario" en Perfil, *entonces* deja de aparecer
  sin que el entrenamiento se borre.

- RF-F9. **Rutina desde el calendario.** Al activar "Actividad de gimnasio" en el formulario de actividad aparece ahí mismo el editor de ejercicios (nombre, series, reps, peso, con autocompletado de nombres ya usados). Los ejercicios se guardan junto con la actividad creando su entrenamiento, sin pasar por el módulo Fitness. Si la actividad ya tiene un entrenamiento guardado, en su lugar se ofrece abrirlo para no duplicarlo.

**Criterio (RF-F9).** *Dado* el formulario de nueva actividad, *cuando* activo el gimnasio, añado un ejercicio y creo la actividad, *entonces* el entrenamiento aparece en el historial de Fitness con ese ejercicio.
