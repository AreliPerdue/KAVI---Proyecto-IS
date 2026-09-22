# KAVI — Manual técnico

Cómo se trabaja en este repositorio: comandos, cómo añadir una prueba, cómo
funciona el pipeline y qué hace cada workflow.

Para *usar* la aplicación, ver el [manual de usuario](manual-de-usuario.md).

---

## 0. Antes de nada: dónde se escriben los comandos

Esta sección es para quien no trabaja con código a diario, o para volver dentro
de un año habiéndolo olvidado. Si esto ya te resulta obvio, salta a la sección 1.

### Qué es la Terminal

Todos los comandos de este manual se escriben en la **Terminal**: una ventana
donde se dan instrucciones escribiéndolas en lugar de haciendo clic.

En Mac se abre con `Cmd + Espacio`, escribiendo `Terminal` y pulsando Enter.
En Windows es la **PowerShell** o la Terminal de Windows.

### Situarse en la carpeta del proyecto

La Terminal siempre está "dentro" de una carpeta, y los comandos solo funcionan
si estás dentro de la del proyecto. Para entrar:

```bash
cd ~/Desktop/kaviland/KAVI---Proyecto-IS
```

`cd` significa *change directory*, cambiar de carpeta. Para comprobar que estás
donde toca:

```bash
pwd
```

Debe responder con la ruta que termina en `KAVI---Proyecto-IS`. Si no, vuelve a
hacer el `cd`.

> **Atajo:** en el Finder, arrastrar la carpeta del proyecto sobre el icono de la
> Terminal la abre ya situada ahí.

### Cómo se ejecuta un comando

Escribes la línea y pulsas **Enter**. La Terminal se queda trabajando —a veces
varios segundos, a veces minutos— y cuando termina te devuelve el cursor.

Cuando en este manual veas un bloque así:

```bash
pnpm test
```

significa: escribe `pnpm test` en la Terminal y pulsa Enter. El símbolo `$` o `%`
que a veces aparece al principio de las líneas **no se escribe**: es el aviso de
que la Terminal está esperando.

### Cómo saber si salió bien

- **Bien:** el comando termina y te devuelve el cursor sin decir `error` ni
  `failed`. Muchos comandos terminan en silencio, y eso es buena señal.
- **Mal:** aparece la palabra `error`, `failed` o `✕` en rojo.

El mensaje de error casi siempre dice qué pasó. Merece la pena leerlo antes de
buscar ayuda: normalmente es una ruta mal escrita o un `pnpm install` pendiente.

### Si algo se queda colgado

`Control + C` (no `Cmd`) interrumpe lo que esté corriendo y te devuelve el
control. Es seguro: no rompe nada.

### Los cuatro comandos del día a día

| Escribes | Qué pasa |
|---|---|
| `pnpm install` | Descarga las dependencias. Solo tras clonar o cambiar de rama |
| `pnpm start` | Levanta la app para desarrollar. Se para con `Control + C` |
| `pnpm test` | Comprueba que nada se rompió. ~20 segundos |
| `pnpm web` | Abre la app en el navegador |

### Ejecutar las pruebas sin Terminal, desde GitHub

Si no quieres abrir la Terminal, las pruebas se pueden lanzar desde la web:

1. Entra en el repositorio en GitHub.
2. Pestaña **Actions**, arriba.
3. En la columna izquierda, elige **Pruebas**.
4. Botón **Run workflow**, a la derecha.
5. Deja los campos como están y pulsa el **Run workflow** verde.
6. Al cabo de un par de minutos aparece la ejecución. Ábrela: verás si todo pasó
   y, si algo falló, qué prueba y por qué.

Para comprobar solo una parte, escribe en el campo **filtro** la zona que te
interesa: `calendar`, `auth`, `profile`, `shared`, `fitness`.

---

## 1. Puesta en marcha

### Requisitos

| | Versión |
|---|---|
| Node | 22 |
| pnpm | 11 |
| Expo SDK | 57 |

### Primera vez

