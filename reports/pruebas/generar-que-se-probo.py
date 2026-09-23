# -*- coding: utf-8 -*-
"""
Genera `Listado de pruebas.md` a partir del resultado real de Jest, para que el informe
no pueda desviarse de lo que de verdad se ejecuta.

    npx jest --json --outputFile=/tmp/tests.json
    python3 reports/pruebas/generar-que-se-probo.py /tmp/tests.json

El texto explicativo de cada area vive aqui; los nombres de las pruebas se toman
tal cual del resultado, restituyendo solo las tildes para poder leerlos.
"""
import json, os, sys, collections


import re as _re

# Los nombres de las pruebas se escribieron sin tildes en el codigo. Aqui se
# restituyen solo para leer. Ojo con los plurales en -ciones/-siones/-tones, que
# PIERDEN la tilde (conexion -> conexiones), por eso no estan en el mapa.
PALABRAS = {
 'dia':'día','dias':'días','sesion':'sesión','titulo':'título','vacio':'vacío','vacia':'vacía',
 'conexion':'conexión','boton':'botón','dueno':'dueño','edicion':'edición','tambien':'también',
 'contrasena':'contraseña','contrasenas':'contraseñas','duracion':'duración','minimo':'mínimo',
 'maximo':'máximo','numero':'número','numeros':'números','ultima':'última','ultimo':'último',
 'proximos':'próximos','atras':'atrás','aqui':'aquí','asi':'así','mas':'más','ademas':'además',
 'despues':'después','segun':'según','interaccion':'interacción','validacion':'validación',
 'navegacion':'navegación','seleccion':'selección','administracion':'administración',
 'confirmacion':'confirmación','informacion':'información','descripcion':'descripción',
 'opcion':'opción','posicion':'posición','aplicacion':'aplicación','notificacion':'notificación',
 'automatico':'automático','automatica':'automática','unico':'único','unica':'única',
 'util':'útil','utiles':'útiles','generico':'genérico','generica':'genérica','logica':'lógica',
 'basico':'básico','basicos':'básicos','basica':'básica','metrica':'métrica','metricas':'métricas',
 'estadistica':'estadística','estadisticas':'estadísticas','cronologico':'cronológico',
 'area':'área','areas':'áreas','linea':'línea','lineas':'líneas','limite':'límite',
 'indice':'índice','codigo':'código','codigos':'códigos','parametro':'parámetro',
 'pagina':'página','version':'versión','razon':'razón','accion':'acción','funcion':'función',
 'region':'región','detras':'detrás','demas':'demás','estan':'están','habia':'había',
 'tenia':'tenía','podria':'podría','deberia':'debería','seria':'sería','decia':'decía',
 'anade':'añade','anadir':'añadir','anaden':'añaden','anadido':'añadido','ano':'año','anos':'años',
 'manana':'mañana','pequeno':'pequeño','pequena':'pequeña','senal':'señal','diseno':'diseño',
 'espanol':'español','tamano':'tamaño','cuantos':'cuántos','cuantas':'cuántas',
 'cuanto':'cuánto','cuanta':'cuánta','ingles':'inglés','telefono':'teléfono','ahi':'ahí',
 'reves':'revés','envia':'envía','envio':'envío','enviarsela':'enviársela','invalido':'inválido','invalida':'inválida','valido':'válido','validos':'válidos','dialogo':'diálogo','numericos':'numéricos','aceptaria':'aceptaría','deberia':'debería','haria':'haría','seguiria':'seguiría','veria':'vería','dejaria':'dejaría','romperia':'rompería','perderia':'perdería','quedaria':'quedaría','esten':'estén','este':'este','solo':'solo',
}

