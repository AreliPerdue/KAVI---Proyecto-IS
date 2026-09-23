const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
} = require('docx');
const fs = require('fs');

const ANCHO = 9360;               // Carta (12240) menos 1440 de margen a cada lado
const TINTA = '1A1A1A';
const GRIS = '595959';
const ACENTO = '2F5496';

const p = (texto, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 120, line: 276 },
  alignment: o.align,
  children: [new TextRun({ text: texto, size: o.size ?? 21, color: o.color ?? TINTA, bold: o.bold, italics: o.italics, font: 'Calibri' })],
});

const rico = (partes, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 120, line: 276 },
  children: partes.map((x) => new TextRun({
    text: typeof x === 'string' ? x : x.t,
    bold: typeof x === 'string' ? false : x.b,
    italics: typeof x === 'string' ? false : x.i,
    size: 21, color: TINTA, font: 'Calibri',
  })),
});

const h1 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 180 },
  children: [new TextRun({ text: t, size: 30, bold: true, color: ACENTO, font: 'Calibri' })],
});
const h2 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 280, after: 140 },
  children: [new TextRun({ text: t, size: 24, bold: true, color: TINTA, font: 'Calibri' })],
});

const vinneta = (t) => new Paragraph({
  numbering: { reference: 'vinetas', level: 0 },
  spacing: { after: 80, line: 276 },
  children: [new TextRun({ text: t, size: 21, color: TINTA, font: 'Calibri' })],
});

/** Tabla con anchos en DXA en tabla y celdas, como exige Google Docs. */
function tabla(encabezados, filas, pesos) {
  const total = pesos.reduce((a, b) => a + b, 0);
  const anchos = pesos.map((x) => Math.round((x / total) * ANCHO));
  const celda = (texto, i, { cabecera = false, bold = false } = {}) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA },
    shading: cabecera ? { type: ShadingType.CLEAR, fill: 'EDF1F7' } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      spacing: { after: 0, line: 260 },
      children: [new TextRun({ text: texto, bold: cabecera || bold, size: 20, color: TINTA, font: 'Calibri' })],
    })],
  });
  return new Table({
    width: { size: ANCHO, type: WidthType.DXA },
    columnWidths: anchos,
    rows: [
      new TableRow({ tableHeader: true, children: encabezados.map((t, i) => celda(t, i, { cabecera: true })) }),
      ...filas.map((f) => new TableRow({ children: f.map((t, i) => celda(String(t), i, { bold: i === 0 && f.destacar })) })),
    ],
  });
}

