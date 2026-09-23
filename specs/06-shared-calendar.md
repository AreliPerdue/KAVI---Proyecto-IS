# Spec 06 — Calendario compartido y reminders compartidos (F4)

## Objetivo
Conectar personas, compartir actividades y calendarios con control de visibilidad, coordinar horarios mediante disponibilidad, y que los reminders de actividades compartidas notifiquen a **todas** las personas involucradas.

## Historias de usuario
- HU-S1: Yo como persona usuaria, quiero buscar a otra persona por username y enviarle solicitud de conexión para poder compartir con ella.
- HU-S2: Yo como persona usuaria, quiero aceptar/rechazar solicitudes para controlar quién se conecta conmigo.
- HU-S3: Yo como persona usuaria, quiero compartir una actividad con un contacto para que aparezca en su calendario.
- HU-S4: Yo como persona usuaria, quiero compartir mi calendario en modo "solo disponibilidad" o "con detalles" para decidir cuánto ve cada contacto.
- HU-S5: Yo como persona usuaria, quiero ver la disponibilidad de un contacto y encontrar horarios donde ambos estemos libres para coordinar actividades juntos.
- HU-S6: Yo como persona usuaria, quiero que una actividad compartida con reminder nos notifique a ambos, y poder silenciar mi copia sin afectar al resto.

## Requerimientos funcionales
### Conexiones
- RF-S1. Búsqueda de personas por **prefijo de `@username`** (mínimo 3 letras) **o correo exacto** (RF-A1). La arroba inicial es opcional y la búsqueda ignora mayúsculas y espacios; lo que decide si el término es correo o username es si queda una arroba tras quitar la inicial.
  **La asimetría entre ambos es deliberada:** un username es un identificador público —existe para que te encuentren—, así que buscarlo por prefijo no revela nada que su dueño no haya publicado. Un correo sí: aceptar prefijos ahí convertiría el buscador en una herramienta para cosechar direcciones de personas registradas. Aun por prefijo el resultado va acotado (3 letras mínimo, tope de 8 filas, solo username y nombre visible), así que nadie puede recorrer el padrón a base de consultas.
  Los resultados salen ordenados —coincidencia exacta primero, luego los usernames más cortos— y muestran nombre y `@usuario`, para confirmar que es la persona correcta antes de enviar la solicitud.
- RF-S2. Solicitud → pending; el destinatario acepta o elimina. Ambos pueden eliminar la conexión después (revoca todos los shares entre ambos — cascada en servicio).
- RF-S3. Pantalla "Contactos": conexiones aceptadas + solicitudes recibidas/enviadas.

### Compartir actividad
- RF-S4. Desde el detalle de la actividad → "Compartir" → lista de contactos → crea `activity_shares` (pending).
- RF-S5. El invitado ve la invitación (badge en tab Compartido) y acepta/rechaza. Aceptada → la actividad aparece en su calendario con estilo distintivo (borde punteado + avatar del dueño).
- RF-S6. Solo el dueño edita la actividad; los invitados la ven actualizada (Realtime). Un invitado puede salirse (eliminar su share).

### Compartir calendario y disponibilidad
- RF-S7. Por contacto, elegir visibilidad: `busy` (solo bloques ocupados) o `details` (título, tema y horario). Revocable en cualquier momento.
- RF-S8. Vista "Disponibilidad": elegir 1+ contactos y un rango de fechas → grid que superpone bloques ocupados de todos (vía RPC `get_availability`, sin detalles para `busy`).
- RF-S9. "Encontrar horario": dado un rango y duración deseada, listar huecos donde todos los seleccionados están libres; tocar un hueco → pre-llena el formulario de nueva actividad (que luego se puede compartir con ellos).
- RF-S15. **Color por persona.** En el calendario se pueden superponer varios contactos a la vez (pestañas "Tú · contacto…"). Mientras haya al menos uno superpuesto, todas las actividades se pintan con **el color de su dueño** en lugar del color de su dimensión/tema, para distinguir de un vistazo de quién es cada bloque; con "Tú" a solas vuelve el color coding de temas (spec 05). Cada contacto tiene un color asignable a mano desde su ficha; si no se asigna, el sistema reparte el primer color libre de la paleta de personas (`constants/people-colors.ts`, 8 matices distintos de la paleta de dimensiones). "Tú" usa siempre el primer color de la paleta. El color es una preferencia de quien mira, no del contacto.