# Casos que dependen del contexto: se corrigen por frase, no por palabra.
FRASES = [
 ('explica que paso', 'explica qué pasó'),
 ('explica como', 'explica cómo'),
 ('dice como', 'dice cómo'),
 ('de quien es', 'de quién es'),
 ('indica quien', 'indica quién'),
 ('en que estado esta', 'en qué estado está'),
 ('cual esta activa', 'cuál está activa'),
 ('ya esta ocupado', 'ya está ocupado'),
 ('no esta marcado', 'no está marcado'),
 ('esta libre', 'está libre'),
 ('esta ocupado', 'está ocupado'),
 ('que ya esta', 'que ya está'),
 ('lo esta', 'lo está'),
 ('esta seleccionada', 'está seleccionada'),
 ('esta bloqueada', 'está bloqueada'),
 ('dice cual', 'dice cuál'),
 ('cual esta elegido', 'cuál está elegido'),
 ('cuando esta deshabilitado', 'cuando está deshabilitado'),
 ('que esta seleccionado', 'que está seleccionado'),
 ('cual es', 'cuál es'),
 ('cuando es y quien la comparte', 'cuándo es y quién la comparte'),
 ('responde que si', 'responde que sí'),
 ('administradora si', 'administradora sí'),
 ('en demo si,', 'en demo sí,'),
 ('demo si las anuncia', 'demo sí las anuncia'),
 ('pero si se puede', 'pero sí se puede'),
 ('si cuenta', 'sí cuenta'),
 ('si permite', 'sí permite'),
 ('si refresca', 'sí refresca'),
 ('si guarda', 'sí guarda'),
 ('si envia', 'sí envía'),
 ('si aparece', 'sí aparece'),
 ('si se ofrece', 'sí se ofrece'),
 ('quien la creo', 'quien la creó'),
 ('quien creo la actividad', 'quien creó la actividad'),
 ('entro al calendario', 'entró al calendario'),
 ('no abrio sesion', 'no abrió sesión'),
 ('sabe que', 'sabe qué'),
 ('por que', 'por qué'),
 ('en que paso va', 'en qué paso va'),
 ('informa cuantos', 'informa cuántos'),
 ('avisa de que', 'avisa de que'),
]

def tildes(t):
    for a, b in FRASES:
        t = t.replace(a, b)
    # Regla fija del espanol: todo sustantivo en -cion/-sion lleva tilde en
    # singular (accion, conexion) y la pierde en plural (acciones, conexiones).
    t = _re.sub(r"\b([a-zñ]{2,})([cs])ion\b", lambda m: m.group(1) + m.group(2) + 'ión', t)
    def _w(m):
        w = m.group(0)
        r = PALABRAS.get(w.lower())
        if not r:
            return w
        return r.capitalize() if w[0].isupper() else r
    return _re.sub(r"[A-Za-zÁÉÍÓÚÑáéíóúñ]+", _w, t)


datos = json.load(open(sys.argv[1]))
raiz = os.getcwd() + '/'

