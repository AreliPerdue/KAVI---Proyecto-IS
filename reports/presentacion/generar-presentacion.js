const pptxgen = require('pptxgenjs');
const S = __dirname + '/slides/', A = __dirname + '/art/';
const N = __dirname + '/art/nobi/';          // set oscuro, para diapositivas oscuras
const NL = __dirname + '/art/nobi-claro/';   // set claro, para diapositivas claras

const TINTA='131313', PAPEL='F2F2F2', GRIS='6E6E6E', GRIS_CLARO='ABABAB', BLANCO='FFFFFF', ORO='C8A27A';
const FISICA='4CAF50', EMOCIONAL='E91E63', SOCIAL='FF9800', INTELECTUAL='2196F3', ESPIRITUAL='9C27B0',
      FINANCIERA='009688', OCUPACIONAL='607D8B';
const HUES=[FISICA,EMOCIONAL,SOCIAL,INTELECTUAL,ESPIRITUAL,FINANCIERA,OCUPACIONAL];

/**
 * Century Gothic es geometrica y redondeada, de la misma familia visual que Moirai One
 * del wordmark; Corbel es humanista y se lee bien en parrafo. Las dos vienen con
 * Microsoft Office en Mac y en Windows, asi que el archivo se ve igual en el salon.
 */
const TITULAR = 'Century Gothic';
const CUERPO  = 'Corbel';

const p = new pptxgen();
p.layout='LAYOUT_WIDE'; p.author='Areli Perdue'; p.title='KAVI — Reto final';
const W=13.3, H=7.5, M=0.85;

const slide = (fondo) => { const s=p.addSlide(); s.background={ path: A+fondo+'.png' }; return s; };
const claro  = () => slide('fondo-claro');
const limpio = () => slide('fondo-limpio');
const oscuro = () => slide('fondo-oscuro');

