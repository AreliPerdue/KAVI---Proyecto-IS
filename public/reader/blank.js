/**
 * La página en blanco del lienzo creativo (spec 13h, RF-CC4; T351). Un recorte o una página del Journal es un
 * "PDF" de páginas vacías con la proporción de la serie ISO A (1 : √2, la de A5) que arma el motor. Así el
 * lienzo se abre en el mismo visor que un libro y comparte el zoom, las formas de leer y la capa de lo pegado,
 * donde viven sus elementos.
 */

/** A5 en puntos de PDF (148 × 210 mm). */
const A5 = { corto: 419.53, largo: 595.28 };

/** Los bytes de un PDF de `paginas` hojas en blanco, verticales u horizontales. */
export function pdfEnBlanco(orientacion = 'portrait', paginas = 1) {
  const n = Math.min(Math.max(1, Math.floor(paginas) || 1), 200);
  const [ancho, alto] = orientacion === 'landscape' ? [A5.largo, A5.corto] : [A5.corto, A5.largo];
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${Array.from({ length: n }, (_, i) => `${i + 3} 0 R`).join(' ')}] /Count ${n} >>`,
    ...Array.from({ length: n }, () => `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ancho} ${alto}] /Resources << >> >>`),
  ];
  let texto = '%PDF-1.4\n';
  const lugares = [];
  objetos.forEach((cuerpo, i) => {
    lugares.push(texto.length);
    texto += `${i + 1} 0 obj\n${cuerpo}\nendobj\n`;
  });
  const xref = texto.length;
  texto += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const lugar of lugares) texto += `${String(lugar).padStart(10, '0')} 00000 n \n`;
  texto += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(texto);
}