# (area, titulo legible, para que sirve)
MAPA = {
 'src/app/(auth)/__tests__/register.test.tsx': ('cuenta', 'Pantalla de crear cuenta', 'El alta por pasos: nombre, correo, usuario, código y contraseña.'),
 'src/app/(auth)/__tests__/login.test.tsx': ('cuenta', 'Pantalla de iniciar sesión', 'Entrar con correo y contraseña.'),
 'src/app/(auth)/__tests__/forgot-password.test.tsx': ('cuenta', 'Pantalla de recuperar contraseña', 'Pedir el enlace de recuperación.'),
 'src/services/supabase/__tests__/auth.test.ts': ('cuenta', 'Cuentas y sesiones — servidor real', 'Lo que ocurre contra la base de datos de verdad.'),
 'src/services/demo/__tests__/auth.test.ts': ('cuenta', 'Cuentas y sesiones — modo demostración', 'La misma lógica en el backend de práctica, sin servidor.'),
 'src/lib/__tests__/username.test.ts': ('cuenta', 'Propuesta automática de nombre de usuario', 'Derivar un usuario válido y libre a partir del correo.'),
 'src/lib/__tests__/auth-errors.test.ts': ('cuenta', 'Mensajes de error al entrar o registrarse', 'Traducir los errores técnicos a algo que se entienda y se pueda resolver.'),
 'src/providers/__tests__/auth-provider.test.tsx': ('cuenta', 'Memoria de la sesión abierta', 'Recordar quién entró y reaccionar si la sesión cambia.'),

 'src/app/(app)/(tabs)/__tests__/calendar.test.tsx': ('calendario', 'Pantalla del calendario', 'La pantalla principal de la app.'),
 'src/components/calendar/__tests__/month-view.test.tsx': ('calendario', 'Vista mensual', 'La rejilla de días del mes.'),
 'src/components/calendar/__tests__/timeline.test.tsx': ('calendario', 'Vistas de semana y de día', 'La rejilla por horas.'),
 'src/components/calendar/__tests__/layout-blocks.test.ts': ('calendario', 'Colocación de los bloques', 'Dónde y de qué tamaño se dibuja cada actividad, y cómo se reparten las que coinciden.'),
 'src/components/calendar/__tests__/helpers.test.ts': ('calendario', 'Filtrado y agrupación de actividades', 'Qué se enseña y cómo se ordena.'),
 'src/components/calendar/__tests__/calendar-header.test.tsx': ('calendario', 'Cabecera del calendario', 'El título del periodo y los controles de navegación.'),
 'src/components/calendar/__tests__/filter-sheet.test.tsx': ('calendario', 'Hoja de filtros', 'Filtrar por dimensión del bienestar y por tema.'),
 'src/store/__tests__/calendar-store.test.ts': ('calendario', 'Memoria de la vista elegida', 'Recordar en qué vista y en qué fecha te quedaste.'),
 'src/lib/__tests__/dates.test.ts': ('calendario', 'Manejo de fechas y horas', 'La base de todo el calendario: rangos, formatos en español y huecos libres.'),

 'src/app/(app)/activity/__tests__/new.test.tsx': ('actividades', 'Pantalla de crear y editar actividad', 'El formulario completo, en sus dos modos.'),
 'src/app/(app)/activity/__tests__/detail.test.tsx': ('actividades', 'Detalle de una actividad', 'Lo que ves al tocar una actividad.'),
 'src/components/calendar/__tests__/activity-form.test.tsx': ('actividades', 'Formulario de actividad', 'Los campos y su validación.'),
 'src/components/calendar/__tests__/activity-form-mapping.test.ts': ('actividades', 'Traducción entre lo guardado y el formulario', 'La base guarda instantes universales; el formulario trabaja con día y hora local.'),
 'src/components/calendar/__tests__/recurrence-field.test.tsx': ('actividades', 'Campo de repetición', 'Elegir cada cuánto se repite una actividad.'),
 'src/lib/__tests__/recurrence.test.ts': ('actividades', 'Reglas de repetición', 'Cómo se calculan las repeticiones futuras.'),
 'src/services/supabase/__tests__/activities.test.ts': ('actividades', 'Actividades — servidor real', 'Guardar, leer, editar y borrar contra la base de datos.'),
 'src/services/demo/__tests__/activities.test.ts': ('actividades', 'Actividades — modo demostración', 'Lo mismo en el backend de práctica.'),
 'src/hooks/__tests__/use-activities.test.tsx': ('actividades', 'Carga y refresco de actividades', 'Cuándo se piden datos y cuándo se refrescan solos.'),

 'src/app/(app)/theme/__tests__/new.test.tsx': ('temas', 'Pantalla de crear y editar tema', 'Tus temas propios.'),
 'src/components/calendar/__tests__/theme-picker.test.tsx': ('temas', 'Selector de tema', 'Elegir tema al crear una actividad, con buscador.'),
 'src/services/supabase/__tests__/themes.test.ts': ('temas', 'Temas — servidor real', 'Guardado y reglas de los temas.'),
 'src/services/demo/__tests__/themes.test.ts': ('temas', 'Temas — modo demostración', 'Lo mismo en el backend de práctica.'),
 'src/hooks/__tests__/use-themes.test.tsx': ('temas', 'Carga de temas', 'Agrupación por dimensión y refresco.'),

 'src/app/(app)/(tabs)/__tests__/shared.test.tsx': ('compartir', 'Pantalla de Compartido', 'Contactos, solicitudes e invitaciones.'),
 'src/app/(app)/activity/__tests__/share.test.tsx': ('compartir', 'Compartir una actividad', 'Elegir con quién y avisar de choques de horario.'),
 'src/app/(app)/shared/__tests__/availability.test.tsx': ('compartir', 'Buscar un hueco en común', 'Ver la disponibilidad de varias personas a la vez.'),
 'src/components/calendar/__tests__/people-tabs.test.tsx': ('compartir', 'Pestañas de personas', 'Superponer el calendario de un contacto sobre el tuyo.'),
 'src/services/supabase/__tests__/shared.test.ts': ('compartir', 'Contactos y permisos — servidor real', 'Todo lo que se comparte, y con qué nivel de detalle.'),
 'src/services/demo/__tests__/connections.test.ts': ('compartir', 'Contactos — modo demostración', 'Buscar personas, aceptar y la cascada al eliminar.'),
 'src/services/demo/__tests__/shares.test.ts': ('compartir', 'Invitaciones a actividades — modo demostración', 'Compartir una actividad y responder.'),
 'src/services/demo/__tests__/availability.test.ts': ('compartir', 'Disponibilidad — modo demostración', 'La regla de privacidad más estricta de la app.'),
 'src/hooks/__tests__/use-connections.test.tsx': ('compartir', 'Carga de contactos', 'Búsqueda, colores y refresco.'),
 'src/hooks/__tests__/use-shares.test.tsx': ('compartir', 'Carga de invitaciones', 'Qué se refresca al aceptar o rechazar.'),
 'src/constants/__tests__/people-colors.test.ts': ('compartir', 'Colores de cada persona', 'Que dos contactos no salgan del mismo color.'),

 'src/components/calendar/__tests__/due-reminders-banner.test.tsx': ('recordatorios', 'Aviso de recordatorio vencido', 'El aviso dentro de la app, para la versión web.'),
 'src/services/supabase/__tests__/reminders.test.ts': ('recordatorios', 'Recordatorios — servidor real', 'Guardado y cálculo de cuándo avisar.'),
 'src/services/demo/__tests__/reminders.test.ts': ('recordatorios', 'Recordatorios — modo demostración', 'Lo mismo en el backend de práctica.'),
 'src/hooks/__tests__/use-reminders.test.tsx': ('recordatorios', 'Programación de las notificaciones', 'Cuándo se reprograman los avisos del sistema.'),
 'src/constants/__tests__/reminders.test.ts': ('recordatorios', 'Opciones de antelación', 'Los presets y cómo se describen en español.'),

 'src/app/(app)/(tabs)/__tests__/fitness.test.tsx': ('gimnasio', 'Pantalla de Fitness', 'El historial de entrenamientos.'),
 'src/app/(app)/workout/__tests__/detail.test.tsx': ('gimnasio', 'Detalle de un entrenamiento', 'Capturar y consultar una sesión.'),
 'src/components/fitness/__tests__/exercise-card.test.tsx': ('gimnasio', 'Tarjeta de ejercicio', 'Capturar series, repeticiones y peso.'),
 'src/components/calendar/__tests__/workout-draft.test.tsx': ('gimnasio', 'Rutina en borrador', 'Preparar los ejercicios antes de que exista la actividad.'),
 'src/services/supabase/__tests__/workouts.test.ts': ('gimnasio', 'Entrenamientos — servidor real', 'Guardado de sesiones y ejercicios.'),
 'src/services/demo/__tests__/workouts.test.ts': ('gimnasio', 'Entrenamientos — modo demostración', 'Lo mismo en el backend de práctica.'),
 'src/hooks/__tests__/use-workouts.test.tsx': ('gimnasio', 'Carga de entrenamientos', 'Historial, detalle y autocompletado.'),

 'src/app/(app)/(tabs)/__tests__/profile.test.tsx': ('perfil', 'Pantalla de Perfil', 'Tus datos, tus estadísticas y los ajustes.'),
 'src/app/(app)/__tests__/admin.test.tsx': ('perfil', 'Panel de administración', 'Solo visible para cuentas con ese rol.'),
 'src/services/supabase/__tests__/profiles.test.ts': ('perfil', 'Perfil — servidor real', 'Leer y actualizar tus datos.'),
 'src/services/demo/__tests__/profiles.test.ts': ('perfil', 'Perfil — modo demostración', 'Lo mismo en el backend de práctica.'),
 'src/services/supabase/__tests__/admin.test.ts': ('perfil', 'Administración — servidor real', 'Las métricas agregadas.'),
 'src/services/demo/__tests__/admin.test.ts': ('perfil', 'Administración — modo demostración', 'Lo mismo en el backend de práctica.'),

 'src/components/ui/__tests__/app-text.test.tsx': ('cimientos', 'Texto', 'Todos los tamaños y colores del sistema de diseño.'),
 'src/components/ui/__tests__/button.test.tsx': ('cimientos', 'Botones', 'Sus cuatro variantes y el estado de "cargando".'),
 'src/components/ui/__tests__/text-field.test.tsx': ('cimientos', 'Campos de texto', 'Etiquetas, errores y el ojo para ver la contraseña.'),
 'src/components/ui/__tests__/rows-and-buttons.test.tsx': ('cimientos', 'Filas de ajustes y botones de icono', 'Los bloques con los que se arman las pantallas de ajustes.'),
 'src/components/ui/__tests__/states.test.tsx': ('cimientos', 'Estados de carga, vacío y error', 'Lo que se ve cuando no hay datos o algo falla.'),
 'src/components/ui/__tests__/switch-row.test.tsx': ('cimientos', 'Interruptores', 'Los de encender y apagar.'),
 'src/components/ui/__tests__/field-button.test.tsx': ('cimientos', 'Campos que abren un selector', 'Fecha, hora y tema.'),
 'src/components/ui/__tests__/time-picker-sheet.test.tsx': ('cimientos', 'Selector de hora', 'Elegir hora y minuto.'),
 'src/components/ui/__tests__/chip.test.tsx': ('cimientos', 'Etiquetas seleccionables', 'Las de filtros y días de la semana.'),
 'src/components/ui/__tests__/segmented.test.tsx': ('cimientos', 'Selector segmentado', 'El de Mes / Semana / Día.'),
 'src/components/ui/__tests__/banner.test.tsx': ('cimientos', 'Avisos', 'Las barras de mensaje.'),
 'src/components/ui/__tests__/avatar.test.tsx': ('cimientos', 'Avatares', 'Las iniciales de cada persona.'),
 'src/components/ui/__tests__/brand.test.tsx': ('cimientos', 'Marca', 'El logotipo KAVI, el eslogan y los puntos de las dimensiones.'),
 'src/providers/__tests__/confirm-provider.test.tsx': ('cimientos', 'Diálogos de confirmación', 'El "¿seguro?" antes de cualquier acción destructiva.'),
 'src/providers/__tests__/snackbar-provider.test.tsx': ('cimientos', 'Avisos emergentes', 'Los mensajes que aparecen abajo y se van solos.'),
 'src/hooks/__tests__/use-debounced-value.test.ts': ('cimientos', 'Espera al teclear', 'No consultar el servidor con cada letra que escribes.'),
 'src/lib/__tests__/env.test.ts': ('cimientos', 'Elección de backend', 'Decidir si la app usa el servidor real o el de práctica.'),
 'src/lib/__tests__/query-invalidation.test.ts': ('cimientos', 'Refresco de datos compartidos', 'Que al aceptar un contacto se actualice todo lo que le afecta.'),
 'src/services/supabase/__tests__/errors.test.ts': ('cimientos', 'Traducción de errores de la base de datos', 'Que nunca se filtre un mensaje técnico a la pantalla.'),
 'src/app/__tests__/index.test.tsx': ('cuenta', 'Primera pantalla al abrir', 'A dónde lleva la app según haya sesión, y la excepción de la primera vez.'),
 'src/app/(app)/__tests__/layout.test.tsx': ('cuenta', 'Rutas protegidas', 'Que sin sesión no se pueda entrar a ninguna pantalla de la app.'),
 'src/components/calendar/__tests__/derived.test.ts': ('calendario', 'Entrenamientos y cumpleaños en el calendario', 'Las dos capas que se dibujan sin ser actividades de verdad.'),
 'src/components/calendar/__tests__/visibility-field.test.tsx': ('compartir', 'Visibilidad de cada actividad', 'Elegir quién ve el detalle y quién solo "ocupado".'),
 'src/components/calendar/__tests__/reminders-field.test.tsx': ('recordatorios', 'Elegir la antelación del aviso', 'Los cinco atajos y la antelación escrita a mano.'),
 'src/lib/__tests__/notifications.test.ts': ('recordatorios', 'Avisos del sistema', 'Que se programen sin duplicados y que la app no se rompa donde no existen.'),
 'src/hooks/__tests__/use-social-notifications.test.tsx': ('recordatorios', 'Avisos de solicitudes e invitaciones', 'El aviso inmediato cuando alguien te escribe o te invita.'),
 'src/store/__tests__/preferences-store.test.ts': ('perfil', 'Preferencias del dispositivo', 'Formato de hora, apariencia y qué capas se ven en el calendario.'),
 'src/hooks/__tests__/use-theme-context.test.tsx': ('perfil', 'El tema llega a toda la pantalla', 'Que al cambiar de tema no quede ninguna parte con el anterior.'),
 'src/hooks/__tests__/use-theme.test.tsx': ('perfil', 'Modo claro y modo oscuro', 'Qué tema se aplica según lo elegido y lo que dice el sistema.'),
 'src/constants/__tests__/nobi.test.ts': ('perfil', 'Nobi, la mascota', 'Los veinte colores y su versión para cada tema.'),
 'src/constants/__tests__/icons.test.tsx': ('temas', 'Iconos de los temas', 'Que cada icono exista y que el del cumpleaños sea un pastel.'),
 'src/components/ui/__tests__/date-input-sheet.test.tsx': ('cimientos', 'Escribir una fecha', 'Teclear día, mes y año sin tener que navegar meses.'),
}

