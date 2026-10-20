# Spec 13f · KAVI Library — Club de lectura

> **Aprobada (12 oct 2026).** Pedida por Areli el 12 oct; decisiones C1–C6 en §9. Parte de la spec 13, a la
> que enmienda: compartir un libro con contactos **dentro de un club** entra al alcance (spec 13 §3.4 y §7).

## 1. Qué es

Un **club de lectura** (*Book club* en inglés) es un grupo de contactos que lee **el mismo PDF o EPUB**
dentro de KAVI. Cada quien tiene **su propia copia** del libro, anotan juntos sobre ella, pueden leer a su
ritmo viendo por dónde van los demás, o juntarse en una **sesión en vivo** donde quien la dirige pasa de
página y todos lo siguen en tiempo real. Al terminar, cada quien se queda con su copia.

Es la única parte de Library que se comparte, y solo con quien se invita (P4).

## 2. Crear el club e invitar (RF-BC1 – RF-BC5)

- **RF-BC1.** Desde el menú de una pieza (13a, RF-BL15) → **"Leer en club"**: se le pone nombre (por omisión,
  el título del libro) y se eligen contactos. Solo libros PDF o EPUB; las creaciones (13e) no.
- **RF-BC2.** Solo se invita a **contactos aceptados** (igual que el calendario compartido, spec 06). Hasta
  **12 personas** contando a quien lo crea (C5).
- **RF-BC3. Aceptar da una copia propia** (C4). La invitación llega a Compartido con Aceptar y Rechazar.
  Aceptar **copia el archivo a la librería de quien acepta**, con una marca de club: es suyo, lo puede
  descargar como cualquier libro suyo (RF-BR1) y **cuenta en su espacio** (B2). Si no le alcanza el espacio,
  se le dice cuánto falta antes de aceptar.
- **RF-BC4.** **Quien crea el club es su anfitrión**: invita, quita personas, cambia el nombre y cierra el
  club. Quitar a alguien, que salga o cerrar el club **no le borra su copia**: solo la desconecta del club
  (RF-BC8).
- **RF-BC5. Aviso de derechos.** Como cada miembro recibe una copia, antes de crear el club una línea dice:
  "Comparte solo libros que tengas derecho a compartir".

## 3. Anotar juntos (RF-BC6 – RF-BC8)

- **RF-BC6. Compartidas por omisión** (C2). Dentro de un libro de club, lo que se subraya, escribe o pega
  (13c) lo ven todos los miembros, con el **color y el nombre** de quien lo hizo (el color por persona de
  spec 06, RF-S15). Una anotación se puede marcar **"Solo para mí"** al crearla o después.
- **RF-BC7. Todos pueden editar** las anotaciones del club: moverlas, cambiarlas o quitarlas, como un
  documento compartido. Cada una dice quién la hizo y quién la cambió por última vez; deshacer (RF-BH18)
  regresa lo que yo cambié. La capa del club se puede ocultar para leer limpio.
- **RF-BC8. Cada quien se queda con su copia.** Al salir, ser quitado o cerrarse el club, las anotaciones del
  club que había en ese momento **se quedan en la copia de cada quien** como suyas, con el nombre de quien
  las hizo, y desde ahí ya no se sincronizan.

## 4. Leer a su ritmo y en vivo (RF-BC9 – RF-BC14)

- **RF-BC9. Por dónde va cada quien.** En el club y en la barra de avance (RF-BR10) se ven los avatares de
  los miembros en el lugar donde van. Cada quien puede apagar que los demás vean su avance.
- **RF-BC10. Sesión en vivo** (C1). Cualquier miembro puede empezarla; los demás reciben un aviso en la app
  ("Ana está leyendo *Rayuela* en vivo") y entran con un toque. Quien la empieza la **dirige**.
- **RF-BC11. Seguir a quien dirige.** Al pasar de página, cambiar de capítulo o saltar, los demás llegan al
  mismo lugar en menos de un segundo con buena red. En EPUB se sigue por posición del texto (CFI), no por
  número de página, porque cada quien puede tener otro tamaño de letra o forma de leer.
- **RF-BC12.** Cada quien puede **soltarse** ("Leer por mi cuenta") y volver con "Seguir a Ana". Quien dirige
  puede pasar el mando a otro miembro.
