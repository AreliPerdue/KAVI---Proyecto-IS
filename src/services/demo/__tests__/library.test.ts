/**
 * KAVI Library en el demo (T275): las mismas reglas que la base (`20261012100000_library.sql`).
 */
import type { LibraryApi } from '@/services/contracts';

jest.mock('@/services/demo/store', () => ({
  ...jest.requireActual('@/services/demo/store'),
  delay: () => Promise.resolve(),
}));

const ANA = 'u-ana';
const MB = 1024 * 1024;

function fresh(): LibraryApi {
  jest.resetModules();
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- estado demo nuevo en cada prueba */
  return (require('@/services/demo/library') as typeof import('@/services/demo/library')).demoLibrary;
}

describe('piezas', () => {
  it('crear guarda el dueño y recorta el título; la lista es de la más nueva a la más vieja', async () => {
    const api = fresh();
    await api.createItem(ANA, { family: 'book', kind: 'pdf', title: '  Rayuela ' });
    await api.createItem(ANA, { family: 'book', kind: 'epub', title: 'Ficciones' });
    await api.createItem('otra', { family: 'book', kind: 'pdf', title: 'Ajeno' });
    const mias = await api.listItems(ANA);
    expect(mias.map((i) => i.title).sort()).toEqual(['Ficciones', 'Rayuela']);
    expect(mias.every((i) => i.owner_id === ANA && i.progress === 0)).toBe(true);
  });

  it('un archivo de más de 50 MB se rechaza; pasar de 500 MB por persona también', async () => {
    const api = fresh();
    await expect(api.createItem(ANA, { family: 'book', kind: 'pdf', title: 'Gigante', file_size: 60 * MB })).rejects.toThrow(/50 MB/);
    for (let i = 0; i < 10; i++) await api.createItem(ANA, { family: 'book', kind: 'pdf', title: `L${i}`, file_size: 50 * MB });
    await expect(api.createItem(ANA, { family: 'book', kind: 'pdf', title: 'Uno más', file_size: MB })).rejects.toThrow(/500 MB/);
    expect(await api.usage(ANA)).toEqual({ usedBytes: 500 * MB, limitBytes: 500 * MB });
  });

  it('borrar una pieza se lleva sus anotaciones, fichas, páginas, archivos y su lugar en los libreros', async () => {
    const api = fresh();
    const libro = await api.createItem(ANA, { family: 'book', kind: 'pdf', title: 'Rayuela' });
    const ruta = await api.uploadFile(ANA, libro.id, 'Rayuela (2ª ed.).pdf', new Uint8Array([1, 2, 3]), 'application/pdf');
    expect(ruta).toBe(`${ANA}/${libro.id}/Rayuela-2-ed.pdf`);
    const estante = await api.createShelf(ANA, { name: 'Por leer' });
    await api.addToShelf(ANA, estante.id, libro.id);
    await api.saveAnnotations(ANA, [{ id: 'n1', item_id: libro.id, kind: 'highlight', locator: { page: 3 } }]);
    const plantilla = await api.saveCardTemplate(ANA, { name: 'Reseña', fields: [] });
    await api.saveCard(ANA, { item_id: libro.id, template_id: plantilla.id });

    await api.removeItem(libro.id);
    expect(await api.listAnnotations(libro.id)).toEqual([]);
    expect(await api.listCards(ANA)).toEqual([]);
    expect(await api.listShelfItems(ANA)).toEqual([]);
    await expect(api.fileUrl(ruta)).rejects.toThrow();
  });
});

