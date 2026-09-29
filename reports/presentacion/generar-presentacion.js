const pptxgen = require('pptxgenjs');
const S = __dirname + '/slides/', A = __dirname + '/art/', N = __dirname + '/art/nobi/', NL = __dirname + '/art/nobi-claro/';

const TINTA='131313', PAPEL='F2F2F2', GRIS='6E6E6E', GRIS_CLARO='ABABAB', BLANCO='FFFFFF', ORO='C8A27A';
const FISICA='4CAF50', EMOCIONAL='E91E63', SOCIAL='FF9800', INTELECTUAL='2196F3', ESPIRITUAL='9C27B0',
      FINANCIERA='009688', OCUPACIONAL='607D8B';
const HUES=[FISICA,EMOCIONAL,SOCIAL,INTELECTUAL,ESPIRITUAL,FINANCIERA,OCUPACIONAL];
const TITULAR='Century Gothic', CUERPO='Corbel';

const p = new pptxgen();
p.layout='LAYOUT_WIDE'; p.author='Areli Perdue'; p.title='KAVI — Reto final';
const W=13.3, H=7.5, M=0.85;

const bg = (f)=>{ const s=p.addSlide(); s.background={path:A+f+'.png'}; return s; };
const T=(s,t,c,osc)=>{ s.addShape(p.ShapeType.ellipse,{x:M,y:0.62,w:0.3,h:0.3,fill:{color:c}});
  s.addText(t,{x:M+0.5,y:0.5,w:W-M*2-0.5,h:0.55,valign:'middle',fontSize:29,bold:true,
    color:osc?PAPEL:TINTA,fontFace:TITULAR,isTextBox:true,margin:0}); };
const txt=(s,t,o)=>s.addText(t,{fontFace:o.f||CUERPO,isTextBox:true,margin:0,...o});
const card=(s,x,y,w,h,t,d,c,osc)=>{
  s.addShape(p.ShapeType.roundRect,{x,y,w,h,fill:{color:osc?'1C1C1C':BLANCO},rectRadius:0.12,
    shadow:osc?undefined:{type:'outer',blur:8,offset:1,angle:90,color:'BFBFBF',opacity:0.28}});
  s.addShape(p.ShapeType.ellipse,{x:x+0.3,y:y+0.32,w:0.26,h:0.26,fill:{color:c}});
  txt(s,t,{x:x+0.68,y:y+0.24,w:w-0.95,h:0.42,fontSize:14.5,bold:true,color:osc?PAPEL:TINTA,f:TITULAR});
  if(d) txt(s,d,{x:x+0.3,y:y+0.78,w:w-0.6,h:h-1.0,fontSize:12.5,color:osc?GRIS_CLARO:GRIS});
};
const nobi=(s,c,x,y,z,claro)=>s.addImage({path:(claro?NL:N)+c+'.png',x,y,w:z,h:z});
const cifra=(s,x,y,w,v,l,c)=>{ txt(s,v,{x,y,w,h:0.9,align:'center',fontSize:44,bold:true,color:c,f:TITULAR});
  txt(s,l,{x,y:y+0.92,w,h:0.4,align:'center',fontSize:13,color:GRIS}); };
const frase=(s,t,y,z,c,w)=>txt(s,t,{x:M,y,w:w||W-M*2,h:2.0,fontSize:z,bold:true,color:c,f:TITULAR,lineSpacing:z*1.18});
const caja=(s,y,h,t,d)=>{ s.addShape(p.ShapeType.roundRect,{x:M,y,w:W-M*2,h,fill:{color:TINTA},rectRadius:0.12});
  txt(s,t,{x:M+0.45,y:y+0.28,w:11,h:0.5,fontSize:19,bold:true,color:PAPEL,f:TITULAR});
  if(d) txt(s,d,{x:M+0.45,y:y+0.88,w:11,h:h-1.1,fontSize:13.5,color:GRIS_CLARO}); };

// ─────────── BLOQUE 0 ───────────
{ const s=bg('fondo-portada');
  s.addImage({path:A+'wordmark-claro.png',x:W/2-4.0,y:1.75,w:8.0,h:3.07});
  HUES.forEach((c,i)=>s.addShape(p.ShapeType.ellipse,{x:W/2-1.47+i*0.49,y:5.15,w:0.19,h:0.19,fill:{color:c}}));
  txt(s,'Reto final · Ingeniería y Desarrollo de Software',{x:0,y:5.65,w:W,h:0.4,align:'center',fontSize:15,color:PAPEL});
  txt(s,'Areli Perdue · Universidad Tecmilenio',{x:0,y:6.1,w:W,h:0.4,align:'center',fontSize:12.5,color:GRIS_CLARO});
  nobi(s,'turquois',0.7,0.55,1.0); nobi(s,'orange',11.6,5.9,1.0);
  s.addNotes('Buenos días. Soy Areli Perdue y este es KAVI, mi proyecto final de Ingeniería de Software. Es una aplicación de planificación personal que funciona en iOS, Android y navegador con un solo código. Antes de entrar en la parte técnica, quiero explicar qué problema resuelve, porque es lo que define todas las decisiones que tomé después.'); }

{ const s=bg('fondo-oscuro');
  frase(s,'Un calendario te dice qué\ntienes que hacer.',1.5,30,GRIS_CLARO,8.6);
  frase(s,'KAVI te dice en qué estás\ninvirtiendo tu vida.',3.5,36,PAPEL,8.9);
  HUES.forEach((c,i)=>s.addShape(p.ShapeType.ellipse,{x:M+i*0.5,y:5.95,w:0.2,h:0.2,fill:{color:c}}));
  nobi(s,'lime_green',10.3,2.1,2.3);
  s.addNotes('La diferencia con cualquier otro calendario no está en la tecnología: está en la pregunta que responde. Un calendario ordinario registra compromisos. KAVI registra en qué inviertes tu tiempo, que no es lo mismo. Esa distinción es la que justifica todo lo demás: la clasificación por dimensiones, el color, y hasta la forma de compartir.'); }