```bash
pnpm install
cp .env.example .env     # y rellena las credenciales
pnpm start               # o `pnpm web` para abrir solo en navegador
```

### Variables de entorno

`.env` **no se versiona** y nunca debe subirse: el repositorio es público.

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<clave anónima>
EXPO_PUBLIC_DEMO_MODE=false
```

Solo se usa la clave **anónima**, nunca la `service_role`. Las mismas variables
viven en tres sitios independientes y hay que actualizarlas en los tres: el `.env`
local, las variables de entorno de **EAS** (para las builds) y las de **Vercel**
(para la web).

### Modo demostración

Con `EXPO_PUBLIC_DEMO_MODE=true` la app usa un backend en memoria
(`src/services/demo/`) en lugar de Supabase. No hace falta servidor ni cuenta.

KAVI también cae a modo demo **sola** si las credenciales faltan o son inválidas,
en vez de arrancar rota. Esa lógica está en `src/lib/env.ts` y tiene sus propias
pruebas: fue lo que provocó que una build de producción saliera silenciosamente
en modo demo.

---

## 2. Comandos

| Comando | Qué hace |
|---|---|
| `pnpm start` | Servidor de desarrollo de Expo |
| `pnpm web` | Solo navegador |
| `pnpm android` / `pnpm ios` | Compila y abre en el dispositivo |
| `pnpm typecheck` | `tsc --noEmit`. Debe quedar limpio |
| `pnpm lint` | ESLint con las reglas de React Compiler |
| `pnpm test` | Las 1 287 pruebas (~20 s) |
| `pnpm test:watch` | Las re-ejecuta al guardar, mientras desarrollas |
| `pnpm test:coverage` | Además mide cobertura y la escribe en `reports/pruebas/` |
| `pnpm test:listado` | Regenera `reports/pruebas/Listado de pruebas.md` |
| `pnpm db:migration <nombre>` | Nueva migración SQL |
| `pnpm db:reset` | Recrea la base local desde migraciones y seeds |
| `pnpm db:push` | Aplica migraciones al proyecto remoto |
| `pnpm db:types` | Regenera `src/types/database.ts` desde el esquema |

Para correr solo una parte de las pruebas:

```bash
npx jest calendar                        # archivos cuya ruta contenga "calendar"
npx jest -t "no envia sin contraseña"    # una prueba concreta por su nombre
```

---

## 3. Estructura

```
src/
├── app/           Rutas de Expo Router: (auth) y (app). El archivo es la URL.
├── components/    UI reutilizable: ui/ (sistema de diseño), calendar/, fitness/
├── services/      ÚNICO acceso a datos. supabase/ y demo/ tras el mismo contrato
├── hooks/         TanStack Query: consultas, mutaciones e invalidaciones
├── lib/           Cliente de Supabase, fechas, recurrencia, errores, esquemas zod
├── constants/     Tokens de diseño, dimensiones, temas, colores de personas
├── providers/     Sesión, confirmaciones y avisos emergentes
└── store/         Zustand: estado de la vista del calendario
supabase/migrations/   Esquema, políticas RLS y seeds, versionados
specs/                 Las especificaciones. Mandan sobre el código
reports/               Evidencia de pruebas, calidad y seguridad
```

### Cuatro reglas que no se negocian

1. **Nunca se llama a Supabase desde un componente.** Todo pasa por
   `src/services/`. Los componentes usan hooks; los hooks usan servicios.
2. **Toda tabla nueva lleva políticas RLS desde su creación.** La seguridad vive
   en la base de datos, no en el cliente. Nunca se desactiva.
3. **Las fechas se guardan en UTC** (`timestamptz`) y se muestran en hora local
   con `date-fns`. El cruce entre ambas representaciones está concentrado en
   `src/lib/dates.ts` y `activity-form-mapping.ts`.
4. **Toda función de datos se implementa dos veces**: en `services/supabase/` y en
   `services/demo/`, tras el mismo contrato de `services/contracts.ts`. Si solo
   se hace una, la app se comporta distinto según el backend.

---

## 4. Cómo añadir una prueba

### Dónde va

No hay que registrar nada. Jest recoge todo lo que encaje con
`src/**/__tests__/**/*.test.ts(x)`. La prueba vive **junto a lo que prueba**:

```
src/components/ui/button.tsx      →  src/components/ui/__tests__/button.test.tsx
src/services/supabase/themes.ts   →  src/services/supabase/__tests__/themes.test.ts
src/lib/dates.ts                  →  src/lib/__tests__/dates.test.ts
```

Extensión `.test.tsx` si renderiza componentes, `.test.ts` si no.

### Qué escribir

Las pruebas de este proyecto **no comprueban que el código haga lo que hace** —eso
no aporta nada—, sino **las reglas que no se ven leyéndolo**. El nombre de la
prueba se escribe como una frase que describe la regla, no como el nombre de la
función:

```
✅ 'de quien comparte solo ocupacion llega el hueco, nunca el titulo'
❌ 'getAvailability returns blocks'
```

Ese nombre es lo que acaba en el [listado legible](../reports/pruebas/Listado%20de%20pruebas.md),
así que se escribe pensando en quien lo va a leer.

### Herramientas ya montadas

No hay que reinventarlas:

| Dónde | Qué te da |
|---|---|
| `jest.setup.js` | Simulacros de Expo Router, gestos, animaciones, iconos y áreas seguras. Expone `mockRouter` para comprobar navegación |
| `src/hooks/__tests__/query-wrapper.tsx` | `crearWrapper()` para probar hooks de TanStack Query, con limpieza automática |
| `src/services/supabase/__tests__/fake-supabase.ts` | Un doble encadenable de PostgREST: `responder()`, `encolar()`, `argsDe()` |

### Ejemplo mínimo

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '@/components/ui/button';

it('no responde cuando esta deshabilitado', async () => {
  const onPress = jest.fn();
  await render(<Button title="Guardar" disabled onPress={onPress} />);

  await fireEvent.press(screen.getByText('Guardar'));

  expect(onPress).not.toHaveBeenCalled();
});
```