- **RF-BC13. Señalar.** Quien dirige puede tocar un pasaje y se ilumina un momento en la pantalla de todos.
- **RF-BC14.** Arriba se ve quién está en la sesión. Si quien dirige se va, el mando pasa a quien lleva más
  tiempo dentro; si se van todos, la sesión termina sola.

## 5. Datos y tiempo real

- `library_clubs`: id, anfitrión, nombre, tipo y huella del archivo (para saber que todas las copias son el
  mismo libro), creado.
- `library_club_members`: club, persona, estado (`pending`/`accepted`), su copia (`library_items.id`, propia),
  si muestra su avance.
- **Las copias son piezas normales** de cada dueño (`library_items`, RLS por dueño de T275), con `club_id`
  mientras estén conectadas. Copiar el archivo lo hace la función `api/library-files` dentro de R2
  (decisión B2): comprueba que quien acepta sea miembro aceptado del club y copia el original del anfitrión
  a la carpeta del miembro, sin pasar por el teléfono. El tope de 500 MB lo cuida el mismo disparador.
- **Las anotaciones del club** son filas de `library_annotations` con `club_id` y `author_id`; las privadas
  lo llevan nulo. Como todas las copias son el mismo archivo, la posición (página + coordenadas o CFI) vale en
  todas. Al desconectarse una copia, el cliente copia las del club a filas propias (RF-BC8).
- **RLS (P4):** una función `library_club_member(club_id)` decide quién ve el club, sus miembros y sus
  anotaciones, y quién puede editarlas. Solo se invita a conexiones `accepted` (`are_connected`, spec 06).
  Toda tabla nueva lleva RLS desde su creación.
- **Sesión en vivo:** un canal de Supabase Realtime por club, con *presence* (quién está y dónde va) y
  *broadcast* (posición de quien dirige y señalar). Nada de la sesión se guarda en la base. Las anotaciones del
  club llegan por los cambios de la tabla, como Compartido (RF-S14).
- **Eliminar la cuenta** (RF-A12): cierra los clubes que dirigía (cada miembro conserva su copia) y la quita
  de los demás.
- **Hecho (T305, 20 oct 2026), migración `20261020110000_library_clubs.sql`:**
  - **Tablas:** `library_clubs` lleva la huella (tipo y tamaño) del libro del anfitrión, que la base copia de
    su pieza. `library_club_members` guarda `status`, `item_id`, `shows_progress` e `invited_by`.
  - **Columnas nuevas:** `club_id` en `library_items`; en `library_annotations`, `club_id`, `author_id` y
    `updated_by` (quién la cambió al último, RF-BC7).
  - **Al crear el club:** el anfitrión queda como miembro aceptado con su libro como copia.
  - **Reglas:**
    - solo se invita a contactos aceptados, hasta 12 contando invitaciones;
    - una pieza entra a un club solo si su dueño está invitado y es el mismo tipo de libro;
    - aceptar pide una copia propia de ese club;
    - una anotación entra al club solo desde una copia del club;
    - otro miembro cambia el contenido de una anotación, pero no su dueño, su pieza, su club ni su autor.
  - **Desconectar (RF-BC8) lo hace la base,** `library_club_disconnect`. Lo usan salir (`library_leave_club`),
    quitar (`library_remove_club_member`) y cerrar. Cerrar es borrar el club, y un disparador desconecta
    antes a cada miembro. Así cada quien se queda con lo del club aunque el anfitrión borre su cuenta.
- **Hecho (T306, 20 oct 2026):**
  - **Crear:** en el menú de un PDF o EPUB, **Leer en club** (si ya está en uno, **Club de lectura** lo
    abre). Se pone el nombre (el título por omisión), se eligen contactos aceptados y se ve el aviso de
    derechos.
  - **Invitaciones:** llegan a **Compartido** (sección "Clubes de lectura", y cuentan en el número de la
    pestaña), con quién invita, el libro y cuánto ocupa. Si no alcanza el espacio, se dice cuánto falta y
    Aceptar no se deja tocar.
  - **Aceptar:**
    - crea la copia en mi carpeta, con `club_id`; la base cuida el tope de 500 MB;
    - la función de archivos (`clubCopy`) copia dentro de R2 el original y su portada. El original lo da
      `library_club_source`, que solo responde a invitados;
    - si algo falla, la copia se borra y no queda nada a medias.
  - **Pantalla del club:**
    - el libro (mi copia), los miembros con su papel (Dirige, Miembro, Invitación enviada) y "Que vean por
      dónde voy";
    - quien dirige invita a más, retira invitaciones, quita personas, cambia el nombre y cierra el club;
    - los demás salen;
    - salir, quitar y cerrar piden confirmación y dicen que cada quien se queda con su copia.
  - **En la librería:** la copia lleva la marca de club (un ícono de personas en la portada).
  - **Tiempo real:** las tablas del club entran a Realtime, así que las invitaciones llegan solas.
  - **Demo:** Ana manda una invitación de muestra, y los contactos invitados aceptan solos al rato.