{ const s=bg('fondo-claro'); T(s,'Siete dimensiones del bienestar',INTELECTUAL);
  txt(s,'Cada actividad se clasifica con un tema ligado a una dimensión.',{x:M,y:1.3,w:11.6,h:0.5,fontSize:15,color:GRIS});
  [['Física',FISICA],['Emocional',EMOCIONAL],['Social',SOCIAL],['Intelectual',INTELECTUAL],
   ['Espiritual',ESPIRITUAL],['Financiera',FINANCIERA],['Ocupacional',OCUPACIONAL]].forEach(([t,c],i)=>{
    const x=M+(i%4)*2.95, y=2.3+Math.floor(i/4)*1.75;
    s.addShape(p.ShapeType.roundRect,{x,y,w:2.6,h:1.4,fill:{color:BLANCO},rectRadius:0.12,
      shadow:{type:'outer',blur:8,offset:1,angle:90,color:'BFBFBF',opacity:0.25}});
    s.addShape(p.ShapeType.ellipse,{x:x+0.28,y:y+0.3,w:0.38,h:0.38,fill:{color:c}});
    txt(s,t,{x:x+0.28,y:y+0.82,w:2.1,h:0.4,fontSize:13.5,bold:true,color:TINTA,f:TITULAR}); });
  nobi(s,'purple',11.3,4.15,1.5,true);
  s.addNotes('Cada actividad se clasifica con un tema ligado a una de las siete dimensiones del bienestar. Esa decisión tiene una consecuencia de diseño: la aplicación entera es monocroma, y el único color que aparece es el de los datos. Así el calendario deja de ser una lista y se lee como un mapa del tiempo propio.'); }

{ const s=bg('fondo-limpio'); T(s,'El calendario es la estrella',SOCIAL);
  s.addImage({path:S+'app-calendario-compartido.png',x:M,y:1.3,w:8.5,h:5.06});
  card(s,9.65,1.3,2.8,2.4,'Color por persona','Cada contacto tiene el suyo. Por omisión, el de su Nobi.',SOCIAL);
  card(s,9.65,3.9,2.8,2.45,'Privacidad real','Las de Ana dicen «Ocupado»: comparte disponibilidad, no contenido.',EMOCIONAL);
  s.addNotes('Esta es la pantalla principal, con dos contactos superpuestos sobre mi calendario. Cada persona tiene su color, asignado automáticamente a partir del avatar que eligió. Permite ver de un vistazo de quién es cada bloque sin leer un solo título, que es justo lo que hace falta al coordinar horarios.'); }

{ const s=bg('fondo-oscuro'); T(s,'Compartir sin exponerse',EMOCIONAL,true);
  frase(s,'Las actividades rojas dicen\n«Ocupado», sin título.',1.6,31,PAPEL,8.8);
  txt(s,'Ana comparte solo su disponibilidad: sé cuándo está libre, pero no qué hace.',
    {x:M,y:3.9,w:8.8,h:0.9,fontSize:16,color:GRIS_CLARO});
  ['No compartir nada','Solo disponibilidad','Con detalles'].forEach((t,i)=>{
    const x=M+i*3.95; s.addShape(p.ShapeType.roundRect,{x,y:5.0,w:3.7,h:1.15,fill:{color:'1C1C1C'},rectRadius:0.1});
    s.addShape(p.ShapeType.ellipse,{x:x+0.3,y:5.28,w:0.24,h:0.24,fill:{color:[OCUPACIONAL,SOCIAL,FISICA][i]}});
    txt(s,t,{x:x+0.66,y:5.2,w:2.9,h:0.4,fontSize:13.5,bold:true,color:PAPEL,f:TITULAR}); });
  s.addNotes('Aquí está la parte que más me interesa. Las actividades rojas dicen «Ocupado», sin título, porque ese contacto comparte únicamente su disponibilidad. Sé cuándo está libre, pero no qué hace. Hay tres niveles, y esto permite coordinarse sin renunciar a la privacidad, que suele ser el precio de cualquier calendario compartido.'); }

{ const s=bg('fondo-claro'); T(s,'Crear una actividad',INTELECTUAL);
  s.addImage({path:S+'app-nueva-actividad.png',x:M,y:1.3,w:6.3,h:4.97});
  txt(s,'Todo lo que define una actividad, en una pantalla.',{x:7.5,y:1.35,w:4.95,h:0.6,fontSize:17,bold:true,color:TINTA,f:TITULAR});
  [['Tema','La liga a una dimensión y le da su color.',INTELECTUAL],
   ['Repetición','Diaria, semanal o mensual.',FISICA],
   ['Quién la ve','Normal, solo algunos, o privada.',EMOCIONAL]].forEach(([t,d,c],i)=>{
    const y=2.15+i*1.45;
    s.addShape(p.ShapeType.ellipse,{x:7.5,y:y+0.06,w:0.26,h:0.26,fill:{color:c}});
    txt(s,t,{x:7.88,y,w:4.5,h:0.4,fontSize:15,bold:true,color:TINTA,f:TITULAR});
    txt(s,d,{x:7.88,y:y+0.42,w:4.5,h:0.85,fontSize:13,color:GRIS}); });
  txt(s,'La privacidad se decide actividad por actividad.',{x:7.5,y:6.45,w:4.95,h:0.5,fontSize:12.5,italic:true,color:ORO});
  s.addNotes('Al crear una actividad se define su tema, si se repite y quién puede verla. Me detengo en lo último: la privacidad se decide actividad por actividad, no solo por contacto. Puedo compartir mi calendario con alguien y aun así marcar una cita concreta como privada. Es el nivel de control que faltaba.'); }

{ const s=bg('fondo-limpio'); T(s,'El gimnasio, dentro del calendario',FISICA);
  s.addImage({path:S+'app-entrenamiento.png',x:M,y:1.3,w:7.4,h:4.16});
  txt(s,'Una actividad de gimnasio abre su propio registro.',{x:8.6,y:1.35,w:3.85,h:0.85,fontSize:16,bold:true,color:TINTA,f:TITULAR});
  txt(s,'Ejercicios, series, repeticiones, peso, tiempo y las notas de la sesión.',{x:8.6,y:2.35,w:3.85,h:1.6,fontSize:13,color:GRIS});
  nobi(s,'lime_green',8.6,4.1,1.5,true);
  txt(s,'No es una aplicación aparte: vive dentro de la actividad ya agendada.',{x:M,y:5.75,w:11.6,h:0.6,fontSize:13.5,italic:true,color:GRIS});
  s.addNotes('Las actividades marcadas como gimnasio abren su propio registro: ejercicios, series, repeticiones, peso, tiempo y las notas de la sesión. Lo importante es que no es una aplicación aparte, sino que vive dentro de la actividad ya agendada. El nombre del último entrenamiento se propone en el siguiente, porque quien entrena repite rutina.'); }

