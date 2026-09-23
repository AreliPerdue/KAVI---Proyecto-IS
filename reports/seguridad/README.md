# Reporte de seguridad — OWASP ZAP

**Objetivo:** https://kavi-proyecto-is.vercel.app
**Fecha:** 23 de septiembre de 2026 (último escaneo)
**Herramienta:** OWASP ZAP {stable} vía `zaproxy/action-baseline@v0.15.0`
**Modo:** *Baseline* (análisis pasivo)
**Ejecución:** [workflow "Escaneo de seguridad (OWASP ZAP)"](../../.github/workflows/seguridad.yml)

## Resumen: antes y después

Se escaneó, se corrigió y se volvió a escanear. Las correcciones están en
[`vercel.json`](../../vercel.json).

| Riesgo | Antes | Después | 23-09 (final) |
|---|---|---|---|
| Alto | 0 | **0** | **0** |
| Medio | 3 | 1 | **1** |
| Bajo | 6 | 2 | **1** |
| Informativo | 9 | 9 | **4** |
| **Total** | **18** | **12** | **6** |

El escaneo previo se conserva íntegro en [`antes/`](antes/) para poder comparar.

## Triaje final (23 de septiembre)

Los seis hallazgos que quedan están **revisados uno a uno** en
[`.zap/reglas.tsv`](../../.zap/reglas.tsv), cada uno con el motivo escrito por el
que se acepta. Silenciar un aviso sin dejar constancia del porqué es
indistinguible de esconderlo, así que la justificación vive junto a la regla.

| Hallazgo | Riesgo | Decisión |
|---|---|---|
| CSP: `style-src unsafe-inline` | Medio | **Sigue avisando.** Es el único con contenido real |
| Timestamp Disclosure (Unix) | Bajo | Aceptado: constantes del bundle, no fechas de personas |
| Suspicious Comments | Info | Aceptado: comentarios de dependencias, sin datos sensibles |
| Modern Web Application | Info | Aceptado: describe la arquitectura, no es un defecto |
| Re-examine Cache-control | Info | Aceptado: la cáscara de la SPA no lleva datos de cuentas |
| Retrieved from Cache | Info | Aceptado: misma razón |

### Por qué la CSP se queda en aviso y no se silencia

React Native Web inyecta los estilos **en línea** en tiempo de ejecución, así que
`style-src 'unsafe-inline'` es estructural mientras la web se genere con Expo: no
es una omisión que se pueda cerrar escribiendo una cabecera. El resto de la
política sí está cerrada — `script-src` con hashes, `default-src 'self'`,
`object-src 'none'` y `frame-ancestors 'none'` —, de modo que el vector que
importa (inyección de **script**) queda cubierto.

Se deja en `WARN` y no en `IGNORE` a propósito: así sigue apareciendo en cada
informe y el día que Expo permita estilos con hash, se quita. Un `IGNORE` lo
haría desaparecer y con él la posibilidad de acordarse.

## Qué se corrigió

Los tres hallazgos de riesgo medio eran cabeceras de respuesta HTTP ausentes.
Se añadieron desde `vercel.json`, sin tocar `src/`:

| Hallazgo | Cabecera añadida |
|---|---|
| CSP no definida | `Content-Security-Policy` completa |
| Falta anti-clickjacking | `X-Frame-Options: DENY` y `frame-ancestors 'none'` |
| Cross-Domain Misconfiguration | `Access-Control-Allow-Origin` acotado al propio sitio |

Y cuatro de riesgo bajo: `X-Content-Type-Options`, `Permissions-Policy`,
`Cross-Origin-Opener-Policy` y `Cross-Origin-Embedder-Policy`. Se añadieron
además `Referrer-Policy` y `Cross-Origin-Resource-Policy`, que ZAP no pedía.

### Sobre la CSP

El único script en línea de la aplicación es el arranque de Expo Router
(`globalThis.__EXPO_ROUTER_HYDRATE__=true;`). Se autoriza **por hash**, no con
`'unsafe-inline'`, de modo que ningún otro script inyectado en el HTML podría
ejecutarse. Tampoco se concede `'unsafe-eval'`.

### Sobre el Access-Control-Allow-Origin

Vercel sirve los archivos estáticos con `Access-Control-Allow-Origin: *` por
omisión. La aplicación no hace peticiones entre orígenes contra sí misma —todo
lo suyo es del mismo origen y lo demás va a Supabase—, así que acotarlo al
propio dominio no le quita nada y cierra el hallazgo.