### Dos trampas que cuestan horas

1. **`render` y `fireEvent` se esperan con `await`.** En Testing Library 14 son
   asíncronos. Si olvidas el `await`, el fallo no aparece en esa prueba sino en
   **la siguiente**, con un mensaje que no tiene nada que ver.
2. **Las variables que use una fábrica de `jest.mock` deben empezar por `mock`.**
   Jest eleva esas fábricas por encima de los imports; cualquier otro nombre da un
   `ReferenceError`.

### Antes de dar una tarea por terminada

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Si añadiste pruebas y quieres actualizar el informe legible:

```bash
pnpm test:listado
```

---

## 5. El pipeline

Tres workflows en `.github/workflows/`, cada uno con su propósito.

### `pruebas.yml` — Pruebas

**Cuándo corre:** en cada push a `main`, en cada pull request, y **a mano** desde
Actions → *Pruebas* → *Run workflow*.

El disparo manual acepta dos campos:

- **filtro** — vacío corre las 1 287; `calendar`, `auth` o `profile` corre solo
  esa zona. Útil tras tocar una parte concreta.
- **sonarqube** — desmarcar para saltarse el análisis en una comprobación rápida.

**Cómo está montado, y por qué:**

- **Tipos, pruebas y lint siguen adelante aunque uno falle.** Así una sola
  ejecución enseña todos los problemas de golpe, en vez de obligarte a arreglar,
  subir, esperar y descubrir el siguiente. Un paso final decide si el build pasa.
- **El resultado se publica en la página de la ejecución**, sin abrir los
  registros: cuántas pruebas pasaron, cuáles se rompieron y con qué error (cada
  archivo en un desplegable), y la cobertura. Lo genera
  `scripts/resumen-pruebas.mjs`, que también funciona en local.
- **SonarQube es un trabajo aparte** que reutiliza la cobertura del anterior en
  lugar de volver a ejecutar las pruebas, y solo corre tras una ejecución
  completa y en verde: no tiene sentido publicar el análisis de un build roto ni
  la cobertura parcial de una corrida filtrada.
