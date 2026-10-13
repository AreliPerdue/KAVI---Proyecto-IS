/** Importar un EPUB (RF-BL12 – RF-BL14, T278): datos del OPF, portada y DRM. */
import { epub, pngDeColor } from './epub-fixture';

import { es } from '@/i18n/es';
import { colorDominante, pixelesPng } from '@/lib/library/import/dominant-color';
import { leerEpub } from '@/lib/library/import/epub';

const portadaPng = pngDeColor(4, 6, [30, 39, 97]);

it('lee título, autores y temas del OPF, con entidades', () => {
  const datos = leerEpub(
    epub({
      metadata:
        '<dc:title>Rayuela &amp; otros</dc:title><dc:creator id="a1">Julio Cortázar</dc:creator><dc:creator>Cortázar, Julio</dc:creator><dc:subject>Novela</dc:subject><dc:subject> Novela </dc:subject><dc:subject>Clásicos</dc:subject>',
    }),
  );
  expect(datos).toEqual({ title: 'Rayuela & otros', authors: ['Julio Cortázar', 'Cortázar, Julio'], genres: ['Novela', 'Clásicos'], pageCount: null, cover: null, serie: null });
});

it('EPUB 3: la portada es la imagen con properties="cover-image"', () => {
  const datos = leerEpub(
    epub({
      metadata: '<dc:title>Ficciones</dc:title>',
      manifest:
        '<item id="otra" href="img/otra.png" media-type="image/png"/><item id="c" href="img/portada%20final.png" media-type="image/png" properties="cover-image"/>',
      extra: { 'OEBPS/img/otra.png': pngDeColor(1, 1, [0, 0, 0]), 'OEBPS/img/portada final.png': portadaPng },
    }),
  );
  expect(datos.cover).toEqual({ bytes: portadaPng, mime: 'image/png', ext: 'png' });
});

it('EPUB 2: la portada la señala <meta name="cover">, aunque esté fuera de la carpeta del OPF', () => {
  const datos = leerEpub(
    epub({
      metadata: '<dc:title>Aura</dc:title><meta name="cover" content="imagen-1"/>',
      manifest: '<item id="imagen-1" href="../Images/tapa.jpg" media-type="image/jpeg"/>',
      extra: { 'Images/tapa.jpg': portadaPng },
    }),
  );
  expect(datos.cover?.ext).toBe('jpg');
  expect(datos.cover?.bytes).toEqual(portadaPng);
});

it('sin portada declarada, usa una imagen llamada "cover"', () => {
  const datos = leerEpub(epub({ manifest: '<item id="i9" href="cover.png" media-type="image/png"/>', extra: { 'OEBPS/cover.png': portadaPng } }));
  expect(datos.cover?.bytes).toEqual(portadaPng);
  expect(datos.title).toBeUndefined();
});

it('una portada declarada que no está en el zip no rompe la importación', () => {
  expect(leerEpub(epub({ manifest: '<item id="c" href="no-esta.png" media-type="image/png" properties="cover-image"/>' })).cover).toBeNull();
});

describe('DRM (RF-BL14)', () => {
  it.each([
    ['Adobe', { 'META-INF/rights.xml': '<rights/>' }],
    ['Apple', { 'META-INF/sinf.xml': '<sinf/>' }],
    ['capítulos cifrados', { 'META-INF/encryption.xml': '<encryption><EncryptedData><EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/></EncryptedData></encryption>' }],
  ])('%s: se rechaza y dice por qué', (_, extra) => {
    expect(() => leerEpub(epub({ extra }))).toThrow(es.errors.libraryDrm);
  });

  it('las fuentes ofuscadas no cuentan como candado', () => {
    const extra = { 'META-INF/encryption.xml': '<encryption><EncryptedData><EncryptionMethod Algorithm="http://www.idpf.org/2008/embedding"/></EncryptedData></encryption>' };
    expect(leerEpub(epub({ metadata: '<dc:title>Libre</dc:title>', extra })).title).toBe('Libre');
  });
});

it('sin container.xml, o si no es zip, está dañado', () => {
  expect(() => leerEpub(epub({ sinContainer: true }))).toThrow(es.errors.libraryDamaged);
  expect(() => leerEpub(new Uint8Array([1, 2, 3]))).toThrow(es.errors.libraryDamaged);
});

describe('color de la portada (RF-BL13)', () => {
  it('lee los píxeles de un PNG con todos los filtros de fila', () => {
    const pixeles = pixelesPng(portadaPng);
    expect(pixeles).not.toBeNull();
    expect([...(pixeles as Uint8Array).subarray(0, 4)]).toEqual([30, 39, 97, 255]);
    expect(colorDominante(pixeles as Uint8Array)).toBe('#1E2761');
  });

  it('gana el color más extendido, promediado, y lo transparente no cuenta', () => {
    const rgba = new Uint8Array([
      ...[250, 250, 250, 255],
      ...[200, 10, 10, 255],
      ...[204, 14, 14, 255],
      ...[0, 0, 255, 0],
      ...[0, 0, 255, 0],
      ...[0, 0, 255, 0],
    ]);
    expect(colorDominante(rgba)).toBe('#CA0C0C');
    expect(colorDominante(new Uint8Array([0, 0, 0, 0]))).toBeNull();
  });

  it('un PNG que no sabe leer da null', () => {
    expect(pixelesPng(new Uint8Array(40))).toBeNull();
  });
});

describe('saga desde el EPUB (RF-BL24)', () => {
  it('EPUB 3: belongs-to-collection con su group-position', () => {
    const datos = leerEpub(
      epub({
        metadata:
          '<dc:title>Una corte de niebla y furia</dc:title><meta property="belongs-to-collection" id="c01">Una corte de rosas y espinas</meta><meta refines="#c01" property="collection-type">series</meta><meta refines="#c01" property="group-position">2</meta>',
      }),
    );
    expect(datos.serie).toEqual({ nombre: 'Una corte de rosas y espinas', numero: 2 });
  });

  it('Calibre: calibre:series y calibre:series_index', () => {
    const datos = leerEpub(epub({ metadata: '<dc:title>X</dc:title><meta name="calibre:series" content="Harry Potter"/><meta name="calibre:series_index" content="1.5"/>' }));
    expect(datos.serie).toEqual({ nombre: 'Harry Potter', numero: 1.5 });
  });

  it('sin número, la saga sin número; sin saga, nada', () => {
    expect(leerEpub(epub({ metadata: '<meta name="calibre:series" content="Sola"/>' })).serie).toEqual({ nombre: 'Sola', numero: null });
    expect(leerEpub(epub({ metadata: '<dc:title>Suelto</dc:title>' })).serie).toBeNull();
  });
});
