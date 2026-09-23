# Ejecutar el análisis de seguridad desde la app de OWASP ZAP

Guía paso a paso para correr el escaneo de seguridad **desde la herramienta de
escritorio**, ver los hallazgos dentro de ella y exportar el reporte.

Es lo mismo que ya hace el [workflow de seguridad](../.github/workflows/seguridad.yml)
de forma automática, pero en una ventana donde se puede explorar cada hallazgo,
navegar el sitio y demostrarlo en vivo.

> **Antes de empezar, lo más importante de esta guía.**
> El sitio desplegado apunta a la **base de datos de producción**. ZAP tiene dos
> modos y uno de ellos lanza ataques reales que pueden crear, modificar o borrar
> datos. En el paso 4 se explica cuál usar y cuál evitar. **No te saltes ese paso.**

---

## 1. Instalar ZAP

**No uses Homebrew.** El instalador `brew install --cask zap` está deshabilitado
desde el 1 de septiembre de 2026 porque no pasa la verificación de seguridad de
macOS. Si lo intentas, falla sin explicar por qué.

Descárgalo a mano:

1. Entra en **https://www.zaproxy.org/download/**
2. Elige el instalador de **macOS** (versión 2.17.0 o posterior). Trae su propio
   Java, no hace falta instalar nada más.
3. Ábrelo y arrastra ZAP a Aplicaciones.

### Si macOS no te deja abrirlo

Saldrá un aviso diciendo que **Apple no pudo verificar que ZAP esté libre de
malware**, con dos botones: *Move to Trash* y *Done*.

**Pulsa "Done".** Si eliges *Move to Trash* se borra la instalación y hay que
descargar los 264 MB otra vez.

El motivo del aviso es real y conviene entenderlo: **las versiones de macOS de
ZAP se publican sin firma de código**. No es que la firma sea dudosa, es que no
existe, y por eso macOS no puede comprobar por su cuenta que el archivo no se
haya alterado por el camino. Es también la razón por la que Homebrew deshabilitó
su instalador.

#### Verifica el archivo antes de saltarte el aviso

Como macOS no puede hacerlo, hazlo tú: OWASP publica la huella SHA-256 de cada
archivo en las notas de la versión. Compara la del tuyo con la oficial.

```bash
shasum -a 256 ~/Downloads/ZAP_2.17.0_aarch64.dmg
```

Esa huella tiene que coincidir **carácter por carácter** con la que aparece
junto al archivo en https://github.com/zaproxy/zaproxy/releases/latest. Si
coincide, el archivo es exactamente el que OWASP publicó. Si no coincide, **no
lo abras**: bórralo y vuelve a descargarlo.

#### Permitir la app

Solo después de que la huella coincida:

- **Ajustes del Sistema → Privacidad y seguridad**. Baja hasta *Seguridad*: hay
  un mensaje sobre ZAP con un botón **Abrir igualmente**. Confirma con tu
  contraseña o Touch ID.

  Con el sistema en inglés: **System Settings → Privacy & Security**, sección
  *Security*, mensaje *«ZAP» was blocked to protect your Mac* y botón **Open
  Anyway**. Sale una segunda confirmación con el mismo botón.
- Si ese mensaje no aparece, desde la Terminal:

  ```bash
  xattr -dr com.apple.quarantine /Applications/ZAP.app
  ```

  Quita la marca de "descargado de internet", solo para esa app.

---

## 2. Primer arranque

Al abrir ZAP por primera vez pregunta si quieres **conservar la sesión**. La
interfaz de ZAP está en inglés siempre, independientemente del idioma del
sistema. De las tres opciones, elige la última:

> **No, I do not want to persist this session at this moment in time**

Para un escaneo puntual no hace falta guardar nada, y así no se acumulan archivos
de sesión en tu disco.

Verás una ventana con tres zonas:

| Zona | Qué es |
|---|---|
| Izquierda | **Sites** — el árbol de páginas que ZAP ha visto |
| Centro | La pestaña **Quick Start** y el detalle de cada petición |
| Abajo | Las pestañas **Alerts**, **History**, **Output** |

---

## 3. Indicar el sitio

El objetivo es:

```
https://kavi-proyecto-is.vercel.app
```

---

## 4. Elegir el tipo de escaneo — el paso que importa

En la pestaña **Quick Start** hay dos botones. **No son intercambiables.**

### ✅ Manual Explore — el que debes usar

Hace un análisis **pasivo**: ZAP se pone en medio como intermediario, tú navegas
el sitio con normalidad y él va revisando cada respuesta. **No envía nada que el
sitio no reciba de un visitante cualquiera.** Es el equivalente al *baseline* que
corre el workflow.

