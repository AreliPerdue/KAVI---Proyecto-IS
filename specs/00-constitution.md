# Constitution — KAVI

Principios permanentes del proyecto. Toda spec, plan y tarea debe cumplirlos. Si un cambio los contradice, se rechaza o se renegocia explícitamente.

## P1. El calendario es la estrella
El calendario es el centro de la app y el punto de entrada a todo: crear/editar actividades, clasificarlas, compartirlas, coordinar horarios y acceder a módulos especializados (fitness). Ninguna funcionalidad debe requerir salir del flujo del calendario para tareas cotidianas.

## P2. Simplicidad primero
Campos abiertos y sencillos antes que formularios rígidos. Cada pantalla debe poder usarse sin tutorial. Si una feature puede resolverse con menos pasos, se hace con menos pasos. Nada de configuraciones avanzadas en V1.

## P3. Las 7 dimensiones estructuran, no estorban
Física, emocional, social, intelectual, espiritual, financiera y ocupacional. Clasificar una actividad debe tomar un toque (temas predefinidos con dimensión, color e icono ya asignados). La clasificación nunca es obligatoria para guardar una actividad.

## P4. Privacidad por diseño
- RLS activo en todas las tablas desde su creación; el cliente jamás confía en filtros de UI para seguridad.
- Lo compartido es opt-in, granular y revocable. Por defecto, nada se comparte.
- Un usuario solo ve de otros lo que le fue explícitamente compartido.

## P5. Multiplataforma real
Toda funcionalidad de V1 debe operar en iOS, Android y web con experiencia equivalente. Se prefieren soluciones compatibles con las tres plataformas sobre soluciones óptimas en una sola. Excepción documentada: notificaciones push en web pueden degradarse a recordatorios in-app.

## P6. Arquitectura modular alrededor de la actividad
La **actividad** es la entidad central. Los módulos especializados (fitness en V1; lectura, nutrición, etc. en el futuro) se conectan a actividades, nunca al revés. Agregar un módulo futuro no debe requerir modificar el calendario.

## P7. Incremental y verificable
Se construye por fases (tasks.md). Cada fase termina con un incremento funcional probado. No se inicia una fase sin cerrar los hitos de la anterior. Entrega final: **26 de septiembre de 2026**.

## P8. Alcance V1 cerrado
V1 = auth + calendario + temas/dimensiones + compartido con reminders compartidos + mini gym tracker + compatibilidad multiplataforma. Todo lo demás (KAVI Reader, nutrición, métricas avanzadas, chat, etc.) se documenta como futuro y **no se implementa**.

## P9. Rendimiento perceptible
Vistas principales del calendario cargan y muestran actividades en ≤ 3 segundos en condiciones normales. Estados de carga y error visibles siempre.

## P10. Español como idioma base
UI, textos, mensajes de error y documentación en español. El código (identificadores) en inglés.
