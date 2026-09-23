#!/usr/bin/env node
/**
 * Convierte el resultado de Jest al formato de ejecución genérica de SonarQube.
 *
 * La cobertura ya viaja por `lcov`, pero eso solo le dice a Sonar qué líneas se
 * ejercen, no que exista una suite: sin este informe el panel muestra la
 * cobertura y deja en blanco el número de pruebas. Con él aparecen las 1 335,
 * su duración y cuántas pasan.
 *
 *   node scripts/sonar-pruebas.mjs <resultado.json> [salida.xml]
 *
 * Formato: https://docs.sonarsource.com/sonarqube-cloud/enriching/test-execution-parameters/
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, relative } from 'node:path';

const [, , rutaResultado, salida = 'reports/pruebas/ejecucion-sonar.xml'] = process.argv;

/** Los cinco caracteres que XML no admite en texto ni en atributos. */
function escapar(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const resultado = JSON.parse(readFileSync(rutaResultado, 'utf8'));
const lineas = ['<?xml version="1.0" encoding="UTF-8"?>', '<testExecutions version="1">'];

for (const archivo of resultado.testResults) {
  // Sonar espera la ruta relativa a la raíz del proyecto, igual que la indexó.
  const ruta = relative(process.cwd(), archivo.name);
  lineas.push(`  <file path="${escapar(ruta)}">`);

  for (const prueba of archivo.assertionResults) {
    // El nombre completo incluye los `describe`, que es como se lee en el panel.
    const nombre = escapar([...prueba.ancestorTitles, prueba.title].join(' › '));
    const duracion = Math.max(0, Math.round(prueba.duration ?? 0));

    if (prueba.status === 'failed') {
      const detalle = escapar((prueba.failureMessages ?? []).join('\n').replace(/\u001b\[[0-9;]*m/g, '').slice(0, 2000));
      lineas.push(`    <testCase name="${nombre}" duration="${duracion}">`);
      lineas.push(`      <failure message="Falló"><![CDATA[${detalle.slice(0, 2000)}]]></failure>`);
      lineas.push('    </testCase>');
    } else if (prueba.status === 'pending' || prueba.status === 'todo' || prueba.status === 'disabled') {
      lineas.push(`    <testCase name="${nombre}" duration="${duracion}">`);
      lineas.push('      <skipped message="Pendiente"/>');
      lineas.push('    </testCase>');
    } else {
      lineas.push(`    <testCase name="${nombre}" duration="${duracion}"/>`);
    }
  }
  lineas.push('  </file>');
}
lineas.push('</testExecutions>', '');

mkdirSync(dirname(salida), { recursive: true });
writeFileSync(salida, lineas.join('\n'));

const total = resultado.numTotalTests;
console.log(`${salida}: ${total} pruebas en ${resultado.testResults.length} archivos`);
