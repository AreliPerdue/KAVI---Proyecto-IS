import { chromium } from 'playwright-core';
import fs from 'fs';
const N = '/Users/Areli/Desktop/kaviland/KAVI---Proyecto-IS/assets/nobi/light/';
const OUT = process.cwd() + '/art/nobi-claro/';
const b = await chromium.launch({ channel: 'chrome' });
const p = await (await b.newContext({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 2 })).newPage();

// El PNG del Nobi lleva su fondo pintado. Se recorta en circulo y se deja el
// resto transparente, para que se pose sobre cualquier fondo de la presentacion.
for (const f of fs.readdirSync(N).filter(x => x.endsWith('.png'))) {
  const b64 = fs.readFileSync(N + f).toString('base64');
  await p.setContent(`<style>html,body{margin:0;background:transparent}
    .n{width:512px;height:512px;border-radius:50%;overflow:hidden;
       background:url(data:image/png;base64,${b64}) center/cover}</style><div class="n"></div>`);
  await p.waitForTimeout(160);
  await p.screenshot({ path: OUT + f, omitBackground: true });
}
await b.close();
console.log('nobis recortados:', fs.readdirSync(OUT).length);
