# KAVI — Manual de usuario

KAVI es un planificador personal donde **todo se gestiona desde el calendario**.
Cada actividad se clasifica con un tema ligado a una de las **7 dimensiones del
bienestar**, de modo que el calendario acaba siendo un mapa de en qué inviertes
tu tiempo.

Funciona en **iOS, Android y navegador** con la misma cuenta y los mismos datos.

> **Sobre iOS:** la app está desarrollada y verificada en el simulador de iOS,
> pero todavía no se puede instalar en un iPhone ni descargar de la App Store:
> hace falta una cuenta de Apple Developer de pago para firmarla y publicarla.
> Mientras tanto, en iPhone se puede usar la **versión web** desde el navegador.

---

## 1. Crear tu cuenta

El alta va por pasos, uno por pantalla, para que no sea un formulario largo:

1. **Tu nombre** — el que verán tus contactos.
2. **Tu correo** — es tu identificador para entrar.
3. **Tu nombre de usuario** — KAVI te propone uno a partir del correo; puedes
   cambiarlo. Sirve para que te encuentren tus contactos. Si el propuesto ya está
   ocupado, te ofrece otro libre.
4. **Código de verificación** — te llega al correo. Si no aparece, revisa la
   carpeta de no deseados y usa *Reenviar código*.
5. **Tu contraseña** — mínimo 8 caracteres, escrita dos veces.

Hasta que no fijas la contraseña, la cuenta queda a medias: si cierras la app en
ese punto, al volver te pedirá terminar.

### Entrar y recuperar la contraseña

En **Iniciar sesión** escribes correo y contraseña. El icono del ojo muestra u
oculta lo que escribes.

Si la olvidaste, *Olvidé mi contraseña* te envía un enlace al correo. Por
seguridad el mensaje de confirmación es el mismo exista o no esa cuenta.

---

## 2. El calendario

Es la pantalla de inicio. Arriba está el periodo que estás viendo; tocándolo se
abre un selector de fecha.

### Las tres vistas

| Vista | Para qué sirve |
|---|---|
| **Mes** | Ver el panorama. Cada día muestra puntos de color, uno por actividad. |
| **Semana** | Las siete columnas con las horas. La vista de trabajo. |
| **Día** | Una sola jornada, con más espacio para leer. |

Se cambia con el selector de la cabecera. Tocar un día en la vista mensual te
lleva a ese día sin cambiar tu vista preferida.

Los botones **‹** y **›** mueven un mes, una semana o un día según donde estés, y
**Hoy** te devuelve a la fecha actual.

### Crear una actividad

Dos maneras:

- **Tocando un hueco** en la vista de semana o día: se abre el formulario con esa
  fecha y hora ya puestas.
- **Con el botón +** de abajo a la derecha, desde cualquier vista.

### Filtrar lo que ves

El botón **Filtros** de la cabecera permite acotar por **dimensión del bienestar**
y por **tema**. Se combinan: si eliges "Física" y el tema "Lectura", ves las dos
cosas, no la intersección. Cuando hay filtros puestos el botón te dice cuántos, y
*Limpiar filtros* los quita de golpe.

Los filtros se aplican a las tres vistas por igual.

---

## 3. Actividades

### Los campos

- **Título** — lo único obligatorio.
- **Descripción** — opcional.
- **Fecha y horas** — o **Todo el día**, que hace desaparecer las horas.
- **Tema** — ver la sección siguiente.
- **Repetir** — ver más abajo.
- **Recordatorios** — con cuánta antelación quieres el aviso.
- **Es gimnasio** — habilita el registro de entrenamiento.

### Actividades que se repiten

En **Repetir** eliges *Diaria*, *Semanal* o *Mensual*. La semanal te deja marcar
los días; siempre queda al menos uno marcado. Puedes ponerle fecha de fin o
dejarla indefinida, en cuyo caso KAVI genera 90 días por adelantado y va
extendiendo la serie sola.

**Lo importante:** al editar o borrar una actividad que se repite, KAVI te
pregunta primero:

- **Solo esta** — cambia únicamente ese día. El resto de la serie sigue igual.
- **Toda la serie** — cambia todas las repeticiones.

Si editas una sola ocurrencia, el campo de repetición se bloquea: esa opción se
cambia desde la serie completa.

### Ver y modificar

Tocando una actividad se abre su detalle, con **Editar**, **Compartir** y
**Eliminar**. Eliminar siempre pide confirmación.

Si la actividad es de otra persona y la ves porque te la compartió, no puedes
editarla ni borrarla: solo **salirte de ella**.

---

## 4. Temas y dimensiones

Las **7 dimensiones del bienestar** son la clasificación de fondo: Física,
Emocional, Social, Intelectual, Espiritual, Financiera y Ocupacional. Cada una
tiene su color fijo, y es lo que da color a tu calendario.

Los **temas** son las categorías concretas dentro de cada dimensión. KAVI trae
unos predefinidos y puedes crear los tuyos en **Perfil → Temas**, eligiendo
nombre, dimensión y color.

Al elegir tema en una actividad se abre un selector agrupado por dimensión, con
buscador: escribes "gim" y filtra. No hace falta poner tildes.

> **Detalle a saber:** el estilo del tema **se copia** a la actividad al crearla.
> Si después cambias el color de un tema, las actividades que ya existían
> conservan el color con el que nacieron.

