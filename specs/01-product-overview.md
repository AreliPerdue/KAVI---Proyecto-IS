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