- **El filtro viaja por variable de entorno**, no interpolado en el shell, para
  que su contenido no pueda ejecutarse como comando.

**Suelo de cobertura:** 80 % de sentencias y líneas, 74 % de ramas y funciones,
en `coverageThreshold` de `jest.config.js`. Si un cambio la baja de ahí, el build
falla. Está fijado por debajo de lo que hay hoy (83 %) para que un refactor normal
no lo dispare.

### `eas-build.yml` — Build de producción

Genera el APK instalable de Android con EAS. Se dispara a mano o al subir a
`main`. Usa el secreto `EXPOKEY` dentro del entorno `expogithub`.

> El perfil `production` de `eas.json` **debe** llevar `"environment": "production"`.
> Sin esa clave, EAS no inyecta las variables de Supabase y la build sale
> silenciosamente en modo demo. Ya pasó una vez.

### `seguridad.yml` — Escaneo OWASP ZAP

Manual. Escaneo **pasivo** (*baseline*) contra el sitio desplegado en Vercel.

Es pasivo a propósito: el *full scan* lanza ataques de inyección reales y este
despliegue apunta a la base de datos de producción.

---

## 6. Calidad y seguridad

### SonarQube Cloud

Corre dentro del workflow de pruebas y consume el `lcov` de Jest.

> **Importante:** el *Automatic Analysis* de SonarQube debe estar **apagado**.
> Si está encendido rechaza el análisis de CI, ignora las exclusiones de
> `sonar-project.properties` y acaba midiendo `dist/`, `ios/` y `android/`. Con él
> encendido el panel llegó a marcar 329 bugs y 25.9 % de duplicación falsos.

Estado actual: 0 bugs, 0 vulnerabilidades, 0 code smells, 0 % de duplicación,
81.8 % de cobertura y las tres calificaciones en **A**.

### Cabeceras de seguridad

Están en `vercel.json` y cierran los hallazgos de ZAP. Dos cosas que hay que
recordar al tocar la aplicación:

- **El hash de la CSP.** El único script en línea es el arranque de Expo Router y
  se autoriza por hash. Si una versión futura de Expo cambia ese script, el hash
  deja de coincidir y **la web no hidrata**, sin error evidente. Se recalcula con
  el sha256 en base64 del contenido del `<script>` sin `src` de `dist/index.html`.
- **`Cross-Origin-Embedder-Policy: require-corp`.** Hoy es seguro porque todos los
  recursos son del mismo origen. El día que se muestren avatares alojados en
  Supabase Storage habrá que añadir ese origen a `img-src` y comprobar que
  Supabase envía `Cross-Origin-Resource-Policy`, o esas imágenes no cargarán.

El detalle completo está en [`reports/seguridad/`](../reports/seguridad/).

---

## 7. Despliegue

| Destino | Cómo |
|---|---|
| **Web** | Vercel, automático al subir a `main`. Config en `vercel.json` |
| **Android** | EAS Build, perfil `production`, genera APK instalable |
| **iOS** | Pendiente: requiere cuenta de Apple Developer |

---

## 8. Flujo de trabajo del proyecto

KAVI se desarrolla con **Spec-Driven Development**: las especificaciones mandan y
el código las implementa.

1. `specs/00-constitution.md` — los principios. Se lee antes de cualquier cambio.
2. Cada funcionalidad tiene su spec en `specs/`. **Nada se implementa sin spec.**
   Si falta, primero se propone la spec.
3. `plan.md` — arquitectura y decisiones técnicas.
4. `tasks.md` — el avance. Las tareas se hacen en orden y se marcan `[x]` en el
   mismo commit.
5. Cada tarea termina cuando cumple los criterios de aceptación de su spec.

**Si una decisión contradice una spec, hay que parar y preguntar**, no improvisar.

Los commits llevan el prefijo de su tarea: `[T042] Crear vista semanal`.