const regla = () => new Paragraph({
  spacing: { before: 200, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D0D7E5' } },
  children: [],
});

const hijos = [];
const add = (...xs) => hijos.push(...xs);

// ─────────────────────────── Portada ───────────────────────────
add(
  new Paragraph({ spacing: { before: 2200, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'KAVI', size: 72, bold: true, color: ACENTO, font: 'Calibri' })] }),
  new Paragraph({ spacing: { after: 700 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Plan more. be more.', size: 24, color: GRIS, italics: true, font: 'Calibri' })] }),
  p('Informe de cierre del proyecto', { size: 34, bold: true, align: AlignmentType.CENTER, after: 160 }),
  p('Planificación contra ejecución · Lecciones aprendidas · Plan de mejora continua',
    { size: 22, color: GRIS, align: AlignmentType.CENTER, after: 900 }),
  p('Ingeniería y Desarrollo de Software', { size: 22, align: AlignmentType.CENTER, after: 60 }),
  p('Universidad Tecmilenio', { size: 22, color: GRIS, align: AlignmentType.CENTER, after: 500 }),
  p('Areli Perdue', { size: 24, bold: true, align: AlignmentType.CENTER, after: 60 }),
  p('23 de septiembre de 2026', { size: 21, color: GRIS, align: AlignmentType.CENTER, after: 500 }),
  p('github.com/AreliPerdue/KAVI---Proyecto-IS', { size: 20, color: ACENTO, align: AlignmentType.CENTER }),
  new Paragraph({ pageBreakBefore: true, children: [] }),
);

// ─────────────────────── 1. Resumen ───────────────────────
add(
  h1('1. Resumen ejecutivo'),
  p('KAVI es una aplicación multiplataforma de planificación personal —iOS, Android y navegador— organizada alrededor del calendario. Las actividades se clasifican con temas ligados a las siete dimensiones del bienestar, se comparten con contactos bajo tres niveles de privacidad, y las de gimnasio abren un registro de entrenamientos.'),
  p('El proyecto se desarrolló entre el 1 y el 23 de septiembre de 2026, en 142 commits, siguiendo un enfoque dirigido por especificaciones: cada funcionalidad se describió antes de implementarse, y el código se contrastó contra esa descripción.'),
  p('Estado al cierre:', { bold: true, after: 100 }),
  tabla(
    ['Indicador', 'Resultado'],
    [
      ['Tareas completadas', '147 de 150 (98 %)'],
      ['Pruebas automáticas', '1 564, todas en verde'],
      ['Cobertura de código', '84.0 % sentencias · 85.4 % líneas'],
      ['Deuda técnica (SonarQube)', '0 minutos'],
      ['Bugs · vulnerabilidades · code smells', '0 · 0 · 0'],
      ['Duplicación de código', '0.5 %'],
      ['Hallazgos de seguridad de riesgo alto', '0 (6 en total, todos revisados)'],
      ['Plataformas operativas', 'Web y Android en producción; iOS verificado en simulador'],
    ], [5, 5],
  ),
  p('', { after: 200 }),
  p('Las tres fases exigidas se completaron: implementación con autenticación y roles, pruebas y análisis de calidad y seguridad, y este cierre.'),
);

// ─────────────── 2. Planificado vs ejecutado ───────────────
add(
  regla(), h1('2. Comparación entre lo planificado y lo ejecutado'),
  p('La planificación se estructuró en nueve fases, registradas en el archivo de tareas del repositorio. A continuación, cada fase con su resultado real.'),
  h2('2.1 Resultado por fase'),
  tabla(
    ['Fase', 'Planificado', 'Ejecutado'],
    [
      ['0 · Preparación', 'Proyecto Expo, TypeScript estricto, enrutado, sistema de diseño', 'Completa'],
      ['1 · Autenticación', 'Alta, sesión, recuperación de contraseña', 'Completa, con un cambio de alcance (§2.2)'],
      ['2 · Calendario', 'Vistas de mes, semana y día; crear y editar', 'Completa'],
      ['3 · Temas y recurrencia', 'Siete dimensiones, temas propios, filtros, repeticiones', 'Completa'],
      ['4 · Recordatorios', 'Avisos con antelación configurable', 'Completa, con una desviación (§2.2)'],
      ['5 · Compartido', 'Contactos, tres niveles de visibilidad, invitaciones', 'Completa'],
      ['6 · Gimnasio', 'Registro de entrenamientos y ejercicios', 'Completa'],
      ['7 · Requisitos no funcionales', 'Rendimiento, accesibilidad, estados de error', 'Completa'],
      ['8 · Backend real', 'Supabase, RLS, despliegue', 'Completa en web y Android; iOS pendiente de distribución'],
    ], [2, 5, 4],
  ),
  p('', { after: 200 }),
  h2('2.2 Desviaciones respecto a lo planificado'),
  p('Cuatro desviaciones merecen explicación, porque ninguna fue un simple retraso: todas obligaron a cambiar una decisión de diseño.', { after: 160 }),

  rico([{ t: 'Alta de usuario por pasos en lugar de formulario único. ', b: true },
    'Se planificó un formulario con todos los campos. Al implementar la verificación por código de correo apareció un problema no previsto: verificar el código ya abre sesión en el proveedor de autenticación, de modo que una persona podía quedar dentro de la aplicación sin haber fijado contraseña. Se rediseñó como un flujo por pasos con un estado de «alta pendiente» que retiene a la persona en el último paso hasta completarlo. Coste: alrededor de un día. Beneficio: se cerró un agujero funcional real.']),

  rico([{ t: 'Notificaciones del sistema desactivadas. ', b: true },
    'Se planificaron notificaciones locales programadas. La biblioteca de notificaciones resultó incompatible con la versión del SDK utilizada y fallaba al ejecutar en Android. En lugar de degradar el SDK de toda la aplicación, se desactivó la funcionalidad tras una interfaz estable y se implementó un aviso dentro de la propia aplicación para la versión web. Los recordatorios se configuran y almacenan; lo que no se emite es la notificación del sistema operativo.']),

  rico([{ t: 'Recurrencia materializada en el cliente. ', b: true },
    'El plan original contemplaba expandir las series recurrentes en la base de datos mediante funciones almacenadas. Se cambió a materializarlas desde el cliente al crear la actividad. El motivo fue de complejidad: distinguir entre «editar solo esta ocurrencia» y «editar toda la serie» resultaba considerablemente más difícil de razonar y de probar dentro de la base de datos.']),

  rico([{ t: 'Fase adicional no planificada. ', b: true },
    'Se añadió una fase 7b de rediseño de la experiencia del calendario y adaptación a pantallas grandes, surgida de probar la aplicación en uso real. No estaba en el plan inicial y representa, aproximadamente, dos días de trabajo no previsto.']),

  h2('2.3 Lo que queda abierto'),
  p('Tres tareas de 150 permanecen sin cerrar. Se documentan por transparencia; ninguna bloquea el funcionamiento del sistema.', { after: 160 }),
  tabla(
    ['Pendiente', 'Motivo'],
    [
      ['Notificación del sistema verificada en dispositivo', 'Requiere instalar una compilación nueva; el código está y funciona en la aplicación'],
      ['Matriz de pruebas manuales por funcionalidad', 'Las pruebas automáticas cubren la lógica; falta el recorrido manual en las tres plataformas'],
      ['Hito final de la versión candidata', 'Fijado al 26 de septiembre de 2026, posterior a este informe'],
    ], [4, 6],
  ),
  p('', { after: 120 }),
  p('Aparte de estas, la distribución de iOS sigue bloqueada por un motivo administrativo y no de desarrollo (§3.4).'),
);

// ─────────────── 3. Implementación y seguridad ───────────────
add(
  regla(), h1('3. Implementación y seguridad'),
  h2('3.1 Autenticación con JWT y roles'),
  p('La autenticación se apoya en Supabase Auth, que emite tokens JWT firmados. Cada petición a la base de datos los transporta y PostgreSQL los valida antes de decidir qué filas devuelve.'),
  p('Se implementaron dos roles, administrador y usuario, almacenados en la tabla de perfiles. La distinción es relevante por dónde se aplica:'),
  vinneta('El panel de administración se oculta a las cuentas sin el rol, pero ocultarlo no es el control de acceso.'),
  vinneta('El control real está en la base de datos: las funciones del panel comprueban el rol antes de devolver nada. Una petición manipulada desde el cliente no obtiene datos.'),
  vinneta('El panel solo expone cifras agregadas —número de cuentas, de actividades, de conexiones—, nunca el contenido de la agenda de ninguna persona.'),
  p('Toda tabla incorpora políticas de seguridad a nivel de fila (Row Level Security) desde su creación. Son 20 migraciones versionadas en el repositorio, cada una con sus políticas.', { after: 160 }),

  h2('3.2 Cobertura de pruebas'),
  p('El requisito era una cobertura igual o superior al 80 %. El resultado:'),
  tabla(
    ['Métrica', 'Cobertura', 'Detalle'],
    [
      ['Sentencias', '84.0 %', '3 266 de 3 888'],
      ['Líneas', '85.4 %', '2 793 de 3 270'],
      ['Ramas', '78.4 %', '2 227 de 2 840'],
      ['Funciones', '78.9 %', '1 079 de 1 367'],
    ], [4, 3, 3],
  ),
  p('', { after: 160 }),
  p('Son 1 564 pruebas en 92 archivos, ejecutadas con Jest en unos 27 segundos. SonarQube publica una cifra distinta, 82.9 %, porque combina líneas y condiciones en un solo número; ambas superan el umbral.'),
  p('Las pruebas no verifican que el código haga lo que hace, sino las reglas que no se ven leyéndolo: que quien comparte su calendario en modo «solo ocupación» ceda sus horas pero nunca sus títulos; que eliminar un contacto revoque en cascada todo lo compartido; que editar una actividad recurrente distinga entre una ocurrencia y la serie completa.'),
  rico([{ t: 'Escribirlas destapó dos defectos reales. ', b: true },
    'El primero: dos pantallas se quedaban completamente en blanco si fallaba la carga de contactos, sin mensaje ni forma de reintentar, indistinguibles de no tener ningún contacto. El segundo: ciertos errores de red no se reconocían como tales y caían en un mensaje genérico. Ambos están corregidos y tienen su propia prueba.'], { after: 160 }),

  h2('3.3 Pipeline de integración y entrega continuas'),
  p('Tres flujos de trabajo en GitHub Actions:'),
  tabla(
    ['Flujo', 'Cuándo se ejecuta', 'Qué hace'],
    [
      ['Pruebas', 'Cada push, cada pull request, y a demanda', 'Tipos, 1 564 pruebas, lint y análisis de SonarQube'],
      ['Build de producción', 'A demanda', 'Genera el APK instalable de Android mediante EAS'],
      ['Escaneo de seguridad', 'A demanda', 'Análisis pasivo con OWASP ZAP del sitio desplegado'],
    ], [2, 3, 5],
  ),
  p('', { after: 160 }),
  p('El despliegue web es automático: cada cambio integrado en la rama principal publica una versión nueva en Vercel.'),
  p('Dos decisiones de diseño del pipeline merecen mención. Primera: los pasos de tipos, pruebas y lint continúan aunque uno falle, de modo que una sola ejecución muestre todos los problemas a la vez en lugar de obligar a descubrirlos de uno en uno. Segunda: el resultado se publica en la propia página de la ejecución —cuántas pruebas pasaron, cuáles fallaron y con qué error— sin necesidad de abrir los registros.'),
  p('La cobertura tiene un suelo del 80 % configurado: si un cambio la baja de ahí, la integración falla en lugar de pasar inadvertida.', { after: 160 }),

  h2('3.4 Sobre la plataforma iOS'),
  p('Conviene ser preciso, porque se presta a malentendidos. La aplicación de iOS está desarrollada y verificada en el simulador, donde se comporta igual que en Android y en web: mismo código, mismas pantallas, mismos datos. No hay funcionalidad pendiente de implementar en esa plataforma.'),
  p('Lo que falta es la cuenta de Apple Developer. Sin ella Apple no emite los certificados de firma, y sin firma no es posible instalar la aplicación en un dispositivo físico, distribuirla para pruebas ni publicarla. Es una limitación administrativa, no un entregable incompleto: con la cuenta adquirida, la compilación se genera con el mismo pipeline que ya produce el APK de Android, sin escribir código.'),
);

// ─────────────── 4. Pruebas y calidad ───────────────
add(
  regla(), h1('4. Pruebas y calidad'),
  h2('4.1 Análisis estático con SonarQube'),
  p('El análisis se ejecuta en cada integración y consume la cobertura de Jest. Resultados sobre 12 505 líneas de código:'),
  tabla(
    ['Métrica', 'Valor'],
    [
      ['Deuda técnica', '0 minutos'],
      ['Code smells', '0'],
      ['Bugs', '0'],
      ['Vulnerabilidades', '0'],
      ['Duplicación de código', '0.5 %'],
      ['Cobertura', '82.9 %'],
      ['Complejidad ciclomática', '2 828'],
      ['Complejidad cognitiva', '1 494'],
      ['Calificaciones', 'Fiabilidad A · Seguridad A · Mantenibilidad A'],
      ['Puerta de calidad', 'Superada'],
    ], [5, 5],
  ),
  p('', { after: 160 }),
  p('Las cifras en cero no son el punto de partida. El primer análisis devolvió 15 hallazgos, y corregirlos reveló defectos reales:'),
  vinneta('Dos ordenaciones sin función de comparación. El orden por defecto de JavaScript es alfabético, de modo que [0, 2, 10] se ordena como [0, 10, 2]. Con días de la semana no fallaba, pero se rompía ante cualquier ampliación del rango.'),
  vinneta('Un bucle que reasignaba su propia variable de avance dentro del cuerpo, reescrito de forma que expresara lo que realmente hacía.'),
  vinneta('Un condicional que devolvía el mismo valor en ambas ramas, resto de un trabajo a medias que desactivaba un indicador visual de foco.'),
  p('En un punto se tomó una decisión contraria a lo que sugería la herramienta. SonarQube proponía usar comparación sensible al idioma para ordenar unos identificadores; se descartó porque esos identificadores forman parte de una clave de caché y una comparación dependiente del idioma del dispositivo la haría inestable entre usuarios. Se optó por un orden fijo, documentado en el código.'),
  rico([{ t: 'Un hallazgo del propio panel. ', b: true },
    'SonarQube llegó a reportar 329 bugs y 25.9 % de duplicación. Ninguna cifra era real: el análisis automático de la plataforma ignora las exclusiones configuradas y estaba midiendo código generado —compilaciones nativas y el empaquetado web— en lugar del código fuente. Desactivarlo devolvió las cifras reales. Es un recordatorio de que una métrica sin verificar puede ser peor que ninguna métrica.'], { after: 160 }),

  h2('4.2 Análisis dinámico con OWASP ZAP'),
  p('Se escaneó el sitio desplegado, se corrigieron los hallazgos y se volvió a escanear. Ambos reportes están versionados en el repositorio.'),
  tabla(
    ['Riesgo', 'Antes', 'Después', 'Tras el triaje'],
    [['Alto', '0', '0', '0'], ['Medio', '3', '1', '1'], ['Bajo', '6', '2', '1'], ['Informativo', '9', '9', '4'], ['Total', '18', '12', '6']],
    [3, 2, 2, 3],
  ),
  p('', { after: 160 }),
  p('Los tres hallazgos de riesgo medio eran cabeceras de respuesta HTTP ausentes, corregidas en la configuración del despliegue sin tocar el código de la aplicación: falta de política de seguridad de contenido, falta de protección contra incrustación en marcos ajenos y una política de origen cruzado más permisiva de lo necesario. Se cerraron además cuatro hallazgos de riesgo bajo.'),
  rico([{ t: 'Sobre inyección SQL y XSS. ', b: true },
    'El escaneo se ejecutó en modo pasivo de forma deliberada: el modo activo envía ataques de inyección reales y el despliegue está conectado a la base de datos de producción. Que no aparezca inyección SQL no es, por tanto, resultado de haberla probado activamente. El argumento es estructural: el acceso a datos se realiza mediante consultas parametrizadas sobre una capa que no construye SQL por concatenación, y bajo políticas de seguridad a nivel de fila. Frente a XSS, la política de seguridad de contenido implantada autoriza el único script en línea mediante su huella criptográfica, de modo que ningún script inyectado en el documento podría ejecutarse.']),
  rico([{ t: 'El hallazgo que permanece. ', b: true },
    'Es de riesgo medio y se mantiene a conciencia: la política de estilos permite estilos en línea. React Native Web inyecta sus hojas de estilo en tiempo de ejecución y un alojamiento estático no puede emitir un identificador único por petición. Se comprobó retirándolo: la aplicación queda completamente sin estilos, y la evidencia gráfica está en el repositorio. El riesgo es acotado, pues permite estilos inyectados pero no ejecución de código; la defensa frente a XSS descansa en la política de scripts, que sí es estricta.']),
  p('Los hallazgos restantes de riesgo bajo e informativo son falsos positivos originados en dependencias de terceros: secuencias numéricas dentro del código empaquetado que un detector interpreta como marcas de tiempo, y comentarios del código empaquetado que un detector marca como sospechosos.'),
  rico([{ t: 'Triaje final. ', b: true },
    'Los seis hallazgos que permanecen están revisados uno a uno, y cada decisión lleva escrito su motivo junto a la regla que la aplica. Silenciar un aviso sin dejar constancia del porqué es, a efectos prácticos, indistinguible de esconderlo: quien lea el archivo dentro de seis meses no podrá saber si se estudió o si se acalló. El hallazgo de riesgo medio se mantiene deliberadamente en estado de aviso —no silenciado— para que siga apareciendo en cada informe mientras la limitación técnica que lo causa siga vigente.']),
);

// ─────────────── 5. Lecciones aprendidas ───────────────
add(
  regla(), h1('5. Lecciones aprendidas'),
  p('Se recogen las que cambiaron una decisión, no las que confirman lo esperado.', { after: 160 }),

  h2('5.1 Una métrica sin verificar es peor que ninguna métrica'),
  p('El panel de calidad reportó durante días 329 bugs y 25.9 % de duplicación. Las cifras eran falsas: la herramienta medía código generado automáticamente. De haberlas dado por buenas, se habría invertido tiempo en «corregir» archivos que nadie escribió. La lección no es desconfiar de las herramientas, sino comprobar qué están midiendo antes de actuar sobre lo que dicen.'),
  p('Ocurrió lo mismo, en menor escala, con la puerta de calidad: marcaba fallo por cobertura insuficiente en el código nuevo, y la causa real era una regla de configuración que clasificaba los ayudantes de prueba como código de producción.'),

  h2('5.2 Las pruebas encuentran lo que la revisión manual no ve'),
  p('Los dos defectos reales aparecidos durante esta fase no eran errores de lógica visibles leyendo el código, sino ausencias: una pantalla que no contemplaba el caso de fallo de red y quedaba en blanco. Nadie lo detecta leyendo, porque no hay nada que leer. Se detecta al preguntarse, prueba por prueba, qué debería ocurrir en cada situación.'),

  h2('5.3 Verificar en el entorno real, no en el que se supone'),
  p('Una compilación de producción salió durante días en modo demostración sin que nada lo advirtiera: faltaba una clave de configuración que vincula el perfil de compilación con sus variables de entorno. El diagnóstico inicial fue erróneo y se corrigió solo al inspeccionar el paquete generado. La conclusión es que un artefacto de producción debe verificarse examinándolo, no asumiendo que la configuración se aplicó.'),
  p('El mismo principio se aplicó después al cambiar las cabeceras de seguridad: antes de desplegarlas se sirvió la compilación en local con esas mismas cabeceras leídas del archivo de configuración, y se comprobó con un navegador que la aplicación seguía funcionando. Una política mal formada puede dejar una aplicación inservible sin producir ningún error visible.'),

  h2('5.4 Medir antes que deducir'),
  p('El fallo que más tiempo consumió en todo el proyecto fue un modo claro que, en el emulador de Expo Go sobre Android, mostraba la interfaz a medias: las imágenes cambiaban al juego claro y los fondos seguían oscuros. Se formularon y descartaron tres explicaciones sucesivas —una caché de imágenes, un compilador que memoiza de más, una barra de pestañas nativa que no propaga el repintado— y cada una consumió trabajo antes de descartarse.'),
  p('La causa real apareció al instrumentar la aplicación para que registrase, en cada render, qué color estaba pidiendo. El registro mostró que pedía exactamente los colores claros correctos. Es decir: el programa funcionaba y era el sistema operativo quien lo alteraba. Android aplica una inversión automática de colores a las aplicaciones que no declaran soportar tema oscuro, y dentro de un contenedor de desarrollo se hereda la configuración de ese contenedor, no la de la aplicación propia. En una compilación firmada el problema no existe, lo que se verificó generando el proyecto nativo y leyendo el tema declarado.'),
  p('La lección no es sobre temas de color. Es que tres hipótesis razonables, encadenadas, costaron más que la media hora de instrumentar y leer un valor. Ante un comportamiento que contradice lo que el código dice hacer, medir primero y deducir después; y ante una diferencia entre plataformas, sospechar del entorno antes que del programa.'),

  h2('5.5 La configuración por defecto rara vez es la adecuada'),
  p('Las incidencias que más tiempo consumieron no fueron de programación, sino de configuración: un perfil de compilación al que le faltaba una clave, un análisis automático que ignoraba las exclusiones, una regla que clasificaba mal los archivos de prueba, un enlace de proyecto ausente en la herramienta de base de datos. Todas se comportaban silenciosamente: no fallaban, producían resultados incorrectos.'),

  h2('5.6 Documentar la decisión, no solo el resultado'),
  p('Varias decisiones de este proyecto resultan incomprensibles sin su motivo: por qué se conserva un hallazgo de seguridad de riesgo medio, por qué el estilo de un tema se copia a la actividad en lugar de referenciarse, por qué la recurrencia se materializa en el cliente. Registrar el razonamiento —y no únicamente la conclusión— es lo que permite que una decisión se revise con criterio en lugar de revertirse por desconocimiento.'),
);

// ─────────────── 6. Plan de mejora ───────────────
add(
  regla(), h1('6. Plan de mejora continua'),
  p('Las propuestas se ordenan por la relación entre el beneficio esperado y el esfuerzo requerido.', { after: 160 }),

  h2('6.1 Corto plazo (1 a 2 semanas)'),
  tabla(
    ['Acción', 'Por qué', 'Esfuerzo'],
    [
      ['Distribución de iOS', 'La aplicación está lista; falta la cuenta de Apple Developer. Desbloquea una de las tres plataformas', 'Bajo (administrativo)'],
      ['Vincular el reporte de pruebas al despliegue', 'Hoy el sitio puede publicarse con pruebas en rojo sin que nada lo advierta', 'Bajo'],
      ['Restaurar las notificaciones del sistema', 'Los recordatorios se guardan pero no se emiten. Requiere reevaluar la compatibilidad de la biblioteca', 'Medio'],
      ['Automatizar las pruebas de las políticas RLS', 'Son el control de acceso real del sistema y hoy se verifican a mano', 'Medio'],
    ], [3, 5, 2],
  ),
  p('', { after: 160 }),

  h2('6.2 Medio plazo (1 a 3 meses)'),
  tabla(
    ['Acción', 'Por qué', 'Esfuerzo'],
    [
      ['Pruebas de extremo a extremo', 'Las actuales verifican piezas aisladas. Un recorrido completo detectaría fallos de integración', 'Alto'],
      ['Escaneo activo sobre entorno de pruebas', 'Permitiría verificar inyección SQL y XSS de forma activa, hoy descartado por apuntar a producción', 'Medio'],
      ['Análisis de dependencias', 'El código propio está limpio; las dependencias no se auditan de forma automática', 'Bajo'],
      ['Medición de rendimiento percibido', 'Existen objetivos definidos pero no se miden de forma continua', 'Medio'],
    ], [3, 5, 2],
  ),
  p('', { after: 160 }),

  h2('6.3 Largo plazo (3 meses en adelante)'),
  p('Tres líneas que aprovechan el valor que ya acumula el sistema:'),
  rico([{ t: 'Sugerencias basadas en el historial. ', b: true },
    'La aplicación clasifica cada actividad por dimensión del bienestar. Con varios meses de historial es posible detectar desequilibrios —semanas sin ninguna actividad de una dimensión— y sugerir huecos concretos donde encajarlas, empleando el mismo cálculo de disponibilidad que ya existe. No requiere aprendizaje automático: reglas sobre datos propios.']),
  rico([{ t: 'Rutinas de entrenamiento recurrentes. ', b: true },
    'El registro de gimnasio ya propone el nombre de la sesión anterior. El siguiente paso natural es guardar rutinas completas y proponer progresión de cargas a partir del historial.']),
  rico([{ t: 'Sincronización con calendarios externos. ', b: true },
    'Importar en modo lectura desde otros calendarios evitaría la duplicación de esfuerzo, que es hoy la principal barrera de adopción de cualquier planificador.']),

  h2('6.4 Mejoras del proceso'),
  p('Independientes del producto, derivadas de las lecciones del apartado anterior:'),
  vinneta('Verificar cada artefacto de producción examinándolo, no asumiendo que la configuración se aplicó.'),
  vinneta('Comprobar qué mide cada herramienta antes de actuar sobre sus cifras.'),
  vinneta('Registrar el motivo de toda decisión que contradiga lo obvio, junto al código que la implementa.'),
  vinneta('Ante un comportamiento que contradice el código, instrumentar y medir antes de encadenar hipótesis.'),
  vinneta('Mantener el suelo de cobertura y elevarlo de forma gradual conforme se estabilicen las áreas nuevas.'),
);

// ─────────────── 7. Entregables ───────────────
add(
  regla(), h1('7. Entregables'),
  p('Repositorio: github.com/AreliPerdue/KAVI---Proyecto-IS', { bold: true, after: 160 }),
  tabla(
    ['Entregable', 'Ubicación'],
    [
      ['Código fuente del sistema', 'src/ · supabase/migrations/'],
      ['Pipeline de integración y entrega continuas', '.github/workflows/'],
      ['Reporte de pruebas unitarias y cobertura', 'reports/pruebas/'],
      ['Listado legible de las 1 564 pruebas', 'reports/pruebas/Listado de pruebas.md'],
      ['Métricas de SonarQube', 'reports/calidad/'],
      ['Reportes de OWASP ZAP (antes y después)', 'reports/seguridad/'],
      ['Manual de usuario', 'docs/manual-de-usuario.md'],
      ['Manual técnico', 'docs/manual-tecnico.md'],
      ['Guía de ejecución de OWASP ZAP', 'docs/guia-owasp-zap.md'],
      ['Especificaciones y planificación', 'specs/ · plan.md · tasks.md'],
    ], [5, 5],
  ),
  p('', { after: 200 }),
  p('Software funcionando:', { bold: true, after: 80 }),
  vinneta('Web: kavi-proyecto-is.vercel.app'),
  vinneta('Android: APK instalable generado mediante EAS Build'),
  vinneta('iOS: verificado en simulador; distribución pendiente de cuenta de desarrollador (§3.4)'),
  p('', { after: 200 }),
  p('Los reportes de este informe no se redactaron a mano: se generan desde el repositorio ejecutando las herramientas, de modo que las cifras citadas son reproducibles.', { italics: true, color: GRIS }),
);

const doc = new Document({
  numbering: {
    config: [{
      reference: 'vinetas',
      levels: [{ level: 0, format: 'bullet', text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 420, hanging: 220 } } } }],
    }],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: hijos,
  }],
});

Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(process.argv[2], b);
  console.log('generado:', process.argv[2], Math.round(b.length / 1024) + ' KB');
});