1. Pulsa **Manual Explore**.
2. En **URL to explore** pega la dirección de arriba.
3. Deja marcado **Enable HUD** si quieres ver los hallazgos superpuestos sobre la
   propia página (es vistoso para una demostración).
4. Pulsa **Launch Browser**. Se abre un navegador controlado por ZAP.
5. **Navega el sitio**: entra a iniciar sesión, a crear cuenta, a recuperar
   contraseña. Cada página que visites, ZAP la analiza.
6. Vuelve a la ventana de ZAP. Los hallazgos van apareciendo en **Alerts**.

### ⚠️ Automated Scan — NO lo uses contra el sitio real

Hace *spider* y después un **escaneo activo**: envía ataques de inyección
reales, rellena formularios y repite peticiones con datos manipulados. Contra un
sitio conectado a la base de producción eso puede **crear, modificar o borrar
datos de verdad**.

Es una herramienta legítima, pero se usa contra un entorno de pruebas desechable,
nunca contra el que usan las personas. Por eso el workflow del proyecto corre el
*baseline* pasivo y no el *full scan*, y está explicado en
[`reports/seguridad/README.md`](../reports/seguridad/README.md).

---

## 5. Leer los resultados

Abre la pestaña **Alerts**, abajo. Los hallazgos vienen agrupados por riesgo, con
una banderita de color:

| Color | Riesgo |
|---|---|
| 🔴 Rojo | Alto |
| 🟠 Naranja | Medio |
| 🟡 Amarillo | Bajo |
| 🔵 Azul | Informativo |

Al pulsar un hallazgo, el panel de la derecha muestra qué es, por qué importa,
qué petición lo provocó y cómo se corrige. Abajo del todo, **Confidence** dice
cuán seguro está ZAP: los marcados como *Low* suelen ser falsos positivos.

### Qué deberías encontrar

Después de las correcciones que ya están aplicadas, el escaneo debe dar:

- **0 hallazgos de riesgo alto.**
- **1 de riesgo medio** — `CSP: style-src unsafe-inline`, que se mantiene a
  propósito: quitarlo deja la aplicación sin estilos. Está justificado en el
  reporte del proyecto.
- **2 de riesgo bajo** y unos cuantos informativos, casi todos falsos positivos
  del código minificado.

Si ves más, compara con [`reports/seguridad/`](../reports/seguridad/): puede que
hayas navegado a pantallas que el escaneo automático no alcanza, lo cual es
justamente la ventaja de hacerlo a mano.

---

## 6. Exportar el reporte

1. Menú **Report** → **Generate Report...**
2. En **Report Name** ponle un nombre y elige dónde guardarlo.
3. En **Template** elige **Traditional HTML Report** (el mismo formato que genera
   el workflow, así se pueden comparar).
4. En la pestaña **Filter** puedes acotar por nivel de riesgo si solo te interesan
   los medios y altos.
5. **Generate Report**. Se abre solo en el navegador.

Para guardarlo junto a los demás del proyecto, colócalo en
`reports/seguridad/` con un nombre que diga que es manual, por ejemplo
`zap-manual-2026-09-22.html`, y súbelo con el resto.

---

## 7. Diferencias con el escaneo automático

Conviene saberlas para explicarlas si te preguntan:

| | Workflow (automático) | ZAP de escritorio (manual) |
|---|---|---|
| Cuándo | A petición, desde GitHub | Cuando lo abras |
| Alcance | Lo que alcanza el rastreador sin sesión | Todo lo que tú navegues |
| Sesión iniciada | No | Sí, si entras tú |
| Queda registro | Sí, en `reports/seguridad/` | Solo si exportas el reporte |
| Sirve para | Dejar constancia repetible | Explorar y demostrar en vivo |

La ventaja real del manual es que **puedes iniciar sesión**. El escaneo
automático no tiene credenciales, así que solo ve la pantalla de entrada y las
rutas públicas. Navegando tú, ZAP analiza también el calendario, el perfil y las
pantallas de compartido.

> Si haces eso, **usa el modo demostración o una cuenta de prueba**, no tu cuenta
> real: ZAP guarda en su historial todo lo que pase por él, incluidas tus
> actividades.

---

## Si algo no funciona

| Síntoma | Qué suele ser |
|---|---|
| El navegador de ZAP no abre ninguna página | El proxy no arrancó. Cierra ZAP y vuelve a abrirlo |
| El sitio se ve pero no aparece ninguna alerta | Estás mirando **History** en vez de **Alerts** |
| Avisos de certificado | Normal: ZAP se pone en medio con su propio certificado. Acepta y continúa |
| macOS no deja abrir la app | Ver el paso 1, apartado de Gatekeeper |