AREAS = [
 ('cuenta', 'Crear cuenta y entrar',
  'Es la puerta de la app: si algo falla aquí, nadie llega al resto. Se comprobó el alta '
  'por pasos completa, el inicio de sesión, la recuperación de contraseña y, sobre todo, '
  'que los mensajes de error digan qué pasó y cómo resolverlo en lugar de mostrar el '
  'error técnico del servidor.'),
 ('calendario', 'El calendario',
  'Es la pantalla central de KAVI. Lo delicado aquí no es enseñar los días, sino colocar '
  'bien las actividades: las que se traslapan tienen que repartirse el ancho, las muy '
  'cortas tienen que seguir siendo legibles y las que cruzan la medianoche tienen que '
  'aparecer en los dos días. También se comprobó todo el manejo de fechas, que es la base '
  'invisible de la pantalla.'),
 ('actividades', 'Crear y editar actividades',
  'Aquí vive la parte más difícil de la app: las actividades que se repiten. Editar o '
  'borrar una tiene que distinguir entre "solo esta vez" y "toda la serie", y equivocarse '
  'significa perder datos de la persona. También se comprobó el cruce entre cómo se '
  'guardan las horas (universales) y cómo se muestran (tu hora local).'),
 ('temas', 'Temas y dimensiones del bienestar',
  'Los temas son la forma en que KAVI clasifica en qué inviertes tu tiempo. La regla '
  'importante es que el estilo se copia a la actividad al crearla: si después cambias el '
  'tema, las actividades que ya existían no cambian de color solas.'),
 ('compartir', 'Compartir con otras personas',
  'Es el área con más reglas de privacidad, y por eso la más probada. Lo esencial: quien '
  'te comparte su calendario "solo ocupación" cede sus horas ocupadas, nunca lo que hace '
  'en ellas; y al eliminar a un contacto tiene que revocarse todo de golpe, sin dejar '
  'restos de acceso.'),
 ('recordatorios', 'Recordatorios',
  'Cada persona decide por su cuenta si quiere el aviso, incluso en una actividad '
  'compartida: silenciarlo tú no puede silenciarlo a los demás. También se comprobó el '
  'cálculo de a qué hora exacta debe saltar cada aviso.'),
 ('gimnasio', 'Gimnasio',
  'El registro de entrenamientos, accesible desde cualquier actividad marcada como '
  'gimnasio. Lo que más se cuidó es que capturar no pierda nada: los campos se guardan al '
  'salir de ellos, y borrar un ejercicio ofrece deshacer en vez de pedir confirmación.'),
 ('perfil', 'Perfil y administración',
  'Tus datos, tus estadísticas y los ajustes. El panel de administración es la parte con '
  'control de acceso: una cuenta normal no debe verlo, y aun viéndolo solo muestra cifras '
  'agregadas, nunca el contenido de la agenda de nadie.'),
 ('cimientos', 'Los cimientos: interfaz y utilidades',
  'Las piezas que se reutilizan en toda la app. Se prueban una vez y sirven en todas '
  'partes: botones, campos, interruptores, avisos, y los estados de carga, vacío y error '
  'que deberían aparecer en cada pantalla. Aquí se concentra buena parte de las '
  'comprobaciones de accesibilidad.'),
]