**Criterio (RF-S15).** *Dado* que Ana y Pedro comparten su calendario conmigo, *cuando* activo ambas pestañas en la vista mensual, *entonces* mis actividades, las de Ana y las de Pedro se ven cada una en un color distinto y estable; *y cuando* dejo solo "Tú", *entonces* mis actividades vuelven a mostrarse con el color de su tema.

- RF-S16. **Aviso de choque de horario al compartir.** Al elegir con quién compartir una actividad, cada contacto que comparta su calendario muestra si ya tiene algo en esa franja ("Ocupado 09:00–17:00", con el título si comparte `details`), si está libre, o que no comparte su disponibilidad. La invitación **no se bloquea**: solo se avisa antes de enviarla, y se resume cuántas de las personas seleccionadas están ocupadas.

**Criterio (RF-S16).** *Dado* que Ana comparte su calendario y tiene trabajo de 09:00 a 17:00, *cuando* voy a compartir con ella una actividad de 16:00 a 17:00, *entonces* su fila avisa de que está ocupada a esa hora y aun así puedo invitarla.

### Reminders compartidos
- RF-S10. Al aceptar un activity_share, el invitado hereda los reminders existentes de la actividad (filas en `reminder_recipients`, vía RPC).
- RF-S11. Si el dueño agrega/edita/borra un reminder o cambia el horario, se sincroniza para todos los recipients (Realtime → cada cliente reprograma sus notificaciones locales).
- RF-S12. Cada recipient puede poner `enabled=false` en su fila para silenciar ese reminder solo para sí.
- RF-S13. La notificación muestra título de la actividad y "Compartida por {display_name}" cuando no eres el dueño.

### Tiempo real
- RF-S14. Suscripción Supabase Realtime a: activities compartidas conmigo, activity_shares propios, reminders/recipients propios. Al recibir cambio → refrescar cache local y reprogramar notificaciones.

## Reglas de negocio
- Solo se comparte con conexiones `accepted` (UI + validación en servicio + `are_connected` en RPC).
- Privacidad: `busy` nunca expone título/descripcion/tema (garantizado por RPC, no por UI — P4).
- Eliminar la actividad elimina shares, reminders y recipients (cascada).

## Criterios de aceptación
- Given A y B conectados, When A comparte una actividad y B acepta, Then B la ve en su calendario y no puede editarla.
- Given un share pending, When B lo rechaza, Then la actividad no aparece en su calendario y A ve el estado.
- Given visibilidad `busy` de A hacia B, When B abre disponibilidad, Then ve bloques ocupados de A sin ningún texto, y ninguna consulta directa a activities de A devuelve filas.
- Given actividad compartida con reminder de 30 min, When llega la hora, Then A y B reciben notificación; y si B lo silenció, solo A la recibe.
- Given que A mueve la actividad 1 hora, When B tiene la app abierta o la abre después, Then su calendario y sus notificaciones reflejan el nuevo horario.
- Given "Encontrar horario" con A+B, 60 min, esta semana, Then los huecos listados no traslapan ninguna actividad de ninguno de los dos.

## UI
Tab "Compartido": contactos, solicitudes, invitaciones a actividades, accesos a disponibilidad. Acciones de compartir viven en el detalle de la actividad (P1: todo desde el calendario).

> **Invitar no es lo mismo que dejar ver.** Invitar (RF-S4) añade a alguien a la
> actividad: le llega una invitación y, si la acepta, la tiene en su propio
> calendario. La visibilidad por actividad (RF-C14) decide qué ven en **tu** calendario
> quienes ya lo tienen compartido. Lo primero se hace desde el detalle de la actividad;
> lo segundo, al crearla.