- **Hecho (T307, 20 oct 2026):**
  - **Lo que se ve:** en una copia de club, lo anotado incluye lo mío y lo del club de todos
    (`listAnnotations(item, club)`).
  - **Compartido por omisión:** lo nuevo es del club. En Ajustes del lector, "Lo que anote ahora" elige "Para
    el club" o "Solo para mí". Lo ya hecho se cambia en la barra de lo elegido o en la hoja del subrayado,
    solo si es mío.
  - **Quién la hizo (RF-BC6):** lo de otro miembro lleva en la página una marca con su inicial en su color.
    El color es el que le doy como contacto (RF-S15) o, si no es mi contacto, uno fijo. La marca va en lo
    pegado, en los dibujos y en los subrayados de PDF; en un EPUB, el subrayado lo dibuja foliate y la
    autoría se ve en el panel y en su hoja.
  - **Quién la cambió (RF-BC7):** la barra de lo elegido, la hoja del subrayado y el panel dicen "De Ana · la
    cambió Luis". Cualquiera la mueve, la cambia o la quita; la base conserva su dueño. Deshacer regresa lo
    que yo cambié.
  - **Capa ocultable:** "Ver lo del club" en Ajustes la apaga para leer limpio.
  - **Tiempo real:** `library_annotations` entra a Realtime y el lector escucha solo su club. Lo mío no avisa;
    al quitar, la lista se recarga.
  - **Imágenes y stickers de otros:** la función de archivos deja ver la imagen pegada o el sticker propio de
    otra persona a quien ve una anotación que los usa: un miembro, o una copia que quedó del club. Quitar la
    imagen de otro no borra su archivo.
  - **Charola:** la de "Quitados" solo muestra mis stickers.
  - **Demo:** Ana ya tiene un subrayado y un post-it en su club de muestra.
- **Hecho (T308, 20 oct 2026):**
  - **De dónde sale el avance:** el avance de una copia es de su dueño, así que los miembros lo leen con
    `library_club_progress(club)` (migración `20261020140000`). Devuelve la parte leída y la página o el CFI
    de cada copia aceptada; quien apagó "Que vean por dónde voy" no sale, salvo para sí.
  - **En la barra del lector:** la inicial de cada miembro, en su color, a la altura de donde va. La mía no.
  - **En la pantalla del club:** "Va en la p. 40 · 35 %", "Aún no empieza" o "Ya lo terminó".
  - **Actualización:** se vuelve a pedir cada minuto. En una sesión en vivo, el lugar de quien dirige viaja
    por el canal de la sesión (T309); el avance de los demás sigue llegando cada minuto.
- **Hecho (T309, 20 oct 2026):**
  - **Canales:** `club-vivo:<club>` lleva la sesión y `club-avisos:<club>` el aviso de que empezó. Los dos
    son privados: la migración `20261020150000` deja leer y escribir en ellos solo a los miembros del club
    (`library_club_de_canal` + `library_club_member` sobre `realtime.messages`). Nada se guarda en la base.
  - **Quién está (presence):** cada quien publica si está en la sesión, si dice dirigir, desde cuándo y,
    quien dirige, su lugar. Quien solo tiene abierto el libro cuenta para el aviso, no para la sesión.
  - **Quién dirige (RF-BC14):** todos lo calculan igual con lo que ven: quien dice dirigir; si se fue, quien
    lleva más tiempo dentro; si dos lo dicen a la vez, el que llegó antes. A quien le toca lo declara.
  - **Seguir (RF-BC11):** quien dirige manda su lugar al moverse, sin repetir el mismo. En EPUB, por CFI;
    en PDF, por página. Al unirse o al volver con "Seguir a Ana", se llega a donde va.
  - **Soltarse y pasar el mando (RF-BC12):** "Leer por mi cuenta" deja de mover; quien dirige elige a quién
    pasarlo en una hoja con los que están.
  - **Señalar (RF-BC13):** con algo seleccionado, quien dirige toca "Señalar" y el pasaje destella 2.6 s en
    todos (sin animación si se pidió menos movimiento). Lo que mande otro se ignora.
  - **Aviso (RF-BC10):** al empezar, los miembros con la app abierta ven "Ana está leyendo *Rayuela* en
    vivo" con "Entrar", que abre su copia y los une.
  - **Barra arriba del libro:** invita a unirse si hay sesión; dentro, las iniciales de quienes están
    (borde en el acento para quien dirige), quién dirige, seguir o soltarse, pasar el mando y salir.
  - **Demo:** al empezar, los miembros aceptados del club de muestra se unen después de un momento.