{ const s=bg('fondo-claro'); T(s,'Un solo código, tres plataformas',FISICA);
  txt(s,'iOS, Android y navegador comparten código, pantallas y datos.',{x:M,y:1.3,w:11.6,h:0.5,fontSize:14.5,color:GRIS});
  s.addImage({path:S+'movil-calendario.png',x:M+0.5,y:1.95,w:2.0,h:4.33});
  s.addImage({path:S+'movil-perfil.png',x:M+2.75,y:1.95,w:2.0,h:4.33});
  s.addImage({path:S+'app-calendario-claro.png',x:M+5.5,y:1.95,w:6.0,h:3.58});
  txt(s,'Móvil',{x:M+0.5,y:6.35,w:4.25,h:0.4,align:'center',fontSize:13,bold:true,color:TINTA,f:TITULAR});
  txt(s,'Navegador, en modo claro',{x:M+5.5,y:5.65,w:6.0,h:0.4,align:'center',fontSize:13,bold:true,color:TINTA,f:TITULAR});
  txt(s,'La apariencia se elige y la paleta cumple contraste en ambos temas.',{x:M+5.5,y:6.05,w:5.8,h:0.6,align:'center',fontSize:12,color:GRIS});
  s.addNotes('Todo lo anterior es el mismo código en las tres plataformas: iOS, Android y navegador comparten pantallas y datos. La apariencia se elige entre clara, oscura o la del sistema, y toda la paleta está verificada para cumplir los mínimos de contraste en ambos temas, no solo en el que se diseñó primero.'); }

// ─────────── BLOQUE 1 ───────────
{ const s=bg('fondo-claro'); T(s,'Módulo desarrollado: cuenta y acceso',EMOCIONAL);
  txt(s,'Alta, sesión persistente y recuperación de contraseña.',{x:M,y:1.3,w:11.6,h:0.5,fontSize:15,color:GRIS});
  ['Nombre','Correo','Usuario','Código','Contraseña'].forEach((t,i)=>{
    const x=M+i*2.36;
    s.addShape(p.ShapeType.roundRect,{x,y:2.3,w:2.15,h:1.5,fill:{color:BLANCO},rectRadius:0.12,
      shadow:{type:'outer',blur:8,offset:1,angle:90,color:'BFBFBF',opacity:0.25}});
    s.addShape(p.ShapeType.ellipse,{x:x+0.28,y:2.55,w:0.4,h:0.4,fill:{color:HUES[i]}});
    txt(s,String(i+1),{x:x+0.28,y:2.55,w:0.4,h:0.4,align:'center',valign:'middle',fontSize:15,bold:true,color:BLANCO,f:TITULAR});
    txt(s,t,{x:x+0.28,y:3.1,w:1.7,h:0.4,fontSize:13,bold:true,color:TINTA,f:TITULAR}); });
  txt(s,'El alta se hace por pasos. No estaba planificada así.',{x:M,y:4.3,w:11.6,h:0.5,fontSize:17,bold:true,color:TINTA,f:TITULAR});
  s.addNotes('Paso al módulo que desarrollé: cuenta y acceso, con alta, sesión persistente y recuperación de contraseña. El alta se resolvió en cinco pasos, y quiero detenerme en ello porque no estaba planificada así. En el diseño original era un formulario único, y la razón del cambio es lo que más aprendí en todo el proyecto.'); }

{ const s=bg('fondo-oscuro'); T(s,'El problema que apareció',EMOCIONAL,true);
  frase(s,'Verificar el código de correo\nya abre sesión.',1.7,32,PAPEL,8.7);
  txt(s,'Una persona podía quedar dentro de la aplicación sin haber fijado nunca una contraseña.',{x:M,y:4.0,w:8.7,h:0.9,fontSize:16,color:GRIS_CLARO});
  txt(s,'No era un error de programación: era un hueco en el diseño.',{x:M,y:5.1,w:8.7,h:0.6,fontSize:16,bold:true,color:ORO});
  nobi(s,'deep_red',10.6,2.5,2.0);
  s.addNotes('Al implementar la verificación por correo apareció un problema que no había previsto: verificar el código ya abre la sesión en el proveedor de autenticación. Es decir, una persona podía quedar dentro de la aplicación sin haber fijado nunca una contraseña. No era un error de programación, sino un hueco en el diseño.'); }

{ const s=bg('fondo-claro'); T(s,'La solución',FISICA);
  txt(s,'Un estado de «alta pendiente».',{x:M,y:1.45,w:11.6,h:0.7,fontSize:30,bold:true,color:TINTA,f:TITULAR});
  txt(s,'Retiene a la persona en el último paso hasta que completa el registro. Costó alrededor de un día y cerró un problema real.',
    {x:M,y:2.35,w:11.6,h:1.0,fontSize:16,color:GRIS});
  caja(s,4.0,2.0,'Lo que aprendí','Un problema de diseño no se detecta leyendo el código: aparece al implementarlo. Preferí rediseñar el flujo antes que dejar un hueco conocido.');
  s.addNotes('La solución fue un estado intermedio de «alta pendiente» que retiene a la persona en el último paso hasta completar el registro. Costó alrededor de un día de trabajo no planificado. Lo rescatable es el criterio: un problema de diseño no se detecta leyendo el código, aparece al implementarlo, y conviene rediseñar antes que dejar el hueco.'); }

{ const s=bg('fondo-claro'); T(s,'Autenticación con JWT',INTELECTUAL);
  card(s,M,1.5,3.7,2.6,'1 · Token firmado','Supabase Auth emite un JWT en cada sesión.',INTELECTUAL);
  card(s,M+3.95,1.5,3.7,2.6,'2 · Viaja en cada petición','La base de datos lo valida antes de devolver filas.',FISICA);
  card(s,M+7.9,1.5,3.7,2.6,'3 · Dos roles','Administrador y usuario, guardados en el perfil.',SOCIAL);
  txt(s,'20 migraciones versionadas, cada una con sus políticas de seguridad.',{x:M,y:4.5,w:11.6,h:0.5,fontSize:15,color:GRIS});
  nobi(s,'navy_blue',11.3,5.1,1.3,true);
  s.addNotes('La autenticación se apoya en tokens JWT firmados. Cada petición los transporta y la base de datos los valida antes de decidir qué filas devuelve. Hay dos roles, administrador y usuario, guardados en el perfil. Y cada tabla lleva sus políticas de seguridad desde el momento en que se crea: son veinte migraciones versionadas.'); }

