import { strToU8, zipSync, zlibSync } from 'fflate';

/** Un PNG RGB de 8 bits de un solo color, con cada fila en un filtro distinto (0–4). */
export function pngDeColor(ancho: number, alto: number, [r, g, b]: [number, number, number]): Uint8Array {
  const fila = ancho * 3;
  const crudo = new Uint8Array(alto * (fila + 1));
  let anterior = new Uint8Array(fila);
  for (let y = 0; y < alto; y++) {
    const pixeles = new Uint8Array(fila);
    for (let x = 0; x < ancho; x++) pixeles.set([r, g, b], x * 3);
    const filtro = y % 5;
    crudo[y * (fila + 1)] = filtro;
    for (let x = 0; x < fila; x++) {
      const a = x >= 3 ? pixeles[x - 3] : 0;
      const arriba = anterior[x];
      const c = x >= 3 ? anterior[x - 3] : 0;
      const p = a + arriba - c;
      const paeth = Math.abs(p - a) <= Math.abs(p - arriba) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - arriba) <= Math.abs(p - c) ? arriba : c;
      const prediccion = [0, a, arriba, (a + arriba) >> 1, paeth][filtro];
      crudo[y * (fila + 1) + 1 + x] = (pixeles[x] - prediccion) & 0xff;
    }
    anterior = pixeles;
  }
  const trozo = (tipo: string, datos: Uint8Array) => {
    const salida = new Uint8Array(12 + datos.length);
    new DataView(salida.buffer).setUint32(0, datos.length);
    salida.set(strToU8(tipo), 4);
    salida.set(datos, 8);
    return salida; // El CRC queda en cero: el lector de KAVI no lo revisa.
  };
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, ancho);
  v.setUint32(4, alto);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const partes = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), trozo('IHDR', ihdr), trozo('IDAT', zlibSync(crudo)), trozo('IEND', new Uint8Array(0))];
  const total = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of partes) {
    total.set(p, i);
    i += p.length;
  }
  return total;
}

type Opciones = {
  /** El bloque `<metadata>` del OPF. */
  metadata?: string;
  /** Las entradas de `<manifest>`. */
  manifest?: string;
  /** Archivos de más (ruta → texto o bytes). */
  extra?: Record<string, string | Uint8Array>;
  sinContainer?: boolean;
};

/** Un EPUB mínimo con su OPF en `OEBPS/content.opf`. */
export function epub({ metadata = '', manifest = '', extra = {}, sinContainer = false }: Opciones = {}): Uint8Array {
  const archivos: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {
    // `mimetype` va primero y sin comprimir, como pide el estándar.
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
  };
  if (!sinContainer) {
    archivos['META-INF/container.xml'] = strToU8(
      '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
    );
  }
  archivos['OEBPS/content.opf'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/">${metadata}</metadata><manifest>${manifest}</manifest><spine/></package>`,
  );
  for (const [ruta, contenido] of Object.entries(extra)) archivos[ruta] = typeof contenido === 'string' ? strToU8(contenido) : contenido;
  return zipSync(archivos);
}
