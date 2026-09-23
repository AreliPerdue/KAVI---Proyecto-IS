# Guion para demostrar OWASP ZAP en vivo

Para ejecutar el análisis de seguridad delante de alguien, sin sorpresas.
Duración: unos 8 minutos.

La guía completa de instalación y detalles está en
[`guia-owasp-zap.md`](guia-owasp-zap.md). Esto es solo el guion.

---

## Antes de empezar (hazlo 10 minutos antes)

Sin público delante, para que la demostración empiece ya en marcha:

- [ ] **Abre ZAP.** Tarda en arrancar y saca una ventana de complementos.
- [ ] **Cierra la ventana "Manage Add-ons"** si aparece. No hace falta tocar nada.
- [ ] **Desactiva el envío de formularios.** `Tools → Options → Spider` y desmarca
      **Process forms** y **Post forms**. *(Ver el porqué en el paso 4.)*
- [ ] **Comprueba que el sitio responde.** Abre
      https://kavi-proyecto-is.vercel.app en cualquier navegador.
- [ ] **Ten a mano** la carpeta `reports/seguridad/` del proyecto, para guardar
      el reporte al final.
- [ ] **Deja ZAP al frente**, no minimizado.

> **Si ya hiciste un escaneo antes:** empieza de cero para que se vea en vivo.
> `File → New Session` y elige no conservar la anterior.

---

## El guion

### 1 · Presentar la herramienta · *30 s*

> «OWASP ZAP es un escáner de seguridad de aplicaciones web. Lo usamos de dos
> maneras: automatizado en cada despliegue mediante GitHub Actions, y manual
> desde la herramienta, que es lo que voy a mostrar ahora.»

Señala la ventana: a la izquierda el árbol de **Sites**, abajo las pestañas
**Alerts** y **Output**.

### 2 · Registrar el sitio · *1 min*

Pestaña **Requester** (arriba). En el campo de la petición escribe:

```
GET https://kavi-proyecto-is.vercel.app HTTP/1.1
```

Pulsa **Send**.

> «Con esto ZAP visita el sitio directamente, como cliente. Aparece en el árbol
> de la izquierda.»

Aparece `kavi-proyecto-is.vercel.app` en el panel **Sites**.

### 3 · Explicar por qué NO usamos el escaneo automático · *1 min*

Este punto luce, porque demuestra criterio y no solo manejo de la herramienta.

Señala la pestaña **Quick Start** y sus dos botones.

> «ZAP tiene dos modos. *Automated Scan* incluye un escaneo **activo**: envía
> ataques de inyección reales y rellena formularios. Este despliegue está
> conectado a la base de datos de producción, así que un escaneo activo podría
> crear, modificar o borrar datos de personas reales.
>
> Por eso usamos el modo **pasivo**: ZAP analiza las respuestas sin enviar
> ningún payload. Es la misma decisión que tomamos en el pipeline automático, y
> está documentada en el reporte del proyecto.»

### 4 · Lanzar el rastreo · *1 min*

En el panel **Sites**, clic derecho sobre `kavi-proyecto-is.vercel.app` →
**Attack → Spider...** → **Start Scan**.

> «El menú se llama *Attack*, pero el Spider solo recorre enlaces: no envía
> ataques. Además le desactivé el envío de formularios, para que no registre
> cuentas en la base real mientras rastrea.»

Se abre la pestaña **Spider** y las URLs se van poniendo en verde.

> «Verde aquí significa que la página se descargó y se analizó. No significa
> que sea segura: los hallazgos están en otra pestaña.»

### 5 · Explicar por qué salen pocas URLs · *30 s*

Se rastrean unas 9 direcciones. Adelántate a la pregunta:

> «Salen pocas porque KAVI es una aplicación de una sola página: sus rutas las
> genera JavaScript en el navegador, y este rastreador no ejecuta JavaScript.
> Es una limitación conocida del análisis pasivo y está anotada en el reporte,
> junto con la otra: el escáner no tiene credenciales, así que solo ve la
> superficie pública.»

### 6 · Los hallazgos · *2 min*

Abre la pestaña **Alerts** (la de la banderita 🚩).

> «Aquí sí están los resultados, agrupados por nivel de riesgo.»

