#!/usr/bin/env node
/**
 * Convierte la salida de Jest en un resumen legible.
 *
 * En GitHub Actions lo escribe en el panel del workflow ($GITHUB_STEP_SUMMARY),
 * que es lo que se ve al abrir la ejecución sin tener que desplegar los logs. En
 * local lo imprime en pantalla.
 *
 *   node scripts/resumen-pruebas.mjs <resultado.json> [coverage-summary.json]
 */
import { readFileSync, appendFileSync, existsSync } from 'node:fs';

const [, , rutaResultado, rutaCobertura] = process.argv;

const lineas = [];
const w = (t = '') => lineas.push(t);
const publicar = () => {
  const texto = lineas.join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${texto}\n`);
  else console.log(texto);
};

// Si Jest se cayo antes de escribir el resultado no hay nada que resumir, pero
// el fallo tiene que verse igual en el panel y no como un error del script.
if (!existsSync(rutaResultado)) {
  w('## ❌ Las pruebas no llegaron a ejecutarse');
  w();
  w('Jest terminó sin escribir su resultado. El motivo está en los registros del paso anterior.');
  publicar();
  process.exit(1);
}

const resultado = JSON.parse(readFileSync(rutaResultado, 'utf8'));
const fallaron = resultado.numFailedTests > 0 || resultado.numFailedTestSuites > 0;
// Se mide con las marcas del propio resultado, no con la hora actual: asi el
// resumen sigue siendo correcto aunque se genere mucho despues de la corrida.
const fin = Math.max(0, ...resultado.testResults.map((r) => r.endTime ?? 0));
const segundos = resultado.startTime && fin > resultado.startTime
  ? Math.round((fin - resultado.startTime) / 1000)
  : null;

w(`## ${fallaron ? '❌ Hay pruebas rotas' : '✅ Todas las pruebas pasaron'}`);
w();
w('| | |');
w('|---|---|');
w(`| Pruebas ejecutadas | **${resultado.numTotalTests}** |`);
w(`| Superadas | ${resultado.numPassedTests} |`);
w(`| Fallidas | ${resultado.numFailedTests > 0 ? `**${resultado.numFailedTests}**` : '0'} |`);
if (resultado.numPendingTests > 0) w(`| Pendientes o saltadas | ${resultado.numPendingTests} |`);
w(`| Archivos de prueba | ${resultado.numTotalTestSuites} |`);
if (segundos !== null) w(`| Duración | ~${segundos} s |`);
w();

/** Lo que de verdad importa cuando algo se rompe: qué y dónde. */
if (fallaron) {
  w('### Qué se rompió');
  w();
  for (const archivo of resultado.testResults) {
    const rotas = archivo.assertionResults.filter((a) => a.status === 'failed');
    if (rotas.length === 0 && !archivo.message) continue;
    const nombre = archivo.name.replace(`${process.cwd()}/`, '');
    w(`<details><summary><strong>${nombre}</strong> — ${rotas.length} fallando</summary>`);
    w();
    for (const prueba of rotas) {
      w(`- **${[...prueba.ancestorTitles, prueba.title].join(' › ')}**`);
      const detalle = (prueba.failureMessages ?? []).join('\n').split('\n').slice(0, 12).join('\n');
      if (detalle.trim()) {
        w();
        w('  ```');
        for (const l of detalle.split('\n')) w(`  ${l.replace(/\u001b\[[0-9;]*m/g, '')}`);
        w('  ```');
      }
    }
    w();
    w('</details>');
    w();
  }
}

if (rutaCobertura && existsSync(rutaCobertura)) {
  const { total } = JSON.parse(readFileSync(rutaCobertura, 'utf8'));
  const fila = (etiqueta, m) => `| ${etiqueta} | ${m.pct} % | ${m.covered} / ${m.total} |`;
  w('## Cobertura del código');
  w();
  w('| Métrica | % | |');
  w('|---|---|---|');
  w(fila('**Sentencias**', total.statements));
  w(fila('**Líneas**', total.lines));
  w(fila('Ramas', total.branches));
  w(fila('Funciones', total.functions));
  w();
  const objetivo = 80;
  w(total.statements.pct >= objetivo
    ? `Por encima del objetivo del ${objetivo} %.`
    : `⚠️ Por debajo del objetivo del ${objetivo} %.`);
  w();
}

/**
 * Tipos y lint corren en pasos aparte y se dejan continuar aunque fallen, para
 * que una sola ejecución enseñe todos los problemas de golpe en vez de uno por
 * corrida. Sus resultados llegan aquí por variables de entorno.
 */
const otras = [
  ['Verificación de tipos', process.env.ESTADO_TIPOS],
  ['Lint', process.env.ESTADO_LINT],
].filter(([, estado]) => estado);

let otrasFallaron = false;
if (otras.length > 0) {
  w('## Otras comprobaciones');
  w();
  w('| | |');
  w('|---|---|');
  for (const [nombre, estado] of otras) {
    const ok = estado === 'success';
    if (!ok) otrasFallaron = true;
    w(`| ${nombre} | ${ok ? '✅ sin problemas' : `❌ ${estado}`} |`);
  }
  w();
}

if (!fallaron && !otrasFallaron) {
  w('_El detalle de qué comprueba cada prueba está en_ `reports/pruebas/Listado de pruebas.md`.');
}

publicar();
process.exit(fallaron || otrasFallaron ? 1 : 0);