{ const s=bg('fondo-oscuro'); T(s,'Dónde vive el control de acceso',ESPIRITUAL,true);
  frase(s,'Ocultar el panel\nno es controlar el acceso.',1.6,33,PAPEL,9.0);
  txt(s,'Ocultarlo es cosmética. El control real está en la base de datos: cada tabla lleva políticas a nivel de fila desde que se crea, y las funciones comprueban el rol antes de devolver nada.',
    {x:M,y:3.9,w:9.0,h:1.3,fontSize:15,color:GRIS_CLARO});
  txt(s,'Una petición manipulada desde el navegador no obtiene datos.',{x:M,y:5.4,w:9.0,h:0.6,fontSize:16,bold:true,color:ORO});
  nobi(s,'indigo',10.5,2.4,2.0);
  s.addNotes('Quiero subrayar algo que me parece importante. Ocultar el panel de administración a quien no tiene permiso es cosmética, no seguridad. El control real vive en la base de datos: las políticas a nivel de fila y la comprobación del rol dentro de cada función. Una petición manipulada desde el navegador no obtiene datos.'); }

{ const s=bg('fondo-oscuro'); T(s,'Pruebas unitarias',FISICA,true);
  txt(s,'84%',{x:M,y:1.8,w:5.4,h:2.0,fontSize:108,bold:true,color:PAPEL,f:TITULAR});
  txt(s,'de cobertura de sentencias',{x:M,y:3.85,w:5.4,h:0.5,fontSize:17,color:GRIS_CLARO});
  txt(s,'El requisito era 80 %',{x:M,y:4.35,w:5.4,h:0.5,fontSize:14,italic:true,color:ORO});
  [['1 564','pruebas'],['92','archivos'],['27 s','en correr'],['0','fallando']].forEach(([v,l],i)=>{
    const x=6.9+(i%2)*3.0, y=1.9+Math.floor(i/2)*1.7;
    txt(s,v,{x,y,w:2.7,h:0.7,fontSize:32,bold:true,color:PAPEL,f:TITULAR});
    txt(s,l,{x,y:y+0.72,w:2.7,h:0.4,fontSize:13,color:GRIS_CLARO}); });
  nobi(s,'green',M,5.35,1.5);
  s.addNotes('El requisito de la materia era ochenta por ciento de cobertura de pruebas. El resultado es ochenta y cuatro por ciento de sentencias y ochenta y cinco de líneas, con mil quinientas sesenta y cuatro pruebas que se ejecutan enteras en veintisiete segundos. Se ejecutan automáticamente en cada cambio que subo al repositorio.'); }

{ const s=bg('fondo-limpio'); T(s,'La evidencia',FISICA);
  s.addImage({path:S+'cobertura.png',x:M,y:1.35,w:11.6,h:5.2});
  s.addNotes('Este es el reporte que genera la herramienta, desglosado archivo por archivo. Está versionado en el repositorio, de modo que cualquiera puede comprobar la cifra sin ejecutar nada. Las zonas en verde son las que superan el umbral; las amarillas señalan dónde queda trabajo por hacer.'); }

{ const s=bg('fondo-claro'); T(s,'Lo que destaparon las pruebas',EMOCIONAL);
  frase(s,'Dos pantallas se quedaban\nen blanco si fallaba la red.',1.5,31,TINTA,8.4);
  txt(s,'Sin mensaje, sin explicación y sin forma de reintentar: indistinguible de no tener ningún contacto.',
    {x:M,y:3.7,w:8.4,h:0.9,fontSize:15.5,color:GRIS});
  txt(s,'Ambas están corregidas y tienen su propia prueba.',{x:M,y:4.8,w:8.4,h:0.5,fontSize:14,italic:true,color:ORO});
  nobi(s,'magenta',10.6,1.8,1.9,true);
  s.addNotes('Pero la cifra no es lo interesante. Lo interesante es que escribir las pruebas destapó dos defectos reales que llevaban ahí desde el principio. Dos pantallas se quedaban completamente en blanco si fallaba la conexión: sin mensaje, sin explicación y sin forma de reintentar, indistinguible de no tener ningún contacto.'); }

{ const s=bg('fondo-oscuro'); T(s,'Por qué no se veían antes',ESPIRITUAL,true);
  frase(s,'No eran errores de lógica.\nEran ausencias.',1.8,36,PAPEL,9.0);
  txt(s,'Nadie detecta leyendo una pantalla que no contempla el fallo de red, porque no hay nada que leer. Se detecta al preguntarse, prueba por prueba, qué debería ocurrir en cada situación.',
    {x:M,y:4.2,w:9.0,h:1.4,fontSize:16,color:GRIS_CLARO});
  nobi(s,'lilac',10.5,2.6,2.0);
  s.addNotes('Quiero explicar por qué no los había visto antes. No eran errores de lógica que se detecten leyendo el código: eran ausencias. Nadie descubre leyendo una pantalla que no contempla el fallo de red, porque no hay nada escrito que leer. Se descubre al preguntarse, caso por caso, qué debería ocurrir en cada situación.'); }