## Cómo se verificó antes de desplegar

Cambiar cabeceras de seguridad puede romper una aplicación entera sin dar ningún
error visible. Para no arriesgar el sitio, se exportó el build web y se sirvió en
local **leyendo las cabeceras del propio `vercel.json`**, conducido con Chrome:

- Las siete pantallas públicas renderizan.
- Las fuentes de marca (Moirai One y Poiret One) cargan.
- La navegación de cliente entre rutas funciona.
- La validación de formularios sigue devolviendo sus mensajes.
- Cero errores de página.

Ya en producción se repitió la comprobación contra el sitio real, incluido un
intento de inicio de sesión: la petición llega a Supabase y la aplicación muestra
su mensaje de credenciales incorrectas, lo que confirma que `connect-src` no
bloquea el backend.

## Lo que sigue abierto, y por qué

### `CSP: style-src unsafe-inline` (medio)

Es un hallazgo **nuevo**, que solo pudo aparecer porque ahora sí hay una CSP que
inspeccionar. Se mantiene a propósito.

React Native Web inyecta sus hojas de estilo en tiempo de ejecución, y en
hosting estático no se puede emitir un *nonce* distinto por petición. Se probó
quitarlo: la aplicación se queda **completamente sin estilos** —tipografía serif
por defecto, sin maquetación, sin colores—, como muestra
[`sin-style-inline.png`](sin-style-inline.png).

El riesgo real es acotado: `unsafe-inline` en `style-src` permite estilos
inyectados, no ejecución de código. La defensa contra XSS descansa en
`script-src`, que sí es estricta.

### `Dangerous JS Functions` (bajo)

Un `new Function("")` dentro de una librería de terceros, que lo usa para
detectar si puede compilar esquemas de validación. Va dentro de un `try/catch`:
la CSP lo bloquea, la librería repliega a la ruta sin compilar —más lenta, pero
correcta— y por eso no se concede `'unsafe-eval'`. Se comprobó que la validación
de formularios sigue funcionando con la CSP puesta.

### Los informativos

`Timestamp Disclosure` y `Base64 Disclosure` son coincidencias dentro del bundle
minificado, no datos expuestos. Los cuatro `Sec-Fetch-*` se refieren a cabeceras
que envía el **navegador** en sus peticiones, no el servidor: no son
accionables desde el despliegue.

## Ejecutarlo a mano

Este reporte lo genera el workflow de forma automática y pasiva. Para explorar
los hallazgos dentro de la herramienta, navegar el sitio con sesión iniciada o
demostrarlo en vivo, hay una guía paso a paso en
[`docs/guia-owasp-zap.md`](../../docs/guia-owasp-zap.md).

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

## Mantenimiento

Dos cosas que hay que recordar al tocar la aplicación:

- **El hash de la CSP.** Si una versión futura de Expo cambia el script de
  arranque, el hash deja de coincidir y la web no hidrata. Se recalcula con el
  sha256 en base64 del contenido del `<script>` sin `src` de `dist/index.html`.
- **`Cross-Origin-Embedder-Policy: require-corp`.** Hoy es seguro porque todos
  los recursos son del mismo origen. El día que se muestren avatares alojados en
  Supabase Storage habrá que añadir ese origen a `img-src` y comprobar que
  Supabase envía `Cross-Origin-Resource-Policy`, o esas imágenes no cargarán.

## Archivos

| Archivo | Uso |
|---|---|
| `zap-baseline.html` | Reporte completo navegable (escaneo posterior) |
| `zap-baseline.md` | Mismo contenido en texto |
| `zap-baseline.json` | Datos crudos |
| `antes/` | El escaneo previo a las correcciones, completo |
| `sin-style-inline.png` | Evidencia de cómo queda la app sin `style-src 'unsafe-inline'` |

## Dónde está el informe completo

[`zap-manual-2026-09-23.html.gz`](zap-manual-2026-09-23.html.gz) — el informe que
genera ZAP, con los seis hallazgos y sus evidencias.

Va comprimido porque en crudo son 15 MB y este repositorio es público: subirlo así
hace lento cualquier `git clone` para siempre, y el contenido es el mismo. Para
abrirlo:

```bash
gunzip -k reports/seguridad/zap-manual-2026-09-23.html.gz
open reports/seguridad/zap-manual-2026-09-23.html
```