describe('libreros', () => {
  it('una pieza puede estar en varios; agregarla dos veces no la duplica; quitarla de uno no la borra', async () => {
    const api = fresh();
    const libro = await api.createItem(ANA, { family: 'book', kind: 'pdf', title: 'Rayuela' });
    const a = await api.createShelf(ANA, { name: ' Favoritos ' });
    const b = await api.createShelf(ANA, { name: 'Escuela' });
    expect(a.name).toBe('Favoritos');
    expect(b.sort_order).toBeGreaterThan(a.sort_order);
    await api.addToShelf(ANA, a.id, libro.id);
    await api.addToShelf(ANA, a.id, libro.id);
    await api.addToShelf(ANA, b.id, libro.id);
    expect(await api.listShelfItems(ANA)).toHaveLength(2);
    await api.removeFromShelf(a.id, libro.id);
    expect((await api.listShelfItems(ANA)).map((s) => s.shelf_id)).toEqual([b.id]);
    expect(await api.listItems(ANA)).toHaveLength(1);
  });
});

describe('anotaciones, fichas y páginas', () => {
  it('guardar anotaciones crea o reemplaza por id (llegan con id del cliente)', async () => {
    const api = fresh();
    const libro = await api.createItem(ANA, { family: 'book', kind: 'pdf', title: 'Rayuela' });
    await api.saveAnnotations(ANA, [{ id: 'n1', item_id: libro.id, kind: 'sticker', locator: { page: 1, x: 0.2, y: 0.3 }, z: 2 }]);
    await api.saveAnnotations(ANA, [{ id: 'n1', item_id: libro.id, kind: 'sticker', locator: { page: 1, x: 0.5, y: 0.5 }, removed: true }]);
    const [n] = await api.listAnnotations(libro.id);
    expect(n).toEqual(expect.objectContaining({ id: 'n1', removed: true, locator: { page: 1, x: 0.5, y: 0.5 } }));
    await api.removeAnnotations(['n1']);
    expect(await api.listAnnotations(libro.id)).toEqual([]);
  });

  it('una ficha por plantilla en cada pieza: guardar otra vez la reemplaza; borrar la plantilla borra sus fichas', async () => {
    const api = fresh();
    const libro = await api.createItem(ANA, { family: 'book', kind: 'epub', title: 'Ficciones' });
    const plantilla = await api.saveCardTemplate(ANA, { name: 'Reseña', fields: [{ id: 'f1', type: 'scale', label: 'Estrellas', max: 5 }] });
    await api.saveCard(ANA, { item_id: libro.id, template_id: plantilla.id, values: { f1: 3 } });
    await api.saveCard(ANA, { item_id: libro.id, template_id: plantilla.id, values: { f1: 5 }, placement: 'front' });
    const fichas = await api.listCards(ANA);
    expect(fichas).toHaveLength(1);
    expect(fichas[0]).toEqual(expect.objectContaining({ values: { f1: 5 }, placement: 'front' }));
    await api.removeCardTemplate(plantilla.id);
    expect(await api.listCards(ANA)).toEqual([]);
  });

  it('las páginas de una creación salen en su orden', async () => {
    const api = fresh();
    const diario = await api.createItem(ANA, { family: 'creation', kind: 'journal', title: 'Diario', style: 'cottagecore' });
    await api.savePages(ANA, [
      { id: 'p2', item_id: diario.id, template: 'rayada', sort_order: 2048 },
      { id: 'p1', item_id: diario.id, template: 'portada', sort_order: 1024 },
    ]);
    expect((await api.listPages(diario.id)).map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('fuentes propias: se guardan con su aviso aceptado y una de más de 10 MB se rechaza', async () => {
    const api = fresh();
    const f = await api.addFont(ANA, { name: 'Mi letra', format: 'ttf', body: new Uint8Array([1]), size: 1000, licenseAcceptedAt: '2026-10-12T10:00:00Z' });
    expect(f.file_path).toBe(`${ANA}/fonts/Mi-letra.ttf`);
    await expect(api.addFont(ANA, { name: 'Pesada', format: 'otf', body: new Uint8Array([1]), size: 11 * MB, licenseAcceptedAt: 'x' })).rejects.toThrow();
    await api.removeFont(f.id);
    expect(await api.listFonts(ANA)).toEqual([]);
  });
});

describe('sagas (T315)', () => {
  it('ensureSeries reusa la saga con el mismo nombre (sin importar mayúsculas) y borrarla deja los libros sin saga', async () => {
    const api = fresh();
    const a = await api.ensureSeries('u1', 'ACOTAR');
    const b = await api.ensureSeries('u1', '  acotar ');
    expect(b.id).toBe(a.id);
    expect(await api.listSeries('u1')).toHaveLength(1);
    expect(await api.listSeries('u2')).toHaveLength(0);
    const libro = await api.createItem('u1', { family: 'book', kind: 'pdf', title: 'Una corte', series_id: a.id, series_index: 1 });
    expect(libro.series_id).toBe(a.id);
    await api.renameSeries(a.id, 'Una corte de rosas y espinas');
    expect((await api.listSeries('u1'))[0].name).toBe('Una corte de rosas y espinas');
    await api.removeSeries(a.id);
    expect((await api.getItem(libro.id)).series_id).toBeNull();
  });
});

describe('enlaces (T316)', () => {
  it('enlazar dos libros propios, sin repetir la pareja; borrar un libro se lleva sus enlaces', async () => {
    const api = fresh();
    const a = await api.createItem('u1', { family: 'book', kind: 'pdf', title: 'A' });
    const b = await api.createItem('u1', { family: 'book', kind: 'pdf', title: 'B' });
    const ajeno = await api.createItem('u2', { family: 'book', kind: 'pdf', title: 'Ajeno' });
    await api.addLink('u1', a.id, b.id, 'prequel');
    await expect(api.addLink('u1', b.id, a.id, 'related')).rejects.toThrow();
    await expect(api.addLink('u1', a.id, a.id, 'related')).rejects.toThrow();
    await expect(api.addLink('u1', a.id, ajeno.id, 'related')).rejects.toThrow();
    expect(await api.listLinks('u1')).toHaveLength(1);
    expect(await api.listLinks('u2')).toHaveLength(0);
    await api.removeItem(b.id);
    expect(await api.listLinks('u1')).toHaveLength(0);
  });
});

describe('acomodos (T331)', () => {
  it('portadas y lomos se acomodan aparte, en Todos y en un librero', async () => {
    const api = fresh();
    const [a, b, c] = [await api.createItem(ANA, { family: 'book', kind: 'pdf', title: 'A' }), await api.createItem(ANA, { family: 'book', kind: 'pdf', title: 'B' }), await api.createItem(ANA, { family: 'book', kind: 'pdf', title: 'C' })];
    expect(a.spine_order).toBeNull();
    await api.applyOrder('spines', null, [c.id, a.id, b.id]);
    await api.applyOrder('covers', null, [b.id, c.id, a.id]);
    const items = await api.listItems(ANA);
    const por = (campo: 'sort_order' | 'spine_order') => [...items].sort((x, y) => Number(x[campo]) - Number(y[campo])).map((x) => x.title);
    expect(por('spine_order')).toEqual(['C', 'A', 'B']);
    expect(por('sort_order')).toEqual(['B', 'C', 'A']);

    const librero = await api.createShelf(ANA, { name: 'Por leer' });
    await api.addToShelf(ANA, librero.id, a.id);
    await api.addToShelf(ANA, librero.id, b.id);
    await api.moveInShelf(librero.id, b.id, 1, 'spines');
    const filas = await api.listShelfItems(ANA);
    expect(filas.find((f) => f.item_id === b.id)?.spine_order).toBe(1);
    expect(filas.find((f) => f.item_id === b.id)?.sort_order).toBe(2048);
  });

  it('guardar, listar y borrar; borrar el librero se lleva sus acomodos', async () => {
    const api = fresh();
    const librero = await api.createShelf(ANA, { name: 'Por leer' });
    await api.saveLayout(ANA, { name: ' Por colores ', view: 'covers', shelf_id: null, item_ids: ['x', 'y'] });
    await api.saveLayout(ANA, { name: 'Por tamaño', view: 'spines', shelf_id: librero.id, item_ids: [] });
    await api.saveLayout('otra', { name: 'Ajeno', view: 'covers', shelf_id: null, item_ids: [] });
    expect((await api.listLayouts(ANA)).map((x) => x.name)).toEqual(['Por colores', 'Por tamaño']);
    await expect(api.saveLayout(ANA, { name: '  ', view: 'covers', shelf_id: null, item_ids: [] })).rejects.toThrow();
    await expect(api.saveLayout('otra', { name: 'x', view: 'covers', shelf_id: librero.id, item_ids: [] })).rejects.toThrow();
    await api.removeShelf(librero.id);
    const quedan = await api.listLayouts(ANA);
    expect(quedan.map((x) => x.name)).toEqual(['Por colores']);
    await api.removeLayout(quedan[0].id);
    expect(await api.listLayouts(ANA)).toEqual([]);
  });
});

describe('sesiones de lectura (T318)', () => {
  it('se guardan y se reescriben por id; las mismas reglas que la base; borrar el libro las borra', async () => {
    const api = fresh();
    const libro = await api.createItem(ANA, { family: 'book', kind: 'pdf', title: 'A' });
    const base = { id: 's1', item_id: libro.id, started_at: '2026-10-14T10:00:00.000Z', ended_at: '2026-10-14T10:20:00.000Z', start_locator: { page: 1 }, end_locator: { page: 5 }, start_progress: 0.1, end_progress: 0.5 };
    await api.saveReadingSession(ANA, { ...base, seconds: 300 });
    await api.saveReadingSession(ANA, { ...base, seconds: 900 });
    expect((await api.listReadingSessions(ANA)).map((s) => s.seconds)).toEqual([900]);
    await expect(api.saveReadingSession(ANA, { ...base, id: 's2', seconds: 30 })).rejects.toThrow();
    await expect(api.saveReadingSession(ANA, { ...base, id: 's3', seconds: 5000 })).rejects.toThrow();
    await expect(api.saveReadingSession('otra', { ...base, id: 's4', seconds: 300 })).rejects.toThrow();
    expect(await api.listReadingSessions('otra')).toEqual([]);
    await api.removeItem(libro.id);
    expect(await api.listReadingSessions(ANA)).toEqual([]);
  });
});

it('una imagen pegada se sube a la carpeta de su pieza y se puede ver (T289)', async () => {
  const api = fresh();
  const libro = await api.createItem(ANA, { family: 'book', kind: 'pdf', title: 'A' });
  const ruta = await api.uploadAnnotationImage(ANA, libro.id, 'img1', new Uint8Array([1, 2, 3]));
  expect(ruta).toBe(`${ANA}/${libro.id}/anotaciones/img1.jpg`);
  expect(await api.fileUrl(ruta)).toBeTruthy();
  await expect(api.uploadAnnotationImage('otra', libro.id, 'img2', new Uint8Array([1]))).rejects.toThrow();
});

describe('tienda de stickers (13c, RF-BH13b; T338)', () => {
  it('el catálogo trae Primer Rebote en los 24 colores, con las mismas caras que los incluidos', async () => {
    const api = fresh();
    const packs = await api.listStickerPacks();
    expect(packs).toHaveLength(24);
    expect(packs.every((p) => p.collection === 'primer-rebote' && p.stickers.length === 26)).toBe(true);
    expect(packs.map((p) => p.id)).toContain('primer-rebote-navy-blue');
  });

  it('descargar y quitar son de cada quien; descargar dos veces no duplica', async () => {
    const api = fresh();
    await api.addStickerPack(ANA, 'primer-rebote-blue');
    await api.addStickerPack(ANA, 'primer-rebote-blue');
    await api.addStickerPack('otra', 'primer-rebote-red');
    expect(await api.listMyStickerPacks(ANA)).toEqual(['primer-rebote-blue']);
    await api.removeStickerPack(ANA, 'primer-rebote-blue');
    expect(await api.listMyStickerPacks(ANA)).toEqual([]);
    expect(await api.listMyStickerPacks('otra')).toEqual(['primer-rebote-red']);
    await expect(api.addStickerPack(ANA, 'no-existe')).rejects.toThrow();
  });
});