Una actividad sin tema es válida: sale en gris neutro.

---

## 5. Compartir con otras personas

### Añadir un contacto

En **Compartido** buscas por nombre de usuario (con o sin `@`) o por el correo
completo. Hacen falta al menos 3 caracteres. Envías la solicitud y la otra
persona la acepta.

### Compartir tu calendario

Una vez sois contactos, decides **qué ve cada quien** de tu agenda:

| Nivel | Qué ve la otra persona |
|---|---|
| **Nada** | No ve tu calendario. |
| **Solo ocupación** | Ve *cuándo* estás ocupada, pero no *en qué*. Sin títulos ni colores. |
| **Con detalles** | Ve el título y el color de tus actividades. |

Es independiente en cada dirección: que tú le compartas no significa que te
comparta.

### Ver el calendario de un contacto sobre el tuyo

En el calendario, las pestañas de arriba muestran **Tú** y tus contactos que te
comparten su agenda. Tocando a alguien, sus actividades se superponen a las tuyas
con su color. Puedes activar a varias personas a la vez; **Tú** vuelve a dejar
solo tu calendario.

Cada persona tiene su color, asignado automáticamente para que no se repitan.

### Invitar a alguien a una actividad concreta

Desde el detalle de una actividad, **Compartir**. Eliges a uno o varios contactos
y se les envía una invitación, que aceptan o rechazan desde su pantalla de
Compartido.

Si el contacto ya tiene algo a esa hora, KAVI te avisa del choque antes de
enviar — pero te deja enviar igualmente, por si ya lo habíais hablado.

### Encontrar un hueco en común

**Compartido → Disponibilidad** muestra la semana de varias personas a la vez.
Eliges a quién incluir y una duración (30 min, 1 h, 1 h 30 o 2 h), y KAVI te
propone los huecos donde todas estáis libres.

### Eliminar un contacto

Pide confirmación, y te avisa de que se revoca todo de una vez: el calendario que
os compartíais, las invitaciones a actividades entre ambos y el color que le
habías asignado.

---

## 6. Recordatorios

Al crear o editar una actividad eliges con cuánta antelación quieres el aviso: al
momento, 10 minutos, 30 minutos, 1 hora o 1 día antes. Puedes poner varios.

En una actividad compartida **cada persona decide por su cuenta**: si tú silencias
el recordatorio, los demás lo siguen recibiendo.

> En la versión web, los recordatorios vencidos aparecen como un aviso dentro de
> la propia app, en la parte superior del calendario. Se pueden descartar uno a
> uno y no vuelven.

---

## 7. Gimnasio

Cualquier actividad marcada como **gimnasio** puede llevar un registro de
entrenamiento, que es **privado tuyo** aunque la actividad esté compartida.

La pestaña **Fitness** guarda el historial completo: qué hiciste, cuándo y cuántos
ejercicios. Desde ahí también puedes empezar un **entrenamiento libre**, sin
actividad asociada.

### Capturar

Cada ejercicio tiene nombre, series, repeticiones, peso, duración y notas. Todos
los campos son opcionales: apunta lo que te sirva.

- **Se guarda solo** al salir de cada campo. No hay botón de guardar.
- El **nombre se autocompleta** con los ejercicios que ya has usado.
- **Borrar un ejercicio no pide confirmación**: aparece un *Deshacer* que lo
  devuelve con sus valores y en su posición.

**Duplicar** copia una sesión entera a otro día, con la opción de conservar los
pesos y repeticiones o dejarlos en blanco para volver a capturarlos.

---

## 8. Perfil

Reúne tus datos, tus estadísticas del mes (actividades, amigos, temas propios y
entrenamientos) y los accesos a **Temas**, **Compartido** y **Disponibilidad**.

Desde aquí se cambia el nombre visible, el nombre de usuario y la contraseña —
esta última pidiendo primero la actual— y se cierra la sesión, con confirmación.

---

## 9. Modo demostración

KAVI puede funcionar **sin servidor**, con datos de ejemplo en memoria. Es el modo
para probar la app sin crear una cuenta real.

- Entra con **`demo@kavi.app`** y **`demo1234`**.
- Hay contactos de ejemplo ya cargados —Ana, Luis, María y Pedro— con distintos
  niveles de compartido, para poder probar esa parte. Desde Perfil se cambia de
  cuenta con un toque.
- **Los datos se reinician al recargar.** No guardes nada que te importe.

---

## Preguntas frecuentes

**Cambié el color de un tema y mis actividades antiguas siguen igual.**
Es intencionado: el color se copia al crear la actividad, para que cambiar un
tema no reescriba tu historial.

**Edité una actividad que se repite y cambió todo.**
Al editar te pregunta el alcance. Si elegiste *Toda la serie*, se aplicó a todas
las repeticiones; *Solo esta* afecta a un único día.

**Veo las horas de un contacto pero no qué hace.**
Te comparte su calendario en modo *Solo ocupación*. Solo esa persona puede
cambiarlo a *Con detalles*.

**Un contacto no aparece en las pestañas del calendario.**
Ahí solo salen quienes te comparten su agenda. Si no te la comparte, no hay nada
que superponer.

**No me llega el código de verificación.**
Mira la carpeta de correo no deseado y usa *Reenviar código*. El código caduca;
si ya pasó tiempo, pide uno nuevo.