// ─────────── BLOQUE 2 ───────────
{ const s=bg('fondo-claro'); T(s,'Pipeline: los tres flujos',SOCIAL);
  [['Pruebas','Cada push y cada pull request','Tipos → 1 564 pruebas → lint → SonarQube',INTELECTUAL],
   ['Build de producción','A demanda','Genera el APK de Android con EAS Build',FISICA],
   ['Escaneo de seguridad','A demanda','Análisis pasivo con OWASP ZAP',EMOCIONAL]].forEach(([t,c,d,col],i)=>{
    const x=M+i*3.95;
    s.addShape(p.ShapeType.roundRect,{x,y:1.6,w:3.7,h:2.9,fill:{color:BLANCO},rectRadius:0.12,
      shadow:{type:'outer',blur:8,offset:1,angle:90,color:'BFBFBF',opacity:0.25}});
    s.addShape(p.ShapeType.ellipse,{x:x+0.3,y:1.88,w:0.26,h:0.26,fill:{color:col}});
    txt(s,t,{x:x+0.68,y:1.8,w:2.8,h:0.4,fontSize:14.5,bold:true,color:TINTA,f:TITULAR});
    txt(s,c,{x:x+0.3,y:2.28,w:3.1,h:0.35,fontSize:11.5,italic:true,color:GRIS});
    txt(s,d,{x:x+0.3,y:2.72,w:3.1,h:1.4,fontSize:12.5,color:TINTA}); });
  txt(s,'El despliegue web es automático: cada cambio en la rama principal publica en Vercel.',
    {x:M,y:4.9,w:11.6,h:0.5,fontSize:15,color:TINTA});
  nobi(s,'baby_blue',11.3,5.5,1.3,true);
  s.addNotes('Paso a la integración continua. Tengo tres flujos configurados. El primero se ejecuta en cada cambio y encadena verificación de tipos, las mil quinientas pruebas, el lint y el análisis de calidad. Los otros dos van a demanda, porque uno consume créditos de compilación y el otro tarda varios minutos. El despliegue web es automático.'); }

{ const s=bg('fondo-claro'); T(s,'Dos decisiones del pipeline',INTELECTUAL);
  card(s,M,1.6,5.65,2.5,'Todo falla junto, no en cadena','Tipos, pruebas y lint continúan aunque uno falle: una sola ejecución muestra todos los problemas a la vez.',INTELECTUAL);
  card(s,M+5.95,1.6,5.65,2.5,'Suelo del 80 %','Si un cambio baja la cobertura de ahí, la integración falla en lugar de pasar inadvertida.',FISICA);
  caja(s,4.4,2.0,'Por qué no es la configuración por defecto','Lo normal es detenerse en el primer error. Prefiero ver todos los problemas de una vez antes que descubrirlos de uno en uno, corregir y volver a esperar.');
  s.addNotes('Dos decisiones que no son la configuración por defecto. La primera: los pasos continúan aunque uno falle, de modo que una sola ejecución muestra todos los problemas a la vez en lugar de obligarme a descubrirlos de uno en uno. La segunda: si un cambio baja la cobertura del ochenta por ciento, la integración falla.'); }

{ const s=bg('fondo-limpio'); T(s,'Ejecuciones en verde',FISICA);
  s.addImage({path:S+'actions-pruebas.png',x:M,y:1.35,w:11.6,h:5.0});
  s.addNotes('Este es el historial real de ejecuciones, todas en verde. Cada una corresponde a un cambio subido al repositorio, y el resultado se publica en la propia página sin necesidad de abrir los registros: cuántas pruebas pasaron y, si alguna falla, cuál y con qué error.'); }

// ─────────── BLOQUE 3 ───────────
{ const s=bg('fondo-oscuro'); T(s,'Calidad de código',INTELECTUAL,true);
  [['0 min','Deuda técnica'],['0','Bugs'],['0','Vulnerabilidades'],['0','Code smells'],['0.5 %','Duplicación'],['A A A','Calificaciones']].forEach(([v,l],i)=>{
    const x=M+(i%3)*3.95, y=1.75+Math.floor(i/3)*2.15;
    s.addShape(p.ShapeType.roundRect,{x,y,w:3.7,h:1.75,fill:{color:'1C1C1C'},rectRadius:0.12});
    txt(s,v,{x:x+0.35,y:y+0.28,w:3.0,h:0.75,fontSize:33,bold:true,color:PAPEL,f:TITULAR});
    txt(s,l,{x:x+0.35,y:y+1.08,w:3.0,h:0.4,fontSize:13,color:GRIS_CLARO}); });
  txt(s,'Sobre 12 505 líneas · Puerta de calidad superada',{x:M,y:6.15,w:11.6,h:0.45,fontSize:13.5,italic:true,color:ORO});
  s.addNotes('En calidad de código, el análisis estático sobre doce mil quinientas líneas devuelve cero minutos de deuda técnica, cero errores, cero vulnerabilidades y calificación A en fiabilidad, seguridad y mantenibilidad. La puerta de calidad está superada, y se vuelve a comprobar en cada integración, no una sola vez.'); }

{ const s=bg('fondo-limpio'); T(s,'El panel, en SonarQube',INTELECTUAL);
  s.addImage({path:S+'sonar.png',x:M+1.4,y:1.35,w:8.9,h:5.0});
  s.addNotes('Este es el panel, que se actualiza solo en cada integración. La comprobación no depende de que yo me acuerde de ejecutarla: si un cambio empeora cualquiera de esas métricas, el propio pipeline lo marca antes de que llegue a publicarse.'); }

{ const s=bg('fondo-claro'); T(s,'Los ceros no son el punto de partida',ESPIRITUAL);
  txt(s,'15',{x:M,y:1.7,w:2.6,h:1.5,fontSize:80,bold:true,color:TINTA,f:TITULAR});
  txt(s,'hallazgos en el primer análisis',{x:M,y:3.25,w:3.2,h:0.8,fontSize:14,color:GRIS});
  txt(s,'Corregirlos reveló defectos reales.',{x:4.6,y:1.8,w:7.8,h:0.5,fontSize:18,bold:true,color:TINTA,f:TITULAR});
  s.addShape(p.ShapeType.roundRect,{x:4.6,y:2.5,w:7.8,h:1.5,fill:{color:BLANCO},rectRadius:0.12,
    shadow:{type:'outer',blur:8,offset:1,angle:90,color:'BFBFBF',opacity:0.25}});
  txt(s,'Ordenar por defecto es alfabético:\n0, 2, 10  se ordena como  0, 10, 2',{x:4.95,y:2.75,w:7.1,h:1.0,fontSize:15,color:TINTA,f:'Courier New'});
  txt(s,'Con días de la semana no fallaba. Se habría roto al ampliar el rango.',{x:4.6,y:4.2,w:7.8,h:0.5,fontSize:13.5,color:GRIS});
  nobi(s,'olive_green',M,4.6,1.7,true);
  s.addNotes('Conviene aclarar que esos ceros no son el punto de partida. El primer análisis devolvió quince hallazgos, y corregirlos reveló defectos reales. El más claro: dos ordenaciones sin función de comparación. Con días de la semana no fallaba, pero se habría roto en cuanto ampliara el rango de valores.'); }

