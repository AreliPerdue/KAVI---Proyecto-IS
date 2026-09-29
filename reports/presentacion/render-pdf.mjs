import { chromium } from 'playwright-core';
import fs from 'fs';
const b = await chromium.launch({ channel: 'chrome' });
const p = await (await b.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
const pdf = fs.readFileSync('deck.pdf').toString('base64');
await p.setContent(`<canvas id="c"></canvas>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>`);
await p.waitForFunction(() => window.pdfjsLib, null, { timeout: 60000 });
const n = await p.evaluate(async (data) => {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const bin = atob(data); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  window.__doc = await window.pdfjsLib.getDocument({ data: arr }).promise;
  return window.__doc.numPages;
}, pdf);
console.log('paginas:', n);
fs.mkdirSync('pg', { recursive: true });
for (let i = 1; i <= n; i++) {
  const b64 = await p.evaluate(async (i) => {
    const page = await window.__doc.getPage(i);
    const vp = page.getViewport({ scale: 1.25 });
    const c = document.getElementById('c');
    c.width = vp.width; c.height = vp.height;
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    return c.toDataURL('image/jpeg', 0.82).split(',')[1];
  }, i);
  fs.writeFileSync(`pg/${String(i).padStart(2, '0')}.jpg`, Buffer.from(b64, 'base64'));
}
await b.close();
console.log('renderizadas');
