const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = require('docx');
const fs = require('fs');

const TINTA = '1A1A1A', GRIS = '5A5A5A', ACENTO = '2F5496';
const hijos = [];
const add = (...x) => hijos.push(...x);

/** Texto que se lee en voz alta: cuerpo grande y bien espaciado. */
const lee = (t) => new Paragraph({
  spacing: { after: 160, line: 340 },
  children: [new TextRun({ text: t, size: 25, color: TINTA, font: 'Calibri' })],
});
/** Indicación de escena: qué hacer, no qué decir. */
const haz = (t) => new Paragraph({
  spacing: { before: 120, after: 140, line: 300 },
  indent: { left: 240 },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'C9D4E6', space: 12 } },
  children: [new TextRun({ text: t, size: 20, color: ACENTO, italics: true, font: 'Calibri' })],
});
const bloque = (n, titulo, minutos) => new Paragraph({
  spacing: { before: 420, after: 100 },
  children: [
    new TextRun({ text: `BLOQUE ${n} · ${titulo}`, size: 30, bold: true, color: ACENTO, font: 'Calibri' }),
    new TextRun({ text: `   ${minutos}`, size: 22, color: GRIS, font: 'Calibri' }),
  ],
});
const sub = (t) => new Paragraph({
  spacing: { before: 220, after: 100 },
  children: [new TextRun({ text: t, size: 24, bold: true, color: TINTA, font: 'Calibri' })],
});
const nota = (t) => new Paragraph({
  spacing: { after: 120, line: 300 },
  children: [new TextRun({ text: t, size: 20, color: GRIS, font: 'Calibri' })],
});
const regla = () => new Paragraph({ spacing: { before: 200, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D0D7E5' } }, children: [] });

// ═══════════ Portada ═══════════
add(
  new Paragraph({ spacing: { before: 600, after: 80 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'KAVI', size: 56, bold: true, color: ACENTO, font: 'Calibri' })] }),
  new Paragraph({ spacing: { after: 400 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Guion de la presentación individual · 15 minutos', size: 28, color: GRIS, font: 'Calibri' })] }),
  new Paragraph({ spacing: { after: 260 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Areli Perdue · Universidad Tecmilenio', size: 22, color: TINTA, font: 'Calibri' })] }),
  regla(),
  sub('Cómo usar este guion'),
  nota('El texto grande en negro es lo que dices. Los recuadros azules en cursiva son lo que haces: cambiar de diapositiva, señalar algo en pantalla o cambiar de ventana. No leas los recuadros. Son 23 diapositivas y cada recuadro te dice a cuál pasar.'),
  nota('El texto hablado son 13 minutos y 40 segundos leyendo a ritmo normal. El resto, hasta los 15, es el margen para las pausas, los cambios de diapositiva y lo que muestres en vivo. No intentes llenar los 15 minutos hablando: si vas sobrado de tiempo, enseña la aplicación funcionando.'),
  nota('La rúbrica lista seis bloques que suman diecisiete minutos, pero el límite son quince. Este guion reparte los quince reales: el bloque 2 y el 5 van algo más cortos que en la tabla, porque son los que menos se penalizan si se resumen.'),
  regla(),
);

// ═══════════ Bloque 0 ═══════════
add(
  bloque(0, 'Presentación del sistema', '1:25 de texto · 2 min con la demo'),
  haz('DIAPOSITIVA 1 — portada.'),
  lee('Buenos días. Soy Areli Perdue y les voy a presentar KAVI, mi proyecto final de Ingeniería de Software.'),
  lee('KAVI es una aplicación de planificación personal para iOS, Android y navegador, con un solo código para las tres. Pero la diferencia con cualquier otro calendario no está en la tecnología, está en la pregunta que responde.'),
  lee('Un calendario normal te dice qué tienes que hacer. KAVI te dice en qué estás invirtiendo tu vida.'),
  haz('DIAPOSITIVA 2 — «Un calendario te dice qué tienes que hacer».'),
  lee('Cada actividad se clasifica con un tema ligado a una de las siete dimensiones del bienestar: física, emocional, social, intelectual, espiritual, financiera y ocupacional. Por eso la aplicación entera es monocroma y el único color que ven es el de los datos: el calendario se lee como un mapa de en qué gastas tu tiempo.'),
  haz('DIAPOSITIVA 3 — las siete dimensiones. Luego la 4, con el calendario compartido: señala los bloques rojos que dicen «Ocupado».'),
  lee('Lo segundo es compartir sin exponerte. Hay tres niveles: no compartir nada, compartir solo tu disponibilidad, o compartir con detalles. En esta pantalla estoy viendo mi calendario con dos contactos superpuestos. Cada persona tiene su color. Y fíjense en las actividades rojas: dicen «Ocupado», sin título, porque Ana me comparte solo su disponibilidad. Yo sé cuándo está libre, pero no qué hace.'),
  lee('Y lo tercero: las actividades marcadas como gimnasio abren un registro de entrenamientos, con ejercicios, series y repeticiones.'),
  nota('(Se puede recortar: la frase del gimnasio.)'),
);

// ═══════════ Bloque 1 ═══════════
add(
  bloque(1, 'Módulo desarrollado y seguridad', '2:50 de texto · 3 min'),
  haz('DIAPOSITIVA 5 — «Verificar el código ya abre sesión».'),
  lee('El módulo que desarrollé es el de cuenta y acceso: alta, sesión persistente y recuperación de contraseña.'),
  lee('Y quiero contarles algo que no estaba planificado, porque es lo que más aprendí. Yo había diseñado un formulario único con todos los campos. Al implementar la verificación por código de correo apareció un problema que no había previsto: verificar el código ya abre sesión en el proveedor de autenticación. Es decir, una persona podía quedar dentro de la aplicación sin haber puesto nunca una contraseña.'),
  lee('No era un error de programación. Era un agujero en el diseño. Lo rediseñé como un flujo por pasos, con un estado de «alta pendiente» que retiene a la persona en el último paso hasta que la completa. Me costó un día y cerró un problema real.'),
  haz('DIAPOSITIVA 6 — autenticación con JWT y roles.'),
  lee('Sobre la autenticación: uso Supabase Auth, que emite un token JWT firmado en cada sesión. Cada petición a la base de datos lo transporta, y PostgreSQL lo valida antes de decidir qué filas devuelve.'),
  lee('Hay dos roles, administrador y usuario, guardados en la tabla de perfiles. Y aquí está la parte que me importa que quede clara.'),
  haz('Señala la tarjeta negra de abajo.'),
  lee('Ocultar el panel de administración no es el control de acceso. Ocultarlo es cosmética. El control real está en la base de datos: cada tabla lleva políticas de seguridad a nivel de fila desde el momento en que se crea, y las funciones del panel comprueban el rol antes de devolver nada. Si alguien manipula la petición desde el navegador, no obtiene datos. Son veinte migraciones versionadas, cada una con sus políticas.'),
  haz('DIAPOSITIVA 7 — el 84 % en grande.'),
  lee('El requisito era ochenta por ciento de cobertura de pruebas. Estoy en ochenta y cuatro por ciento de sentencias y ochenta y cinco coma cuatro de líneas. Son mil quinientas sesenta y cuatro pruebas en noventa y dos archivos, y corren enteras en veintisiete segundos.'),
  haz('DIAPOSITIVA 8 — el reporte de cobertura. Luego la 9.'),
  lee('Pero el número no es lo interesante. Lo interesante es que escribirlas destapó dos defectos reales que llevaban ahí desde el principio. Dos pantallas se quedaban completamente en blanco si fallaba la conexión: sin mensaje, sin explicación y sin forma de reintentar, exactamente igual que si de verdad no tuvieras ningún contacto.'),
  lee('Y quiero subrayar por qué no los había visto antes. No eran errores de lógica que se detecten leyendo el código. Eran ausencias. Nadie detecta leyendo una pantalla que no contempla el fallo de red, porque no hay nada que leer. Se detecta al preguntarse, prueba por prueba, qué debería pasar en cada situación.'),
);

// ═══════════ Bloque 2 ═══════════
add(
  bloque(2, 'Pipeline CI/CD', '1:30 de texto · 2:30 con Actions en vivo'),
  haz('DIAPOSITIVA 10 — los tres flujos. Y la 11 con las ejecuciones en verde: si hay internet, abre Actions en el navegador.'),
  lee('Tengo tres flujos configurados en GitHub Actions.'),
  lee('El primero, «Pruebas», corre en cada push y en cada pull request: verifica tipos, ejecuta las mil quinientas sesenta y cuatro pruebas, pasa el lint y envía el análisis a SonarQube.'),
  lee('El segundo genera el APK instalable de Android con EAS Build. El tercero es el escaneo de seguridad con OWASP ZAP. Esos dos van a demanda, porque uno gasta créditos de compilación y el otro tarda varios minutos.'),
  lee('El despliegue web es automático: cada cambio que entra a la rama principal publica una versión nueva en Vercel.'),
  haz('Señala las dos tarjetas de abajo.'),
  lee('Hay dos decisiones del pipeline que quiero explicar, porque no son las que vienen por defecto.'),
  lee('La primera: los pasos de tipos, pruebas y lint continúan aunque uno falle. Lo normal es que el pipeline se detenga en el primer error. Yo prefiero que una sola ejecución me enseñe todos los problemas de golpe, en vez de obligarme a descubrirlos de uno en uno, arreglar, volver a subir y esperar otra vez.'),
  lee('La segunda: el resultado se publica en la propia página de la ejecución. Cuántas pruebas pasaron, cuáles fallaron y con qué error, sin tener que abrir los registros.'),
  lee('Y la cobertura tiene un suelo del ochenta por ciento configurado: si un cambio la baja de ahí, la integración falla en lugar de pasar inadvertida.'),
);

// ═══════════ Bloque 3 ═══════════
add(
  bloque(3, 'Pruebas de seguridad y calidad de código', '3:05 de texto · 3 min'),
  haz('DIAPOSITIVA 12 — las seis cifras. Y la 13 con el panel: si hay internet, ábrelo en vivo.'),
  lee('Empiezo por SonarQube. Sobre doce mil quinientas líneas de código: cero minutos de deuda técnica, cero bugs, cero vulnerabilidades, cero code smells, cero coma cinco por ciento de duplicación, y calificación A en fiabilidad, seguridad y mantenibilidad. La puerta de calidad está superada.'),
  haz('DIAPOSITIVA 14 — los quince hallazgos.'),
  lee('Esos ceros no son el punto de partida. El primer análisis me devolvió quince hallazgos, y corregirlos reveló defectos reales. El más claro: dos ordenaciones sin función de comparación. En JavaScript, ordenar por defecto es alfabético, así que cero, dos, diez se ordena como cero, diez, dos. Con días de la semana no fallaba, pero se habría roto en cuanto ampliara el rango.'),
  nota('(Se puede recortar: el ejemplo de la ordenación.)'),
  haz('DIAPOSITIVA 15 — la progresión 18 → 12 → 6.'),
  lee('En seguridad usé OWASP ZAP contra el sitio desplegado. Escaneé, corregí y volví a escanear. Empecé con dieciocho hallazgos, bajé a doce corrigiendo, y después de revisarlos uno a uno quedan seis. Ninguno de riesgo alto, en ningún momento.'),
  lee('Los tres de riesgo medio eran cabeceras HTTP que faltaban: la política de seguridad de contenido, la protección contra que te incrusten en un marco ajeno, y una política de origen cruzado más permisiva de lo necesario. Los tres se cerraron desde la configuración del despliegue, sin tocar una línea del código de la aplicación.'),
  haz('DIAPOSITIVA 16 — «Mi escaneo fue pasivo, a propósito». Esta parte dila despacio.'),
  lee('Y ahora quiero ser precisa sobre XSS e inyección SQL, porque es fácil decir de más aquí.'),
  lee('Mi escaneo fue pasivo, a propósito. El modo activo envía ataques de inyección reales, y mi despliegue está conectado a la base de datos de producción. No quise atacar mi propia base. Eso significa que, si no aparece inyección SQL en el reporte, no es porque la haya probado activamente.'),
  lee('Mi argumento es estructural, no empírico: el acceso a datos va por consultas parametrizadas sobre una capa que no construye SQL concatenando cadenas, y todo pasa por políticas a nivel de fila. Y frente a XSS, la política de seguridad de contenido autoriza el único script en línea por su huella criptográfica, así que un script inyectado en el documento no se ejecutaría.'),
  haz('DIAPOSITIVA 17 — el hallazgo que se mantiene.'),
  lee('Queda un hallazgo de riesgo medio, y lo mantengo a conciencia. La política de estilos permite estilos en línea. React Native Web inyecta sus hojas de estilo en tiempo de ejecución y un alojamiento estático no puede emitir un identificador único por petición. Lo comprobé quitándolo: la aplicación se queda completamente sin estilos. La captura está en el repositorio.'),
  lee('El riesgo es acotado, porque permite estilos inyectados pero no ejecución de código. Y lo dejé como aviso en vez de silenciarlo, para que siga apareciendo en cada informe. Silenciar un aviso sin dejar escrito por qué es, en la práctica, indistinguible de esconderlo: quien abra ese archivo dentro de seis meses no podría saber si lo estudié o si lo callé.'),
);

// ═══════════ Bloque 4 ═══════════
add(
  bloque(4, 'Cierre del proyecto y lecciones aprendidas', '2:45 de texto · 2:30 min'),
  haz('DIAPOSITIVA 18 — planificado contra ejecutado.'),
  lee('Cerré ciento cuarenta y siete de ciento cincuenta tareas, en ciento cuarenta y tres commits. Planifiqué nueve fases y ejecuté diez: hubo una que no estaba prevista.'),
  lee('Tuve cuatro desviaciones, y ninguna fue un simple retraso. Todas me obligaron a cambiar una decisión de diseño.'),
  lee('El alta por pasos ya se la conté. Las notificaciones del sistema las tuve que desactivar: la biblioteca resultó incompatible con la versión del SDK y fallaba en Android. Podría haber bajado el SDK de toda la aplicación para que funcionara una sola cosa; preferí dejar la funcionalidad detrás de una interfaz estable y poner un aviso dentro de la app. Los recordatorios se configuran y se guardan; lo que no sale es la notificación del sistema operativo.'),
  lee('La recurrencia la había planificado en la base de datos y la moví al cliente, porque distinguir entre «editar solo esta vez» y «editar toda la serie» era mucho más difícil de razonar y de probar dentro de la base.'),
  lee('Y la fase que no estaba: un rediseño del calendario que salió de usar la aplicación de verdad, no de mirarla. Dos días no previstos.'),
  haz('DIAPOSITIVA 19 — lección 1.'),
  lee('De las lecciones les traigo tres, y son las que me cambiaron una decisión.'),
  lee('La primera: una métrica sin verificar es peor que ninguna métrica. El panel de calidad me reportó durante días trescientos veintinueve bugs y veinticinco por ciento de duplicación. Ninguna cifra era real: la herramienta estaba midiendo código generado automáticamente, no el que yo escribí. Si me las hubiera creído, habría perdido días corrigiendo archivos que nadie escribió.'),
  haz('DIAPOSITIVA 20 — «Medir antes que deducir».'),
  lee('La segunda es la que más me costó, y es la más útil. Tuve un fallo en el que el modo claro se veía a medias en el móvil: los iconos cambiaban y los fondos seguían oscuros. Formulé tres explicaciones distintas y las tres eran falsas, y cada una me costó trabajo antes de descartarla.'),
  lee('La causa apareció cuando dejé de deducir y puse la aplicación a registrar qué color estaba pidiendo en cada momento. Estaba pidiendo los colores claros correctos. O sea: mi programa funcionaba, y era el sistema operativo quien lo alteraba, porque Android invierte los colores de las aplicaciones que no declaran soportar tema oscuro. Media hora de medir contra un día de suponer.'),
  lee('Y la tercera ya se la conté: las pruebas encuentran lo que leer el código no ve. Las dos pantallas en blanco no eran errores de lógica, eran ausencias.'),
);

// ═══════════ Bloque 5 ═══════════
add(
  bloque(5, 'Plan de mejora continua e innovación', '2:00 de texto · 2 min'),
  haz('DIAPOSITIVA 21 — plan de mejora.'),
  lee('El plan de mejora lo ordené por beneficio contra esfuerzo.'),
  lee('A corto plazo, tres cosas medibles: la distribución de iOS, que es puramente administrativa —la aplicación está hecha y verificada en simulador, lo que falta es la cuenta de Apple Developer—; vincular el reporte de pruebas al despliegue, porque hoy el sitio se puede publicar con pruebas en rojo sin que nada lo advierta; y automatizar las pruebas de las políticas de acceso, que son el control de seguridad real y hoy las verifico a mano.'),
  lee('A medio plazo: pruebas de extremo a extremo, un escaneo activo pero sobre un entorno de pruebas y no sobre producción, y auditoría automática de dependencias, porque mi código está limpio pero las dependencias no se revisan solas.'),
  haz('DIAPOSITIVA 22 — innovación.'),
  lee('Y termino con la innovación, que en mi caso no es añadir inteligencia artificial por añadirla.'),
  lee('KAVI ya clasifica cada actividad por dimensión del bienestar. Ese dato, acumulado durante unos meses, permite algo que ningún calendario hace hoy: detectar que llevas tres semanas sin una sola actividad de la dimensión física, o social, y no solo decírtelo, sino proponerte un hueco concreto donde meterla, porque el cálculo de disponibilidad ya existe y ya sabe cruzar agendas.'),
  lee('Eso no necesita aprendizaje automático: son reglas sobre datos propios. La inteligencia artificial entra en un segundo paso, para redactar la sugerencia en lenguaje natural y aprender qué propuestas aceptas y cuáles ignoras, manteniendo la base de reglas explicable.'),
  lee('La innovación no es añadir IA. Es que el producto ya recoge el dato que la haría útil.'),
  haz('DIAPOSITIVA 23 — cierre.'),
  lee('Mil quinientas sesenta y cuatro pruebas, ochenta y cuatro por ciento de cobertura, cero bugs y cero hallazgos de riesgo alto. La aplicación está en línea y el repositorio es público.'),
  lee('Muchas gracias. Quedo atenta a sus preguntas.'),
);

// ═══════════ Anexo ═══════════
add(
  regla(),
  new Paragraph({ spacing: { before: 300, after: 160 },
    children: [new TextRun({ text: 'ANEXO · Preguntas probables', size: 30, bold: true, color: ACENTO, font: 'Calibri' })] }),
  nota('La rúbrica da quince puntos por responder con seguridad. Estas son las cinco preguntas más probables, con la idea central de cada respuesta. No las memorices palabra por palabra: quédate con el argumento.'),
);

const qa = [
  ['¿Probaste inyección SQL y XSS de verdad?',
   'No activamente, y es deliberado: el modo activo de ZAP envía ataques reales y mi despliegue apunta a la base de producción. Lo que sí puedo defender es el argumento estructural: no construyo SQL concatenando cadenas, todo va por consultas parametrizadas bajo políticas a nivel de fila, y la política de contenido autoriza el único script en línea por su huella criptográfica. El siguiente paso, que está en mi plan de mejora, es levantar un entorno de pruebas con datos falsos y ahí sí correr el escaneo activo.'],
  ['¿Por qué dejaste una vulnerabilidad de riesgo medio sin corregir?',
   'Porque no se puede corregir sin romper la aplicación, y lo comprobé en vez de suponerlo: al quitar esa directiva la app se queda sin estilos, y tengo la captura. React Native Web inyecta los estilos en tiempo de ejecución. El riesgo es acotado —permite estilos inyectados, no ejecución de código— y la defensa contra XSS descansa en la política de scripts, que sí es estricta. Lo dejé como aviso visible y no silenciado justamente para no esconderlo.'],
  ['Si ocultas el panel de administración, ¿no basta con eso?',
   'No, y es importante: ocultarlo es solo cosmética. Si alguien manipula la petición desde el navegador, la interfaz no lo detiene. Lo que lo detiene son las políticas de seguridad a nivel de fila en la base de datos y la comprobación del rol dentro de las funciones del panel. Además el panel solo devuelve cifras agregadas, nunca el contenido de la agenda de nadie.'],
  ['¿Ochenta y cuatro por ciento de cobertura significa que no hay errores?',
   'No. Significa que el ochenta y cuatro por ciento de las líneas se ejecuta durante las pruebas, no que el comportamiento sea correcto. De hecho me encontré con una prueba que pasaba y estaba defendiendo un comportamiento equivocado; una prueba verde que protege un error es peor que no tener prueba. Por eso mis pruebas verifican reglas de negocio y no que el código haga lo que hace.'],
  ['¿Por qué iOS no está publicado?',
   'Es una limitación administrativa, no un entregable incompleto. La aplicación de iOS está desarrollada y verificada en el simulador: mismo código, mismas pantallas, mismos datos que Android y web. Lo que falta es la cuenta de Apple Developer, porque sin ella Apple no emite los certificados de firma. Con la cuenta, la compilación sale del mismo pipeline que ya genera el APK, sin escribir una línea de código.'],
];
qa.forEach(([q, a], i) => {
  add(
    new Paragraph({ spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: `${i + 1}. ${q}`, size: 24, bold: true, color: TINTA, font: 'Calibri' })] }),
    new Paragraph({ spacing: { after: 120, line: 320 },
      children: [new TextRun({ text: a, size: 22, color: GRIS, font: 'Calibri' })] }),
  );
});

add(
  regla(),
  sub('Antes de presentar'),
  nota('Lleva la presentación y este guion en la memoria USB, y también el APK y el PDF del informe de cierre. Si no hay internet, las capturas de las diapositivas ya sirven como evidencia: no dependes de abrir SonarCloud ni GitHub en vivo.'),
  nota('Si hay internet, las tres cosas que impresionan al mostrarse en vivo son, por este orden: los builds en verde de GitHub Actions, el dashboard de SonarQube con la puerta de calidad superada, y la aplicación funcionando en kavi-proyecto-is.vercel.app.'),
  nota('Ensaya una vez con cronómetro. El bloque 3 es el único que va justo: si te pasas, recorta ahí el ejemplo de la ordenación. Los bloques 0 y 2 van holgados a propósito, porque son los que ganan si enseñas algo en vivo.'),
);

const doc = new Document({
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: hijos,
  }],
});
Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(process.argv[2], b);
  console.log('generado:', process.argv[2], Math.round(b.length / 1024) + ' KB');
});