{ const s=bg('fondo-claro'); T(s,'Seguridad: OWASP ZAP',EMOCIONAL);
  txt(s,'Se escaneó, se corrigió y se volvió a escanear.',{x:M,y:1.3,w:11.6,h:0.45,fontSize:15,color:GRIS});
  cifra(s,M,2.1,2.7,'18','Antes',GRIS_CLARO);
  cifra(s,M+3.0,2.1,2.7,'12','Tras corregir',GRIS);
  cifra(s,M+6.0,2.1,2.7,'6','Tras el triaje',FISICA);
  cifra(s,M+9.0,2.1,2.7,'0','De riesgo alto',FISICA);
  caja(s,4.3,2.1,'Los tres de riesgo medio eran cabeceras HTTP ausentes','Política de seguridad de contenido, protección contra incrustación en marcos ajenos y una política de origen cruzado demasiado permisiva. Se cerraron desde la configuración del despliegue, sin tocar el código.');
  s.addNotes('En seguridad utilicé OWASP ZAP contra el sitio publicado. Escaneé, corregí y volví a escanear. De dieciocho hallazgos iniciales quedan seis, y ninguno de riesgo alto en ningún momento. Los tres de riesgo medio eran cabeceras de respuesta ausentes, y se cerraron desde la configuración del despliegue sin tocar el código.'); }

{ const s=bg('fondo-oscuro'); T(s,'Sobre XSS e inyección SQL',ESPIRITUAL,true);
  frase(s,'El escaneo fue pasivo,\na propósito.',1.7,33,PAPEL,8.6);
  txt(s,'El modo activo envía ataques reales, y el despliegue está conectado a la base de producción. No quise atacar mi propia base de datos.',
    {x:M,y:3.9,w:8.6,h:1.0,fontSize:16,color:GRIS_CLARO});
  txt(s,'Si no aparece inyección SQL, no es porque la haya probado activamente.',{x:M,y:5.1,w:8.6,h:0.6,fontSize:16,bold:true,color:ORO});
  nobi(s,'red',10.5,2.4,2.0);
  s.addNotes('Aquí quiero ser precisa, porque es fácil afirmar de más. El escaneo fue pasivo a propósito: el modo activo envía ataques de inyección reales, y mi despliegue está conectado a la base de datos de producción. Por tanto, que no aparezca inyección SQL en el reporte no significa que la haya probado activamente.'); }

{ const s=bg('fondo-claro'); T(s,'Por qué la defensa se sostiene',FISICA);
  card(s,M,1.6,5.65,2.6,'Frente a inyección SQL','No se construye SQL concatenando cadenas. Todo pasa por consultas parametrizadas y por políticas a nivel de fila.',INTELECTUAL);
  card(s,M+5.95,1.6,5.65,2.6,'Frente a XSS','La política de contenido autoriza el único script en línea por su huella criptográfica. Un script inyectado no se ejecutaría.',EMOCIONAL);
  txt(s,'El argumento es estructural, no empírico: descansa en cómo está construido el sistema.',
    {x:M,y:4.5,w:11.6,h:0.6,fontSize:15,italic:true,color:GRIS});
  nobi(s,'turquois',11.3,5.2,1.3,true);
  s.addNotes('Mi argumento es estructural, no empírico. Frente a inyección, el acceso a datos no construye instrucciones concatenando cadenas: usa consultas parametrizadas bajo políticas a nivel de fila. Frente a ejecución de scripts, la política de contenido autoriza únicamente el script propio por su huella criptográfica, de modo que uno inyectado no se ejecutaría.'); }

{ const s=bg('fondo-claro'); T(s,'El hallazgo que se mantiene',SOCIAL);
  s.addShape(p.ShapeType.roundRect,{x:M,y:1.4,w:11.6,h:1.9,fill:{color:BLANCO},rectRadius:0.12,
    shadow:{type:'outer',blur:8,offset:1,angle:90,color:'BFBFBF',opacity:0.25}});
  txt(s,'CSP: style-src unsafe-inline  ·  riesgo medio',{x:M+0.4,y:1.65,w:10.8,h:0.45,fontSize:18,bold:true,color:TINTA,f:TITULAR});
  txt(s,'React Native Web inyecta sus estilos en tiempo de ejecución. Al retirarlo, la aplicación queda completamente sin estilos: está comprobado y la evidencia está en el repositorio.',
    {x:M+0.4,y:2.15,w:10.8,h:1.0,fontSize:13.5,color:GRIS});
  txt(s,'El riesgo es acotado: permite estilos inyectados, no ejecución de código.',{x:M,y:3.6,w:11.6,h:0.5,fontSize:15,color:TINTA});
  caja(s,4.35,2.1,'Se mantiene como aviso, no silenciado','Silenciar un aviso sin dejar escrito el motivo es indistinguible de esconderlo: quien abra ese archivo dentro de seis meses no sabría si se estudió o se calló.');
  s.addNotes('Queda un hallazgo de riesgo medio, y lo mantengo a conciencia. No se puede corregir sin dejar la aplicación sin estilos, y lo comprobé retirándolo. El riesgo es acotado: permite estilos inyectados, no ejecución de código. Lo dejé como aviso visible en lugar de silenciarlo, para que siga apareciendo en cada informe.'); }

// ─────────── BLOQUE 4 ───────────
{ const s=bg('fondo-claro'); T(s,'Planificado contra ejecutado',SOCIAL);
  cifra(s,M,1.6,2.7,'147/150','Tareas cerradas',TINTA);
  cifra(s,M+3.0,1.6,2.7,'143','Commits',TINTA);
  cifra(s,M+6.0,1.6,2.7,'9','Fases planificadas',TINTA);
  cifra(s,M+9.0,1.6,2.7,'10','Fases ejecutadas',SOCIAL);
  caja(s,3.9,2.4,'Cuatro desviaciones, ninguna fue un simple retraso','Las cuatro obligaron a cambiar una decisión de diseño. Una de ellas ni siquiera estaba en el plan: apareció al usar la aplicación de verdad, no al mirarla.');
  s.addNotes('Sobre la planeación: cerré ciento cuarenta y siete de ciento cincuenta tareas, en ciento cuarenta y tres cambios registrados. Planifiqué nueve fases y ejecuté diez, porque apareció una que no estaba prevista. Tuve cuatro desviaciones, y ninguna fue un simple retraso: las cuatro obligaron a cambiar una decisión de diseño.'); }

