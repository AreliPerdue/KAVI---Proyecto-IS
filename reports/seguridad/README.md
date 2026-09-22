# Reporte de seguridad — OWASP ZAP

**Objetivo:** https://kavi-proyecto-is.vercel.app
**Fecha:** 22 de septiembre de 2026
**Herramienta:** OWASP ZAP {stable} vía `zaproxy/action-baseline@v0.15.0`
**Modo:** *Baseline* (análisis pasivo)
**Ejecución:** [workflow "Escaneo de seguridad (OWASP ZAP)"](../../.github/workflows/seguridad.yml)

## Resumen

| Riesgo | Hallazgos |
|---|---|
| Alto | 0 |
| **Medio** | **3** |
| Bajo | 6 |
| Informativo | 9 |
| **Total** | **18** |

Sin hallazgos de riesgo alto. Ninguno corresponde a inyección SQL ni a XSS
explotable.

## Hallazgos de riesgo medio

| Hallazgo | Qué significa |
|---|---|
| Content Security Policy (CSP) no definida | No hay cabecera que restrinja de dónde puede cargarse script. Es la defensa en profundidad frente a XSS. |
| Cross-Domain Misconfiguration | La política de origen cruzado permite más de lo necesario en 5 recursos. |
| Falta cabecera anti-clickjacking | Sin `X-Frame-Options` ni `frame-ancestors`, la página puede incrustarse en un iframe ajeno. |

Los tres son **cabeceras de respuesta HTTP**, no defectos del código de la
aplicación: se corrigen configurando el despliegue en `vercel.json`, no tocando
`src/`.

## Alcance y limitaciones

Conviene ser explícito sobre qué cubre y qué no:

1. **Solo superficie sin autenticar.** KAVI exige inicio de sesión y el escáner
   no tiene credenciales, así que recorrió la pantalla de entrada y las rutas
   públicas. Las pantallas que leen o escriben datos quedaron fuera.

2. **Análisis pasivo, no activo.** Se descartó el *full scan* a propósito: lanza
   ataques reales de inyección contra el objetivo, y este despliegue apunta a la
   base de datos de producción. El baseline inspecciona las respuestas sin
   enviar payloads ni modificar datos.

3. **Sobre inyección SQL.** Que no aparezca no es resultado de haberla probado
   activamente. El acceso a datos va por PostgREST con consultas parametrizadas
   y bajo Row Level Security, lo que hace la SQLi estructuralmente improbable;
   la verificación de ese control está en `supabase/tests/rls.sql`.

## Archivos

| Archivo | Uso |
|---|---|
| `zap-baseline.html` | Reporte completo navegable |
| `zap-baseline.md` | Mismo contenido en texto |
| `zap-baseline.json` | Datos crudos |

## Siguiente paso

Corregir las tres cabeceras de riesgo medio desde `vercel.json` y volver a
ejecutar el escaneo para dejar constancia del antes y el después.
