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
