# -*- coding: utf-8 -*-
"""Apartados 3 a 8 del informe y la bibliografia."""
from formato import (titulo, subtitulo, texto, rico, vineta, tabla, espacio,
                     imagen, pie, fuente_bibliografia)
import datos as D

B = lambda t: (t, {'b': True})


def agregar(a, img):
    # ══════════════════ 3. Implementacion y seguridad ══════════════════
    a(titulo('3. Implementación y seguridad', salto=True))

    a(subtitulo('3.1 El módulo implementado'))
    a(texto('El módulo desarrollado para esta fase es el registro y la gestión de cuentas, que es '
            'la puerta de entrada del sistema y la pieza de la que dependen todas las demás: sin '
            'identidad no hay calendario, ni actividades, ni nada que compartir.'))
    a(texto('Comprende el alta de la persona en cinco pasos —nombre, correo, nombre de usuario, '
            'código de verificación y contraseña—, el inicio de sesión, la sesión persistente '
            'entre arranques, la recuperación de contraseña, la edición del perfil y el cambio de '
            'contraseña. Alrededor de ese núcleo, el sistema completo añade el calendario, los '
            'temas, el compartido y el registro de gimnasio.'))
    a(texto('Tres decisiones del módulo que no son evidentes:'))
    a(vineta('El nombre de usuario se reserva en el paso en que se pide y se vuelve a comprobar al '
             'enviar el código, porque entre un momento y otro alguien puede haberlo tomado. Viaja '
             'en los metadatos de la verificación para que la base de datos lo escriba al crear la '
             'cuenta, en lugar de asignar uno provisional y corregirlo después.'))
    a(vineta('El cambio de contraseña reautentica con la contraseña actual antes de aceptar la '
             'nueva. La interfaz del proveedor no lo exige, y sin ese paso una sesión abierta y '
             'olvidada permitiría cambiarla sin conocerla.'))
    a(vineta('La búsqueda de personas acepta el nombre de usuario por prefijo, pero el correo solo '
             'completo: aceptar prefijos de correo permitiría cosechar direcciones probando '
             'cadenas cortas.'))

    a(subtitulo('3.2 Autenticación con JWT y roles'))
    a(texto('La autenticación se apoya en Supabase Auth, que emite tokens JWT firmados. Cada '
            'petición a la base de datos los transporta y PostgreSQL los valida antes de decidir '
            'qué filas devuelve. El token se guarda en el almacén cifrado del dispositivo en las '
            'plataformas nativas.'))
    a(texto('Se implementaron dos roles —administrador y usuario— en una columna de la tabla de '
            'perfiles. Lo relevante es dónde se aplica la distinción:'))
    a(vineta('El panel de administración se oculta a las cuentas sin el rol, pero ocultarlo no es '
             'el control de acceso: quien conozca la ruta puede pedirla.'))
    a(vineta('El control real vive en la base de datos: las funciones que alimentan el panel '
             'comprueban el rol antes de devolver nada. Una petición manipulada desde el cliente '
             'no obtiene datos.'))
    a(vineta('Un disparador impide el auto-ascenso. Sin él, cualquier cuenta podría escribir su '
             'propia fila de perfil y concederse el rol de administrador, porque la política que '
             'permite editar el perfil propio también dejaría cambiar esa columna.'))
    a(vineta('Se revocó explícitamente el permiso de ejecución a las peticiones sin sesión en '
             'todas las funciones de la base de datos, salvo la que el alta necesita antes de '
             'existir. El proveedor lo concede por omisión al crear una función nueva, y la '
             'instrucción habitual para quitarlo no lo deshace: se detectó sondeando el proyecto '
             'ya desplegado.'))
    a(vineta('El panel solo expone cifras agregadas —número de cuentas, de actividades, de '
             'conexiones—, nunca el contenido de la agenda de ninguna persona. El rol de '
             'administrador da visibilidad de operación, no acceso a datos personales.'))
    a(texto(f'Toda tabla incorpora políticas de seguridad a nivel de fila (Row Level Security) '
            f'desde la migración que la crea. Son {D.MIGRACIONES} migraciones versionadas, y un '
            'archivo de pruebas en SQL comprueba con tres usuarios reales que nadie ve lo ajeno, '
            'que el modo «solo ocupación» no filtra filas y que el rol de administrador no concede '
            'acceso a contenido.'))

    a(subtitulo('3.3 Cobertura de pruebas'))
    a(texto('El requisito era una cobertura igual o superior al 80 %. El resultado medido con Jest:'))
    a(tabla(['Métrica', 'Cobertura', 'Detalle'], [
        ['Sentencias', D.COB['sentencias']['pct'], D.COB['sentencias']['detalle']],
        ['Líneas', D.COB['lineas']['pct'], D.COB['lineas']['detalle']],
        ['Ramas', D.COB['ramas']['pct'], D.COB['ramas']['detalle']],
        ['Funciones', D.COB['funciones']['pct'], D.COB['funciones']['detalle']],
    ], [4, 3, 3]))
    a(espacio())
    a(texto(f"Son {D.PRUEBAS['total']} pruebas en {D.PRUEBAS['archivos']} archivos, ejecutadas en "
            f"{D.PRUEBAS['duracion']}, con {D.PRUEBAS['fallidas']} fallidas y ninguna saltada. "
            f"SonarQube publica una cifra distinta, {D.SONAR['cobertura']}, porque combina líneas y "
            'condiciones en un solo número; las dos superan el umbral y miden cosas diferentes.'))
    a(texto('La cobertura no se persiguió como número. Las pruebas verifican las reglas de negocio '
            'que no se ven leyendo el código: que quien comparte su calendario en modo «solo '
            'ocupación» ceda sus horas pero nunca los títulos ni los colores; que eliminar un '
            'contacto revoque en cascada los calendarios compartidos, las invitaciones, los '
            'colores y las copias de recordatorios; que editar una actividad recurrente distinga '
            'entre esta ocurrencia y la serie completa; y que las dos representaciones del tiempo '
            '—la base guarda instantes en UTC, el formulario trabaja en hora local— coincidan en '
            'los cruces de medianoche y en las actividades que empiezan a las 23:50.'))
    a(rico([B('Escribirlas destapó dos defectos reales. '),
            'El primero: dos pantallas se quedaban completamente en blanco si fallaba la carga de '
            'contactos, sin mensaje ni forma de reintentar, indistinguibles de no tener ningún '
            'contacto. El segundo: los errores de la capa de datos llegan como objetos planos y no '
            'se reconocían como falta de conexión, así que caían en un mensaje genérico. Ambos '
            'están corregidos y cada uno tiene su propia prueba.']))

    a(subtitulo('3.4 Pipeline de integración y entrega continuas'))
    a(texto('Tres flujos de trabajo en GitHub Actions, más el despliegue web:'))
    a(tabla(['Flujo', 'Cuándo se ejecuta', 'Qué hace'], [
        ['Pruebas', 'Cada push a la rama principal, cada pull request y a demanda',
         f"Verifica tipos, corre las {D.PRUEBAS['total']} pruebas con cobertura, pasa el lint y "
         'publica el análisis de SonarQube'],
        ['EAS build producción', 'Cada push a la rama principal y a demanda',
         'Compila el APK instalable de Android. Antes de gastar créditos exige tipos, lint y '
         'pruebas en verde'],
        ['Escaneo de seguridad', 'A demanda',
         'Análisis pasivo con OWASP ZAP contra el sitio desplegado'],
        ['Despliegue web', 'Automático en cada cambio integrado',
         'Publica una versión nueva en Vercel'],
    ], [2.4, 3.2, 5.4]))
    a(espacio())
    a(texto('Cuatro decisiones del pipeline que merecen mención:'))
    a(vineta('Los pasos de tipos, pruebas y lint continúan aunque uno falle, y un paso final decide '
             'el resultado. Así una sola ejecución muestra todos los problemas a la vez en lugar '
             'de obligar a descubrirlos de uno en uno.'))
    a(vineta('El resumen —cuántas pruebas pasaron, cuáles fallaron y con qué error, y la '
             'cobertura— se publica en la propia página de la ejecución, sin abrir los registros.'))
    a(vineta('La cobertura tiene un suelo del 80 % configurado en Jest: si un cambio la baja de '
             'ahí, la integración falla en lugar de pasar inadvertida.'))
    a(vineta('La máquina del runner está fijada a una versión concreta en lugar de usar la '
             'etiqueta «la más reciente», que migra de sistema operativo en una fecha anunciada y '
             'cambiaría el entorno sin que nadie toque el repositorio.'))
    a(texto('El flujo de pruebas acepta además un filtro al lanzarlo a mano, para acotar la '
            'ejecución a una zona concreta. El filtro llega por variable de entorno y no '
            'interpolado en el intérprete de órdenes, para que su contenido no pueda ejecutarse '
            'como una orden.'))

    a(subtitulo('3.5 Sobre la plataforma iOS'))
    a(texto('Conviene ser preciso, porque se presta a malentendidos. La aplicación de iOS está '
            'desarrollada y verificada en el simulador, donde se comporta igual que en Android y '
            'en web: mismo código, mismas pantallas, mismos datos. No hay funcionalidad pendiente '
            'de implementar en esa plataforma.'))
    a(texto('Lo que falta es la cuenta de Apple Developer. Sin ella Apple no emite los '
            'certificados de firma, y sin firma no es posible instalar la aplicación en un '
            'dispositivo físico, distribuirla para pruebas ni publicarla. Es una limitación '
            'administrativa, no un entregable incompleto: con la cuenta adquirida, la compilación '
            'se genera con el mismo pipeline que ya produce el APK de Android, sin escribir código.'))

    # ══════════════════ 4. Pruebas y calidad ══════════════════
    a(titulo('4. Pruebas y calidad', salto=True))

    a(subtitulo('4.1 Análisis estático con SonarQube'))
    a(texto(f"El análisis se ejecuta en cada integración y consume la cobertura de Jest, de modo "
            f"que el panel muestra también cuántas pruebas hay y cuánto tardan, no solo qué líneas "
            f"se ejercen. Resultados sobre {D.SONAR['lineas']} líneas de código:"))
    a(tabla(['Métrica', 'Valor'], [
        ['Deuda técnica', D.SONAR['deuda']],
        ['Code smells', D.SONAR['smells']],
        ['Bugs', D.SONAR['bugs']],
        ['Vulnerabilidades', D.SONAR['vulnerabilidades']],
        ['Security hotspots', D.SONAR['hotspots']],
        ['Duplicación de código', D.SONAR['duplicacion']],
        ['Cobertura', D.SONAR['cobertura']],
        ['Complejidad ciclomática', D.SONAR['ciclomatica']],
        ['Complejidad cognitiva', D.SONAR['cognitiva']],
        ['Calificaciones', f"Fiabilidad {D.SONAR['fiabilidad']} · Seguridad "
                           f"{D.SONAR['seguridad']} · Mantenibilidad {D.SONAR['mantenibilidad']}"],
        ['Hallazgos abiertos', str(D.HALLAZGOS_ABIERTOS)],
        ['Puerta de calidad', 'Superada'],
    ], [5, 5]))
    a(espacio(120))
    a(imagen(img['sonar']['rid'], img['sonar']['w'], img['sonar']['h'], 6.1, 'Panel de SonarQube'))
    a(pie('Panel de SonarQube Cloud tras el análisis final: cero incidencias abiertas en '
          'seguridad, fiabilidad y mantenibilidad, con las tres calificaciones en A.'))
    a(texto('Las dos métricas que la rúbrica pedía explícitamente son la deuda técnica y los code '
            'smells, ambas en cero. No es una cifra de partida: el primer análisis devolvió 15 '
            'hallazgos y se corrigieron todos. Que quedaran pocos tiene explicación —el código ya '
            'pasaba por 83 reglas de lint y por el modo estricto del compilador antes de llegar a '
            'SonarQube—, pero corregirlos reveló defectos reales:'))
    a(vineta('Dos ordenaciones sin función de comparación. El orden por omisión de JavaScript es '
             'alfabético, de modo que [0, 2, 10] se ordena como [0, 10, 2]. Con días de la semana '
             'no fallaba hoy, pero se rompía ante cualquier ampliación del rango.'))
    a(vineta('Un bucle que reasignaba su propia variable de avance dentro del cuerpo, reescrito de '
             'forma que expresara lo que realmente hacía.'))
    a(vineta('Dos condicionales que devolvían el mismo valor en ambas ramas, restos de trabajo a '
             'medias: uno desactivaba el anillo de foco de un campo de texto y el otro duplicaba '
             'un título.'))
    a(vineta('Dos expresiones regulares con cuantificadores que podían retroceder de forma '
             'superlineal.'))
    a(rico([B('Una decisión contraria a la herramienta. '),
            'SonarQube proponía usar comparación sensible al idioma para ordenar unos '
            'identificadores. Se descartó: esos identificadores forman parte de una clave de '
            'caché, y una comparación que depende del idioma del dispositivo haría la clave '
            'inestable entre usuarios. Se optó por un orden fijo por punto de código, con el '
            'motivo escrito en el código.']))
    a(rico([B('Un hallazgo del propio panel. '),
            'SonarQube llegó a reportar 329 bugs y 25,9 % de duplicación. Ninguna cifra era real: '
            'el análisis automático de la plataforma ignora las exclusiones configuradas y estaba '
            'midiendo código generado —las compilaciones nativas y el empaquetado web— en lugar '
            'del código fuente. Desactivarlo devolvió las cifras reales. Es un recordatorio de que '
            'una métrica sin verificar puede ser peor que ninguna métrica.']))

    a(subtitulo('4.2 Análisis dinámico con OWASP ZAP'))
    a(texto('Se escaneó el sitio desplegado, se corrigieron los hallazgos, se volvió a escanear y '
            'por último se revisó uno a uno lo que quedaba. Los tres reportes están versionados en '
            'el repositorio, incluido el previo a las correcciones, para poder comparar.'))
    a(tabla(['Riesgo', 'Antes', 'Después de corregir', 'Tras el triaje'],
            [[D.NIVEL[n], str(D.ZAP_ANTES[n]), str(D.ZAP_DESPUES[n]), str(D.ZAP_FINAL[n])]
             for n in (3, 2, 1, 0)]
            + [['Total', str(D.suma(D.ZAP_ANTES)), str(D.suma(D.ZAP_DESPUES)),
                str(D.suma(D.ZAP_FINAL))]], [3, 2, 3, 2.5]))
    a(espacio())
    a(texto('Los tres hallazgos de riesgo medio eran cabeceras de respuesta HTTP ausentes, y se '
            'corrigieron en la configuración del despliegue sin tocar el código de la aplicación: '
            'falta de política de seguridad de contenido, falta de protección contra la '
            'incrustación en marcos ajenos, y una política de origen cruzado más permisiva de lo '
            'necesario. Se cerraron además cuatro hallazgos de riesgo bajo, y se añadieron dos '
            'cabeceras que ZAP no pedía.'))
    a(rico([B('Sobre inyección SQL y XSS. '),
            'El escaneo se ejecutó en modo pasivo de forma deliberada: el modo activo envía '
            'ataques de inyección reales y este despliegue apunta a la base de datos de '
            'producción, de modo que un escaneo completo escribiría basura en datos de verdad. Que '
            'no aparezca inyección SQL no es, por tanto, resultado de haberla probado activamente, '
            'y conviene decirlo en lugar de presentar la ausencia como un aprobado. El argumento '
            'es estructural: el acceso a datos se realiza mediante consultas parametrizadas sobre '
            'una capa que no construye SQL por concatenación, y bajo políticas de seguridad a '
            'nivel de fila cuya verificación está en el archivo de pruebas SQL del repositorio. '
            'Frente a XSS, la política de seguridad de contenido autoriza el único script en línea '
            'de la aplicación mediante su huella criptográfica —no con un permiso general— de modo '
            'que ningún script inyectado en el documento podría ejecutarse; tampoco se concede '
            'permiso para evaluar código en tiempo de ejecución.']))
    a(rico([B('El hallazgo que permanece. '),
            'Es de riesgo medio y se mantiene a conciencia: la política de estilos permite estilos '
            'en línea. La biblioteca que genera la versión web inyecta sus hojas de estilo en '
            'tiempo de ejecución, y un alojamiento estático no puede emitir un identificador único '
            'por petición. Se comprobó retirándolo: la aplicación queda completamente sin estilos, '
            'como muestra la evidencia siguiente. El riesgo es acotado, porque permite estilos '
            'inyectados pero no ejecución de código; la defensa frente a XSS descansa en la '
            'política de scripts, que sí es estricta.']))
    a(imagen(img['csp']['rid'], img['csp']['w'], img['csp']['h'], 4.2, 'KAVI sin estilos en línea'))
    a(pie('KAVI con la política de estilos cerrada: la aplicación pierde toda la maquetación. '
          'Es la razón por la que el hallazgo se acepta y se documenta en vez de silenciarse.'))
    a(rico([B('Triaje final. '),
            f'Los seis hallazgos que permanecen están revisados uno a uno, y cada decisión lleva '
            'escrito su motivo junto a la regla que la aplica. Silenciar un aviso sin dejar '
            'constancia del porqué es, a efectos prácticos, indistinguible de esconderlo: quien '
            'lea el archivo dentro de seis meses no podrá saber si se estudió o si se acalló. El '
            'hallazgo de riesgo medio se deja deliberadamente en estado de aviso y no de silencio, '
            'para que siga apareciendo en cada informe mientras la limitación técnica siga '
            'vigente.']))
    a(texto('Los hallazgos restantes de riesgo bajo e informativo son falsos positivos originados '
            'en dependencias de terceros: secuencias numéricas dentro del código empaquetado que '
            'un detector interpreta como marcas de tiempo, comentarios de las bibliotecas que otro '
            'marca como sospechosos, y una función de compilación dentro de una biblioteca de '
            'validación que va protegida por un manejador de errores y a la que la propia política '
            'de seguridad bloquea.'))

    a(subtitulo('4.3 Por qué hacen falta los dos análisis'))
    a(texto('SonarQube es estático: mira el código. ZAP es dinámico: mira la aplicación desplegada. '
            'Son complementarios y por eso encuentran cosas distintas. El ejemplo más claro de '
            'este proyecto es que ZAP detectó cabeceras HTTP ausentes —el hallazgo de seguridad '
            'más relevante del sistema— y ninguna cantidad de análisis estático las habría '
            'encontrado, porque no están en el código fuente: están en lo que el servidor deja de '
            'decir.'))