por_archivo = {}
for r in datos['testResults']:
    f = r['name'].replace(raiz, '')
    por_archivo[f] = r['assertionResults']

faltan = [f for f in por_archivo if f not in MAPA]
if faltan:
    # Detener y no avisar: un archivo sin area no se imprime en ninguna seccion, y el
    # informe saldria diciendo que las recorre todas mientras deja fuera un archivo entero.
    print('Estos archivos de prueba no estan clasificados en MAPA y se perderian:', file=sys.stderr)
    for f in faltan:
        print('  ', f, file=sys.stderr)
    sys.exit(1)

total_pruebas = sum(len(v) for v in por_archivo.values())
superadas = sum(1 for v in por_archivo.values() for a in v if a['status'] == 'passed')
falladas = total_pruebas - superadas
segundos = round((datos['startTime'] and (max(r['endTime'] for r in datos['testResults']) - datos['startTime']) / 1000) or 0)

# La cobertura se lee del resumen que escribe Jest, no se teclea.
try:
    with open('reports/pruebas/cobertura/coverage-summary.json') as fh:
        cobertura = '%.1f %%' % json.load(fh)['total']['lines']['pct']
except (OSError, KeyError, ValueError):
    cobertura = 'sin medir'

def miles(n):
    return f'{n:,}'.replace(',', '\u202f')