| Bandera | Qué decir |
|---|---|
| 🔴 **Ninguna roja** | «**Cero hallazgos de riesgo alto.** Es el dato principal.» |
| 🟠 `CSP: style-src unsafe-inline` | «El único medio, y se mantiene a propósito. React Native Web inyecta sus estilos en tiempo de ejecución y el hosting estático no puede emitir un *nonce* por petición. Lo probamos quitándolo: la aplicación se queda sin estilos. Está documentado con la captura.» |
| 🟡 `Timestamp Disclosure` | «Falso positivo: números dentro del bundle minificado que parecen fechas.» |
| 🔵 `Suspicious Comments` | «También de terceros: lo dispara un mensaje de error de Zod, la librería de validación, que contiene la palabra *bug*.» |
| 🔵 `Modern Web Application` | «No es un hallazgo, ZAP solo constata que es una SPA.» |

Despliega una alerta con la flecha `>` y selecciona una instancia: a la derecha
aparece la descripción, la petición que la provocó y el campo **Evidence** con
el texto exacto.

> «De cada hallazgo, ZAP dice qué es, dónde lo encontró y cómo se corrige.
> Abajo del todo está *Confidence*: los de confianza baja suelen ser falsos
> positivos, y conviene revisarlos antes de darlos por buenos.»

### 7 · Generar el reporte · *1 min*

⚠️ **Haz clic en la ventana de ZAP primero.** En macOS la barra de menús de
arriba muestra la app que esté al frente; si vienes del editor, verás sus menús
y no los de ZAP.

Barra superior: **Report → Generate Report...**

| Campo | Valor |
|---|---|
| Report Name | `zap-manual-2026-09-23` |
| Report Directory | `…/KAVI---Proyecto-IS/reports/seguridad` |
| Template | **Traditional HTML Report** |
| Report Title | `KAVI — Escaneo manual con OWASP ZAP` |

**Generate Report**. Se abre solo en el navegador.

> «El reporte queda versionado en el repositorio, junto al del escaneo
> automático y al escaneo previo a las correcciones, para poder comparar el
> antes y el después.»

### 8 · Cerrar · *30 s*

> «Las dos vías coinciden: cero hallazgos de riesgo alto. El único medio está
> justificado con evidencia, y el resto son falsos positivos de dependencias de
> terceros. El análisis automático corre en cada despliegue, así que esto no es
> una foto puntual sino una comprobación continua.»

Si puedes, enseña también `reports/seguridad/README.md`, que tiene la tabla de
**antes y después**: de 18 hallazgos a 12, con los 3 medios cerrados.

---

## Lo que NO hay que tocar

| | Por qué |
|---|---|
| **Automated Scan** | Escaneo activo contra la base de producción |
| **Active Scan** en el menú de clic derecho | Lo mismo |
| **Fuzzer** | Envía cientos de peticiones manipuladas |
| *Process forms* en el Spider | Registraría cuentas de verdad |

---

## Preguntas probables

**«¿Por qué no hiciste el escaneo completo?»**
Porque el despliegue apunta a la base de producción y el escaneo activo envía
ataques reales. Se haría contra un entorno de pruebas desechable. La decisión
está documentada en el reporte.

**«¿Solo eso encontró?»**
El alcance es la superficie sin autenticar: el escáner no tiene credenciales.
Además, la inyección SQL es estructuralmente improbable aquí porque el acceso a
datos va por PostgREST con consultas parametrizadas y bajo Row Level Security;
ese control se verifica aparte, con pruebas SQL en `supabase/tests/rls.sql`.

**«¿Y el hallazgo de riesgo medio?»**
Se mantiene a conciencia. Se probó quitarlo y la aplicación se queda sin
estilos; hay una captura como evidencia. El riesgo es acotado: `unsafe-inline`
en `style-src` permite estilos inyectados, no ejecución de código. La defensa
contra XSS está en `script-src`, que sí es estricta y usa hash.

**«¿Esto se ejecuta solo?»**
Sí, hay un workflow en GitHub Actions. Lo manual sirve para explorar los
hallazgos y poder navegar con sesión iniciada, que el automático no puede.

**«¿Qué corregiste gracias a ZAP?»**
Tres hallazgos de riesgo medio y cuatro de bajo, todos cabeceras HTTP ausentes:
falta de Content-Security-Policy, falta de protección contra clickjacking y una
política de origen cruzado demasiado permisiva. Se corrigieron en `vercel.json`
y se volvió a escanear para dejar constancia del antes y el después.

---

## Si algo falla en vivo

| Síntoma | Qué hacer |
|---|---|
| ZAP tarda en arrancar | Por eso se abre antes. Mientras, enseña `reports/seguridad/README.md` |
| No aparece el menú **Report** | ZAP no está al frente. Clic en su ventana |
| El Spider no encuentra nada | Comprueba que el sitio responde en un navegador normal |
| Sale un error de navegador | No lo necesitas: esta ruta no usa navegador |
| Se cae del todo | Ten abierto `reports/seguridad/zap-baseline.html`, que es el mismo reporte ya generado |
