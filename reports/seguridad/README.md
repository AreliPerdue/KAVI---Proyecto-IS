# Reporte de seguridad — OWASP ZAP

**Objetivo:** https://kavi-proyecto-is.vercel.app
**Fecha:** 22 de septiembre de 2026
**Herramienta:** OWASP ZAP {stable} vía `zaproxy/action-baseline@v0.15.0`
**Modo:** *Baseline* (análisis pasivo)
**Ejecución:** [workflow "Escaneo de seguridad (OWASP ZAP)"](../../.github/workflows/seguridad.yml)

## Resumen: antes y después

Se escaneó, se corrigió y se volvió a escanear. Las correcciones están en
[`vercel.json`](../../vercel.json).

| Riesgo | Antes | Después |
|---|---|---|
| Alto | 0 | **0** |
| Medio | 3 | **1** |
| Bajo | 6 | **2** |
| Informativo | 9 | 9 |
| **Total** | **18** | **12** |

El escaneo previo se conserva íntegro en [`antes/`](antes/) para poder comparar.

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