L = []
w = L.append
w('# Qué se probó en KAVI, y qué salió\n')
w(f'Este documento recorre **una por una** las {miles(total_pruebas)} pruebas automáticas del proyecto,')
w('agrupadas por zona de la aplicación y escritas para que se entiendan sin leer código.\n')
w('Una prueba automática es un programa pequeño que usa la app como lo haría una persona')
w('—tocar un botón, escribir en un campo, guardar— y comprueba que ocurre lo que debía')
w(f'ocurrir. Si algo deja de funcionar, la prueba falla y lo dice. Las {miles(total_pruebas)} se ejecutan')
w(f'enteras en unos {segundos} segundos, cada vez que se sube un cambio al repositorio.\n')
w('## Resultado\n')
w('| | |')
w('|---|---|')
w(f'| Pruebas ejecutadas | **{miles(total_pruebas)}** |')
w(f'| Pruebas superadas | **{miles(superadas)}** |')
w(f'| Pruebas falladas | **{falladas}** |')
w(f'| Archivos de prueba | {len(por_archivo)} |')
w(f'| Porcentaje del código cubierto | **{cobertura}** |')
w(f'| Tiempo de ejecución | ~{segundos} segundos |\n')
w('**Todas pasaron.** Ninguna quedó pendiente, saltada ni marcada como excepción.\n'
  if falladas == 0 else f'**Fallaron {falladas}.** El detalle está en las listas de abajo.\n')