/** Titulo de seccion con su punto de color. El motivo que se repite en todo el deck. */
function titulo(s, texto, color, sobreOscuro=false) {
  s.addShape(p.ShapeType.ellipse,{x:M,y:0.62,w:0.3,h:0.3,fill:{color}});
  s.addText(texto,{x:M+0.5,y:0.5,w:W-M*2-0.5,h:0.55,valign:'middle',fontSize:29,bold:true,
    color: sobreOscuro?PAPEL:TINTA, fontFace:TITULAR,isTextBox:true,margin:0});
}
/** Frase grande, para las diapositivas de una sola idea. */
function frase(s, texto, y, size, color, w=W-M*2) {
  s.addText(texto,{x:M,y,w,h:2.0,fontSize:size,bold:true,color,fontFace:TITULAR,isTextBox:true,margin:0,lineSpacing:size*1.18});
}
/** Cifra grande con etiqueta. */
function cifra(s,x,y,w,valor,etiqueta,color,sub=null) {
  s.addText(valor,{x,y,w,h:0.9,align:'center',fontSize:44,bold:true,color,fontFace:TITULAR,isTextBox:true,margin:0});
  s.addText(etiqueta,{x,y:y+0.92,w,h:0.4,align:'center',fontSize:13,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  if(sub) s.addText(sub,{x,y:y+1.28,w,h:0.35,align:'center',fontSize:10.5,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
}
/** Tarjeta redondeada con titulo y cuerpo. */
function tarjeta(s,x,y,w,h,t,d,color,oscura=false) {
  s.addShape(p.ShapeType.roundRect,{x,y,w,h,fill:{color:oscura?'1C1C1C':BLANCO},rectRadius:0.12,
    shadow:{type:'outer',blur:8,offset:1,angle:90,color:'BFBFBF',opacity:0.28}});
  s.addShape(p.ShapeType.ellipse,{x:x+0.3,y:y+0.32,w:0.26,h:0.26,fill:{color}});
  s.addText(t,{x:x+0.68,y:y+0.24,w:w-0.95,h:0.42,fontSize:14.5,bold:true,color:oscura?PAPEL:TINTA,
    fontFace:TITULAR,isTextBox:true,margin:0});
  s.addText(d,{x:x+0.3,y:y+0.78,w:w-0.6,h:h-1.0,fontSize:12.5,color:oscura?GRIS_CLARO:GRIS,
    fontFace:CUERPO,isTextBox:true,margin:0});
}
/** Nobi decorativo. */
/** El Nobi lleva su fondo pintado, asi que se usa el set que corresponde al fondo. */
const nobi  = (s,color,x,y,size) => s.addImage({path:N+color+'.png',x,y,w:size,h:size});
const nobiL = (s,color,x,y,size) => s.addImage({path:NL+color+'.png',x,y,w:size,h:size});
/** Los siete puntos de dimension. */
function puntos(s,x,y,r=0.16,gap=0.42){ HUES.forEach((c,i)=>s.addShape(p.ShapeType.ellipse,{x:x+i*gap,y,w:r,h:r,fill:{color:c}})); }

// ═════ 1 · Portada ═════
{
  const s = slide('fondo-portada');
  s.addImage({path:A+'wordmark-claro.png', x:W/2-4.0, y:1.75, w:8.0, h:3.07});
  puntos(s, W/2-1.47, 5.15, 0.19, 0.49);
  s.addText('Reto final · Ingeniería y Desarrollo de Software',{x:0,y:5.65,w:W,h:0.4,align:'center',
    fontSize:15,color:PAPEL,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addText('Areli Perdue · Universidad Tecmilenio · Septiembre 2026',{x:0,y:6.1,w:W,h:0.4,align:'center',
    fontSize:12.5,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
  nobi(s,'turquois',0.7,0.55,1.0); nobi(s,'orange',11.6,5.9,1.0);
  s.addNotes('Bloque 0 · Diapositiva 1');
}

// ═════ 2 · La idea ═════
{
  const s = oscuro();
  frase(s,'Un calendario te dice qué\ntienes que hacer.',1.35,30,GRIS_CLARO,8.6);
  frase(s,'KAVI te dice en qué estás\ninvirtiendo tu vida.',3.35,36,PAPEL,8.9);
  puntos(s,M,5.85,0.2,0.5);
  nobi(s,'lime_green',10.3,2.1,2.3);
  s.addNotes('Diapositiva 2 · la frase que abre.');
}

// ═════ 3 · Las siete dimensiones ═════
{
  const s = claro();
  titulo(s,'Siete dimensiones del bienestar',INTELECTUAL);
  s.addText('Cada actividad se clasifica con un tema ligado a una dimensión. Por eso la app es monocroma: el único color que ves es el de tus datos.',
    {x:M,y:1.3,w:W-M*2,h:0.6,fontSize:14.5,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  const dims=[['Física',FISICA],['Emocional',EMOCIONAL],['Social',SOCIAL],['Intelectual',INTELECTUAL],
              ['Espiritual',ESPIRITUAL],['Financiera',FINANCIERA],['Ocupacional',OCUPACIONAL]];
  dims.forEach(([t,c],i)=>{
    const x=M+(i%4)*2.95, y=2.3+Math.floor(i/4)*1.75;
    s.addShape(p.ShapeType.roundRect,{x,y,w:2.6,h:1.4,fill:{color:BLANCO},rectRadius:0.12,
      shadow:{type:'outer',blur:8,offset:1,angle:90,color:'BFBFBF',opacity:0.25}});
    s.addShape(p.ShapeType.ellipse,{x:x+0.28,y:y+0.3,w:0.38,h:0.38,fill:{color:c}});
    s.addText(t,{x:x+0.28,y:y+0.82,w:2.1,h:0.4,fontSize:13.5,bold:true,color:TINTA,fontFace:TITULAR,isTextBox:true,margin:0});
  });
  nobiL(s,'purple',11.3,4.15,1.5);
  s.addNotes('Diapositiva 3');
}

// ═════ 4 · El calendario ═════
{
  const s = limpio();
  titulo(s,'El calendario es la estrella',SOCIAL);
  s.addImage({path:S+'app-calendario-compartido.png',x:M,y:1.3,w:8.5,h:5.06});
  tarjeta(s,9.65,1.3,2.8,2.4,'Color por persona','Cada contacto tiene el suyo. Por omisi\u00f3n, el de su Nobi.',SOCIAL);
  tarjeta(s,9.65,3.9,2.8,2.45,'Privacidad real','Las de Ana dicen \u00abOcupado\u00bb: comparte su disponibilidad, no lo que hace.',EMOCIONAL);
  s.addNotes('Diapositiva 4 \u00b7 se\u00f1ala los bloques rojos que dicen \u00abOcupado\u00bb.');
}

// ═════ 5 · Crear una actividad ═════
{
  const s = claro();
  titulo(s,'Crear una actividad',INTELECTUAL);
  s.addImage({path:S+'app-nueva-actividad.png',x:M,y:1.3,w:6.3,h:4.97});
  s.addText('Todo lo que define una actividad, en una pantalla.',
    {x:7.5,y:1.35,w:4.95,h:0.6,fontSize:17,bold:true,color:TINTA,fontFace:TITULAR,isTextBox:true,margin:0});
  const campos=[['Tema','Lo liga a una dimensi\u00f3n del bienestar y le da su color.',INTELECTUAL],
                ['Repetici\u00f3n','Diaria, semanal o mensual.',FISICA],
                ['Qui\u00e9n la ve','Normal, solo algunos contactos, o privada.',EMOCIONAL]];
  campos.forEach(([t,d,c],i)=>{
    const y=2.15+i*1.45;
    s.addShape(p.ShapeType.ellipse,{x:7.5,y:y+0.06,w:0.26,h:0.26,fill:{color:c}});
    s.addText(t,{x:7.88,y,w:4.5,h:0.4,fontSize:15,bold:true,color:TINTA,fontFace:TITULAR,isTextBox:true,margin:0});
    s.addText(d,{x:7.88,y:y+0.42,w:4.5,h:0.85,fontSize:13,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  });
  s.addShape(p.ShapeType.roundRect,{x:7.5,y:6.5,w:4.95,h:0.0,fill:{color:BLANCO},rectRadius:0.1});
  s.addText('La privacidad se decide actividad por actividad, no solo por contacto.',
    {x:7.5,y:6.5,w:4.95,h:0.5,fontSize:12.5,italic:true,color:ORO,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addNotes('Diapositiva 5 \u00b7 lo distintivo es \u00abqui\u00e9n la ve\u00bb.');
}

// ═════ 6 · El gimnasio ═════
{
  const s = limpio();
  titulo(s,'El gimnasio, dentro del calendario',FISICA);
  s.addImage({path:S+'app-entrenamiento.png',x:M,y:1.3,w:7.4,h:4.16});
  s.addText('Una actividad marcada como gimnasio abre su propio registro.',
    {x:8.6,y:1.35,w:3.85,h:0.85,fontSize:16,bold:true,color:TINTA,fontFace:TITULAR,isTextBox:true,margin:0});
  s.addText('Ejercicios, series, repeticiones, peso y las notas de la sesi\u00f3n. El nombre del \u00faltimo entrenamiento se propone en el siguiente, porque quien entrena repite rutina.',
    {x:8.6,y:2.35,w:3.85,h:1.9,fontSize:13,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  nobiL(s,'lime_green',8.6,4.4,1.5);
  s.addText('No es una app aparte: vive dentro del calendario, en la actividad que ya agendaste.',
    {x:M,y:5.75,w:11.6,h:0.6,fontSize:13.5,italic:true,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addNotes('Diapositiva 6 \u00b7 el gimnasio.');
}

// ═════ 7 · Tres plataformas ═════
{
  const s = claro();
  titulo(s,'Un solo c\u00f3digo, tres plataformas',FISICA);
  s.addText('iOS, Android y navegador comparten el mismo c\u00f3digo, las mismas pantallas y los mismos datos (NFR-8).',
    {x:M,y:1.3,w:11.6,h:0.5,fontSize:14.5,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addImage({path:S+'movil-calendario.png',x:M+0.5,y:1.95,w:2.0,h:4.33});
  s.addImage({path:S+'movil-perfil.png',x:M+2.75,y:1.95,w:2.0,h:4.33});
  s.addImage({path:S+'app-calendario-claro.png',x:M+5.5,y:1.95,w:6.0,h:3.58});
  s.addText('M\u00f3vil',{x:M+0.5,y:6.35,w:4.25,h:0.4,align:'center',fontSize:13,bold:true,color:TINTA,
    fontFace:TITULAR,isTextBox:true,margin:0});
  s.addText('Navegador, en modo claro',{x:M+5.5,y:5.65,w:6.0,h:0.4,align:'center',fontSize:13,bold:true,
    color:TINTA,fontFace:TITULAR,isTextBox:true,margin:0});
  s.addText('La apariencia se elige: sistema, claro u oscuro. Toda la paleta est\u00e1 verificada a 4.5:1 en los dos temas.',
    {x:M+5.5,y:6.05,w:5.8,h:0.7,align:'center',fontSize:12,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addNotes('Diapositiva 7 \u00b7 las tres plataformas y el modo claro.');
}

// ═════ 5 · El módulo: el problema ═════
{
  const s = oscuro();
  titulo(s,'Módulo: cuenta y acceso',EMOCIONAL,true);
  frase(s,'Verificar el código de correo\nya abre sesión.',1.7,32,PAPEL,8.7);
  s.addText('Una persona podía quedar dentro de la aplicación sin haber puesto nunca una contraseña. No era un error de programación: era un agujero en el diseño.',
    {x:M,y:4.15,w:8.7,h:1.2,fontSize:15,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addText('No estaba planificado. Apareció al implementarlo.',{x:M,y:5.6,w:8.7,h:0.5,fontSize:13,
    italic:true,color:ORO,fontFace:CUERPO,isTextBox:true,margin:0});
  nobi(s,'deep_red',10.6,2.5,2.0);
  s.addNotes('Diapositiva 5');
}

// ═════ 6 · JWT y roles ═════
{
  const s = claro();
  titulo(s,'Autenticación con JWT y roles',ESPIRITUAL);
  tarjeta(s,M,1.4,3.7,2.4,'1 · Token firmado','Supabase Auth emite un JWT en cada sesión.',INTELECTUAL);
  tarjeta(s,M+3.95,1.4,3.7,2.4,'2 · Viaja y se valida','Cada petición lo transporta; PostgreSQL lo valida antes de devolver filas.',FISICA);
  tarjeta(s,M+7.9,1.4,3.7,2.4,'3 · Dos roles','Administrador y usuario, guardados en la tabla de perfiles.',SOCIAL);
  s.addShape(p.ShapeType.roundRect,{x:M,y:4.15,w:W-M*2,h:2.3,fill:{color:TINTA},rectRadius:0.12});
  s.addText('Ocultar el panel de administración NO es el control de acceso',{x:M+0.45,y:4.42,w:11,h:0.5,
    fontSize:20,bold:true,color:PAPEL,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addText('Ocultarlo es cosmética. El control real está en la base de datos: cada tabla lleva políticas de seguridad a nivel de fila desde que se crea, y las funciones del panel comprueban el rol antes de devolver nada. Una petición manipulada desde el navegador no obtiene datos.',
    {x:M+0.45,y:5.0,w:11,h:1.2,fontSize:13.5,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addText('20 migraciones versionadas',{x:M+0.45,y:6.05,w:11,h:0.4,fontSize:12,italic:true,color:ORO,
    fontFace:CUERPO,isTextBox:true,margin:0});
  s.addNotes('Diapositiva 6 · la tarjeta oscura es el mensaje clave.');
}

// ═════ 7 · Cobertura, la cifra ═════
{
  const s = oscuro();
  titulo(s,'Pruebas unitarias',FISICA,true);
  s.addText('84%',{x:M,y:1.8,w:5.4,h:2.0,fontSize:108,bold:true,color:PAPEL,fontFace:TITULAR,isTextBox:true,margin:0});
  s.addText('de cobertura de sentencias',{x:M,y:3.85,w:5.4,h:0.5,fontSize:17,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addText('El requisito era 80 %',{x:M,y:4.35,w:5.4,h:0.5,fontSize:14,italic:true,color:ORO,fontFace:CUERPO,isTextBox:true,margin:0});
  [['1 564','pruebas'],['92','archivos'],['27 s','en correr'],['0','fallando']].forEach(([v,l],i)=>{
    const x=6.9+(i%2)*3.0, y=1.9+Math.floor(i/2)*1.7;
    s.addText(v,{x,y,w:2.7,h:0.7,fontSize:32,bold:true,color:PAPEL,fontFace:TITULAR,isTextBox:true,margin:0});
    s.addText(l,{x,y:y+0.72,w:2.7,h:0.4,fontSize:13,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
  });
  nobi(s,'green',M,5.35,1.5);
  s.addNotes('Diapositiva 7');
}

// ═════ 8 · Cobertura, la evidencia ═════
{
  const s = limpio();
  titulo(s,'La evidencia',FISICA);
  s.addImage({path:S+'cobertura.png',x:M,y:1.35,w:11.6,h:5.2});
  s.addNotes('Diapositiva 8 · si hay internet, abre el reporte real.');
}

// ═════ 9 · Lo que destaparon ═════
{
  const s = claro();
  titulo(s,'Lo que destaparon las pruebas',EMOCIONAL);
  frase(s,'Dos pantallas se quedaban\nen blanco si fallaba la red.',1.45,30,TINTA,8.3);
  s.addText('Sin mensaje, sin explicación y sin forma de reintentar: exactamente igual que si de verdad no tuvieras ningún contacto.',
    {x:M,y:3.6,w:8.3,h:0.9,fontSize:14.5,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addShape(p.ShapeType.roundRect,{x:M,y:4.75,w:11.6,h:1.65,fill:{color:TINTA},rectRadius:0.12});
  s.addText('No eran errores de lógica. Eran ausencias.',{x:M+0.45,y:4.98,w:10.7,h:0.45,fontSize:18,
    bold:true,color:PAPEL,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addText('Nadie detecta leyendo una pantalla que no contempla el fallo de red, porque no hay nada que leer. Se detecta al preguntarse, prueba por prueba, qué debería pasar en cada situación.',
    {x:M+0.45,y:5.5,w:10.7,h:0.8,fontSize:13.5,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
  nobiL(s,'magenta',10.6,1.6,1.7);
  s.addNotes('Diapositiva 9');
}

// ═════ 10 · Pipeline ═════
{
  const s = claro();
  titulo(s,'Pipeline de integración y entrega',SOCIAL);
  const f=[['Pruebas','Cada push y cada pull request','Tipos → 1 564 pruebas → lint → SonarQube',INTELECTUAL],
           ['Build de producción','A demanda','Genera el APK de Android con EAS Build',FISICA],
           ['Escaneo de seguridad','A demanda','Análisis pasivo con OWASP ZAP del sitio en línea',EMOCIONAL]];
  f.forEach(([t,c,d,col],i)=>{
    const x=M+i*3.95;
    s.addShape(p.ShapeType.roundRect,{x,y:1.4,w:3.7,h:2.5,fill:{color:BLANCO},rectRadius:0.12,
      shadow:{type:'outer',blur:8,offset:1,angle:90,color:'BFBFBF',opacity:0.25}});
    s.addShape(p.ShapeType.ellipse,{x:x+0.3,y:1.68,w:0.26,h:0.26,fill:{color:col}});
    s.addText(t,{x:x+0.68,y:1.6,w:2.8,h:0.4,fontSize:14.5,bold:true,color:TINTA,fontFace:TITULAR,isTextBox:true,margin:0});
    s.addText(c,{x:x+0.3,y:2.08,w:3.1,h:0.35,fontSize:11.5,italic:true,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
    s.addText(d,{x:x+0.3,y:2.5,w:3.1,h:1.2,fontSize:12.5,color:TINTA,fontFace:CUERPO,isTextBox:true,margin:0});
  });
  s.addText('El despliegue web es automático: cada cambio en la rama principal publica en Vercel.',
    {x:M,y:4.15,w:11.6,h:0.45,fontSize:14,color:TINTA,fontFace:CUERPO,isTextBox:true,margin:0});
  tarjeta(s,M,4.75,5.65,1.9,'Todo falla junto, no en cadena','Tipos, pruebas y lint continúan aunque uno falle: una ejecución muestra todos los problemas.',INTELECTUAL);
  tarjeta(s,M+5.95,4.75,5.65,1.9,'Suelo del 80 %','Si un cambio baja la cobertura de ahí, la integración falla en lugar de pasar inadvertida.',FISICA);
  s.addNotes('Diapositiva 10');
}

// ═════ 11 · Actions ═════
{
  const s = limpio();
  titulo(s,'Ejecuciones en verde',FISICA);
  s.addImage({path:S+'actions-pruebas.png',x:M,y:1.35,w:11.6,h:5.0});
  s.addNotes('Diapositiva 11 · si hay internet, abre Actions.');
}

// ═════ 12 · SonarQube cifras ═════
{
  const s = oscuro();
  titulo(s,'Calidad de código',INTELECTUAL,true);
  [['0 min','Deuda técnica'],['0','Bugs'],['0','Vulnerabilidades'],['0','Code smells'],['0.5 %','Duplicación'],['A A A','Calificaciones']].forEach(([v,l],i)=>{
    const x=M+(i%3)*3.95, y=1.75+Math.floor(i/3)*2.15;
    s.addShape(p.ShapeType.roundRect,{x,y,w:3.7,h:1.75,fill:{color:'1C1C1C'},rectRadius:0.12});
    s.addText(v,{x:x+0.35,y:y+0.28,w:3.0,h:0.75,fontSize:33,bold:true,color:PAPEL,fontFace:TITULAR,isTextBox:true,margin:0});
    s.addText(l,{x:x+0.35,y:y+1.08,w:3.0,h:0.4,fontSize:13,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
  });
  s.addText('Sobre 12 505 líneas de código · Puerta de calidad superada',{x:M,y:6.15,w:11.6,h:0.45,
    fontSize:13.5,italic:true,color:ORO,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addNotes('Diapositiva 12');
}

// ═════ 13 · SonarQube evidencia ═════
{
  const s = limpio();
  titulo(s,'El panel, en vivo',INTELECTUAL);
  s.addImage({path:S+'sonar.png',x:M+1.4,y:1.35,w:8.9,h:5.0});
  s.addNotes('Diapositiva 13');
}

// ═════ 14 · Los ceros no son el inicio ═════
{
  const s = claro();
  titulo(s,'Los ceros no son el punto de partida',ESPIRITUAL);
  s.addText('15',{x:M,y:1.6,w:2.6,h:1.5,fontSize:80,bold:true,color:TINTA,fontFace:TITULAR,isTextBox:true,margin:0});
  s.addText('hallazgos en el primer análisis',{x:M,y:3.15,w:3.2,h:0.8,fontSize:14,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addText('Corregirlos reveló defectos reales. El más claro: dos ordenaciones sin función de comparación.',
    {x:4.6,y:1.7,w:7.8,h:0.9,fontSize:16,bold:true,color:TINTA,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addShape(p.ShapeType.roundRect,{x:4.6,y:2.8,w:7.8,h:1.5,fill:{color:BLANCO},rectRadius:0.12,
    shadow:{type:'outer',blur:8,offset:1,angle:90,color:'BFBFBF',opacity:0.25}});
  s.addText('En JavaScript, ordenar por defecto es alfabético:\n0, 2, 10  se ordena como  0, 10, 2',
    {x:4.95,y:3.05,w:7.1,h:1.0,fontSize:15,color:TINTA,fontFace:'Courier New',isTextBox:true,margin:0});
  s.addText('Con días de la semana no fallaba. Se habría roto en cuanto ampliara el rango.',
    {x:4.6,y:4.5,w:7.8,h:0.5,fontSize:13.5,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  nobiL(s,'indigo',M,4.6,1.7);
  s.addNotes('Diapositiva 14 · se puede saltar si vas con retraso.');
}

// ═════ 15 · ZAP progresión ═════
{
  const s = claro();
  titulo(s,'Seguridad: OWASP ZAP',EMOCIONAL);
  s.addText('Se escaneó, se corrigió y se volvió a escanear.',{x:M,y:1.3,w:11.6,h:0.45,fontSize:15,
    color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  cifra(s,M,2.0,2.7,'18','Antes',GRIS_CLARO);
  cifra(s,M+3.0,2.0,2.7,'12','Tras corregir',GRIS);
  cifra(s,M+6.0,2.0,2.7,'6','Tras el triaje',FISICA);
  cifra(s,M+9.0,2.0,2.7,'0','De riesgo alto',FISICA);
  s.addShape(p.ShapeType.roundRect,{x:M,y:4.25,w:11.6,h:2.15,fill:{color:BLANCO},rectRadius:0.12,
    shadow:{type:'outer',blur:8,offset:1,angle:90,color:'BFBFBF',opacity:0.25}});
  s.addShape(p.ShapeType.ellipse,{x:M+0.35,y:4.55,w:0.26,h:0.26,fill:{color:EMOCIONAL}});
  s.addText('Los tres de riesgo medio eran cabeceras HTTP ausentes',{x:M+0.72,y:4.47,w:10.5,h:0.42,
    fontSize:16,bold:true,color:TINTA,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addText('Política de seguridad de contenido, protección contra incrustación en marcos ajenos, y una política de origen cruzado más permisiva de lo necesario. Los tres se cerraron desde la configuración del despliegue, sin tocar una línea del código.',
    {x:M+0.35,y:5.0,w:10.9,h:1.1,fontSize:13.5,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addNotes('Diapositiva 15');
}

// ═════ 16 · Honestidad XSS/SQLi ═════
{
  const s = oscuro();
  titulo(s,'Sobre XSS e inyección SQL',ESPIRITUAL,true);
  frase(s,'Mi escaneo fue pasivo,\na propósito.',1.5,31,PAPEL,8.4);
  s.addText('El modo activo envía ataques de inyección reales, y mi despliegue está conectado a la base de producción. No quise atacar mi propia base.',
    {x:M,y:3.5,w:8.4,h:0.9,fontSize:14.5,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addText('Si no aparece inyección SQL, no es porque la haya probado activamente.',
    {x:M,y:4.45,w:8.4,h:0.5,fontSize:14,bold:true,color:ORO,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addShape(p.ShapeType.roundRect,{x:M,y:5.15,w:11.6,h:1.45,fill:{color:'1C1C1C'},rectRadius:0.12});
  s.addText('Mi argumento es estructural: no construyo SQL concatenando cadenas, todo va por consultas parametrizadas bajo políticas a nivel de fila. Frente a XSS, la política de contenido autoriza el único script en línea por su huella criptográfica.',
    {x:M+0.4,y:5.4,w:10.8,h:1.0,fontSize:13.5,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
  nobi(s,'lilac',10.5,1.8,1.9);
  s.addNotes('Diapositiva 16 · dila despacio. Es la que más puntos da si preguntan.');
}

// ═════ 17 · El hallazgo que permanece ═════
{
  const s = claro();
  titulo(s,'El hallazgo que se mantiene',SOCIAL);
  s.addShape(p.ShapeType.roundRect,{x:M,y:1.35,w:11.6,h:1.85,fill:{color:BLANCO},rectRadius:0.12,
    shadow:{type:'outer',blur:8,offset:1,angle:90,color:'BFBFBF',opacity:0.25}});
  s.addText('CSP: style-src unsafe-inline  ·  riesgo medio',{x:M+0.4,y:1.6,w:10.8,h:0.45,fontSize:18,
    bold:true,color:TINTA,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addText('React Native Web inyecta sus hojas de estilo en tiempo de ejecución, y un alojamiento estático no puede emitir un identificador único por petición. Lo comprobé quitándolo: la aplicación se queda completamente sin estilos.',
    {x:M+0.4,y:2.12,w:10.8,h:1.0,fontSize:13.5,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  frase(s,'Lo dejé como aviso, no silenciado.',3.5,26,TINTA,11.6);
  s.addText('Silenciar un aviso sin dejar escrito por qué es, en la práctica, indistinguible de esconderlo: quien abra ese archivo dentro de seis meses no podría saber si lo estudié o si lo callé.',
    {x:M,y:4.45,w:11.6,h:0.9,fontSize:14.5,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addText('El riesgo es acotado: permite estilos inyectados, no ejecución de código.',
    {x:M,y:5.55,w:11.6,h:0.5,fontSize:13.5,italic:true,color:ORO,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addNotes('Diapositiva 17');
}

// ═════ 18 · Planificado vs ejecutado ═════
{
  const s = claro();
  titulo(s,'Planificado contra ejecutado',SOCIAL);
  cifra(s,M,1.35,2.7,'147/150','Tareas cerradas',TINTA);
  cifra(s,M+3.0,1.35,2.7,'143','Commits',TINTA);
  cifra(s,M+6.0,1.35,2.7,'9','Fases planificadas',TINTA);
  cifra(s,M+9.0,1.35,2.7,'10','Fases ejecutadas',SOCIAL);
  s.addText('Cuatro desviaciones. Ninguna fue un simple retraso: todas cambiaron una decisión de diseño.',
    {x:M,y:3.2,w:11.6,h:0.45,fontSize:16,bold:true,color:TINTA,fontFace:CUERPO,isTextBox:true,margin:0});
  const d=[['Alta por pasos','La obligó un agujero funcional real. Un día.',EMOCIONAL],
           ['Notificaciones','Biblioteca incompatible con el SDK. Se degradó a aviso dentro de la app.',SOCIAL],
           ['Recurrencia en el cliente','En la base era mucho más difícil distinguir «esta vez» de «toda la serie».',INTELECTUAL],
           ['Fase 7b de rediseño','Surgió de usar la app de verdad. Dos días no previstos.',FISICA]];
  d.forEach(([t,x,c],i)=>tarjeta(s,M+(i%2)*5.95,3.85+Math.floor(i/2)*1.4,5.65,1.25,t,x,c));
  s.addNotes('Diapositiva 18');
}

// ═════ 19 · Lección 1 ═════
{
  const s = oscuro();
  titulo(s,'Lección 1',ESPIRITUAL,true);
  frase(s,'Una métrica sin verificar\nes peor que ninguna métrica.',1.5,32,PAPEL,9.0);
  s.addText('El panel de calidad me reportó durante días 329 bugs y 25.9 % de duplicación. Ninguna cifra era real: estaba midiendo código generado automáticamente, no el que yo escribí.',
    {x:M,y:3.9,w:9.0,h:1.0,fontSize:15,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addText('Si me las hubiera creído, habría perdido días corrigiendo archivos que nadie escribió.',
    {x:M,y:5.0,w:9.0,h:0.6,fontSize:15,bold:true,color:ORO,fontFace:CUERPO,isTextBox:true,margin:0});
  nobi(s,'yellow',10.6,2.6,2.0);
  s.addNotes('Diapositiva 19');
}

// ═════ 20 · Lección 2 ═════
{
  const s = oscuro();
  titulo(s,'Lección 2',ESPIRITUAL,true);
  frase(s,'Medir antes que deducir.',1.5,36,PAPEL,9.0);
  s.addText('El modo claro se veía a medias en el móvil. Formulé tres explicaciones distintas y las tres eran falsas; cada una me costó trabajo antes de descartarla.',
    {x:M,y:2.8,w:9.0,h:0.95,fontSize:15,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addText('La causa apareció cuando dejé de deducir y puse la app a registrar qué color estaba pidiendo. Estaba pidiendo los correctos: mi programa funcionaba, y era el sistema operativo quien lo alteraba.',
    {x:M,y:3.85,w:9.0,h:1.1,fontSize:15,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addShape(p.ShapeType.roundRect,{x:M,y:5.15,w:9.0,h:1.0,fill:{color:'1C1C1C'},rectRadius:0.12});
  s.addText('Media hora de medir contra un día de suponer.',{x:M+0.4,y:5.38,w:8.2,h:0.55,fontSize:18,
    bold:true,color:ORO,fontFace:CUERPO,isTextBox:true,margin:0});
  nobi(s,'baby_blue',10.6,2.9,2.0);
  s.addNotes('Diapositiva 20 · la lección más honesta. No la saltes.');
}

// ═════ 21 · Plan de mejora ═════
{
  const s = claro();
  titulo(s,'Plan de mejora continua',FISICA);
  const pl=[['Corto · 1–2 semanas',['Distribución de iOS: falta la cuenta de desarrollador','Vincular el reporte de pruebas al despliegue','Automatizar las pruebas de las políticas de acceso'],FISICA],
            ['Medio · 1–3 meses',['Pruebas de extremo a extremo','Escaneo activo sobre entorno de pruebas','Auditoría automática de dependencias'],SOCIAL],
            ['Largo · 3 meses en adelante',['Sincronización con calendarios externos','Rutinas de gimnasio con progresión','Medición continua del rendimiento'],INTELECTUAL]];
  pl.forEach(([t,items,c],i)=>{
    const x=M+i*3.95;
    s.addShape(p.ShapeType.roundRect,{x,y:1.4,w:3.7,h:3.9,fill:{color:BLANCO},rectRadius:0.12,
      shadow:{type:'outer',blur:8,offset:1,angle:90,color:'BFBFBF',opacity:0.25}});
    s.addShape(p.ShapeType.ellipse,{x:x+0.3,y:1.68,w:0.26,h:0.26,fill:{color:c}});
    s.addText(t,{x:x+0.68,y:1.6,w:2.85,h:0.42,fontSize:13,bold:true,color:TINTA,fontFace:TITULAR,isTextBox:true,margin:0});
    s.addText(items.map((it,j)=>({text:it,options:{bullet:true,breakLine:j<items.length-1}})),
      {x:x+0.3,y:2.15,w:3.1,h:3.0,fontSize:12,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0,paraSpaceAfter:9});
  });
  s.addText('Del proceso: verificar cada artefacto examinándolo · comprobar qué mide cada herramienta antes de actuar · instrumentar y medir antes de encadenar hipótesis.',
    {x:M,y:5.6,w:11.6,h:0.8,fontSize:13,italic:true,color:GRIS,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addNotes('Diapositiva 21');
}

// ═════ 22 · Innovación ═════
{
  const s = oscuro();
  titulo(s,'Innovación: el equilibrio como dato',ESPIRITUAL,true);
  s.addText('KAVI ya clasifica cada actividad por dimensión. Ese dato, acumulado, permite algo que ningún calendario hace hoy.',
    {x:M,y:1.3,w:11.6,h:0.6,fontSize:16,color:PAPEL,fontFace:CUERPO,isTextBox:true,margin:0});
  const ps=[['1','Detectar','Semanas sin ninguna actividad de una dimensión. Reglas sobre datos propios: no hace falta aprendizaje automático.',FISICA],
            ['2','Proponer','El cálculo de disponibilidad ya existe y sabe cruzar agendas. Puede sugerir un hueco concreto, no un consejo genérico.',SOCIAL],
            ['3','Con IA, después','Redactaría la sugerencia en lenguaje natural y aprendería qué propuestas aceptas. La base de reglas se mantiene explicable.',ESPIRITUAL]];
  ps.forEach(([n,t,d,c],i)=>{
    const x=M+i*3.95;
    s.addShape(p.ShapeType.roundRect,{x,y:2.1,w:3.7,h:3.3,fill:{color:'1C1C1C'},rectRadius:0.12});
    s.addShape(p.ShapeType.ellipse,{x:x+0.32,y:2.4,w:0.46,h:0.46,fill:{color:c}});
    s.addText(n,{x:x+0.32,y:2.4,w:0.46,h:0.46,align:'center',valign:'middle',fontSize:17,bold:true,
      color:BLANCO,fontFace:TITULAR,isTextBox:true,margin:0});
    s.addText(t,{x:x+0.32,y:3.0,w:3.1,h:0.42,fontSize:15.5,bold:true,color:PAPEL,fontFace:TITULAR,isTextBox:true,margin:0});
    s.addText(d,{x:x+0.32,y:3.5,w:3.1,h:1.8,fontSize:12.5,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
  });
  s.addText('La innovación no es añadir IA. Es que el producto ya recoge el dato que la haría útil.',
    {x:M,y:5.75,w:11.6,h:0.6,fontSize:17,bold:true,italic:true,color:ORO,fontFace:CUERPO,isTextBox:true,margin:0});
  s.addNotes('Diapositiva 22 · la última frase es el remate.');
}

// ═════ 23 · Cierre ═════
{
  const s = slide('fondo-portada');
  s.addImage({path:A+'wordmark-solo-claro.png',x:W/2-2.5,y:1.45,w:5.0,h:1.33});
  s.addText('kavi-proyecto-is.vercel.app',{x:0,y:3.0,w:W,h:0.45,align:'center',fontSize:17,
    color:INTELECTUAL,fontFace:CUERPO,isTextBox:true,margin:0});
  [['1 564','pruebas'],['84 %','cobertura'],['0','bugs'],['0','riesgo alto']].forEach(([v,l],i)=>{
    const x=W/2-5.4+i*2.7;
    s.addText(v,{x,y:3.85,w:2.4,h:0.65,align:'center',fontSize:28,bold:true,color:PAPEL,fontFace:TITULAR,isTextBox:true,margin:0});
    s.addText(l,{x,y:4.5,w:2.4,h:0.4,align:'center',fontSize:12.5,color:GRIS_CLARO,fontFace:CUERPO,isTextBox:true,margin:0});
  });
  s.addText('Gracias. ¿Preguntas?',{x:0,y:5.35,w:W,h:0.55,align:'center',fontSize:20,color:PAPEL,
    fontFace:CUERPO,isTextBox:true,margin:0});
  nobi(s,'pink',1.0,5.6,1.1); nobi(s,'blue',11.2,5.6,1.1);
  s.addNotes('Cierre. Respira y espera la pregunta.');
}

p.writeFile({fileName:process.argv[2]}).then(f=>console.log('generado:',f));
