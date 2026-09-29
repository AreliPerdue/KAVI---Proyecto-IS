# -*- coding: utf-8 -*-
"""Cuerpo del informe de cierre. Devuelve la lista de bloques XML del documento."""
from formato import (titulo, subtitulo, texto, rico, vineta, tabla, espacio,
                     imagen, pie, fuente_bibliografia, parrafo, run, CUERPO, GRIS)
import datos as D

B = lambda t: (t, {'b': True})          # tramo en negrita dentro de un parrafo


def construir(img):
    """img: dict con los datos de cada captura ya registrada (rid, ancho, alto)."""
    x = []
    a = x.append

    # ══════════════════ Introduccion ══════════════════
    a(titulo('Introducción', salto=True))
    a(texto('Este documento es el informe de cierre de KAVI, el sistema desarrollado a lo largo '
            'del curso. Recoge lo que se construyó, cómo se verificó, en qué se desvió de lo '
            'planificado y qué se aprende de ello. Antes de entrar en los resultados conviene '
            'explicar de qué trata el proyecto, porque las decisiones técnicas que se justifican '
            'más adelante solo tienen sentido a la luz de lo que el producto pretende ser.'))

    a(subtitulo('Qué es KAVI'))
    a(texto('KAVI es una aplicación de planificación personal multiplataforma —iOS, Android y '
            'navegador— en la que el calendario no es una funcionalidad más, sino el centro de la '
            'aplicación y la puerta de entrada a todo lo demás. Desde el calendario se crean y '
            'editan las actividades, se clasifican, se comparten, se coordinan horarios con otras '
            'personas y se accede a las herramientas especializadas. Ninguna tarea cotidiana '
            'obliga a salir de ese flujo.'))
    a(texto('Lo que distingue a KAVI de una agenda es la clasificación: cada actividad puede '
            'asociarse a un tema ligado a una de las siete dimensiones del bienestar —física, '
            'emocional, social, intelectual, espiritual, financiera y ocupacional—. Clasificar '
            'cuesta un toque, porque los temas ya vienen con su dimensión, su color y su icono; y '
            'nunca es obligatorio para guardar una actividad. Esa clasificación es la que permite '
            'ver no solo en qué se ocupa el tiempo, sino en qué área de la vida se está '
            'invirtiendo.'))

    a(subtitulo('El problema que resuelve'))
    a(texto('Los calendarios tradicionales registran compromisos, pero no relacionan la '
            'planificación con el bienestar de quien los usa, no ofrecen herramientas ligadas a la '
            'actividad concreta —por ejemplo, registrar el entrenamiento de la sesión de gimnasio '
            'que ya está agendada— y resuelven mal algo tan cotidiano como un recordatorio '
            'compartido entre dos personas. KAVI atiende esos tres huecos sin pedir que la persona '
            'cambie de herramienta ni abandone el calendario.'))
    a(texto('Está pensado para dos perfiles: una persona que organiza estudio, trabajo, vida '
            'personal y ejercicio y quiere entender cómo reparte su tiempo por área de vida; y '
            'grupos pequeños —pareja, familia, amistades, compañeros de gimnasio— que necesitan '
            'compartir actividades y coordinar horarios comunes sin exponer su agenda entera.'))

    a(subtitulo('Qué hace el sistema'))
    a(texto('El alcance de la versión 1 se cerró en seis bloques funcionales, cada uno con su '
            'especificación en el repositorio:'))
    a(tabla(['Bloque', 'Qué resuelve'], [
        ['Autenticación y perfil',
         'Alta en cinco pasos con verificación por correo, sesión persistente, recuperación y '
         'cambio de contraseña, y dos roles (usuario y administrador)'],
        ['Calendario',
         'Vistas de mes, semana y día; crear, editar y eliminar actividades; actividades '
         'recurrentes distinguiendo una ocurrencia de la serie; y recordatorios propios'],
        ['Temas y siete dimensiones',
         'Temas predefinidos del sistema y temas propios, cada uno ligado a una dimensión del '
         'bienestar, con filtros por dimensión en el calendario'],
        ['Calendario compartido',
         'Contactos, tres niveles de visibilidad —nada, solo ocupación, detalle—, invitaciones a '
         'actividades, recordatorios compartidos y consulta de disponibilidad'],
        ['Módulo de gimnasio',
         'Registro de entrenamientos y ejercicios que se abre desde la propia actividad de '
         'gimnasio, sin duplicar la agenda'],
        ['Requisitos no funcionales',
         'Rendimiento perceptible, accesibilidad, estados de carga y error, y equivalencia real '
         'entre las tres plataformas'],
    ], [3, 7]))
    a(espacio())
    a(texto('Quedaron deliberadamente fuera de esta versión los módulos de otras dimensiones '
            '(lectura, nutrición, meditación, finanzas), las estadísticas de uso del tiempo, la '
            'mensajería entre personas, la importación de calendarios externos, las notificaciones '
            'push remotas y el modo sin conexión completo. Están documentados como trabajo futuro '
            'y no se implementaron, para que el alcance de la versión 1 no se moviera durante el '
            'desarrollo.'))

    a(subtitulo('Objetivos del proyecto'))
    a(texto('El proyecto se rige por un documento de principios que ninguna especificación, plan '
            'ni tarea puede contradecir. De él salen los objetivos que guiaron cada decisión:'))
    a(vineta('Hacer del calendario el centro real del producto: que organizar, clasificar, '
             'compartir y coordinar ocurran sin salir de él.'))
    a(vineta('Mantener la simplicidad como criterio de diseño: cada pantalla debe poder usarse sin '
             'tutorial, y si algo se resuelve en menos pasos, se resuelve en menos pasos.'))
    a(vineta('Que las siete dimensiones estructuren sin estorbar: clasificar cuesta un toque y '
             'nunca bloquea el guardado de una actividad.'))
    a(vineta('Privacidad por diseño: nada se comparte por omisión, lo compartido es granular y '
             'revocable, y la seguridad vive en la base de datos y no en filtros de la interfaz.'))
    a(vineta('Multiplataforma de verdad: la misma funcionalidad en iOS, Android y web, prefiriendo '
             'la solución compatible con las tres antes que la óptima en una sola.'))
    a(vineta('Arquitectura modular alrededor de la actividad, de modo que añadir un módulo futuro '
             'no obligue a modificar el calendario.'))
    a(vineta('Construcción incremental y verificable: cada fase cierra con un incremento funcional '
             'probado, y no se abre una fase sin cerrar los hitos de la anterior.'))
    a(texto('El criterio de éxito de la versión 1 se definió de forma comprobable, no como una '
            'declaración de intenciones: una persona nueva debe poder registrarse, agendar una '
            'semana de actividades con temas, compartir una actividad con recordatorio con otra '
            'persona y registrar un entrenamiento desde una actividad de gimnasio, completando '
            'todo el recorrido sin salir del calendario, sin errores y en las tres plataformas.'))

    a(subtitulo('Objetivo de esta entrega'))
    a(texto('Sobre ese producto, la entrega final persigue un objetivo distinto y complementario: '
            'implementar el sistema dando prioridad a la calidad, la seguridad y el despliegue '
            'continuo, y documentar tanto los resultados obtenidos como las lecciones aprendidas. '
            'Se concreta en tres fases, que son las que estructuran este informe: implementación '
            'del módulo con autenticación por JWT y roles (apartado 3), pruebas con análisis de '
            'calidad y de seguridad (apartado 4), y cierre y evaluación (apartados 2, 5 y 6).'))
    a(texto('El sistema está construido con Expo y React Native sobre TypeScript en modo estricto, '
            'con Supabase para autenticación, base de datos PostgreSQL, políticas de seguridad a '
            'nivel de fila y sincronización en tiempo real. Se desarrolló entre el '
            f'{D.RANGO}, en {D.COMMITS} commits, siguiendo un '
            'enfoque dirigido por especificaciones: cada funcionalidad se describió antes de '
            'implementarse, y el código se contrastó contra esa descripción. El repositorio, las '
            'especificaciones, el pipeline y todos los reportes que se citan aquí son públicos.'))

    # ══════════════════ 1. Resumen ejecutivo ══════════════════
    a(titulo('1. Resumen ejecutivo'))
    a(texto('Estado del proyecto al cierre:'))
    a(tabla(['Indicador', 'Resultado'], [
        ['Tareas completadas', f'{D.TAREAS_HECHAS} de {D.TAREAS_TOTAL} '
                               f'({round(D.TAREAS_HECHAS / D.TAREAS_TOTAL * 100)} %)'],
        ['Pruebas automáticas', f"{D.PRUEBAS['total']}, todas en verde "
                                f"({D.PRUEBAS['fallidas']} fallidas)"],
        ['Cobertura de código (Jest)', f"{D.COB['sentencias']['pct']} de sentencias · "
                                       f"{D.COB['lineas']['pct']} de líneas"],
        ['Deuda técnica (SonarQube)', D.SONAR['deuda']],
        ['Bugs · vulnerabilidades · code smells', f"{D.SONAR['bugs']} · "
                                                  f"{D.SONAR['vulnerabilidades']} · {D.SONAR['smells']}"],
        ['Duplicación de código', D.SONAR['duplicacion']],
        ['Hallazgos de seguridad de riesgo alto', f'{D.ZAP_FINAL[3]} '
                                                  f'({D.suma(D.ZAP_FINAL)} en total, todos revisados)'],
        ['Entrega respecto al hito planificado', f'{(D.HITO_PLAN - D.FIN).days} días antes'],
        ['Plataformas operativas', 'Web y Android en producción; iOS verificado en simulador'],
    ], [5, 5]))
    a(espacio())
    a(texto('Las tres fases exigidas se completaron: implementación del módulo con autenticación '
            'por JWT y roles, pruebas con análisis de calidad y de seguridad, y este cierre.'))

    # ══════════════════ 2. Planificado vs ejecutado ══════════════════
    a(titulo('2. Comparación entre lo planificado y lo ejecutado', salto=True))

    a(subtitulo('2.1 Línea de tiempo: planificada contra real'))
    a(texto('Conviene empezar por una limitación del plan, porque condiciona todo lo demás: la '
            'planificación fijó el día de inicio y el hito de entrega, y ordenó las fases con sus '
            'dependencias, pero no asignó una fecha a cada fase. El plan decía en qué orden se '
            'haría el trabajo, no cuándo. La consecuencia práctica aparece más abajo.'))
    a(tabla(['Concepto', 'Planificado', 'Real'], [
        ['Inicio', D.larga(D.INICIO), D.larga(D.INICIO)],
        ['Hito de entrega', D.larga(D.HITO_PLAN),
         f'{D.larga(D.FIN)} ({(D.HITO_PLAN - D.FIN).days} días antes)'],
        ['Ventana de trabajo', f'{(D.HITO_PLAN - D.INICIO).days + 1} días naturales',
         f'{D.VENTANA} días naturales'],
        ['Días con avance', 'Trabajo continuo (implícito)',
         f'{len(D.DIAS_ACTIVOS)} días de {D.VENTANA}'],
        ['Fechas por fase', 'No se asignaron', 'Ver el detalle por día'],
    ], [3, 3.5, 3.5]))
    a(espacio())
    a(texto('El detalle día a día, reconstruido de los commits del repositorio:'))
    a(tabla(['Fecha', 'Commits', 'Qué se hizo'], [
        [D.corta(D.date.fromisoformat('2026-09-01')), str(D.POR_DIA['2026-09-01']),
         'Fase 0 (configuración del proyecto) y Fase 1 (autenticación), más el modo demo'],
        [D.corta(D.date.fromisoformat('2026-09-02')), str(D.POR_DIA['2026-09-02']),
         'Fases 2 a 7b completas sobre el modo demo: calendario, temas, recurrencia, '
         'recordatorios, compartido, gimnasio, requisitos no funcionales y el refactor de UX'],
        ['3 a 19 de sep.', '1',
         'Hueco de 17 días sin avance, con un único commit de resguardo el 10 de septiembre'],
        [D.corta(D.date.fromisoformat('2026-09-20')), str(D.POR_DIA['2026-09-20']),
         'Se retoma: notificaciones, migraciones y ajustes de pantallas'],
        [D.corta(D.date.fromisoformat('2026-09-21')), str(D.POR_DIA['2026-09-21']),
         'Despliegue: perfil de producción de EAS, enlaces directos y workflows'],
        [D.corta(D.date.fromisoformat('2026-09-22')), str(D.POR_DIA['2026-09-22']),
         'Fase 8 (backend real) y toda la fase de pruebas y calidad: Jest hasta el 80 %, '
         'los 15 hallazgos de SonarQube, las cabeceras de seguridad y el reescaneo de ZAP'],
        [D.corta(D.date.fromisoformat('2026-09-23')), str(D.POR_DIA['2026-09-23']),
         'Análisis final de SonarQube, triaje de los hallazgos de ZAP e informe de cierre'],
    ], [1.8, 1.2, 7]))
    a(espacio())
    a(rico([B('Tres desviaciones de calendario que merecen nombre propio. '),
            'La primera: el trabajo se concentró. Cuatro días —',
            B('1, 2, 22 y 23 de septiembre'), f'— reúnen {D.CONCENTRACION["commits"]} de los '
            f'{D.COMMITS} commits, el {D.CONCENTRACION["pct"]} %. La segunda: entre el 3 y el 19 de '
            'septiembre hubo 17 días sin avance real, que el plan no podía detectar porque no '
            'había fechas intermedias contra las cuales comparar. La tercera, y la de mayor '
            'riesgo: toda la fase de pruebas y calidad ocurrió en dos días, el 22 y el 23. Si '
            'SonarQube o ZAP hubieran encontrado algo estructural —no cabeceras ausentes, sino un '
            'defecto de diseño— no habría quedado margen para corregirlo antes del hito.']))
    a(texto('El proyecto entregó tres días antes de lo planificado, pero ese adelanto no es mérito '
            'de la planificación: es consecuencia de haber comprimido el trabajo en pocas jornadas '
            'muy largas. Un plan con fechas por fase habría dado el mismo resultado con menos '
            'riesgo, y es la primera mejora de proceso que se propone en el apartado 6.'))

    a(subtitulo('2.2 Resultado por fase'))
    a(texto('El avance se registró tarea por tarea en el archivo de tareas del repositorio, que es '
            'la fuente de verdad del proyecto:'))
    a(tabla(['Fase', 'Planificado', 'Tareas', 'Estado'],
            [[f['nombre'], PLANIFICADO.get(f['nombre'], '—'), f"{f['hechas']}/{f['total']}",
              'Completa' if f['hechas'] == f['total']
              else f"Abierta {', '.join(f['abiertas'])} (§2.4)"]
             for f in D.FASES], [1.7, 5.3, 1.2, 2.8]))
    a(espacio())
    a(texto(f'En total, {D.TAREAS_HECHAS} de {D.TAREAS_TOTAL} tareas cerradas. Las fases se '
            'ejecutaron en el orden previsto, con una decisión de secuencia que resultó acertada y '
            'conviene explicar: todo el frontend se construyó primero contra un backend en memoria '
            '—el «modo demo»— y la integración real con la base de datos se concentró al final, en '
            'la fase 8. Eso permitió diseñar las pantallas sin esperar al esquema, y obligó a '
            'definir los contratos de datos antes de implementarlos, de modo que ambas '
            'implementaciones cumplen la misma interfaz. El efecto secundario más útil llegó en la '
            'fase de pruebas: el backend en memoria es un doble de prueba ya construido, así que '
            'las pruebas no necesitaron simular la base de datos.'))
    a(texto('La contrapartida, visible en la línea de tiempo, es que concentrar la integración real '
            'al final mantuvo todo el riesgo de integración abierto hasta el día 22.'))

    a(subtitulo('2.3 Desviaciones de alcance'))
    a(texto('Cuatro desviaciones de contenido merecen explicación, porque ninguna fue un simple '
            'retraso: todas obligaron a cambiar una decisión de diseño.'))
    a(rico([B('Alta de usuario por pasos en lugar de formulario único. '),
            'Se planificó un formulario con todos los campos. Al implementar la verificación por '
            'código de correo apareció un problema no previsto: verificar el código ya abre sesión '
            'en el proveedor de autenticación, de modo que una persona podía quedar dentro de la '
            'aplicación sin haber fijado contraseña. Se rediseñó como un flujo de cinco pasos con '
            'un estado de «alta pendiente» que retiene a la persona en el último paso hasta '
            'completarlo. Coste: alrededor de un día. Beneficio: se cerró un agujero real.']))
    a(rico([B('Notificaciones del sistema desactivadas. '),
            'Se planificaron notificaciones locales programadas. La biblioteca resultó '
            'incompatible con la versión del SDK utilizada y fallaba al ejecutar en Android. En '
            'lugar de degradar el SDK de toda la aplicación, se desactivó la funcionalidad tras '
            'una interfaz estable y se implementó un aviso dentro de la propia aplicación. Los '
            'recordatorios se configuran y se almacenan; lo que no se emite es la notificación del '
            'sistema operativo.']))
    a(rico([B('Recurrencia materializada en el cliente. '),
            'El plan contemplaba expandir las series recurrentes en la base de datos mediante '
            'funciones almacenadas. Se cambió a materializarlas desde el cliente al crear la '
            'actividad, por complejidad: distinguir entre «editar solo esta ocurrencia» y «editar '
            'toda la serie» resultaba mucho más difícil de razonar y de probar dentro de la base '
            'de datos, y duplicar la expansión en dos lenguajes habría abierto la puerta a que las '
            'dos implementaciones difirieran.']))
    a(rico([B('Una fase entera no planificada. '),
            f"La fase 7b —{next(f['total'] for f in D.FASES if f['nombre'] == 'Fase 7b')} tareas de "
            'rediseño de la experiencia del calendario y adaptación a pantallas grandes— no '
            'existía en el plan inicial. Surgió de usar la aplicación de verdad y encontrar que '
            'varias decisiones razonables sobre el papel no lo eran en la mano. Es la desviación '
            'más grande en volumen de trabajo, y la única que no se puede achacar a un imprevisto '
            'técnico: se planificó a partir de una maqueta y no de un uso real.']))

    a(subtitulo('2.4 Lo que queda abierto'))
    a(texto(f'{len(D.PENDIENTES)} tareas de {D.TAREAS_TOTAL} permanecen sin cerrar. Se documentan '
            'por transparencia; ninguna bloquea el funcionamiento del sistema.'))
    a(tabla(['Pendiente', 'Motivo'], [
        ['T074 · Notificación del sistema verificada en dispositivo',
         'Requiere instalar una compilación nativa nueva. El código está escrito y el aviso '
         'funciona dentro de la aplicación'],
        ['T100 · Matriz de pruebas manuales por funcionalidad',
         'Las pruebas automáticas cubren la lógica y la web está verificada con capturas en cada '
         'fase; falta el recorrido manual en iOS y Android'],
        ['T107 · Hito de la versión candidata',
         f'Planificado para el {D.larga(D.HITO_PLAN)}; el sistema quedó listo el '
         f'{D.larga(D.FIN)} y se cierra con la entrega de este informe'],
    ], [4, 6]))
    a(espacio())
    a(texto('Aparte de estas, la distribución de iOS sigue bloqueada por un motivo administrativo '
            'y no de desarrollo (§3.5).'))

    return x


PLANIFICADO = {
    'Fase 0': 'Proyecto Expo, TypeScript estricto, enrutado y cliente de datos',
    'Fase 1': 'Alta de cuenta, sesión persistente y recuperación de contraseña',
    'Fase 2': 'Vistas de mes, semana y día; crear y editar actividades',
    'Fase 3': 'Siete dimensiones, temas propios, filtros y repeticiones',
    'Fase 4': 'Recordatorios con antelación configurable',
    'Fase 5': 'Contactos, tres niveles de visibilidad e invitaciones',
    'Fase 6': 'Registro de entrenamientos y ejercicios',
    'Fase 7': 'Rendimiento, accesibilidad y estados de error',
    'Fase 7b': 'No estaba planificada: surgió de usar la aplicación de verdad',
    'Fase 8': 'Supabase, políticas RLS, tipos generados y despliegue',
}
