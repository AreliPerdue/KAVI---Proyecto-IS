# -*- coding: utf-8 -*-
"""Apartados 5 a 8 del informe: lecciones, plan de mejora, entregables y rubrica."""
from formato import (titulo, subtitulo, texto, rico, vineta, tabla, espacio,
                     fuente_bibliografia)
import datos as D

B = lambda t: (t, {'b': True})


def agregar(a, img, rid_url):
    # ══════════════════ 5. Lecciones aprendidas ══════════════════
    a(titulo('5. Lecciones aprendidas', salto=True))
    a(texto('Se recogen las que cambiaron una decisión, no las que confirman lo esperado. Cada una '
            'lleva el error concreto que la originó, porque una lección sin el fallo que la '
            'produjo es difícil de creer y más difícil de aplicar.'))

    a(subtitulo('5.1 Un plan sin fechas intermedias no permite detectar un retraso'))
    a(texto('La planificación ordenó las fases y fijó el hito final, pero no asignó fecha a cada '
            'fase. Mientras el trabajo avanzó, eso no se notó. Se notó en el hueco de 17 días: no '
            'había ninguna fecha intermedia contra la cual comparar, así que el retraso no '
            'produjo ninguna señal. El proyecto entregó a tiempo, pero por compresión —cuatro días '
            'concentran el 94 % de los commits—, no por control.'))
    a(texto('La conclusión no es que el plan necesitara más detalle de contenido: las tareas '
            'estaban bien descritas y con sus dependencias. Le faltaba la dimensión temporal. Un '
            'hito con fecha por fase habría convertido el hueco en una alarma el 5 de septiembre '
            'en lugar de en una constatación al final.'))

    a(subtitulo('5.2 Concentrar la verificación al final concentra también el riesgo'))
    a(texto('Toda la fase de pruebas y calidad ocurrió en dos días. Salió bien, y eso es '
            'precisamente lo que la hace engañosa: los hallazgos de ZAP resultaron ser cabeceras '
            'HTTP ausentes, que se corrigen en un archivo de configuración sin tocar el código. Si '
            'hubieran sido un defecto de diseño —un modelo de permisos mal planteado, por '
            'ejemplo— no habría existido margen para corregirlo.'))
    a(texto('Lo mismo vale para la decisión de concentrar el backend real en la última fase. Fue '
            'acertada por lo que permitió (diseñar sin esperar al esquema, y obtener un doble de '
            'prueba gratis), pero mantuvo abierto todo el riesgo de integración hasta el día 22. '
            'La versión corregida de esa decisión no es abandonarla, sino integrar una vertical '
            'completa —una sola pantalla contra la base de datos real— al principio, para que el '
            'riesgo se conozca pronto aunque el grueso se haga al final.'))

    a(subtitulo('5.3 Una métrica sin verificar es peor que ninguna métrica'))
    a(texto('El panel de calidad reportó durante días 329 bugs y 25,9 % de duplicación. Las cifras '
            'eran falsas: la herramienta medía código generado automáticamente, que nadie había '
            'escrito. De haberlas dado por buenas, se habría invertido tiempo en «corregir» '
            'archivos producidos por una compilación. La lección no es desconfiar de las '
            'herramientas, sino comprobar qué están midiendo antes de actuar sobre lo que dicen.'))
    a(texto('Ocurrió lo mismo, en menor escala, con la puerta de calidad: marcaba fallo por '
            'cobertura insuficiente en el código nuevo, y la causa real era una regla de '
            'configuración que clasificaba los ayudantes de prueba como código de producción, de '
            'modo que contaban como fuente sin cubrir.'))

    a(subtitulo('5.4 Las pruebas encuentran lo que la revisión manual no ve'))
    a(texto('Los dos defectos reales aparecidos durante esta fase no eran errores de lógica '
            'visibles leyendo el código, sino ausencias: una pantalla que no contemplaba el caso '
            'de fallo de red y quedaba en blanco. Nadie lo detecta leyendo, porque no hay nada que '
            'leer. Se detecta al preguntarse, prueba por prueba, qué debería ocurrir en cada '
            'situación —y una de esas situaciones es que la petición falle.'))
    a(texto('El corolario práctico es que el valor de una prueba está en la pregunta que obliga a '
            'hacerse, no en la línea que cubre. Las pruebas escritas para subir un número son las '
            'que menos encuentran.'))

    a(subtitulo('5.5 Verificar en el entorno real, no en el que se supone'))
    a(texto('Una compilación de producción salió durante días en modo demostración sin que nada lo '
            'advirtiera: faltaba una clave de configuración que vincula el perfil de compilación '
            'con sus variables de entorno. El diagnóstico inicial fue erróneo y se corrigió solo '
            'al inspeccionar el paquete generado. Un artefacto de producción debe verificarse '
            'examinándolo, no asumiendo que la configuración se aplicó.'))
    a(texto('El mismo principio se aplicó después al cambiar las cabeceras de seguridad: antes de '
            'desplegarlas se sirvió la compilación en local con esas mismas cabeceras leídas del '
            'archivo de configuración y se recorrió la aplicación con un navegador. Una política '
            'mal formada puede dejar una aplicación inservible sin producir ningún error visible, '
            'y la comprobación en producción se repitió incluso con un intento de inicio de '
            'sesión, para confirmar que la política no bloqueaba al backend.'))

    a(subtitulo('5.6 Medir antes que deducir'))
    a(texto('El fallo que más tiempo consumió en todo el proyecto fue un modo claro que, en el '
            'emulador de Android dentro del contenedor de desarrollo, mostraba la interfaz a '
            'medias: las imágenes cambiaban al juego claro y los fondos seguían oscuros. Se '
            'formularon y descartaron tres explicaciones sucesivas —una caché de imágenes, un '
            'compilador que memoiza de más, una barra de pestañas nativa que no propaga el '
            'repintado— y cada una consumió trabajo antes de descartarse.'))
    a(texto('La causa real apareció al instrumentar la aplicación para que registrara, en cada '
            'render, qué color estaba pidiendo. El registro mostró que pedía exactamente los '
            'colores claros correctos. Es decir: el programa funcionaba y era el sistema operativo '
            'quien lo alteraba. Android aplica una inversión automática de colores a las '
            'aplicaciones que no declaran soportar tema oscuro, y dentro de un contenedor de '
            'desarrollo se hereda la declaración de ese contenedor. En una compilación firmada el '
            'problema no existe, lo que se verificó generando el proyecto nativo y leyendo el tema '
            'declarado.'))
    a(texto('La lección no es sobre temas de color. Es que tres hipótesis razonables, encadenadas, '
            'costaron más que la media hora de instrumentar y leer un valor. Ante un '
            'comportamiento que contradice lo que el código dice hacer, medir primero y deducir '
            'después; y ante una diferencia entre plataformas, sospechar del entorno antes que del '
            'programa.'))

    a(subtitulo('5.7 La configuración por omisión rara vez es la adecuada'))
    a(texto('Las incidencias que más tiempo consumieron no fueron de programación, sino de '
            'configuración: un perfil de compilación al que le faltaba una clave, un análisis '
            'automático que ignoraba las exclusiones, una regla que clasificaba mal los archivos '
            'de prueba, un permiso de ejecución que el proveedor concede por omisión a las '
            'peticiones sin sesión, un enlace de proyecto ausente. Todas se comportaban '
            'silenciosamente: no fallaban, producían resultados incorrectos.'))
    a(texto('El caso del permiso es el más instructivo, porque era un problema de seguridad real y '
            'no una molestia: la base de datos concedía ejecución a las peticiones anónimas en '
            'cada función nueva, y la instrucción habitual para revocarlo no lo deshacía. No lo '
            'encontró ninguna herramienta; se encontró sondeando el proyecto desplegado como lo '
            'haría alguien de fuera.'))

    a(subtitulo('5.8 Documentar la decisión, no solo el resultado'))
    a(texto('Varias decisiones de este proyecto resultan incomprensibles sin su motivo: por qué se '
            'conserva un hallazgo de seguridad de riesgo medio, por qué la recurrencia se '
            'materializa en el cliente, por qué se ordena por punto de código en lugar de por '
            'idioma, por qué el runner está fijado a una versión. Registrar el razonamiento —y no '
            'únicamente la conclusión— es lo que permite que una decisión se revise con criterio '
            'en lugar de revertirse por desconocimiento.'))
    a(texto('La prueba de fuego es el archivo de reglas del escáner de seguridad: cada aviso '
            'aceptado lleva escrito al lado por qué se acepta. Sin esa línea, dentro de seis meses '
            'no habría forma de distinguir un hallazgo estudiado de uno escondido.'))

    a(subtitulo('5.9 Una fase de planificación no sustituye al uso'))
    a(texto(f"La desviación de alcance más grande no vino de un imprevisto técnico, sino de haber "
            f"planificado el calendario a partir de una maqueta. Usar la aplicación unos días "
            f"obligó a añadir una fase entera de "
            f"{next(f['total'] for f in D.FASES if f['nombre'] == 'Fase 7b')} tareas. Las "
            'decisiones de interacción deberían validarse con uso real antes de escribirlas como '
            'tareas, y no después.'))

    # ══════════════════ 6. Plan de mejora continua ══════════════════
    a(titulo('6. Plan de mejora continua', salto=True))
    a(texto('Cada acción se enuncia con su indicador, el valor de partida medido hoy, la meta y el '
            'plazo, para que el cumplimiento pueda comprobarse y no solo afirmarse. Los valores de '
            'partida son los que este informe documenta, no estimaciones.'))

    a(subtitulo('6.1 Corto plazo (1 a 2 semanas)'))
    a(tabla(['Acción', 'Indicador', 'Hoy', 'Meta', 'Plazo'], [
        ['Fechas por fase en el plan',
         'Fases con fecha de inicio y fin comprometida', '0 de 10', '10 de 10', '1 semana'],
        ['Cerrar las tareas abiertas del plan',
         'Tareas sin cerrar', f'{len(D.PENDIENTES)}', '0', '2 semanas'],
        ['Condicionar el despliegue web a las pruebas',
         'Despliegues posibles con pruebas en rojo', 'Sí', 'No', '1 semana'],
        ['Distribución de iOS',
         'Plataformas distribuibles', '2 de 3', '3 de 3', '2 semanas'],
        ['Restaurar las notificaciones del sistema',
         'Recordatorios que emiten aviso del sistema', '0 %', '100 %', '2 semanas'],
        ['Automatizar las pruebas de las políticas RLS',
         'Aserciones RLS ejecutadas en cada integración', '0 de 14', '14 de 14', '2 semanas'],
    ], [3.1, 3.2, 1.2, 1.3, 1.2], sz=18))
    a(espacio())

    a(subtitulo('6.2 Medio plazo (1 a 3 meses)'))
    a(tabla(['Acción', 'Indicador', 'Hoy', 'Meta', 'Plazo'], [
        ['Entorno de pruebas separado de producción',
         'Entornos desplegados', '1', '2', '1 mes'],
        ['Escaneo activo de seguridad sobre ese entorno',
         'Cobertura del escaneo', 'Solo pasivo', 'Pasivo y activo', '6 semanas'],
        ['Pruebas de extremo a extremo',
         'Recorridos completos automatizados', '0', '5', '2 meses'],
        ['Análisis automático de dependencias',
         'Dependencias auditadas en cada integración', '0 %', '100 %', '1 mes'],
        ['Elevar la cobertura de ramas',
         'Cobertura de ramas (Jest)', D.COB['ramas']['pct'], '85 %', '3 meses'],
        ['Medición continua del rendimiento',
         'Apertura con 500 actividades', '421 ms (medición puntual)',
         '< 500 ms, vigilado en cada integración', '2 meses'],
        ['Reducir la complejidad cognitiva',
         'Complejidad cognitiva (SonarQube)', D.SONAR['cognitiva'], '−15 %', '3 meses'],
    ], [3.1, 3.2, 1.6, 1.7, 1.1], sz=18))
    a(espacio())

    a(subtitulo('6.3 Propuestas de innovación'))
    a(texto('Tres líneas que no son continuación del trabajo hecho, sino producto nuevo que '
            'aprovecha datos que el sistema ya acumula y hoy no explota. Cada una se plantea con '
            'la forma de comprobar si funciona, porque una innovación que no se puede medir no se '
            'puede descartar.'))
    a(rico([B('1. Equilibrio del bienestar y sugerencia de huecos. '),
            'KAVI clasifica cada actividad por dimensión del bienestar, de modo que tras unos '
            'meses existe el historial necesario para detectar desequilibrios —semanas sin '
            'ninguna actividad de una dimensión— y proponer huecos concretos donde encajarlas, '
            'reutilizando el cálculo de disponibilidad que ya existe. Es la funcionalidad que '
            'convierte un calendario en un asistente de bienestar, que es la promesa del producto. '
            'Conviene subrayar que la primera versión no requiere aprendizaje automático: son '
            'reglas sobre datos propios, y empezar por ahí permite medir si la sugerencia sirve '
            'antes de invertir en un modelo.']))
    a(rico([('Cómo se mide: ', {'i': True}),
            'porcentaje de sugerencias aceptadas por la persona usuaria; meta de aceptación '
            'superior al 30 % en la primera versión, medido sobre un mes.'],
           ind=360, despues=160))
    a(rico([B('2. Predicción de carga y aviso de sobrecarga. '),
            'Con el historial de horas comprometidas por semana es posible anticipar, al crear una '
            'actividad, que la semana siguiente ya está por encima de la carga habitual de esa '
            'persona. El aviso de choque de horario al compartir ya existe y resuelve el conflicto '
            'puntual; esto lo lleva al agregado, que es donde se produce el agotamiento. La '
            'innovación no está en el algoritmo —una media móvil basta— sino en el momento en que '
            'se avisa.']))
    a(rico([('Cómo se mide: ', {'i': True}),
            'reducción de actividades reprogramadas o eliminadas en las 48 horas previas; meta de '
            'una reducción del 20 % frente al periodo anterior.'],
           ind=360, despues=160))
    a(rico([B('3. Rutinas de entrenamiento con progresión. '),
            'El registro de gimnasio ya propone el nombre de la sesión anterior. El paso siguiente '
            'es guardar rutinas completas y proponer progresión de cargas a partir del historial, '
            'que es la función por la que la gente adopta una aplicación de gimnasio y la razón '
            'más probable de que vuelva a abrirla a diario.']))
    a(rico([('Cómo se mide: ', {'i': True}),
            'entrenamientos registrados por persona y semana; meta de pasar de un registro '
            'esporádico a tres sesiones semanales sostenidas durante un mes.'],
           ind=360, despues=160))
    a(rico([B('Una cuarta línea, habilitadora: '),
            'la sincronización en modo lectura con calendarios externos. No es innovación en sí '
            'misma, pero es la condición para las tres anteriores: sin importar lo que la persona '
            'ya tiene agendado en otro sitio, el historial está incompleto y cualquier sugerencia '
            'se construye sobre datos parciales. Es, además, la principal barrera de adopción de '
            'cualquier planificador, porque nadie mantiene dos agendas.']))

    a(subtitulo('6.4 Mejoras del proceso'))
    a(texto('Independientes del producto, derivadas directamente de las lecciones del apartado '
            'anterior:'))
    a(vineta('Asignar fecha comprometida a cada fase, no solo orden y dependencias, y revisar el '
             'avance contra esas fechas al cerrar cada una (§5.1).'))
    a(vineta('Integrar una vertical completa contra el backend real al principio del proyecto, '
             'aunque el grueso de la integración siga yendo al final (§5.2).'))
    a(vineta('Distribuir la verificación a lo largo del proyecto en lugar de concentrarla: correr '
             'el análisis de calidad y el escaneo de seguridad al cerrar cada fase, no al final.'))
    a(vineta('Comprobar qué mide cada herramienta antes de actuar sobre sus cifras (§5.3).'))
    a(vineta('Verificar cada artefacto de producción examinándolo, no asumiendo que la '
             'configuración se aplicó (§5.5).'))
    a(vineta('Ante un comportamiento que contradice el código, instrumentar y medir antes de '
             'encadenar hipótesis (§5.6).'))
    a(vineta('Revisar los permisos por omisión de cada servicio nuevo, y sondear el sistema '
             'desplegado desde fuera además de analizarlo desde dentro (§5.7).'))
    a(vineta('Registrar el motivo de toda decisión que contradiga lo obvio, junto al código que la '
             'implementa (§5.8).'))
    a(vineta('Validar las decisiones de interacción con uso real antes de convertirlas en '
             'tareas (§5.9).'))

    a(subtitulo('6.5 Cómo se revisará el plan'))
    a(texto('El plan se revisa al cierre de cada quincena contra los indicadores de las tablas '
            'anteriores, que son todos observables desde el repositorio o desde los paneles ya '
            'conectados: la cobertura y el número de pruebas salen de la integración continua, las '
            'métricas de calidad del panel de SonarQube, los hallazgos de seguridad del escaneo, y '
            'el avance de tareas del archivo de tareas. Ninguno exige instrumentación nueva, que '
            'es la razón de haberlos elegido: un indicador que cuesta recolectar deja de '
            'recolectarse a las dos semanas.'))

    # ══════════════════ 7. Entregables ══════════════════
    a(titulo('7. Entregables', salto=True))
    a(rico([B('Repositorio: '), 'github.com/AreliPerdue/KAVI---Proyecto-IS']))
    a(rico([B('Software funcionando: '), 'kavi-proyecto-is.vercel.app']))
    a(espacio(80))
    a(tabla(['Entregable', 'Ubicación en el repositorio'], [
        ['Código fuente del sistema', 'src/'],
        ['Esquema de la base de datos y políticas RLS',
         f'supabase/migrations/ ({D.MIGRACIONES} migraciones)'],
        ['Pruebas de las políticas de acceso', 'supabase/tests/rls.sql'],
        ['Pipeline de integración y entrega continuas', '.github/workflows/'],
        ['Reporte de pruebas unitarias y cobertura', 'reports/pruebas/'],
        [f"Listado legible de las {D.PRUEBAS['total']} pruebas",
         'reports/pruebas/Listado de pruebas.md'],
        ['Métricas y hallazgos de SonarQube', 'reports/calidad/'],
        ['Reportes de OWASP ZAP (antes, después y triaje)', 'reports/seguridad/'],
        ['Reglas de triaje del escáner, con su motivo', '.zap/reglas.tsv'],
        ['Medición de rendimiento', 'reports/rendimiento.md'],
        ['Manual de usuario', 'docs/manual-de-usuario.md'],
        ['Manual técnico', 'docs/manual-tecnico.md'],
        ['Guía y guion de ejecución de OWASP ZAP',
         'docs/guia-owasp-zap.md · docs/demo-owasp-zap.md'],
        ['Especificaciones, arquitectura y planificación', 'specs/ · plan.md · tasks.md'],
        ['Este informe y su generador', 'reports/Informe-de-cierre-KAVI.docx · reports/generador/'],
    ], [5, 5]))
    a(espacio())
    a(texto('Plataformas:'))
    a(vineta('Web: desplegada en Vercel, accesible sin instalar nada.'))
    a(vineta('Android: APK instalable generado mediante EAS Build.'))
    a(vineta('iOS: verificada en simulador; distribución pendiente de cuenta de desarrollador '
             '(§3.5).'))
    a(texto('Para probar el sistema sin crear una cuenta ni tocar datos reales, existe un modo de '
            'demostración con datos en memoria y cuentas de ejemplo, documentado en el manual de '
            'usuario.'))

    # ══════════════════ 8. Correspondencia con la rubrica ══════════════════
    a(titulo('8. Correspondencia con los criterios de evaluación'))
    a(texto('Resumen de dónde se encuentra la evidencia de cada criterio.'))
    a(tabla(['Criterio', 'Resultado', 'Evidencia'], [
        ['Módulo funcional', 'Registro y gestión de cuentas, más el sistema completo alrededor',
         '§3.1 · src/'],
        ['Autenticación con JWT',
         'Supabase Auth con tokens firmados, validados en la base de datos', '§3.2'],
        ['Roles administrador y usuario',
         'Rol en la tabla de perfiles, aplicado en la base de datos y protegido contra '
         'auto-ascenso', '§3.2 · supabase/migrations/'],
        ['Cobertura ≥ 80 %',
         f"{D.COB['sentencias']['pct']} de sentencias y {D.COB['lineas']['pct']} de líneas, con "
         'suelo del 80 % en la integración continua', '§3.3 · reports/pruebas/'],
        ['Pipeline CI/CD',
         'Tres flujos en GitHub Actions más despliegue automático en Vercel',
         '§3.4 · .github/workflows/'],
        ['Pruebas de seguridad',
         f'OWASP ZAP: de {D.suma(D.ZAP_ANTES)} hallazgos a {D.suma(D.ZAP_FINAL)}, con corrección y '
         'triaje documentados', '§4.2 · reports/seguridad/'],
        ['Análisis de calidad de código',
         f"SonarQube: deuda técnica {D.SONAR['deuda']}, {D.SONAR['smells']} code smells, "
         f"duplicación {D.SONAR['duplicacion']}", '§4.1 · reports/calidad/'],
        ['Líneas de tiempo planificadas contra reales',
         'Comparación día a día reconstruida de los commits, con las tres desviaciones de '
         'calendario explicadas', '§2.1'],
        ['Comparación de alcance',
         f'{D.TAREAS_HECHAS} de {D.TAREAS_TOTAL} tareas, con las desviaciones y lo que queda '
         'abierto', '§2.2 a §2.4'],
        ['Lecciones aprendidas',
         'Nueve lecciones, cada una con el error concreto que la originó', '§5'],
        ['Plan de mejora continua',
         'Trece acciones con indicador, valor de partida, meta y plazo', '§6.1 y §6.2'],
        ['Propuestas de innovación',
         'Tres propuestas de producto con su criterio de medición, más una habilitadora', '§6.3'],
    ], [2.8, 5.2, 2.4]))
    a(espacio(240))
    a(rico([(f'Las cifras de este informe no se escribieron a mano: se leen del repositorio en '
             f'cada generación —la cobertura de Jest, las métricas de la API de SonarQube, los '
             f'reportes de ZAP, el archivo de tareas y el historial de git— de modo que no pueden '
             f'desviarse de lo que miden las herramientas. Generado el {D.FECHA} sobre '
             f'{D.COMMITS} commits.', {'i': True})]))

    # ══════════════════ Bibliografia ══════════════════
    a(titulo('Bibliografía', salto=True))
    for n, (ref, url) in enumerate(BIBLIOGRAFIA, 1):
        a(fuente_bibliografia(n, ref, url, rid_url.get(url)))


