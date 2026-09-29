import { chromium } from 'playwright-core';
const A = process.cwd() + '/art';
const b = await chromium.launch({ channel: 'chrome' });

/**
 * Fondo con formas organicas en las esquinas y una linea fina que las acompana,
 * al estilo de la referencia. Las formas entran desde fuera y no invaden el centro.
 */
async function fondo(nombre, base, forma, linea, extras = '') {
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 })).newPage();
  await p.setContent(`<style>html,body{margin:0}svg{display:block}</style>
  <svg width="1600" height="900" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
    <rect width="1600" height="900" fill="${base}"/>
    <!-- Esquina superior izquierda -->
    <path d="M-40,-40 L250,-40 C238,42 190,84 122,110 C64,132 18,120 -40,152 Z" fill="${forma}"/>
    <path d="M292,-30 C268,56 208,104 128,134 C62,159 20,150 -30,182"
          fill="none" stroke="${linea}" stroke-width="4" stroke-linecap="round"/>
    <!-- Esquina inferior derecha -->
    <path d="M1640,940 L1350,940 C1362,858 1410,816 1478,790 C1536,768 1582,780 1640,748 Z" fill="${forma}"/>
    <path d="M1308,930 C1332,844 1392,796 1472,766 C1538,741 1580,750 1630,718"
          fill="none" stroke="${linea}" stroke-width="4" stroke-linecap="round"/>
    ${extras}
  </svg>`);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${A}/${nombre}.png` });
  await p.close();
}

// Puntos de dimension: el motivo de KAVI, discreto, en una esquina libre.
const puntos = (x, y, r, op) => Array.from({ length: 7 }, (_, i) =>
  `<circle cx="${x + i * (r * 2.9)}" cy="${y}" r="${r}" fill="${
    ['#4CAF50','#E91E63','#FF9800','#2196F3','#9C27B0','#009688','#607D8B'][i]}" opacity="${op}"/>`).join('');

await fondo('fondo-claro', '#F2F2F2', '#131313', '#C8A27A');
await fondo('fondo-oscuro', '#131313', '#1F1F1F', '#C8A27A');
await fondo('fondo-limpio', '#F2F2F2', '#E6E6E6', '#D8C3A8');
await fondo('fondo-portada', '#131313', '#1C1C1C', '#C8A27A');

await b.close();
console.log('fondos rehechos');