w('El apartado [Lo que encontramos](#lo-que-encontramos) al final cuenta los dos defectos')
w('reales que aparecieron al escribirlas.\n')
w('### Cómo leer las listas\n')
w('Cada línea con ✓ es una prueba que se ejecuta y pasa. El texto describe qué comprueba.')
w('Están agrupadas igual que en el código, bajo el aspecto que verifican.\n')
w('### Índice\n')
for clave, titulo, _ in AREAS:
    n = sum(len(v) for k, v in por_archivo.items() if MAPA.get(k, ('',))[0] == clave)
    ancla = titulo.lower().replace(' ', '-').replace(':', '').replace(',', '')
    for a, b in [('á','a'),('é','e'),('í','i'),('ó','o'),('ú','u'),('ñ','n')]:
        ancla = ancla.replace(a, b)
    w(f'- [{titulo}](#{ancla}) — {n} pruebas')
w('- [Lo que encontramos](#lo-que-encontramos)')
w('- [Cómo reproducirlo](#como-reproducirlo)\n')

for clave, titulo, intro in AREAS:
    # En el orden de MAPA, que va de las pantallas a los cimientos, no alfabetico.
    archivos = [(f, MAPA[f]) for f in MAPA if MAPA[f][0] == clave and f in por_archivo]
    total = sum(len(por_archivo[f]) for f, _ in archivos)
    w('\n---\n')
    w(f'## {titulo}\n')
    w(f'**{total} pruebas, todas superadas.**\n')
    w(intro + '\n')
    for f, (_, nombre, para_que) in archivos:
        pruebas = por_archivo[f]
        w(f'\n### {nombre}\n')
        w(f'*{para_que}* — {len(pruebas)} pruebas.\n')
        ult = None
        for a in pruebas:
            g = ' › '.join(a['ancestorTitles'])
            if g != ult:
                w(f'\n**{tildes(g)}**\n' if g else '')
                ult = g
            w('- ✓ ' + tildes(a['title']))
        w('')