{ const s=bg('fondo-claro'); T(s,'Las cuatro desviaciones',EMOCIONAL);
  [['Alta por pasos','La obligó un hueco de seguridad real. Un día.',EMOCIONAL],
   ['Notificaciones','Biblioteca incompatible con el SDK. Se degradó a aviso dentro de la aplicación.',SOCIAL],
   ['Recurrencia en el cliente','En la base de datos era mucho más difícil distinguir «esta vez» de «toda la serie».',INTELECTUAL],
   ['Rediseño del calendario','Surgió de usar la aplicación. Dos días no previstos.',FISICA]].forEach(([t,d,c],i)=>
    card(s,M+(i%2)*5.95,1.5+Math.floor(i/2)*1.75,5.65,1.6,t,d,c));
  txt(s,'Preferí degradar una funcionalidad antes que bajar el SDK de toda la aplicación por una sola cosa.',
    {x:M,y:5.2,w:11.6,h:0.6,fontSize:14,italic:true,color:GRIS});
  s.addNotes('Estas son las cuatro. El alta por pasos ya la expliqué. En las notificaciones, la biblioteca resultó incompatible con la versión del entorno: preferí degradar esa funcionalidad antes que bajar el entorno de toda la aplicación por una sola cosa. Y la última surgió de usar la aplicación de verdad, no de mirarla.'); }

{ const s=bg('fondo-oscuro'); T(s,'Lección 1',ESPIRITUAL,true);
  frase(s,'Una métrica sin verificar\nes peor que ninguna métrica.',1.7,32,PAPEL,9.0);
  txt(s,'El panel de calidad reportó durante días 329 bugs y 25.9 % de duplicación. Ninguna cifra era real: medía código generado automáticamente.',
    {x:M,y:4.0,w:9.0,h:1.1,fontSize:16,color:GRIS_CLARO});
  txt(s,'De haberlas creído, habría corregido archivos que nadie escribió.',{x:M,y:5.3,w:9.0,h:0.6,fontSize:16,bold:true,color:ORO});
  nobi(s,'yellow',10.6,2.6,2.0);
  s.addNotes('Primera lección. El panel de calidad reportó durante días trescientos veintinueve errores y veinticinco por ciento de duplicación. Ninguna cifra era real: la herramienta estaba midiendo código generado automáticamente, no el que yo escribí. De haberlas dado por buenas, habría invertido días corrigiendo archivos que nadie había escrito.'); }

{ const s=bg('fondo-oscuro'); T(s,'Lección 2',ESPIRITUAL,true);
  txt(s,'Medir antes que deducir.',{x:M,y:1.75,w:9.0,h:0.8,fontSize:38,bold:true,color:PAPEL,f:TITULAR});
  txt(s,'El modo claro se veía a medias en el móvil. Formulé tres explicaciones distintas y las tres resultaron falsas.',
    {x:M,y:3.2,w:9.0,h:1.0,fontSize:16,color:GRIS_CLARO});
  txt(s,'La causa apareció al medir: la aplicación pedía los colores correctos. Era el sistema operativo quien los alteraba.',
    {x:M,y:4.3,w:9.0,h:1.1,fontSize:16,color:GRIS_CLARO});
  txt(s,'Media hora de medir contra un día de suponer.',{x:M,y:5.6,w:9.0,h:0.6,fontSize:18,bold:true,color:ORO});
  nobi(s,'baby_blue',10.6,2.9,2.0);
  s.addNotes('Segunda lección, y la que más me costó. El modo claro se veía a medias en el teléfono. Formulé tres explicaciones distintas y las tres resultaron falsas, y cada una consumió trabajo antes de descartarse. La causa apareció al medir: la aplicación pedía los colores correctos y era el sistema operativo quien los alteraba.'); }

{ const s=bg('fondo-claro'); T(s,'Lección 3',FISICA);
  frase(s,'Las pruebas encuentran\nlo que leer el código no ve.',1.7,32,TINTA,9.0);
  txt(s,'Los dos defectos que aparecieron no eran errores de lógica: eran ausencias. Una pantalla que no contempla el fallo de red no tiene nada que leer.',
    {x:M,y:4.0,w:9.0,h:1.1,fontSize:16,color:GRIS});
  nobi(s,'pink',10.6,2.6,2.0,true);
  s.addNotes('Y la tercera, que ya adelanté: las pruebas encuentran lo que leer el código no permite ver. Los dos defectos que aparecieron no eran errores de lógica sino ausencias, y por eso ninguna revisión manual los habría detectado. Es el argumento que me convenció de que la cobertura no era un trámite.'); }

// ─────────── BLOQUE 5 ───────────
{ const s=bg('fondo-claro'); T(s,'Plan de mejora: corto plazo',FISICA);
  txt(s,'Acciones medibles, en una o dos semanas.',{x:M,y:1.3,w:11.6,h:0.45,fontSize:15,color:GRIS});
  [['Distribución de iOS','La aplicación está hecha y verificada en simulador. Falta la cuenta de Apple Developer: es administrativo, no técnico.',FISICA],
   ['Reporte ligado al despliegue','Hoy el sitio puede publicarse con pruebas en rojo sin que nada lo advierta.',SOCIAL],
   ['Pruebas de las políticas de acceso','Son el control de seguridad real y hoy se verifican a mano.',EMOCIONAL]].forEach(([t,d,c],i)=>
    card(s,M+i*3.95,1.9,3.7,3.1,t,d,c));
  nobi(s,'lime_green',11.3,5.3,1.3,true);
  s.addNotes('El plan de mejora está ordenado por beneficio contra esfuerzo. A corto plazo, tres acciones medibles. La distribución de iOS es puramente administrativa: la aplicación está terminada y verificada en simulador, y lo que falta es la cuenta de desarrollador. Las otras dos cierran huecos que hoy dependen de que yo me acuerde.'); }

