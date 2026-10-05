# Spec 01 — Producto: visión y alcance

## Visión
KAVI es una app de planificación personal donde el calendario es el centro de la vida del usuario: organiza sus actividades, las clasifica según las 7 dimensiones del bienestar mediante temas predefinidos, coordina horarios con otras personas mediante calendarios compartidos con recordatorios compartidos, y da acceso a herramientas especializadas por dimensión — en V1, un mini gym tracker ligado a actividades de gimnasio.

## Usuarios objetivo
- **Persona usuaria general**: organiza estudio, trabajo, vida personal y ejercicio; quiere ver en qué invierte su tiempo por área de vida.
- **Grupos pequeños** (pareja, amigos, familia, compañeros de gym): comparten actividades y coordinan horarios comunes.

## Problema
Los calendarios tradicionales registran compromisos, pero no relacionan la planificación con el bienestar ni ofrecen herramientas ligadas a las actividades (p. ej., registrar el entrenamiento de la sesión de gym agendada), ni recordatorios compartidos simples entre personas.

## Alcance V1 (features)
| # | Feature | Spec |
|---|---------|------|
| F1 | Autenticación y perfil | `03-auth.md` |
| F2 | Calendario (núcleo): vistas, CRUD, recurrencia, reminders propios | `04-calendar.md` |
| F3 | Temas predefinidos y 7 dimensiones | `05-themes-dimensions.md` |
| F4 | Calendario compartido + reminders compartidos + disponibilidad | `06-shared-calendar.md` |
| F5 | Módulo fitness (mini gym tracker) | `07-fitness.md` |
| F6 | Requisitos no funcionales (rendimiento, seguridad, compatibilidad) | `08-nfr.md` |

## Navegación (T188, T189; aprobada el 5 oct 2026)
- RF-N1. **Barra de accesos en teléfono (iOS y Android): cuatro lugares.** El primero es siempre el
  **Calendario** (P1: es la estrella y donde abre la app). El segundo y el tercero son **dos módulos a elección**.
  El cuarto es siempre **Más**, con un icono de cuatro cuadrados que no cambia, porque es la vía fija hacia todo
  lo demás, incluido Perfil si alguien lo saca de la barra.
- RF-N2. **Por omisión**, la barra es Calendario · Compartido · Fitness · Más, y Perfil vive en Más.
- RF-N3. **Más** lista todos los módulos con icono y nombre, y tocar uno lo abre. Si el módulo está en la barra,
  cambia a esa pestaña. Si no lo está, se abre como pantalla apilada con "Atrás", que regresa a donde estabas.
  Ahí mismo se eligen los dos accesos: para cada lugar se escoge un módulo, y escoger uno que ya está en el otro
  lugar los intercambia, de modo que nunca se repite ni queda un lugar vacío. Si Compartido queda fuera de la
  barra, el número de invitaciones pendientes pasa a Más y a su fila.
- RF-N4. La elección es una preferencia del **dispositivo**, como la apariencia o el formato de hora. Cambiarla
  no reinicia la navegación ni hace perder lo que había abierto en otras pestañas.
- RF-N5. **En web no hay límite:** la barra superior muestra todos los módulos con pestaña propia (Compartido,
  Fitness, Perfil) y no hace falta Más. Listas se abre desde el botón ○✓ del calendario (spec 10, §UI).
- RF-N6. Los módulos que existen hoy son Compartido, Fitness, Perfil y **Listas** (T189b). Los futuros (Lectura,
  Sueño, Diario…) se suman a la lista de Más y a los candidatos de la barra sin cambiar estas reglas. El botón
  ○✓ del calendario abre Listas donde esté: en su lugar de la barra o apilada.

Criterios de aceptación:
- Given la app recién instalada en un teléfono, When se abre, Then la barra muestra Calendario · Compartido ·
  Fitness · Más, y Perfil se abre desde Más con "Atrás".
- Given que en Más elijo Perfil para el tercer lugar, When regreso a la barra, Then dice Calendario · Compartido ·
  Perfil · Más, y Fitness se abre desde Más.
- Given que elijo para el segundo lugar el módulo que ya está en el tercero, When lo confirmo, Then los dos
  lugares se intercambian y ninguno se repite.
- Given que Compartido está fuera de la barra y tengo invitaciones pendientes, When miro la barra, Then el
  número aparece en Más.
- Given la web, When la abro, Then la barra superior muestra todos los módulos.

## Fuera de alcance V1
- Módulos de otras dimensiones (lectura, nutrición, meditación, finanzas).
- Estadísticas/analytics de entrenamientos o de distribución del tiempo.
- Chat o mensajería entre usuarios.
- Importar/exportar calendarios externos (Google/Apple Calendar).
- Notificaciones push remotas vía servidor (V1 usa notificaciones locales programadas).
- Modo offline completo (solo tolerancia básica a errores de red).

## Criterio de éxito de V1
Given un usuario nuevo, When se registra, agenda una semana de actividades con temas, comparte una actividad con reminder con otro usuario y registra un entrenamiento desde una actividad de gym, Then completa todo el flujo sin salir del calendario, sin errores y en las 3 plataformas.

## Entrega
Versión candidata: **26 de septiembre de 2026**.