BIBLIOGRAFIA = [
    ('Meta Platforms. (s. f.). Jest: Delightful JavaScript testing.',
     'https://jestjs.io/docs/getting-started'),
    ('SonarSource. (s. f.). Clean Code with SonarQube Cloud.',
     'https://docs.sonarsource.com/sonarqube-cloud/'),
    ('SonarSource. (s. f.). Metric definitions: technical debt, code smells and duplications.',
     'https://docs.sonarsource.com/sonarqube-server/latest/user-guide/code-metrics/metrics-definition/'),
    ('OWASP Foundation. (s. f.). OWASP ZAP: Zed Attack Proxy — Baseline scan.',
     'https://www.zaproxy.org/docs/docker/baseline-scan/'),
    ('OWASP Foundation. (2021). OWASP Top 10: The ten most critical web application security risks.',
     'https://owasp.org/Top10/'),
    ('GitHub. (s. f.). Understanding GitHub Actions.',
     'https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions'),
    ('Supabase. (s. f.). Auth: JSON Web Tokens and Row Level Security.',
     'https://supabase.com/docs/guides/auth/jwts'),
    ('PostgreSQL Global Development Group. (s. f.). Row security policies.',
     'https://www.postgresql.org/docs/current/ddl-rowsecurity.html'),
    ('Expo. (s. f.). EAS Build.', 'https://docs.expo.dev/build/introduction/'),
    ('Mozilla. (s. f.). Content Security Policy (CSP).',
     'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP'),
    ('Fowler, M. (2006). Continuous integration.',
     'https://martinfowler.com/articles/continuousIntegration.html'),
]
