# KAVI — paquete SDD

Archivos para desarrollar KAVI V1 con Claude Code bajo Spec-Driven Development.

## Contenido
- `CLAUDE.md` — instrucciones de trabajo para Claude Code (leer primero)
- `specs/00-constitution.md` — principios del proyecto
- `specs/01-product-overview.md` — visión y alcance V1
- `specs/02-data-model.md` — esquema PostgreSQL completo + RLS
- `specs/03-auth.md` … `specs/07-fitness.md` — specs por feature con criterios Given/When/Then
- `specs/08-nfr.md` — requisitos no funcionales
- `plan.md` — arquitectura y decisiones técnicas
- `tasks.md` — ~90 tareas en 9 fases con dependencias e hitos

## Uso
1. Copia todo a la raíz del repo del proyecto.
2. Abre Claude Code y pide: "Lee CLAUDE.md y empieza con la Fase 0 de tasks.md".
3. Claude Code implementará tarea por tarea marcando avances.
