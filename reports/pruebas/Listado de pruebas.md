# Qué se probó en KAVI, y qué salió

Este documento recorre **una por una** las 1 287 pruebas automáticas del proyecto,
agrupadas por zona de la aplicación y escritas para que se entiendan sin leer código.

Una prueba automática es un programa pequeño que usa la app como lo haría una persona
—tocar un botón, escribir en un campo, guardar— y comprueba que ocurre lo que debía
ocurrir. Si algo deja de funcionar, la prueba falla y lo dice. Las 1 287 se ejecutan
enteras en unos 20 segundos, cada vez que se sube un cambio al repositorio.

## Resultado

| | |
|---|---|
| Pruebas ejecutadas | **1 287** |
| Pruebas superadas | **1 287** |
| Pruebas falladas | **0** |
| Archivos de prueba | 79 |
| Porcentaje del código cubierto | **83.3 %** |
| Tiempo de ejecución | ~20 segundos |

**Todas pasaron.** Ninguna quedó pendiente, saltada ni marcada como excepción.

El apartado [Lo que encontramos](#lo-que-encontramos) al final cuenta los dos defectos
reales que aparecieron al escribirlas.

### Cómo leer las listas

Cada línea con ✓ es una prueba que se ejecuta y pasa. El texto describe qué comprueba.
Están agrupadas igual que en el código, bajo el aspecto que verifican.

### Índice

- [Crear cuenta y entrar](#crear-cuenta-y-entrar) — 155 pruebas
- [El calendario](#el-calendario) — 191 pruebas
- [Crear y editar actividades](#crear-y-editar-actividades) — 204 pruebas
- [Temas y dimensiones del bienestar](#temas-y-dimensiones-del-bienestar) — 68 pruebas
- [Compartir con otras personas](#compartir-con-otras-personas) — 221 pruebas
- [Recordatorios](#recordatorios) — 80 pruebas
- [Gimnasio](#gimnasio) — 140 pruebas
- [Perfil y administración](#perfil-y-administracion) — 72 pruebas
- [Los cimientos: interfaz y utilidades](#los-cimientos-interfaz-y-utilidades) — 204 pruebas
- [Lo que encontramos](#lo-que-encontramos)
- [Cómo reproducirlo](#como-reproducirlo)


---

## Crear cuenta y entrar

**155 pruebas, todas superadas.**

Es la puerta de la app: si algo falla aquí, nadie llega al resto. Se comprobó el alta por pasos completa, el inicio de sesión, la recuperación de contraseña y, sobre todo, que los mensajes de error digan qué pasó y cómo resolverlo en lugar de mostrar el error técnico del servidor.


### Pantalla de crear cuenta

*El alta por pasos: nombre, correo, usuario, código y contraseña.* — 19 pruebas.


**recorrido de pasos**

- ✓ empieza preguntando el nombre
- ✓ anuncia en qué paso va
- ✓ no avanza con el nombre vacío
- ✓ avanza al correo con un nombre válido
- ✓ no avanza con un correo inválido
- ✓ se puede retroceder

**propuesta de usuario (RF-A8)**

- ✓ se deriva del correo al salir de ese paso
- ✓ se puede cambiar por otro
- ✓ si el derivado está ocupado propone otro libre

**envío del código**

- ✓ se dispara al salir del paso de usuario, con los tres datos
- ✓ el paso del código ofrece reenviarlo

**verificación y contraseña**

- ✓ verificar marca el alta como pendiente para no entrar a la app sin contraseña
- ✓ si la verificación falla se deshace la marca
- ✓ el último paso pide la contraseña y cambia el botón
- ✓ exige que las dos contraseñas coincidan
- ✓ con ambas iguales completa el alta

**errores y estados**

- ✓ muestra el error de cualquiera de los tres pasos
- ✓ mientras hay petición el botón queda ocupado
- ✓ abandonar el alta limpia la marca de pendiente


### Pantalla de iniciar sesión

*Entrar con correo y contraseña.* — 10 pruebas.


**LoginScreen**

- ✓ muestra el título y los dos campos
- ✓ la contraseña nace oculta
- ✓ ofrece recuperar contraseña y crear cuenta
- ✓ envía las credenciales escritas
- ✓ no envía con un correo inválido
- ✓ no envía sin contraseña
- ✓ muestra el error de credenciales
- ✓ durante el envío el botón queda ocupado
- ✓ sin modo demo no anuncia las credenciales de prueba
- ✓ en modo demo sí las anuncia


### Pantalla de recuperar contraseña

*Pedir el enlace de recuperación.* — 8 pruebas.


**ForgotPasswordScreen**

- ✓ muestra el título y el campo de correo
- ✓ ofrece volver a iniciar sesión
- ✓ envía el correo escrito
- ✓ no envía si el correo no es válido
- ✓ no envía con el campo vacío
- ✓ muestra el error del backend
- ✓ el mensaje de exito no revela si el correo existe
- ✓ durante el envío el botón queda ocupado


### Cuentas y sesiones — servidor real

*Lo que ocurre contra la base de datos de verdad.* — 29 pruebas.


**isUsernameAvailable (RF-A1)**

- ✓ consulta la RPC en minusculas
- ✓ solo true significa disponible
- ✓ una respuesta nula se trata como no disponible
- ✓ traduce el error al español

**signUp (RF-A2)**

- ✓ comprueba el username antes de crear la cuenta
- ✓ manda username y nombre como metadatos para el trigger
- ✓ informa si Supabase no abrió sesión (correo por confirmar)
- ✓ traduce un correo ya registrado

**alta por pasos (RF-A8)**

- ✓ revalida el username justo antes de enviar el código
- ✓ normaliza correo y username, y permite crear la cuenta
- ✓ un nombre vacío viaja como null, no como cadena vacía
- ✓ verificar el código devuelve la persona
- ✓ un código caducado se distingue de uno inválido
- ✓ sin usuario en la respuesta también falla
- ✓ setPassword actualiza la sesión ya verificada

**changePassword (RF-A9)**

- ✓ reautentica antes de cambiar: updateUser no comprueba la actual
- ✓ si la actual no coincide, no toca la contraseña
- ✓ traduce el rechazo de repetir la misma contraseña

**signIn / signOut (RF-A3)**

- ✓ devuelve la persona al entrar
- ✓ traduce credenciales incorrectas
- ✓ un fallo de red no se confunde con credenciales incorrectas
- ✓ signOut propaga su error
- ✓ signOut sin error resuelve

**resetPassword (RF-A7)**

- ✓ manda una URL de retorno hacia la app
- ✓ propaga el error traducido

**sesión**

- ✓ getSession devuelve la persona si hay sesión
- ✓ getSession devuelve null sin sesión
- ✓ un usuario sin correo no rompe: se normaliza a cadena vacía
- ✓ onAuthStateChange traduce la sesión a la persona


### Cuentas y sesiones — modo demostración

*La misma lógica en el backend de práctica, sin servidor.* — 36 pruebas.


**isUsernameAvailable (RF-A1)**

- ✓ reporta ocupado uno que ya existe
- ✓ reporta libre uno que no existe
- ✓ la comparación ignora mayusculas

**signUp directo**

- ✓ crea la cuenta y abre sesión
- ✓ normaliza correo y username a minusculas
- ✓ rechaza un username ocupado
- ✓ rechaza un correo ya registrado
- ✓ la cuenta nueva nace sin rol de administración

**alta por pasos (RF-A8)**

- ✓ el primer paso no crea cuenta todavia
- ✓ rechaza empezar con un correo ya registrado
- ✓ rechaza empezar con un username ocupado
- ✓ el código correcto crea la cuenta y abre sesión
- ✓ conserva el username elegido en el paso previo
- ✓ la cuenta queda sin contraseña hasta el último paso
- ✓ una cuenta a medias no puede iniciar sesión
- ✓ un código incorrecto se distingue de uno caducado
- ✓ verificar sin haber empezado se reporta como caducado
- ✓ el código se consume: no sirve dos veces
- ✓ setPassword completa el alta y ya permite entrar
- ✓ setPassword sin sesión falla

**signIn**

- ✓ entra con las credenciales de la cuenta demo
- ✓ rechaza la contraseña incorrecta
- ✓ el correo no distingue mayusculas
- ✓ un correo nuevo crea cuenta al vuelo (solo en demo)
- ✓ pero exige una contraseña de al menos 8 caracteres
- ✓ el username derivado del correo cumple el formato

**changePassword (RF-A9)**

- ✓ cambia la contraseña comprobando la actual
- ✓ rechaza si la actual no coincide
- ✓ rechaza repetir la misma contraseña
- ✓ falla con un correo desconocido

**sesión**

- ✓ getSession devuelve null sin sesión
- ✓ getSession devuelve la sesión abierta
- ✓ signOut la cierra
- ✓ onAuthStateChange avisa al entrar y al salir
- ✓ cancelar la suscripción deja de avisar
- ✓ resetPassword no falla (en demo no envía nada)


### Propuesta automática de nombre de usuario

*Derivar un usuario válido y libre a partir del correo.* — 15 pruebas.


**suggestUsername**

- ✓ toma la parte local del correo
- ✓ pasa todo a minusculas
- ✓ quita los acentos en vez de sustituirlos
- ✓ sustituye los caracteres no permitidos por guion bajo
- ✓ colapsa los guiones bajos repetidos
- ✓ no deja guiones bajos en los extremos
- ✓ alarga los demasiado cortos
- ✓ recorta a 30 caracteres
- ✓ cae al valor de reserva cuando no queda nada aprovechable
- ✓ siempre produce algo que la base aceptaría

**availableUsername**

- ✓ devuelve la base cuando está libre
- ✓ prueba sufijos numéricos hasta encontrar uno libre
- ✓ consulta la base antes que cualquier sufijo
- ✓ respeta el tope de intentos y aun así devuelve algo válido
- ✓ el sufijo no hace crecer el username más alla del máximo


### Mensajes de error al entrar o registrarse

*Traducir los errores técnicos a algo que se entienda y se pueda resolver.* — 29 pruebas.


**isOfflineError**

- ✓ reconoce "Network request failed" como falta de conexión
- ✓ reconoce "TypeError: Failed to fetch" como falta de conexión
- ✓ reconoce "Load failed" como falta de conexión
- ✓ reconoce "fetch failed" como falta de conexión
- ✓ reconoce "NetworkError when attempting to fetch resource" como falta de conexión
- ✓ no confunde otros errores con falta de conexión
- ✓ acepta valores que no son Error

**toAuthMessage**

- ✓ la falta de conexión gana sobre cualquier otra coincidencia
- ✓ traduce "Invalid login credentials"
- ✓ traduce "invalid_credentials"
- ✓ traduce "User already registered"
- ✓ traduce "user_already_exists"
- ✓ traduce "duplicate key value violates profiles_username_key"
- ✓ traduce "Email not confirmed"
- ✓ traduce "email_not_confirmed"
- ✓ traduce "over_request_rate_limit"
- ✓ traduce "Too many requests"
- ✓ traduce "Token has expired"
- ✓ traduce "otp_expired"
- ✓ traduce "Invalid token"
- ✓ traduce "invalid_otp"
- ✓ traduce "New password should be different from the old password"
- ✓ ignora mayusculas y minusculas
- ✓ un código caducado no se reporta como código inválido
- ✓ cae al mensaje genérico con algo desconocido
- ✓ nunca devuelve una cadena vacía
- ✓ todos los mensajes están en español y son accionables

**AuthUiError**

- ✓ conserva el mensaje y se identifica por nombre
- ✓ guarda la causa original para depurar


### Memoria de la sesión abierta

*Recordar quién entró y reaccionar si la sesión cambia.* — 9 pruebas.


**restauración de sesión**

- ✓ con sesión guardada la deja disponible
- ✓ sin sesión arranca sin usuario
- ✓ termina de cargar aunque restaurar falle (sin red)
- ✓ se suscribe a los cambios de sesión del backend
- ✓ un cambio en el backend se refleja en la app
- ✓ cancela la suscripción al desmontar

**alta por pasos (RF-A8)**

- ✓ arranca sin alta pendiente
- ✓ se puede marcar como pendiente para retener a la persona en el último paso

**useAuth**

- ✓ falla con un mensaje útil fuera del provider


---

## El calendario

**191 pruebas, todas superadas.**

Es la pantalla central de KAVI. Lo delicado aquí no es enseñar los días, sino colocar bien las actividades: las que se traslapan tienen que repartirse el ancho, las muy cortas tienen que seguir siendo legibles y las que cruzan la medianoche tienen que aparecer en los dos días. También se comprobó todo el manejo de fechas, que es la base invisible de la pantalla.


### Pantalla del calendario

*La pantalla principal de la app.* — 19 pruebas.


**vista activa**

- ✓ abre en mensual
- ✓ cambia a semanal según el estado
- ✓ cambia a diaria según el estado

**volver a la pestaña**

- ✓ tocar la pestaña devuelve a la vista mensual
- ✓ mientras no se toque la pestaña la vista se respeta

**estados**

- ✓ mientras carga no pinta ninguna vista
- ✓ si falla muestra el error con reintentar
- ✓ en vista diaria el aviso de vacío no tapa la rejilla
- ✓ con actividades no muestra el aviso de vacío

**navegación**

- ✓ tocar una actividad propia abre su detalle
- ✓ tocar un hueco abre el alta con día y hora
- ✓ tocar un día en mensual abre la vista diaria sin cambiar la preferida

**calendarios superpuestos (RF-S15)**

- ✓ una actividad ajena no abre el detalle: avisa que es de solo lectura
- ✓ con personas superpuestas el color pasa a ser el de cada persona
- ✓ sin superponer a nadie vuelve el color del tema
- ✓ se ignora a quien dejo de compartir, sin tener que limpiar la selección

**filtros**

- ✓ informa cuántos hay activos
- ✓ la hoja de filtros empieza cerrada y se abre

**horizonte de recurrencia (plan §4)**

- ✓ se extiende al abrir el calendario


### Vista mensual

*La rejilla de días del mes.* — 9 pruebas.


**rejilla**

- ✓ pinta siempre seis semanas completas
- ✓ cada celda dice el día y que no tiene nada
- ✓ una celda con una actividad lo dice en singular
- ✓ con varias lo dice en plural
- ✓ incluye días del mes anterior y del siguiente

**interacción**

- ✓ tocar un día lo comunica
- ✓ también se pueden tocar los días de relleno

**actividades de varios días**

- ✓ aparecen contadas en cada día que tocan
- ✓ las de otro mes no se cuentan en este


### Vistas de semana y de día

*La rejilla por horas.* — 11 pruebas.


**huecos para crear**

- ✓ cada media hora del día es un botón
- ✓ la etiqueta lleva la hora en formato 24 h
- ✓ tocar un hueco da el día y los minutos desde medianoche
- ✓ en vista semanal hay huecos para los siete días

**bloques de actividad**

- ✓ pinta la actividad del día
- ✓ tocar el bloque devuelve la actividad completa
- ✓ no pinta actividades de otro día
- ✓ varias actividades a la vez se pintan todas

**franja de todo el día**

- ✓ las de todo el día van en su propia franja, fuera de la rejilla
- ✓ sin actividades de todo el día no se reserva esa franja

**actividades compartidas**

- ✓ se puede distinguir cuales son de otra persona


### Colocación de los bloques

*Dónde y de qué tamaño se dibuja cada actividad, y cómo se reparten las que coinciden.* — 18 pruebas.


**posicionamiento básico**

- ✓ sin actividades devuelve vacío
- ✓ coloca una actividad en minutos desde medianoche
- ✓ una sola actividad ocupa toda la anchura
- ✓ descarta las de todo el día: van en su propia franja
- ✓ descarta las de otro día
- ✓ devuelve los bloques ordenados por hora de inicio

**traslapes**

- ✓ dos que se solapan se reparten en dos columnas
- ✓ tres simultaneas se reparten en tres columnas
- ✓ dos consecutivas sin solaparse ocupan cada una toda la anchura
- ✓ la columna se reutiliza cuando el bloque anterior ya termino
- ✓ grupos separados no comparten el reparto de columnas

**alto mínimo legible**

- ✓ sin mínimo, visualEnd es el fin real
- ✓ con mínimo, una actividad corta se infla para poder leerse
- ✓ una actividad larga no se encoge al mínimo
- ✓ dos cortas separadas 20 min se solapan por su alto en pantalla
- ✓ esas mismas dos, sin mínimo extra, van cada una a su anchura

**actividades que cruzan la medianoche**

- ✓ la que viene del día anterior empieza a medianoche
- ✓ la que sigue al día siguiente termina a medianoche


### Filtrado y agrupación de actividades

*Qué se enseña y cómo se ordena.* — 29 pruebas.


**applyFilters**

- ✓ sin filtros devuelve todo
- ✓ sin filtros devuelve una copia, no el mismo arreglo
- ✓ filtra por dimensión
- ✓ filtra por tema
- ✓ los filtros se combinan con O: basta cumplir uno
- ✓ una actividad sin dimensión ni tema se descarta al filtrar

**groupByDay**

- ✓ indexa por clave de día local
- ✓ una actividad de varios días aparece en cada uno
- ✓ dentro de cada día van en orden cronológico
- ✓ a igual hora desempata por título, para que el orden sea estable
- ✓ sin actividades devuelve un mapa vacío

**superposición de calendarios (RF-S15)**

- ✓ convierte bloques en actividades de solo lectura
- ✓ un bloque sin título se llama "Ocupado"
- ✓ con título visible lo conserva
- ✓ el color y el nombre salen de quién es el dueño
- ✓ los ids no chocan aunque coincidan persona y hora
- ✓ una actividad normal no se confunde con una superpuesta

**color del bloque (RF-T4)**

- ✓ usa el color copiado de la actividad
- ✓ sin color cae al neutro del tema

**tint**

- ✓ convierte un hex de 6 digitos en rgba al 14 %
- ✓ acepta hex de 3 digitos
- ✓ acepta hex sin almohadilla
- ✓ admite otra opacidad

**no duplicar lo que ya tengo**

- ✓ sin nada propio los bloques pasan tal cual
- ✓ descarta el bloque de una actividad que ya tengo compartida
- ✓ una actividad de la misma persona a otra hora si se pinta
- ✓ el mismo horario pero de otra persona no se descarta
- ✓ mis propias actividades no descartan bloques ajenos
- ✓ descarta solo los que coinciden, no la lista entera


### Cabecera del calendario

*El título del periodo y los controles de navegación.* — 11 pruebas.


**título del periodo**

- ✓ en mensual muestra mes y año
- ✓ en semanal muestra el rango
- ✓ en diaria muestra el día completo
- ✓ el título abre el selector de fecha

**navegación**

- ✓ ofrece anterior y siguiente
- ✓ ofrece volver a hoy

**cambio de vista**

- ✓ el control dice cuál está activa
- ✓ abre el menu de vistas

**filtros**

- ✓ sin filtros activos solo dice "Filtros"
- ✓ con filtros activos dice cuántos
- ✓ abre la hoja de filtros


### Hoja de filtros

*Filtrar por dimensión del bienestar y por tema.* — 15 pruebas.


**lo que ofrece**

- ✓ están las 7 dimensiones del bienestar
- ✓ están los temas del usuario
- ✓ sin temas cargados no revienta

**dimensiones**

- ✓ tocar una la activa
- ✓ tocar una activa la apaga
- ✓ se pueden acumular varias
- ✓ las activas se ven marcadas

**temas**

- ✓ tocar uno lo activa
- ✓ tocar uno activo lo apaga
- ✓ filtrar por tema no borra el filtro de dimensión: se combinan

**acciones**

- ✓ sin filtros activos no se ofrece limpiar
- ✓ con una dimensión activa sí aparece
- ✓ con solo un tema activo también
- ✓ limpiar avisa al calendario
- ✓ "Listo" cierra la hoja


### Memoria de la vista elegida

*Recordar en qué vista y en qué fecha te quedaste.* — 16 pruebas.


**valores iniciales**

- ✓ abre en vista mensual
- ✓ el ancla es hoy en formato yyyy-MM-dd
- ✓ nace sin filtros ni superposiciones

**vista y navegación**

- ✓ setView cambia la vista
- ✓ setAnchorKey mueve el ancla sin tocar la vista
- ✓ openDay lleva a la vista diaria de ese día
- ✓ goToday vuelve al ancla de hoy

**filtros**

- ✓ setFilters los aplica
- ✓ clearFilters los vacía
- ✓ hasActiveFilters distingue vacío de con contenido

**calendarios superpuestos (RF-S15)**

- ✓ toggle añade y quita
- ✓ acepta varias personas y conserva el orden
- ✓ clearOverlayUsers vuelve a "solo yo"

**hidratación**

- ✓ marca hydrated al terminar
- ✓ sin preferencia guardada cae a la vista por defecto
- ✓ no vuelve a hidratar si ya lo hizo


### Manejo de fechas y horas

*La base de todo el calendario: rangos, formatos en español y huecos libres.* — 63 pruebas.


**constantes**

- ✓ el día se divide en slots de 30 minutos
- ✓ las etiquetas de día empiezan en lunes

**claves de día**

- ✓ toDayKey usa el formato estable yyyy-MM-dd
- ✓ fromDayKey es su inversa
- ✓ fromDayKey devuelve el día a medianoche local
- ✓ fromDayKey tolera una clave incompleta sin romperse

**ISO**

- ✓ toIso y fromIso conservan el instante
- ✓ toIso emite UTC, como se guarda en la base

**rangeForView**

- ✓ mes abarca semanas completas de lunes a domingo
- ✓ semana empieza en lunes y dura 7 días
- ✓ día es exactamente [medianoche, medianoche siguiente)
- ✓ los tres rangos arrancan a medianoche

**shiftAnchor**

- ✓ avanza y retrocede un mes
- ✓ avanza una semana
- ✓ avanza un día
- ✓ ir y volver deja la fecha igual

**rejillas**

- ✓ el grid mensual son siempre 6 semanas
- ✓ el grid mensual no repite días
- ✓ weekDays devuelve 7 días consecutivos desde el lunes

**horas**

- ✓ nextHalfHour salta a y media si aun no pasa
- ✓ nextHalfHour salta a la hora en punto si ya paso la media
- ✓ minutesSinceMidnight cuenta desde las 00:00
- ✓ setTimeOfDay y minutesSinceMidnight son inversas
- ✓ durationMinutes mide entre dos ISO
- ✓ durationMinutes es negativa si el fin precede al inicio

**formatos es-MX**

- ✓ título de mes capitalizado
- ✓ título de semana dentro del mismo mes
- ✓ título de semana a caballo entre dos meses
- ✓ título de día capitalizado
- ✓ fecha corta en minusculas
- ✓ fecha con año
- ✓ formatMinutes usa 24 h con dos digitos
- ✓ formatMinutes envuelve valores fuera del día
- ✓ formatHourLabel envuelve las horas
- ✓ formatTime toma la hora local del Date
- ✓ formatTimeRange une inicio y fin
- ✓ formatTimeRange ignora las horas si es de todo el día

**clampToDay**

- ✓ recorta una actividad contenida en el día
- ✓ devuelve null si la actividad es de otro día
- ✓ recorta por la izquierda cuando viene del día anterior
- ✓ recorta por la derecha cuando sigue al día siguiente
- ✓ garantiza 15 minutos de alto para que el bloque sea visible

**findFreeSlots (RF-S9)**

- ✓ sin ocupaciones ofrece huecos dentro de la franja útil
- ✓ respeta la duración pedida
- ✓ no propone huecos que choquen con lo ocupado
- ✓ devuelve vacío si el día está ocupado por completo
- ✓ devuelve vacío si la duración no cabe en la franja
- ✓ acepta una franja horaria personalizada
- ✓ recorre varios días

**formato de 12 y 24 horas**

- ✓ por omisión el reloj es de 24 h
- ✓ en 12 h la tarde lleva p.m.
- ✓ en 12 h la mañana lleva a.m.
- ✓ la medianoche es 12 a.m.
- ✓ el mediodia es 12 p.m.
- ✓ las 12:59 aun son p.m., no a.m.
- ✓ las 23:59 son las 11:59 p.m.
- ✓ los minutos siguen llevando dos digitos
- ✓ la etiqueta de hora omite los minutos en 12 h
- ✓ en 24 h la etiqueta conserva los minutos
- ✓ formatTime respeta la preferencia
- ✓ el rango de horas también
- ✓ una actividad de todo el día no cambia con el reloj
- ✓ cambiar de vuelta a 24 h restaura el formato


---

## Crear y editar actividades

**204 pruebas, todas superadas.**

Aquí vive la parte más difícil de la app: las actividades que se repiten. Editar o borrar una tiene que distinguir entre "solo esta vez" y "toda la serie", y equivocarse significa perder datos de la persona. También se comprobó el cruce entre cómo se guardan las horas (universales) y cómo se muestran (tu hora local).


### Pantalla de crear y editar actividad

*El formulario completo, en sus dos modos.* — 19 pruebas.


**modo creación**

- ✓ se titula "Nueva actividad"
- ✓ el botón invita a crear
- ✓ al enviar crea la actividad
- ✓ no consulta ninguna actividad existente

**modo edición**

- ✓ se titula "Editar actividad"
- ✓ con alcance de serie lo dice en el título
- ✓ el botón invita a guardar
- ✓ mientras carga muestra el estado de carga
- ✓ también espera a los recordatorios antes de pintar el formulario
- ✓ si falla muestra el error con reintentar
- ✓ reintentar vuelve a consultar
- ✓ al guardar actualiza con el alcance recibido
- ✓ los recordatorios se guardan después de la actividad, no antes
- ✓ solo se avisa y se cierra cuando los recordatorios terminan
- ✓ editar la serie lo dice en el aviso
- ✓ muestra el error de la mutación
- ✓ mientras guarda el botón queda ocupado
- ✓ editar una sola ocurrencia bloquea cambiar la recurrencia
- ✓ editar la serie completa sí permite cambiarla


### Detalle de una actividad

*Lo que ves al tocar una actividad.* — 20 pruebas.


**contenido**

- ✓ muestra el título de la actividad
- ✓ muestra el día y el rango de horas
- ✓ en una actividad de todo el día no muestra horas
- ✓ mientras carga lo indica
- ✓ si ya no existe ofrece reintentar

**acciones del dueño**

- ✓ ofrece editar, compartir y eliminar
- ✓ compartir navega a su pantalla
- ✓ editar una actividad suelta va directo al formulario

**recurrencia: solo está o toda la serie (RF-C8)**

- ✓ editar una serie pregunta primero el alcance
- ✓ eliminar una serie también pregunta
- ✓ elegir "solo está" aplica ese alcance
- ✓ una actividad recurrente se anuncia como tal

**eliminar**

- ✓ pide confirmación
- ✓ al confirmar elimina con el alcance correspondiente

**actividad de otra persona**

- ✓ no ofrece editar ni eliminar
- ✓ ofrece salirse de la actividad

**entrenamiento (privado del dueño)**

- ✓ una actividad de gimnasio propia ofrece su entrenamiento
- ✓ una actividad normal no lo ofrece

**recordatorios**

- ✓ lista los definidos y permite silenciar el propio
- ✓ sin recordatorios no pinta interruptores


### Formulario de actividad

*Los campos y su validación.* — 18 pruebas.


**campos básicos**

- ✓ muestra título, fecha y horas
- ✓ las horas vienen de los valores iniciales
- ✓ el botón lleva la etiqueta pedida
- ✓ muestra el error recibido
- ✓ mientras guarda el botón queda ocupado

**validación**

- ✓ no envía sin título
- ✓ con título sí envía

**todo el día**

- ✓ por defecto no está marcado y se ven las horas
- ✓ al marcarlo desaparecen las horas
- ✓ la fecha sigue estando

**recurrencia (RF-C8)**

- ✓ se puede elegir la frecuencia cuando no está bloqueada
- ✓ al editar una sola ocurrencia se explica por qué no se puede

**gimnasio (RF-F9)**

- ✓ por defecto no está marcado
- ✓ al marcarlo aparece la captura de rutina
- ✓ con un entrenamiento ya existente ofrece abrirlo en vez de duplicarlo
- ✓ un entrenamiento existente sin ejercicios se describe distinto

**descripción**

- ✓ es opcional
- ✓ se propaga cuando se escribe


### Traducción entre lo guardado y el formulario

*La base guarda instantes universales; el formulario trabaja con día y hora local.* — 23 pruebas.


**valores por defecto**

- ✓ propone una hora de duración
- ✓ arranca vacío y sin nada activado
- ✓ respeta el día, la hora y el título que le pasen
- ✓ no deja empezar tan tarde que la actividad se salga del día
- ✓ el final nunca pasa de la medianoche
- ✓ un fin explicito por encima de la medianoche también se recorta

**de actividad a formulario**

- ✓ traduce el instante UTC a día y minutos locales
- ✓ una descripción ausente llega como cadena vacía, no como null
- ✓ conserva la descripción cuando la hay
- ✓ arrastra tema, gimnasio y todo el día
- ✓ si cruza la medianoche el fin se ancla a las 24:00
- ✓ lee la recurrencia de la propia actividad por omisión
- ✓ acepta la regla de la serie por separado
- ✓ sin regla en ningun lado la recurrencia es nula
- ✓ los recordatorios se inyectan desde fuera

**de formulario a alta**

- ✓ convierte día y minutos a instantes UTC
- ✓ una descripción vacía se guarda como null, no como cadena
- ✓ una descripción con texto se conserva
- ✓ copia el estilo del tema en la actividad
- ✓ sin tema la actividad nace neutra (RF-T4)
- ✓ todo el día ocupa de medianoche a medianoche e ignora las horas del formulario
- ✓ arrastra título, gimnasio y recurrencia

**ida y vuelta**

- ✓ actividad -> formulario -> alta conserva las horas


### Campo de repetición

*Elegir cada cuánto se repite una actividad.* — 23 pruebas.


**elegir frecuencia**

- ✓ arranca en "No" cuando no hay regla
- ✓ marca la frecuencia que ya tiene la regla
- ✓ volver a "No" borra la regla entera
- ✓ la diaria no arrastra días de la semana
- ✓ la semanal se estrena con el día de la propia actividad
- ✓ al volver a semanal se recuperan los días que ya había
- ✓ cambiar de frecuencia conserva la fecha de fin

**días de la semana**

- ✓ solo aparecen en la frecuencia semanal
- ✓ se marcan los días de la regla
- ✓ tocar un día libre lo añade
- ✓ tocar un día marcado lo quita
- ✓ quitar el único día lo vuelve a poner

**fecha de fin**

- ✓ sin regla no se ofrece
- ✓ se explica que sin fecha se repite indefinidamente
- ✓ activarla propone el día de la actividad
- ✓ desactivarla la borra
- ✓ con fecha puesta se muestra para poder cambiarla
- ✓ sin fecha no hay botón que abrir
- ✓ escribir la fecha de fin la fija
- ✓ una fecha anterior al arranque se corrige al día base
- ✓ una fecha que no existe no deja guardar
- ✓ dice desde cuando empieza la repetición

**editando una sola ocurrencia**

- ✓ no deja tocar la repetición y dice por qué


### Reglas de repetición

*Cómo se calculan las repeticiones futuras.* — 19 pruebas.


**toRRule**

- ✓ serializa la frecuencia sola
- ✓ traduce byDay a códigos RFC 5545 con lunes = 0
- ✓ ordena byDay aunque llegue desordenado
- ✓ omite BYDAY cuando no es semanal
- ✓ escribe UNTIL sin guiones

**parseRRule**

- ✓ devuelve null sin texto
- ✓ devuelve null con una frecuencia que no soportamos
- ✓ es la inversa de toRRule
- ✓ ignora códigos de día desconocidos

**expandOccurrences**

- ✓ excluye la madre y devuelve una ocurrencia por día
- ✓ conserva la hora del día de la madre
- ✓ semanal solo cae en los días pedidos
- ✓ semanal sin byDay repite el día de la madre
- ✓ UNTIL corta la serie e incluye ese mismo día
- ✓ no devuelve nada si el horizonte no pasa de la madre
- ✓ mensual salta los meses que no tienen ese día

**describeRecurrence**

- ✓ describe la ausencia de regla
- ✓ describe cada frecuencia en es-MX
- ✓ añade el límite en formato dd/mm/aaaa


### Actividades — servidor real

*Guardar, leer, editar y borrar contra la base de datos.* — 36 pruebas.


**listByRange**

- ✓ usa traslape, no contención: start < to AND end > from (NFR-1)
- ✓ ordena por hora de inicio
- ✓ sin nada compartido conmigo pide solo lo mio
- ✓ busca primero que actividades me han compartido y aceptado
- ✓ con actividades compartidas pide las mias O esas, no todo lo legible
- ✓ sin compartidas no construye un in() vacío
- ✓ una invitación pendiente no entra en el calendario
- ✓ en una actividad propia no añade el nombre del dueño
- ✓ en una actividad ajena añade el nombre visible (RF-S5)
- ✓ sin nombre visible cae al username
- ✓ sin perfil del dueño usa un texto neutro
- ✓ traduce el error

**getById**

- ✓ filtra por id
- ✓ avisa si ya no existe
- ✓ traduce el error

**create**

- ✓ marca al dueño y no escribe regla si no hay recurrencia
- ✓ con recurrencia guarda la RRULE en la madre
- ✓ materializa las instancias en el cliente (plan §4)
- ✓ no usa ninguna RPC de recurrencia
- ✓ no reinserta las instancias que ya existen

**update con alcance "this"**

- ✓ actualiza solo esa fila
- ✓ resincroniza los destinatarios de recordatorios
- ✓ una actividad suelta se trata como "this" aunque se pida la serie
- ✓ falla si la actividad ya no existe

**remove**

- ✓ falla si ya no existe
- ✓ una actividad suelta se borra por id

**extendRecurrenceHorizon**

- ✓ no hace nada si no hay series

**update con alcance "series"**

- ✓ actualiza la madre, no la instancia
- ✓ borra las instancias futuras antes de regenerarlas
- ✓ acota el borrado a las que empiezan desde la ocurrencia editada
- ✓ conserva la regla cuando el parche no la menciona
- ✓ quitar la recurrencia deja la regla en null

**remove con alcance "series"**

- ✓ borra la madre y sus instancias
- ✓ falla si la actividad ya no existe

**extendRecurrenceHorizon**

- ✓ consulta las series de esa persona
- ✓ con una serie vigente no reinserta nada


### Actividades — modo demostración

*Lo mismo en el backend de práctica.* — 29 pruebas.


**crear**

- ✓ devuelve la actividad con id, dueño y marcas de tiempo
- ✓ aplica los valores por defecto de los campos opcionales
- ✓ queda recuperable por listByRange
- ✓ con recurrencia materializa las instancias de la serie

**leer**

- ✓ getById devuelve la actividad creada
- ✓ getById falla con un id inexistente
- ✓ listByRange excluye lo que queda fuera del rango
- ✓ listByRange incluye lo que se traslapa parcialmente con el rango
- ✓ listByRange no muestra actividades de otra persona
- ✓ listByRange devuelve ordenado por hora de inicio

**actualizar**

- ✓ cambia los campos enviados y conserva el resto
- ✓ persiste el cambio
- ✓ permite vaciar la descripción pasando null
- ✓ scope "this" no toca a las hermanas de la serie
- ✓ falla al actualizar algo que no existe

**eliminar**

- ✓ quita la actividad de listByRange
- ✓ getById falla después de eliminar
- ✓ no afecta a las demás actividades
- ✓ scope "series" borra la madre y las instancias futuras
- ✓ falla al eliminar algo que no existe

**series completas (RF-C8)**

- ✓ editar la serie cambia la madre
- ✓ editar la serie regenera las instancias
- ✓ el título nuevo llega a todas las instancias
- ✓ quitar la recurrencia deja la actividad suelta
- ✓ editar desde una instancia afecta a la serie entera
- ✓ borrar solo la madre deja que la primera instancia herede la serie
- ✓ borrar una instancia no toca a las demás
- ✓ extender el horizonte no duplica lo que ya existe
- ✓ extender el horizonte ignora las series de otra persona


### Carga y refresco de actividades

*Cuándo se piden datos y cuándo se refrescan solos.* — 17 pruebas.


**activityKeys**

- ✓ la clave de rango distingue usuario y extremos
- ✓ dos rangos distintos no comparten cache
- ✓ la clave raiz inválida todo lo de actividades

**useActivitiesRange**

- ✓ consulta con los extremos en ISO
- ✓ no consulta sin sesión
- ✓ expone el error

**usePrefetchAdjacentRanges (NFR-2)**

- ✓ precarga el rango anterior y el siguiente
- ✓ sin sesión no precarga nada
- ✓ funciona igual en vista semanal

**useActivity**

- ✓ pide el detalle por id
- ✓ sin id no consulta

**useActivityMutations**

- ✓ crear pasa el usuario y la entrada
- ✓ actualizar propaga el alcance de la recurrencia
- ✓ actualizar refresca el detalle en cache sin esperar a la red
- ✓ eliminar propaga el alcance
- ✓ crear inválida el calendario
- ✓ un fallo al crear se propaga


---

## Temas y dimensiones del bienestar

**68 pruebas, todas superadas.**

Los temas son la forma en que KAVI clasifica en qué inviertes tu tiempo. La regla importante es que el estilo se copia a la actividad al crearla: si después cambias el tema, las actividades que ya existían no cambian de color solas.


### Pantalla de crear y editar tema

*Tus temas propios.* — 15 pruebas.


**crear**

- ✓ muestra el campo de nombre vacío
- ✓ ofrece las siete dimensiones
- ✓ no crea sin nombre
- ✓ con nombre crea el tema
- ✓ al crearlo avisa y cierra
- ✓ cambiar la dimensión se refleja en lo enviado
- ✓ al crear no ofrece eliminar

**editar**

- ✓ carga los valores del tema
- ✓ se titula como edición
- ✓ guardar actualiza en vez de crear
- ✓ un color fuera de la paleta cae al primero, sin dejar el selector vacío
- ✓ ofrece eliminar y pide confirmación
- ✓ al confirmar lo elimina

**estados**

- ✓ mientras cargan los temas lo indica
- ✓ muestra el error de la mutación


### Selector de tema

*Elegir tema al crear una actividad, con buscador.* — 16 pruebas.


**listado**

- ✓ muestra los temas disponibles
- ✓ los agrupa bajo el nombre de su dimensión
- ✓ ofrece siempre la opción de no poner tema (RF-T4)
- ✓ mientras cargan lo dice
- ✓ marca cuál está elegido

**elegir**

- ✓ tocar un tema lo devuelve entero, no solo su id
- ✓ "Sin tema" devuelve null

**busqueda**

- ✓ filtra por nombre del tema
- ✓ ignora mayusculas
- ✓ ignora acentos
- ✓ también encuentra por el nombre de la dimensión
- ✓ esconde las dimensiones que se quedan sin temas
- ✓ sin coincidencias lo dice en vez de dejar el hueco vacío
- ✓ borrar la busqueda devuelve la lista completa
- ✓ los espacios sobrantes no cuentan

**gestionar temas**

- ✓ cierra el picker antes de navegar, para no dejarlo abierto detrás


### Temas — servidor real

*Guardado y reglas de los temas.* — 13 pruebas.


**list**

- ✓ consulta la tabla themes
- ✓ ordena los del sistema primero y luego por nombre
- ✓ devuelve lo que responde la base
- ✓ traduce el error de la base

**create**

- ✓ marca el tema como propio y no del sistema
- ✓ pide una sola fila de vuelta
- ✓ propaga un nombre duplicado como "ya existe"

**update**

- ✓ filtra por el id del tema
- ✓ envía solo el parche
- ✓ un tema del sistema lo rechaza la RLS (RF-T3)

**remove**

- ✓ borra por id
- ✓ no devuelve nada al tener exito
- ✓ traduce el error


### Temas — modo demostración

*Lo mismo en el backend de práctica.* — 12 pruebas.


**crear**

- ✓ marca el tema como propio y no del sistema
- ✓ recorta los espacios del nombre
- ✓ aparece en la lista del dueño

**leer**

- ✓ la lista incluye los temas del sistema
- ✓ no muestra los temas propios de otra persona

**actualizar**

- ✓ cambia los campos enviados
- ✓ propaga el nuevo estilo a las actividades que lo usan (copia de estilo)
- ✓ rechaza modificar un tema del sistema
- ✓ falla con un tema inexistente

**eliminar**

- ✓ lo saca de la lista
- ✓ desvincula las actividades pero les conserva el estilo copiado (RF-T6)
- ✓ rechaza borrar un tema del sistema


### Carga de temas

*Agrupación por dimensión y refresco.* — 12 pruebas.


**useThemes**

- ✓ pide los temas del usuario
- ✓ no consulta sin sesión
- ✓ expone el error si la consulta falla

**useThemesByDimension**

- ✓ devuelve un grupo por cada dimensión, en el orden de la spec
- ✓ coloca cada tema en su dimensión
- ✓ las dimensiones sin temas quedan vacias, no ausentes
- ✓ tolera undefined

**useThemeMutations**

- ✓ crear pasa el usuario y la entrada
- ✓ actualizar pasa id y parche
- ✓ eliminar pasa el id
- ✓ editar un tema inválida también las actividades (copia de estilo)
- ✓ un fallo al crear se propaga


---

## Compartir con otras personas

**221 pruebas, todas superadas.**

Es el área con más reglas de privacidad, y por eso la más probada. Lo esencial: quien te comparte su calendario "solo ocupación" cede sus horas ocupadas, nunca lo que hace en ellas; y al eliminar a un contacto tiene que revocarse todo de golpe, sin dejar restos de acceso.


### Pantalla de Compartido

*Contactos, solicitudes e invitaciones.* — 21 pruebas.


**estructura**

- ✓ muestra el título como encabezado
- ✓ ofrece buscar personas y abrir disponibilidad
- ✓ abrir disponibilidad navega a su pantalla
- ✓ mientras carga lo indica
- ✓ si falla ofrece reintentar
- ✓ sin contactos invita a buscar a alguien

**invitaciones a actividades (RF-S5)**

- ✓ muestra la actividad, cuándo es y quién la comparte
- ✓ aceptar responde que sí
- ✓ al aceptar se avisa de que entró al calendario
- ✓ rechazar responde que no y sin aviso
- ✓ sin invitaciones no pinta la sección

**solicitudes recibidas**

- ✓ ofrece aceptar y rechazar
- ✓ aceptar usa el id de la conexión

**eliminar contacto (RF-S2)**

- ✓ pide confirmación antes de nada
- ✓ al confirmar elimina la conexión
- ✓ con un contacto aceptado avisa de la cascada

**lista de contactos**

- ✓ muestra el nombre y que comparte cada quien
- ✓ sin nombre visible usa un texto de reserva
- ✓ quien no comparte su calendario no muestra esa línea
- ✓ las solicitudes enviadas se marcan como pendientes

**errores**

- ✓ muestra el error de cualquier mutación


### Compartir una actividad

*Elegir con quién y avisar de choques de horario.* — 20 pruebas.


**lista de candidatos**

- ✓ muestra a los contactos aceptados
- ✓ cuando ya se comparte con todos lo dice
- ✓ no ofrece a quien ya tiene la actividad
- ✓ sin contactos disponibles lo dice
- ✓ ignora las solicitudes pendientes: solo contactos aceptados

**selección**

- ✓ el botón nace deshabilitado
- ✓ al elegir a alguien se habilita
- ✓ con varias personas el botón dice cuántas
- ✓ volver a tocar deselecciona

**aviso de choque de horario (RF-S16)**

- ✓ avisa si el contacto ya está ocupado en ese rango
- ✓ sin título visible avisa solo del horario
- ✓ con varios choques indica cuántos más
- ✓ sin choques no avisa nada
- ✓ el aviso no impide compartir

**compartir**

- ✓ envía la actividad y los contactos elegidos
- ✓ al lograrlo avisa y cierra

**errores de carga (NFR-11)**

- ✓ si falla la lista de contactos lo explica y deja reintentar
- ✓ no se confunde con no tener contactos

**shares existentes**

- ✓ muestra en qué estado está cada invitación
- ✓ permite revocar el acceso


### Buscar un hueco en común

*Ver la disponibilidad de varias personas a la vez.* — 18 pruebas.


**quien aparece**

- ✓ muestra a quien comparte su calendario
- ✓ no muestra a un contacto que no comparte
- ✓ tampoco a una solicitud pendiente
- ✓ sin nadie compartiendo explica cómo pedirlo

**semana visible**

- ✓ permite ir a la semana anterior y siguiente
- ✓ cambiar de semana vuelve a consultar con otro rango

**selección de personas**

- ✓ la propia agenda siempre entra en la consulta
- ✓ al elegir a alguien se suma a la consulta
- ✓ volver a tocar la quita

**encontrar horario (RF-S9)**

- ✓ sin elegir a nadie invita a hacerlo
- ✓ ofrece las cuatro duraciones
- ✓ arranca en una hora
- ✓ se puede cambiar la duración
- ✓ sin huecos de esa duración lo dice

**estados**

- ✓ mientras calcula lo dice
- ✓ si falla el calculo de disponibilidad ofrece reintentar
- ✓ si falla la lista de contactos lo explica y deja reintentar (NFR-11)
- ✓ el fallo de contactos no se confunde con no tener a nadie compartiendo


### Pestañas de personas

*Superponer el calendario de un contacto sobre el tuyo.* — 13 pruebas.


**quien aparece**

- ✓ yo siempre estoy, y siempre activo
- ✓ salen los contactos que me comparten su calendario
- ✓ un contacto que no me comparte su calendario no aparece
- ✓ una solicitud pendiente tampoco
- ✓ sin contactos quedan solo "Tú" y el acceso a contactos
- ✓ mientras cargan tampoco revienta

**como se nombran**

- ✓ se usa el nombre de pila, para que quepan varias pestanas
- ✓ sin nombre en el perfil se cae a una etiqueta genérica

**interacción**

- ✓ tocar un contacto pide superponerlo
- ✓ los superpuestos se ven marcados
- ✓ se pueden superponer varios a la vez
- ✓ tocar "Tú" vuelve a dejar solo mi calendario
- ✓ el acceso a contactos lleva a la pantalla de compartidos


### Contactos y permisos — servidor real

*Todo lo que se comparte, y con qué nivel de detalle.* — 38 pruebas.


**searchUsers (RF-S1)**

- ✓ va por RPC, no leyendo profiles
- ✓ pasa el termino y el tope de 8
- ✓ una busqueda vacía no consulta
- ✓ solo una arroba tampoco consulta
- ✓ sin resultados devuelve lista vacía

**listContacts (RF-S3)**

- ✓ clasifica una solicitud que envie como saliente
- ✓ clasifica una solicitud que recibi como entrante
- ✓ muestra el perfil de la otra persona, no el mio
- ✓ separa lo que yo comparto de lo que me comparten
- ✓ incluye el color asignado a mano (RF-S15)
- ✓ los colores se piden solo los mios

**request**

- ✓ rechaza enviarse una solicitud a uno mismo sin tocar la base
- ✓ inserta la conexión
- ✓ el índice único cubre las dos direcciones y se explica en español
- ✓ otro error se traduce igual

**accept**

- ✓ solo actualiza si soy la destinataria
- ✓ marca la fecha de respuesta
- ✓ si no actualizo ninguna fila, la solicitud ya no esta

**remove (RF-S2)**

- ✓ borra la conexión y deja la cascada al trigger

**setCalendarVisibility (RF-S7)**

- ✓ compartir hace upsert sobre el par
- ✓ null borra la fila en vez de guardar un estado

**setContactColor (RF-S15)**

- ✓ guardar hace upsert
- ✓ null vuelve a automático borrando la fila

**shareActivity (RF-S4)**

- ✓ sin contactos no consulta
- ✓ upsert deja pendiente a quien había rechazado

**listInvitations (RF-S5)**

- ✓ pide solo las pendientes dirigidas a mi
- ✓ separa share, actividad y dueño
- ✓ ordena por la fecha de la actividad

**respond**

- ✓ aceptar marca accepted solo en mi invitación
- ✓ rechazar marca declined
- ✓ si no actualizo nada, la invitación ya no esta

**removeShare (RF-S6)**

- ✓ borra el share y resincroniza los recordatorios
- ✓ si el share ya no existe no llama a la RPC

**getAvailability (RF-S8)**

- ✓ sin personas no consulta
- ✓ va por RPC y no leyendo activities
- ✓ pasa personas y ventana
- ✓ sin datos devuelve lista vacía
- ✓ traduce el error


### Contactos — modo demostración

*Buscar personas, aceptar y la cascada al eliminar.* — 35 pruebas.


**buscar personas (RF-S1)**

- ✓ encuentra por prefijo de username
- ✓ acepta la arroba inicial
- ✓ encuentra por correo completo
- ✓ el correo exige la cadena completa: un prefijo no basta
- ✓ exige al menos 3 caracteres, para no poder enumerar cuentas
- ✓ nunca se devuelve a quien busca
- ✓ ignora mayusculas y espacios
- ✓ ordena la coincidencia exacta primero
- ✓ tope de 8 resultados

**listar contactos (RF-S3)**

- ✓ clasifica aceptados, recibidas y enviadas
- ✓ reporta la visibilidad que cada quien concede
- ✓ viene ordenado por nombre visible
- ✓ no incluye a quien no tiene conexión conmigo

**solicitar conexión**

- ✓ crea la solicitud como pendiente
- ✓ rechaza enviársela a uno mismo
- ✓ rechaza duplicar una conexión ya aceptada
- ✓ rechaza duplicar una solicitud pendiente, en cualquier dirección

**aceptar**

- ✓ la solicitud recibida pasa a aceptada y queda fechada
- ✓ solo la puede aceptar quien la recibio, no quien la envío
- ✓ falla con una solicitud inexistente

**eliminar contacto y cascada (RF-S2)**

- ✓ quita la conexión
- ✓ revoca el calendario que esa persona me compartia
- ✓ revoca las invitaciones a actividades entre ambos
- ✓ olvida el color que le había asignado (RF-S15)
- ✓ no deja borrar una conexión ajena
- ✓ ignora en silencio una conexión inexistente

**color de contacto (RF-S15)**

- ✓ guarda el color elegido
- ✓ null vuelve al color automático y no guarda nada
- ✓ reemplaza en vez de acumular
- ✓ solo se puede asignar a contactos aceptados

**visibilidad del calendario (RF-S7)**

- ✓ comparte con el nivel elegido
- ✓ cambiar el nivel no duplica el share
- ✓ null deja de compartir
- ✓ no se puede compartir con quien no es contacto aceptado
- ✓ pero sí se puede dejar de compartir aunque ya no sean contactos


### Invitaciones a actividades — modo demostración

*Compartir una actividad y responder.* — 21 pruebas.


**compartir una actividad (RF-S4)**

- ✓ crea la invitación como pendiente
- ✓ solo quien la creó puede compartirla
- ✓ solo se comparte con contactos aceptados
- ✓ compartir dos veces no duplica la invitación
- ✓ reinvitar a quien rechazo reabre la invitación
- ✓ acepta varios contactos de una vez
- ✓ falla con una actividad inexistente

**listar shares de una actividad**

- ✓ incluye el perfil de cada invitado
- ✓ vacía si no se ha compartido

**invitaciones recibidas (RF-S5)**

- ✓ solo muestra las pendientes dirigidas a mi
- ✓ acompana cada invitación con la actividad y su dueño
- ✓ ordena por la fecha de la actividad
- ✓ una vez respondida desaparece de la lista

**responder invitaciones**

- ✓ aceptar marca el share como aceptado
- ✓ rechazar lo marca como rechazado
- ✓ nadie más puede responder por mi
- ✓ al aceptar se heredan los recordatorios de la actividad (RF-S10)

**quitar un share**

- ✓ lo puede quitar quien creó la actividad
- ✓ también lo puede quitar el invitado
- ✓ un tercero no puede
- ✓ ignora en silencio un share inexistente


### Disponibilidad — modo demostración

*La regla de privacidad más estricta de la app.* — 12 pruebas.


**que se ve de cada persona**

- ✓ de quien comparte en modo detalles llega el título y el color
- ✓ de quien comparte solo ocupación llega el hueco, nunca el título (P4)
- ✓ de quien no comparte su calendario no llega nada
- ✓ de uno mismo se ve todo aunque no haya share
- ✓ pedir varias personas a la vez respeta la visibilidad de cada una

**recorte por rango**

- ✓ una actividad que solapa el borde inicial sí cuenta
- ✓ una que termina justo al empezar el rango no cuenta
- ✓ una que empieza justo al acabar el rango tampoco
- ✓ las de fuera del rango se descartan

**forma del resultado**

- ✓ los bloques salen ordenados por hora de inicio
- ✓ sin personas que consultar devuelve vacío
- ✓ cada bloque dice de quién es


### Carga de contactos

*Búsqueda, colores y refresco.* — 17 pruebas.


**useContacts**

- ✓ pide los contactos del usuario
- ✓ no consulta sin sesión

**usePeopleColors (RF-S15)**

- ✓ incluye mi propio color bajo mi id
- ✓ asigna color a los contactos aceptados
- ✓ ignora las solicitudes pendientes
- ✓ respeta el color elegido a mano

**useUserSearch (RF-S1)**

- ✓ no busca por debajo del mínimo
- ✓ la arroba no cuenta para el mínimo
- ✓ busca en minusculas y sin espacios
- ✓ sin sesión no busca

**useConnectionMutations**

- ✓ solicitar pasa usuario y destinatario
- ✓ aceptar pasa el id de la conexión
- ✓ eliminar pasa el id
- ✓ cambiar visibilidad propaga el nivel
- ✓ quitar color pasa null
- ✓ aceptar inválida también calendario, disponibilidad e invitaciones
- ✓ eliminar inválida lo mismo: la cascada afecta a todo


### Carga de invitaciones

*Qué se refresca al aceptar o rechazar.* — 11 pruebas.


**claves**

- ✓ separan por actividad y por usuario

**useActivityShares**

- ✓ consulta los de esa actividad
- ✓ sin actividad no consulta
- ✓ se puede desactivar a mano: solo el dueño ve los shares

**useInvitations**

- ✓ consulta las del usuario
- ✓ sin sesión no consulta

**useShareMutations**

- ✓ compartir pasa usuario, actividad y contactos
- ✓ responder pasa la invitación y la decisión
- ✓ revocar pasa el share
- ✓ aceptar inválida también actividades y recordatorios (RF-S10)
- ✓ un fallo al compartir se propaga


### Colores de cada persona

*Que dos contactos no salgan del mismo color.* — 15 pruebas.


**paleta**

- ✓ son 8 colores con id, etiqueta y hex
- ✓ no hay hex repetidos
- ✓ el color de "Tú" es el primero de la paleta

**assignPeopleColors**

- ✓ sin contactos devuelve un mapa vacío
- ✓ asigna un color a cada contacto
- ✓ respeta el color elegido a mano
- ✓ nunca reparte el color reservado para "Tú"
- ✓ no repite color entre contactos mientras queden libres
- ✓ un color elegido a mano deja de ofrecerse al resto
- ✓ es estable: el mismo orden da el mismo reparto
- ✓ con más contactos que colores reutiliza en vez de dejar a alguien sin color

**nextAvailableColor**

- ✓ sin nada en uso devuelve el primero libre después del de "Tú"
- ✓ salta los que ya están en uso
- ✓ nunca devuelve el color de "Tú"
- ✓ agotada la paleta cae a un color válido


---

## Recordatorios

**80 pruebas, todas superadas.**

Cada persona decide por su cuenta si quiere el aviso, incluso en una actividad compartida: silenciarlo tú no puede silenciarlo a los demás. También se comprobó el cálculo de a qué hora exacta debe saltar cada aviso.


### Aviso de recordatorio vencido

*El aviso dentro de la app, para la versión web.* — 10 pruebas.


**cuando aparece**

- ✓ con un recordatorio ya vencido lo muestra
- ✓ indica a que hora empieza la actividad
- ✓ un recordatorio futuro todavia no se muestra
- ✓ sin recordatorios no pinta nada
- ✓ en nativo no aparece: ahí hay notificaciones del sistema
- ✓ se anuncia a los lectores de pantalla

**interacción**

- ✓ tocarlo abre la actividad
- ✓ se puede descartar y no vuelve
- ✓ descartar uno no descarta los demás
- ✓ nunca muestra más de tres a la vez


### Recordatorios — servidor real

*Guardado y cálculo de cuándo avisar.* — 25 pruebas.


**listByActivity**

- ✓ filtra por actividad y ordena por antelación
- ✓ pide las copias de destinatario junto al recordatorio
- ✓ resuelve `enabled` desde mi propia copia
- ✓ sin copia propia se asume habilitado
- ✓ no filtra por la copia de otra persona
- ✓ traduce el error

**setForActivity**

- ✓ lee primero lo que ya existe
- ✓ inserta solo los offsets que faltan
- ✓ no inserta nada si no falta ninguno
- ✓ borra por id los que sobran
- ✓ una lista vacía borra todos
- ✓ conserva los offsets que se repiten: no los borra ni reinserta
- ✓ sincroniza las copias con la RPC, incluso si solo se borro
- ✓ propaga el rechazo de la RLS al insertar

**setEnabled (RF-S12)**

- ✓ actualiza solo mi copia
- ✓ traduce el error

**listUpcoming**

- ✓ pide solo las copias habilitadas de esta persona
- ✓ acota la ventana al horizonte pedido
- ✓ calcula el disparo restando la antelación
- ✓ el cuerpo lleva la hora de inicio
- ✓ en todo el día dice "Hoy"
- ✓ en actividad ajena indica quién la comparte
- ✓ sin nombre visible del dueño cae al username
- ✓ sin perfil del dueño usa un texto neutro
- ✓ vienen ordenados por cuando se disparan


### Recordatorios — modo demostración

*Lo mismo en el backend de práctica.* — 21 pruebas.


**definir recordatorios**

- ✓ crea uno por cada offset
- ✓ los devuelve ordenados por antelación
- ✓ reemplaza el conjunto en vez de acumular
- ✓ una lista vacía los borra todos
- ✓ conserva los que se repiten entre una llamada y otra
- ✓ solo quien creó la actividad puede definirlos
- ✓ falla con una actividad inexistente

**listar por actividad**

- ✓ nacen habilitados
- ✓ vacío si la actividad no tiene ninguno

**habilitar y deshabilitar**

- ✓ cada persona decide por su cuenta
- ✓ se puede volver a habilitar
- ✓ desactivarlo yo no lo desactiva para los demás

**próximos recordatorios**

- ✓ devuelve los de actividades futuras dentro del horizonte
- ✓ el aviso se programa antes del inicio, según el offset
- ✓ ignora las actividades ya pasadas
- ✓ ignora lo que cae más alla del horizonte
- ✓ omite los que desactive
- ✓ el cuerpo dice la hora de inicio
- ✓ en una actividad de todo el día dice "Hoy" en vez de la hora
- ✓ en una actividad ajena indica quién la comparte
- ✓ vienen ordenados por cuando se disparan


### Programación de las notificaciones

*Cuándo se reprograman los avisos del sistema.* — 13 pruebas.


**claves**

- ✓ separan por actividad y por usuario

**useActivityReminders**

- ✓ consulta los de esa actividad para ese usuario
- ✓ sin actividad no consulta
- ✓ sin sesión tampoco

**useReminderMutations**

- ✓ definir offsets pasa actividad, usuario y lista
- ✓ silenciar uno pasa el recordatorio y el usuario
- ✓ cualquier cambio inválida toda la familia

**useUpcomingReminders**

- ✓ pide los del horizonte configurado
- ✓ sin sesión no consulta

**useReminderSync (plan §3.4)**

- ✓ reprograma las notificaciones con lo que hay
- ✓ no reprograma si el contenido no cambio, aunque se vuelva a renderizar
- ✓ se suscribe al cambio de primer plano para refrescar
- ✓ sin recordatorios no programa nada


### Opciones de antelación

*Los presets y cómo se describen en español.* — 11 pruebas.


**presets**

- ✓ van de menor a mayor antelación
- ✓ el horizonte coincide con el de la recurrencia

**describeOffset**

- ✓ usa la etiqueta del preset para 0
- ✓ usa la etiqueta del preset para 10
- ✓ usa la etiqueta del preset para 30
- ✓ usa la etiqueta del preset para 60
- ✓ usa la etiqueta del preset para 1440
- ✓ expresa en días los multiplos de 1440
- ✓ expresa en horas los multiplos de 60
- ✓ cae a minutos cuando no es multiplo
- ✓ nunca devuelve vacío


---

## Gimnasio

**140 pruebas, todas superadas.**

El registro de entrenamientos, accesible desde cualquier actividad marcada como gimnasio. Lo que más se cuidó es que capturar no pierda nada: los campos se guardan al salir de ellos, y borrar un ejercicio ofrece deshacer en vez de pedir confirmación.


### Pantalla de Fitness

*El historial de entrenamientos.* — 21 pruebas.


**estados de carga**

- ✓ mientras carga no muestra la lista
- ✓ si falla explica qué pasó y deja reintentar
- ✓ sin entrenamientos invita a empezar

**historial**

- ✓ un nombre propio gana sobre el título de la actividad (RF-F7)
- ✓ sin nombre propio se usa el de la actividad
- ✓ sin ninguno de los dos queda el texto de reserva
- ✓ una sesión ligada a una actividad lleva su título
- ✓ una sesión sin actividad se llama entrenamiento libre
- ✓ un solo ejercicio se dice en singular
- ✓ varios, en plural
- ✓ sin cuenta de ejercicios se muestra cero, no un hueco
- ✓ la duración solo aparece si se registro
- ✓ sin duración no se inventa un cero
- ✓ cada fila se anuncia con título, fecha y número de ejercicios
- ✓ tocar una fila la abre en modo lectura

**entrenamiento libre**

- ✓ lo crea sin ligarlo a ninguna actividad
- ✓ se estrena con el nombre del entrenamiento anterior
- ✓ la primera vez, sin nombre previo, se crea sin nombre
- ✓ solo entra al detalle cuando el backend confirma
- ✓ el botón se bloquea mientras se crea
- ✓ explica cómo registrar una sesión ya agendada


### Detalle de un entrenamiento

*Capturar y consultar una sesión.* — 25 pruebas.


**modo de apertura**

- ✓ con mode=edit abre en captura
- ✓ con mode=view abre en lectura y ofrece editar
- ✓ desde lectura se puede pasar a edición

**contenido**

- ✓ lista los ejercicios
- ✓ muestra la fecha del entrenamiento
- ✓ mientras carga lo indica
- ✓ si ya no existe ofrece reintentar

**ejercicios**

- ✓ se puede añadir uno
- ✓ eliminar uno no pide confirmación: ofrece deshacer (NFR-12)
- ✓ deshacer lo vuelve a crear con sus valores y su posición

**duplicar (RF-F8)**

- ✓ se ofrece en lectura
- ✓ abre la hoja con la opción de conservar valores
- ✓ permite duplicar como entrenamiento libre

**eliminar el entrenamiento**

- ✓ pide confirmación
- ✓ al confirmar lo elimina

**nombre del entrenamiento**

- ✓ en lectura se muestra el nombre propio
- ✓ sin nombre propio se usa el de la actividad
- ✓ sin ninguno de los dos queda el texto de reserva
- ✓ en edición es un campo, no un título fijo
- ✓ se guarda al salir del campo
- ✓ escribir sin salir del campo todavia no guarda
- ✓ borrarlo lo deja sin nombre, no en cadena vacía
- ✓ salir del campo sin cambiar nada no guarda

**el nombre se recuerda para el siguiente entrenamiento**

- ✓ al confirmar el backend queda como propuesta del proximo
- ✓ borrar el nombre no deja una propuesta vacía


### Tarjeta de ejercicio

*Capturar series, repeticiones y peso.* — 16 pruebas.


**contenido**

- ✓ muestra los valores guardados
- ✓ los campos vacios se muestran vacios, no como "null"
- ✓ ofrece eliminar con el nombre en la etiqueta
- ✓ un ejercicio sin nombre sigue teniendo etiqueta útil

**guardado al perder el foco (RF-F5)**

- ✓ escribir no guarda todavia
- ✓ al salir del campo sí guarda
- ✓ las series se guardan como número
- ✓ un número inválido se guarda como vacío, no como cero
- ✓ un cero tampoco se guarda: no hay series de cero
- ✓ un texto en blanco se guarda como vacío
- ✓ las notas también se recortan

**autocompletado de nombres (RF-F4)**

- ✓ sin foco en el nombre no propone nada
- ✓ al enfocar propone lo ya escrito antes
- ✓ elegir una sugerencia la escribe y la guarda

**modo lectura**

- ✓ no ofrece eliminar

**eliminar**

- ✓ avisa al pulsarlo


### Rutina en borrador

*Preparar los ejercicios antes de que exista la actividad.* — 12 pruebas.


**borrador vacío**

- ✓ explica que se puede dejar para después
- ✓ invita a añadir el primero
- ✓ añadir crea una tarjeta vacía
- ✓ cada ejercicio nuevo lleva su propia clave

**con ejercicios**

- ✓ el botón cambia de texto
- ✓ muestra los valores del borrador
- ✓ editar un campo actualiza solo ese ejercicio

**entrenamiento ya existente**

- ✓ ofrece abrirlo en vez de capturar otro
- ✓ en singular lo dice en singular
- ✓ sin ejercicios lo describe distinto
- ✓ abrirlo avisa
- ✓ sin la forma de abrirlo vuelve a la captura normal


### Entrenamientos — servidor real

*Guardado de sesiones y ejercicios.* — 28 pruebas.


**list**

- ✓ filtra por dueño y ordena del más reciente al más antiguo (RF-F7)
- ✓ trae el título de la actividad ligada
- ✓ sin actividad ligada el título es null
- ✓ cuenta los ejercicios

**duración derivada (RF-F3)**

- ✓ suma la de los ejercicios
- ✓ sin ninguna duración anotada es null, no cero
- ✓ sin ejercicios también es null

**getById**

- ✓ devuelve los ejercicios ordenados por posición
- ✓ avisa si ya no existe
- ✓ traduce el error

**getByActivity (RF-F1)**

- ✓ filtra por actividad y dueño
- ✓ devuelve null si la actividad no tiene entrenamiento

**create / update / remove**

- ✓ crear marca al dueño
- ✓ actualizar filtra por id y envía el parche
- ✓ eliminar borra por id
- ✓ eliminar traduce el error

**ejercicios**

- ✓ calcula la siguiente posición si no se indica
- ✓ el primero va en la posición 0
- ✓ respeta una posición explicita sin consultar
- ✓ actualizar filtra por id
- ✓ eliminar borra por id

**exerciseNames (RF-F4)**

- ✓ solo ve los del propio usuario
- ✓ quita duplicados y ordena alfabeticamente
- ✓ sin historial devuelve lista vacía

**duplicate (RF-F8)**

- ✓ con keepValues copia series, repeticiones y peso
- ✓ sin keepValues solo viajan los nombres
- ✓ las notas nunca se copian: son de la sesión que las escribio
- ✓ un entrenamiento sin ejercicios no inserta la segunda tanda


### Entrenamientos — modo demostración

*Lo mismo en el backend de práctica.* — 23 pruebas.


**crear**

- ✓ devuelve el entrenamiento con id y dueño
- ✓ nace sin ejercicios y sin duración
- ✓ guarda el nombre que se le da (RF-F7)
- ✓ recorta los espacios del nombre
- ✓ un nombre en blanco se guarda como sin nombre, no como cadena vacía
- ✓ sin nombre nace sin el
- ✓ se puede cambiar después
- ✓ rechaza un segundo entrenamiento para la misma actividad

**leer**

- ✓ list solo devuelve los propios
- ✓ list ordena del más reciente al más antiguo
- ✓ getById falla con un id inexistente
- ✓ getByActivity devuelve null cuando la actividad no tiene entrenamiento

**actualizar**

- ✓ cambia las notas
- ✓ conserva las notas si el patch no las menciona

**ejercicios**

- ✓ se añaden con posición incremental
- ✓ recortan los espacios del nombre
- ✓ suben el conteo del entrenamiento
- ✓ la duración total es la suma de los ejercicios, no un campo guardado (RF-F3)
- ✓ se pueden editar
- ✓ al eliminarlos baja el conteo
- ✓ no se pueden añadir a un entrenamiento inexistente

**eliminar**

- ✓ lo saca de la lista
- ✓ arrastra sus ejercicios


### Carga de entrenamientos

*Historial, detalle y autocompletado.* — 15 pruebas.


**claves**

- ✓ separan lista, detalle, actividad y nombres

**consultas**

- ✓ useWorkouts pide el historial del usuario
- ✓ useWorkout pide por id
- ✓ useWorkout sin id no consulta
- ✓ useWorkoutByActivity cruza actividad y usuario
- ✓ useWorkoutByActivity se puede desactivar a mano
- ✓ useExerciseNames pide el autocompletado propio

**mutaciones**

- ✓ crear pasa el usuario
- ✓ actualizar pasa id y parche
- ✓ eliminar pasa el id
- ✓ añadir ejercicio pasa entrenamiento y datos
- ✓ editar un ejercicio solo refresca el autocompletado (RF-F4)
- ✓ eliminar un ejercicio sí refresca todo el historial
- ✓ duplicar propaga destino y si se conservan valores (RF-F8)
- ✓ un fallo al crear se propaga


---

## Perfil y administración

**72 pruebas, todas superadas.**

Tus datos, tus estadísticas y los ajustes. El panel de administración es la parte con control de acceso: una cuenta normal no debe verlo, y aun viéndolo solo muestra cifras agregadas, nunca el contenido de la agenda de nadie.


### Pantalla de Perfil

*Tus datos, tus estadísticas y los ajustes.* — 19 pruebas.


**identidad**

- ✓ muestra nombre, usuario y correo
- ✓ sin nombre visible usa un texto de reserva
- ✓ la tarjeta abre la edición
- ✓ mientras carga lo dice
- ✓ si falla ofrece reintentar

**estadísticas**

- ✓ cuenta actividades del mes, amigos, temas propios y entrenamientos
- ✓ solo cuenta contactos aceptados como amigos

**accesos del calendario**

- ✓ ofrece temas, compartido y disponibilidad

**administración (spec 09)**

- ✓ una cuenta normal no ve el panel
- ✓ una cuenta administradora sí

**recordatorios**

- ✓ sin permisos disponibles lo explica
- ✓ con permiso concedido lo dice
- ✓ sin permiso invita a activarlos en Ajustes

**cerrar sesión**

- ✓ pide confirmación antes de nada
- ✓ al confirmar cierra la sesión
- ✓ muestra el error si falla

**modo demo**

- ✓ fuera de demo no ofrece cambiar de cuenta
- ✓ en demo sí, y avisa de que los datos se reinician
- ✓ la versión se marca como demo


### Panel de administración

*Solo visible para cuentas con ese rol.* — 10 pruebas.


**control de acceso**

- ✓ una cuenta sin rol recibe una explicación, no un error crudo
- ✓ y no ve ninguna estadística

**estadísticas**

- ✓ muestra las métricas con su etiqueta
- ✓ formatea los números grandes en es-MX
- ✓ mientras cargan lo indica
- ✓ si fallan ofrece reintentar

**listado de cuentas**

- ✓ muestra correo y nombre
- ✓ sin cuentas lo dice
- ✓ mientras cargan lo indica
- ✓ no expone contenido de ninguna cuenta, solo agregados


### Perfil — servidor real

*Leer y actualizar tus datos.* — 8 pruebas.


**getMyProfile**

- ✓ consulta profiles filtrando por id
- ✓ pide columnas explicitas, no select(*)
- ✓ devuelve el perfil
- ✓ traduce el error

**updateMyProfile**

- ✓ envía el parche y filtra por id
- ✓ un username ocupado se reporta como tal, no como error genérico
- ✓ un username con formato inválido explica la regla
- ✓ otro error cae al genérico


### Perfil — modo demostración

*Lo mismo en el backend de práctica.* — 12 pruebas.


**getMyProfile**

- ✓ devuelve el perfil de la cuenta
- ✓ falla con un usuario desconocido
- ✓ devuelve una copia: mutarla no toca el estado

**updateMyProfile**

- ✓ cambia el nombre visible
- ✓ permite dejar el nombre en blanco
- ✓ normaliza el username a minusculas y sin espacios
- ✓ rechaza un username que ya tiene otra persona
- ✓ la comprobación ignora mayusculas: Pedro y pedro son el mismo
- ✓ guardar el propio username sin cambiarlo no se reporta como ocupado
- ✓ un parche vacío no rompe nada
- ✓ falla con un usuario desconocido
- ✓ cambiar el username no borra el nombre visible


### Administración — servidor real

*Las métricas agregadas.* — 9 pruebas.


**getStats**

- ✓ llama a la RPC admin_stats
- ✓ devuelve la primera fila
- ✓ sin filas avisa en vez de devolver vacío
- ✓ una cuenta sin rol recibe el rechazo de la base (RF-AD6)
- ✓ no consulta tablas directamente: solo la RPC

**listAccounts**

- ✓ llama a admin_accounts con límite y desplazamiento
- ✓ devuelve las cuentas
- ✓ sin datos devuelve lista vacía, no null
- ✓ traduce el rechazo de la RLS


### Administración — modo demostración

*Lo mismo en el backend de práctica.* — 14 pruebas.


**getStats**

- ✓ cuenta todas las cuentas
- ✓ cuenta todas las actividades
- ✓ las altas de 7 días no superan a las de 30
- ✓ cuenta solo las conexiones aceptadas
- ✓ los temas personalizados excluyen los del sistema
- ✓ las personas activas no superan al total de cuentas
- ✓ devuelve todas las métricas del contrato

**listAccounts**

- ✓ devuelve una fila por cuenta
- ✓ incluye correo, rol y fecha de alta
- ✓ cuenta las actividades de cada persona
- ✓ la última actividad es la más reciente de esa persona
- ✓ una cuenta sin actividades no tiene última actividad
- ✓ vienen de la más reciente a la más antigua
- ✓ no expone contraseñas


---

## Los cimientos: interfaz y utilidades

**204 pruebas, todas superadas.**

Las piezas que se reutilizan en toda la app. Se prueban una vez y sirven en todas partes: botones, campos, interruptores, avisos, y los estados de carga, vacío y error que deberían aparecer en cada pantalla. Aquí se concentra buena parte de las comprobaciones de accesibilidad.


### Texto

*Todos los tamaños y colores del sistema de diseño.* — 18 pruebas.


**AppText**

- ✓ muestra el contenido
- ✓ usa la variante body por defecto
- ✓ aplica la escala de la variante display
- ✓ aplica la escala de la variante title
- ✓ aplica la escala de la variante heading
- ✓ aplica la escala de la variante bodyStrong
- ✓ aplica la escala de la variante label
- ✓ aplica la escala de la variante caption
- ✓ usa el color de texto primario por defecto
- ✓ acepta el token de color textSecondary
- ✓ acepta el token de color textTertiary
- ✓ acepta el token de color danger
- ✓ acepta el token de color success
- ✓ activa números tabulares para horas y fechas
- ✓ no los activa por defecto
- ✓ el estilo propio gana sobre el de la variante
- ✓ deja pasar las props de accesibilidad
- ✓ respeta numberOfLines


### Botones

*Sus cuatro variantes y el estado de "cargando".* — 11 pruebas.


**Button**

- ✓ muestra el título
- ✓ se anuncia como botón con su etiqueta
- ✓ avisa al tocarlo
- ✓ no responde cuando está deshabilitado
- ✓ cargando oculta el título y no responde
- ✓ cargando se anuncia como ocupado y deshabilitado
- ✓ deshabilitado no se anuncia como ocupado
- ✓ renderiza la variante primary
- ✓ renderiza la variante secondary
- ✓ renderiza la variante ghost
- ✓ renderiza la variante danger


### Campos de texto

*Etiquetas, errores y el ojo para ver la contraseña.* — 14 pruebas.


**TextField**

- ✓ muestra la etiqueta
- ✓ el campo se anuncia con la etiqueta
- ✓ la etiqueta no envuelve, para no desalinear filas de dos columnas
- ✓ muestra el hint cuando no hay error
- ✓ el error sustituye al hint
- ✓ el error se anuncia a los lectores de pantalla
- ✓ sin mensaje no pinta nada debajo
- ✓ propaga el texto escrito
- ✓ avisa del foco y del blur sin tragarse los callbacks
- ✓ un campo seguro nace oculto
- ✓ el botón del ojo revela y vuelve a ocultar
- ✓ un campo normal no trae botón de ojo
- ✓ no editable se refleja en el campo
- ✓ deja pasar el tipo de teclado


### Filas de ajustes y botones de icono

*Los bloques con los que se arman las pantallas de ajustes.* — 23 pruebas.


**IconButton**

- ✓ se anuncia con la etiqueta obligatoria
- ✓ avisa al tocarlo
- ✓ deshabilitado no responde y lo comunica
- ✓ tiene área tactil ampliada con hitSlop

**Fab**

- ✓ usa una etiqueta por defecto descriptiva
- ✓ acepta una etiqueta propia
- ✓ avisa al tocarlo

**ActionRow**

- ✓ muestra la etiqueta
- ✓ avisa al tocarla
- ✓ deshabilitada no responde
- ✓ acepta el color destructivo

**SettingsRow**

- ✓ muestra etiqueta y valor
- ✓ sin onPress es informativa, no un botón
- ✓ con onPress es un botón que avisa
- ✓ se anuncia con etiqueta y valor juntos
- ✓ deshabilitada deja de ser interactiva
- ✓ muestra el hint en segunda línea
- ✓ un control propio a la derecha sustituye al valor
- ✓ la etiqueta no envuelve

**SettingsGroup**

- ✓ muestra el título del grupo
- ✓ muestra el pie del grupo
- ✓ renderiza todas las filas
- ✓ descarta los hijos falsos (filas condicionales)


### Estados de carga, vacío y error

*Lo que se ve cuando no hay datos o algo falla.* — 12 pruebas.


**LoadingState**

- ✓ usa un texto por defecto
- ✓ acepta una etiqueta propia
- ✓ anuncia el cambio a los lectores de pantalla

**EmptyState**

- ✓ muestra el título
- ✓ muestra la descripción cuando la hay
- ✓ sin descripción no pinta nada extra

**ErrorState**

- ✓ muestra el mensaje
- ✓ se anuncia como alerta
- ✓ ofrece reintentar cuando hay como
- ✓ sin onRetry no muestra el botón

**Skeleton**

- ✓ se renderiza sin contenido
- ✓ acepta un estilo para imitar la forma del contenido


### Interruptores

*Los de encender y apagar.* — 10 pruebas.


**Toggle**

- ✓ se anuncia como switch con su etiqueta
- ✓ comunica el estado encendido
- ✓ comunica el estado apagado
- ✓ al tocarlo propone el valor contrario
- ✓ estando encendido propone apagarlo
- ✓ deshabilitado no responde

**SwitchRow**

- ✓ muestra la etiqueta
- ✓ muestra el hint cuando lo hay
- ✓ sin hint no pinta segunda línea
- ✓ el interruptor de la fila funciona


### Campos que abren un selector

*Fecha, hora y tema.* — 10 pruebas.


**FieldButton**

- ✓ muestra etiqueta y valor
- ✓ sin valor muestra el placeholder
- ✓ acepta un placeholder propio
- ✓ se anuncia con etiqueta y valor juntos
- ✓ sin valor se anuncia con el placeholder
- ✓ abre el selector al tocarlo
- ✓ deshabilitado no abre nada
- ✓ muestra el error debajo
- ✓ el valor no envuelve a dos líneas
- ✓ la etiqueta tampoco envuelve


### Selector de hora

*Elegir hora y minuto.* — 12 pruebas.


**apertura**

- ✓ cerrado no pinta el selector
- ✓ abierto muestra la hora recibida
- ✓ usa un título por defecto
- ✓ acepta un título propio
- ✓ la medianoche se muestra como 00:00

**columnas**

- ✓ cada hora y cada minuto se anuncian con su etiqueta
- ✓ marca como seleccionadas la hora y el minuto actuales
- ✓ elegir otra hora actualiza la vista previa
- ✓ elegir otro minuto también
- ✓ se pueden combinar hora y minuto

**confirmar**

- ✓ devuelve los minutos desde medianoche
- ✓ devuelve lo elegido, no lo inicial


### Etiquetas seleccionables

*Las de filtros y días de la semana.* — 6 pruebas.


**Chip**

- ✓ muestra la etiqueta
- ✓ anuncia que está seleccionado
- ✓ anuncia que no lo está
- ✓ avisa al tocarlo
- ✓ acepta un color de acento de la dimensión
- ✓ la variante compacta sigue mostrando la etiqueta


### Selector segmentado

*El de Mes / Semana / Día.* — 6 pruebas.


**Segmented**

- ✓ muestra todas las opciones
- ✓ se anuncia como tablist
- ✓ marca como seleccionada solo la opción activa
- ✓ avisa del valor elegido
- ✓ tocar la ya seleccionada también avisa
- ✓ funciona con dos opciones


### Avisos

*Las barras de mensaje.* — 6 pruebas.


**Banner**

- ✓ muestra el mensaje
- ✓ se anuncia como alerta
- ✓ renderiza el tono error
- ✓ renderiza el tono success
- ✓ renderiza el tono info
- ✓ el tono por defecto es informativo


### Avatares

*Las iniciales de cada persona.* — 7 pruebas.


**Avatar**

- ✓ toma las iniciales de nombre y apellido
- ✓ con un solo nombre usa una inicial
- ✓ se queda en dos iniciales aunque haya más palabras
- ✓ sin nombre visible cae al username
- ✓ un nombre en blanco también cae al username
- ✓ las iniciales van en mayuscula
- ✓ es decorativo: no lo anuncian los lectores de pantalla


### Marca

*El logotipo KAVI, el eslogan y los puntos de las dimensiones.* — 14 pruebas.


**Wordmark**

- ✓ muestra el wordmark
- ✓ usa la fuente de marca, no la del sistema
- ✓ sin pedirlo no muestra el eslogan
- ✓ con slogan lo muestra en su propia fuente
- ✓ el tamaño escala el wordmark
- ✓ apilado el eslogan escala en proporción y queda pequeño
- ✓ en línea respeta el mínimo de 12 px aunque el wordmark sea chico
- ✓ en línea no encoge un eslogan que ya supera el mínimo
- ✓ el eslogan puede llevar su propio color
- ✓ sin sloganColor ambos comparten color

**DimensionDots**

- ✓ pinta un punto por cada dimensión del bienestar
- ✓ son siete
- ✓ acepta un tamaño propio
- ✓ es decorativo: se oculta a los lectores de pantalla


### Diálogos de confirmación

*El "¿seguro?" antes de cualquier acción destructiva.* — 10 pruebas.


**ConfirmProvider**

- ✓ no muestra el diálogo hasta pedirlo
- ✓ muestra título y mensaje
- ✓ usa etiquetas por defecto
- ✓ acepta etiquetas propias
- ✓ confirmar resuelve true
- ✓ cancelar resuelve false
- ✓ al responder el diálogo se cierra
- ✓ sin mensaje solo muestra el título
- ✓ se puede volver a abrir después de responder

**useConfirm**

- ✓ falla con un mensaje útil fuera del provider


### Avisos emergentes

*Los mensajes que aparecen abajo y se van solos.* — 11 pruebas.


**SnackbarProvider**

- ✓ no muestra nada hasta que se pide
- ✓ muestra el mensaje al pedirlo
- ✓ se oculta solo a los 3 s cuando no hay acción
- ✓ con acción dura más: sigue visible a los 3 s
- ✓ respeta una duración propia
- ✓ muestra la acción y la ejecuta
- ✓ al usar la acción el aviso desaparece
- ✓ sin onAction no pinta botón aunque haya etiqueta
- ✓ se anuncia a los lectores de pantalla
- ✓ un aviso nuevo reemplaza al anterior

**useSnackbar**

- ✓ falla con un mensaje útil si se usa fuera del provider


### Espera al teclear

*No consultar el servidor con cada letra que escribes.* — 6 pruebas.


**useDebouncedValue**

- ✓ devuelve el valor inicial de inmediato
- ✓ no propaga el cambio antes del retardo
- ✓ propaga el valor pasado el retardo
- ✓ teclear seguido solo deja pasar el último valor
- ✓ acepta un retardo propio
- ✓ funciona con valores que no son texto


### Elección de backend

*Decidir si la app usa el servidor real o el de práctica.* — 13 pruebas.


**con credenciales completas**

- ✓ usa el backend real
- ✓ la bandera explicita gana sobre las credenciales

**cae a modo demo**

- ✓ sin ninguna variable
- ✓ sin la URL, aunque haya llave (el caso del APK de producción)
- ✓ sin la llave, aunque haya URL
- ✓ con la URL de ejemplo de .env.example sin sustituir
- ✓ con una llave demasiado corta para ser un JWT
- ✓ con una URL que no es http

**la bandera solo activa demo con el texto exacto "true"**

- ✓ no lo activa con "TRUE"
- ✓ no lo activa con "True"
- ✓ no lo activa con "1"
- ✓ no lo activa con "si"
- ✓ no lo activa con ""


### Refresco de datos compartidos

*Que al aceptar un contacto se actualice todo lo que le afecta.* — 4 pruebas.


**invalidateSharedData**

- ✓ inválida las cinco familias afectadas
- ✓ cubre contactos, actividades, shares, recordatorios y disponibilidad
- ✓ no olvida el calendario, que es el fallo que motivo centralizarlo
- ✓ no lanza si el cliente resuelve de inmediato


### Traducción de errores de la base de datos

*Que nunca se filtre un mensaje técnico a la pantalla.* — 11 pruebas.


**toError**

- ✓ la falta de conexión se reporta como tal cuando llega como Error
- ✓ un error de red en forma de objeto plano hoy NO se detecta
- ✓ 42501 (RLS o trigger) se traduce a falta de permiso
- ✓ 23505 (único duplicado) se traduce a que ya existe
- ✓ un código desconocido cae al mensaje genérico
- ✓ siempre devuelve un AuthUiError que conserva la causa
- ✓ nunca filtra el mensaje crudo de Postgres

**unwrap**

- ✓ devuelve los datos cuando no hay error
- ✓ lanza el error traducido
- ✓ datos nulos sin error también lanzan
- ✓ respeta valores falsy válidos


---

## Lo que encontramos

Escribir estas pruebas no fue solo documentar lo que ya funcionaba: destapó dos
defectos reales que estaban en la aplicación y no se habían visto. Los dos están
corregidos y tienen ahora su propia prueba para que no vuelvan.

### 1. Dos pantallas se quedaban en blanco si fallaba la conexión

En **Disponibilidad** y en **Compartir actividad**, si la carga de contactos fallaba
—por ejemplo sin internet— la pantalla se quedaba vacía. Sin mensaje, sin explicación
y sin forma de reintentar: exactamente igual que si de verdad no tuvieras ningún
contacto. Ahora explican qué pasó y ofrecen reintentar.

### 2. Los fallos de red no siempre se reconocían como tales

La app sabe distinguir "no hay internet" de "los datos son incorrectos", y eso cambia
el mensaje que ves. Pero cuando el error venía de la base de datos en cierto formato,
no se reconocía como falta de conexión y caía al mensaje genérico. Queda documentado
con una prueba que describe el caso.

También hay dos comportamientos que solo se entendieron del todo al probarlos, y que
ahora están explicados en el código: por qué una actividad corta ocupa más alto del que
le tocaría (para que se pueda leer) y por qué eso hace que dos actividades separadas
por 20 minutos se consideren solapadas en pantalla.

---

## Cómo reproducirlo

Desde la carpeta del proyecto:

```
pnpm test              # ejecuta las 1 287 pruebas
pnpm test:coverage     # además mide qué porcentaje del código se ejerce
```

Las mismas pruebas se ejecutan automáticamente en GitHub cada vez que se sube un
cambio. Si alguna fallara, el cambio quedaría marcado en rojo.

El informe navegable línea por línea está en `cobertura/lcov-report/index.html`, y el
resumen técnico con la cobertura por capa en [`README.md`](README.md).