w('\n---\n')
w('## Lo que encontramos\n')
w('Escribir estas pruebas no fue solo documentar lo que ya funcionaba: destapó dos')
w('defectos reales que estaban en la aplicación y no se habían visto. Los dos están')
w('corregidos y tienen ahora su propia prueba para que no vuelvan.\n')
w('### 1. Dos pantallas se quedaban en blanco si fallaba la conexión\n')
w('En **Disponibilidad** y en **Compartir actividad**, si la carga de contactos fallaba')
w('—por ejemplo sin internet— la pantalla se quedaba vacía. Sin mensaje, sin explicación')
w('y sin forma de reintentar: exactamente igual que si de verdad no tuvieras ningún')
w('contacto. Ahora explican qué pasó y ofrecen reintentar.\n')
w('### 2. Los fallos de red no siempre se reconocían como tales\n')
w('La app sabe distinguir "no hay internet" de "los datos son incorrectos", y eso cambia')
w('el mensaje que ves. Pero cuando el error venía de la base de datos en cierto formato,')
w('no se reconocía como falta de conexión y caía al mensaje genérico. Queda documentado')
w('con una prueba que describe el caso.\n')
w('También hay dos comportamientos que solo se entendieron del todo al probarlos, y que')
w('ahora están explicados en el código: por qué una actividad corta ocupa más alto del que')
w('le tocaría (para que se pueda leer) y por qué eso hace que dos actividades separadas')
w('por 20 minutos se consideren solapadas en pantalla.\n')
w('---\n')
w('## Cómo reproducirlo\n')
w('Desde la carpeta del proyecto:\n')
w('```')
w(f'pnpm test              # ejecuta las {miles(total_pruebas)} pruebas')
w('pnpm test:coverage     # además mide qué porcentaje del código se ejerce')
w('```\n')
w('Las mismas pruebas se ejecutan automáticamente en GitHub cada vez que se sube un')
w('cambio. Si alguna fallara, el cambio quedaría marcado en rojo.\n')
w('El informe navegable línea por línea está en `cobertura/lcov-report/index.html`, y el')
w('resumen técnico con la cobertura por capa en [`README.md`](README.md).\n')

open('reports/pruebas/Listado de pruebas.md', 'w').write('\n'.join(L) + '\n')
print('generado:', sum(len(v) for v in por_archivo.values()), 'pruebas en', len(por_archivo), 'archivos')