{ const s=bg('fondo-claro'); T(s,'Plan de mejora: medio y largo plazo',INTELECTUAL);
  [['Medio · 1–3 meses',['Pruebas de extremo a extremo','Escaneo activo sobre entorno de pruebas','Auditoría de dependencias'],SOCIAL],
   ['Largo · 3 meses en adelante',['Sincronización con calendarios externos','Rutinas de gimnasio con progresión','Medición continua del rendimiento'],INTELECTUAL]].forEach(([t,items,c],i)=>{
    const x=M+i*5.95;
    s.addShape(p.ShapeType.roundRect,{x,y:1.6,w:5.65,h:3.4,fill:{color:BLANCO},rectRadius:0.12,
      shadow:{type:'outer',blur:8,offset:1,angle:90,color:'BFBFBF',opacity:0.25}});
    s.addShape(p.ShapeType.ellipse,{x:x+0.3,y:1.88,w:0.26,h:0.26,fill:{color:c}});
    txt(s,t,{x:x+0.68,y:1.8,w:4.6,h:0.42,fontSize:14.5,bold:true,color:TINTA,f:TITULAR});
    s.addText(items.map((it,j)=>({text:it,options:{bullet:true,breakLine:j<items.length-1}})),
      {x:x+0.3,y:2.4,w:5.0,h:2.3,fontSize:13,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0,paraSpaceAfter:10}); });
  txt(s,'Del proceso: verificar cada artefacto examinándolo, y medir antes de encadenar hipótesis.',
    {x:M,y:5.3,w:11.6,h:0.6,fontSize:14,italic:true,color:GRIS});
  s.addNotes('A medio plazo, pruebas de extremo a extremo que recorran un flujo completo, y el escaneo activo que hoy descarté, pero sobre un entorno de pruebas en lugar de producción. A largo plazo, la sincronización con calendarios externos, que es la principal barrera de adopción de cualquier planificador.'); }

{ const s=bg('fondo-oscuro'); T(s,'Innovación: el equilibrio como dato',ESPIRITUAL,true);
  frase(s,'KAVI ya sabe en qué dimensión\ninviertes tu tiempo.',1.6,31,PAPEL,9.0);
  txt(s,'Ese dato, acumulado unos meses, permite detectar que llevas tres semanas sin una sola actividad física, o social.',
    {x:M,y:3.7,w:9.0,h:1.0,fontSize:16,color:GRIS_CLARO});
  txt(s,'Y no solo señalarlo: proponer un hueco concreto, porque el cálculo de disponibilidad ya existe y sabe cruzar agendas.',
    {x:M,y:4.8,w:9.0,h:1.1,fontSize:16,color:GRIS_CLARO});
  nobi(s,'purple',10.5,2.5,2.0);
  s.addNotes('Termino con la propuesta de innovación. KAVI ya clasifica cada actividad por dimensión del bienestar, y ese dato, acumulado durante unos meses, permite algo que ningún calendario hace hoy: detectar que alguien lleva tres semanas sin una sola actividad física o social, y no limitarse a señalarlo.'); }

{ const s=bg('fondo-oscuro'); T(s,'Dónde entra la inteligencia artificial',INTELECTUAL,true);
  [['1','Detectar','Reglas sobre datos propios. No hace falta aprendizaje automático.',FISICA],
   ['2','Proponer','El cálculo de disponibilidad ya existe y sabe cruzar agendas.',SOCIAL],
   ['3','Con IA, después','Redactar la sugerencia y aprender qué propuestas se aceptan.',ESPIRITUAL]].forEach(([n,t,d,c],i)=>{
    const x=M+i*3.95;
    s.addShape(p.ShapeType.roundRect,{x,y:1.7,w:3.7,h:3.3,fill:{color:'1C1C1C'},rectRadius:0.12});
    s.addShape(p.ShapeType.ellipse,{x:x+0.32,y:2.0,w:0.46,h:0.46,fill:{color:c}});
    txt(s,n,{x:x+0.32,y:2.0,w:0.46,h:0.46,align:'center',valign:'middle',fontSize:17,bold:true,color:BLANCO,f:TITULAR});
    txt(s,t,{x:x+0.32,y:2.6,w:3.1,h:0.42,fontSize:15.5,bold:true,color:PAPEL,f:TITULAR});
    txt(s,d,{x:x+0.32,y:3.1,w:3.1,h:1.7,fontSize:12.5,color:GRIS_CLARO}); });
  txt(s,'La innovación no es añadir IA. Es que el producto ya recoge el dato que la haría útil.',
    {x:M,y:5.5,w:11.6,h:0.6,fontSize:18,bold:true,italic:true,color:ORO,f:TITULAR});
  s.addNotes('La base son reglas sobre datos propios: no requiere aprendizaje automático. La inteligencia artificial entra en un segundo paso, para redactar la sugerencia en lenguaje natural y aprender qué propuestas se aceptan, manteniendo explicable la base de reglas. La innovación no está en añadir inteligencia artificial, sino en que el producto ya recoge el dato que la haría útil.'); }

{ const s=bg('fondo-portada');
  s.addImage({path:A+'wordmark-solo-claro.png',x:W/2-2.5,y:1.45,w:5.0,h:1.33});
  txt(s,'kavi-proyecto-is.vercel.app',{x:0,y:3.0,w:W,h:0.45,align:'center',fontSize:17,color:INTELECTUAL});
  [['1 564','pruebas'],['84 %','cobertura'],['0','bugs'],['0','riesgo alto']].forEach(([v,l],i)=>{
    const x=W/2-5.4+i*2.7;
    txt(s,v,{x,y:3.85,w:2.4,h:0.65,align:'center',fontSize:28,bold:true,color:PAPEL,f:TITULAR});
    txt(s,l,{x,y:4.5,w:2.4,h:0.4,align:'center',fontSize:12.5,color:GRIS_CLARO}); });
  txt(s,'Gracias. Quedo atenta a sus preguntas.',{x:0,y:5.35,w:W,h:0.55,align:'center',fontSize:20,color:PAPEL});
  nobi(s,'pink',1.0,5.6,1.1); nobi(s,'blue',11.2,5.6,1.1);
  s.addNotes('Para cerrar: mil quinientas sesenta y cuatro pruebas, ochenta y cuatro por ciento de cobertura, cero errores y ningún hallazgo de riesgo alto. La aplicación está publicada y el repositorio es público, de modo que todo lo que acabo de exponer se puede comprobar. Gracias, quedo atenta a sus preguntas.'); }

p.writeFile({fileName:process.argv[2]}).then(f=>console.log('generado:',f));