- **Modo demo:** los otros miembros son contactos simulados, igual que en Compartido.

## 6. Fuera de esta versión

- **Llamada de voz del club** (C3). Areli la quería si era simple, y no lo es: para hasta 12 personas pide un
  módulo nativo de WebRTC, un servidor intermedio de audio (LiveKit o Daily, de paga a partir de cierto uso)
  con su función para dar acceso, permisos de micrófono en las tres plataformas y audio en segundo plano.
  Mientras, cada quien habla por fuera. Queda en el largo plazo de `tasks.md`.
- Chat del club (P8 deja fuera el chat) · video · clubes públicos o con personas que no son contactos ·
  compartir creaciones (cuadernos, diarios, álbumes) · calendario de lectura del club (se puede hacer con una
  actividad compartida de Lectura).

## 7. Criterios de aceptación

- *Dado* un PDF mío de 20 MB y dos contactos aceptados, *cuando* creo "Club de *Rayuela*" y aceptan,
  *entonces* cada quien lo tiene en su librería con la marca de club, puede descargarlo y su espacio usado
  sube 20 MB.
- *Dado* un contacto con 490 MB usados, *cuando* abre la invitación a ese club, *entonces* ve que le faltan
  10 MB y aceptar no deja una copia a medias.
- *Dado* alguien que no es mi contacto, *cuando* intento invitarlo por la API, *entonces* la base lo rechaza.
- *Dado* un club, *cuando* subrayo un párrafo, *entonces* los demás lo ven con mi color y mi nombre; *cuando*
  marco otro como "Solo para mí", *entonces* nadie más lo ve.
- *Dado* un subrayado de Ana en el club, *cuando* le cambio el color, *entonces* todos ven el nuevo color y
  que lo cambié yo.
- *Dado* una sesión en vivo que dirijo, *cuando* paso a la página 40, *entonces* los miembros que me siguen
  llegan a la 40 en menos de un segundo; *cuando* uno se suelta, *entonces* mis cambios ya no lo mueven.
- *Dado* un EPUB con letra grande en un teléfono y chica en otro, *cuando* quien dirige avanza, *entonces*
  ambos quedan en el mismo párrafo.
- *Dado* que cierro el club, *cuando* un miembro abre su copia, *entonces* sigue ahí con todas las
  anotaciones del club como suyas, y lo que yo anote después ya no le llega.

## 8. Etapa

**LC · Club de lectura**, después de L3 (necesita el lector y la capa de anotaciones) y antes de L7, para que
salga a la luz junto con el resto de Library (C6).

## 9. Decisiones (aprobadas el 12 oct 2026)

| # | Pregunta | Lo aprobado |
|---|---|---|
| **C1** | ¿Qué es "tiempo real"? | **Las dos cosas:** cada quien a su ritmo viendo el avance de los demás, y sesión en vivo donde se sigue a quien dirige. |
| **C2** | ¿Qué anotaciones ve el club? | **Todas por omisión**; cada una se puede marcar "Solo para mí". Todos los miembros pueden editarlas (RF-BC7). |
| **C3** | ¿Cómo conversan? | Una **llamada** si fuera simple; no lo es (§6), así que **cada quien por fuera** y la llamada al largo plazo. |
| **C4** | ¿Los miembros tienen el archivo? | **Sí: cada quien recibe su copia**, la descarga, anota sobre ella con el club y **se la queda** al terminar. Cuenta en su propio espacio. |
| **C5** | Tamaño del club | **Hasta 12 personas** (propuesta; Areli puede cambiarla). |
| **C6** | ¿Cuándo se construye? | **Etapa LC, después de L3** y antes de L7 (propuesta; Areli puede cambiarla). |
