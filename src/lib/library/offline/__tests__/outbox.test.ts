/** Cola local de KAVI Library (RF-BR3, T285): el avance leído sin red se guarda y sube al volver. */
const mockDisco = new Map<string, unknown>();
jest.mock('@/lib/storage', () => ({
  getJson: async (k: string) => (mockDisco.has(k) ? JSON.parse(JSON.stringify(mockDisco.get(k))) : null),
  setJson: async (k: string, v: unknown) => {
    mockDisco.set(k, JSON.parse(JSON.stringify(v)));
  },
  storage: { removeItem: async (k: string) => mockDisco.delete(k) },
}));

import type { EntradaDeLibreria } from '@/lib/library/offline/outbox';

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const cola = require('@/lib/library/offline/outbox') as typeof import('@/lib/library/offline/outbox');
/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const lista = require('@/lib/library/offline/snapshot') as typeof import('@/lib/library/offline/snapshot');

const avance = (itemId: string, pagina: number, at: number) =>
  ({ op: 'position', itemId, patch: { last_position: { page: pagina }, progress: pagina / 100 }, at }) as const;

beforeEach(() => mockDisco.clear());

describe('cola', () => {
  it('una entrada por libro: el último avance gana', async () => {
    await cola.encolar(avance('l1', 10, 1));
    await cola.encolar(avance('l2', 5, 2));
    await cola.encolar(avance('l1', 12, 3));
    expect((await cola.pendientes()).map((e) => [e.itemId, e.op === 'position' ? e.patch.last_position : null])).toEqual([
      ['l2', { page: 5 }],
      ['l1', { page: 12 }],
    ]);
  });

  it('confirmar quita lo enviado, salvo que llegara algo más nuevo mientras tanto', async () => {
    await cola.encolar(avance('l1', 10, 1));
    await cola.encolar(avance('l2', 5, 2));
    const enviadas = await cola.pendientes();
    await cola.encolar(avance('l2', 6, 3));
    await cola.confirmar(enviadas);
    expect(await cola.pendientes()).toEqual([avance('l2', 6, 3)]);
  });

  it('lo pendiente se pinta encima de lo que dice el servidor', () => {
    const items = [
      { id: 'l1', progress: 0.1, last_position: { page: 10 } },
      { id: 'l2', progress: 0, last_position: null },
    ];
    expect(cola.aplicarPendientes(items, [avance('l1', 40, 1)])).toEqual([
      { id: 'l1', progress: 0.4, last_position: { page: 40 } },
      { id: 'l2', progress: 0, last_position: null },
    ]);
  });

  it('al eliminar la cuenta se vacía', async () => {
    await cola.encolar(avance('l1', 10, 1));
    await cola.vaciarCola();
    expect(await cola.pendientes()).toEqual([]);
  });
});

const nota = (id: string, at: number, cambio: Record<string, unknown> = {}) =>
  ({
    op: 'annotation',
    itemId: 'l1',
    userId: 'u1',
    annotation: { id, item_id: 'l1', kind: 'postit', locator: { page: 2, x: 0.1, y: 0.1, w: 0.24 }, content: { text: 'hola' }, z: 1, removed: false, locked: false, ...cambio },
    at,
  }) as const;

describe('anotaciones en la cola (T286)', () => {
  it('una entrada por anotación: guardar y quitar la misma comparten lugar', async () => {
    await cola.encolar(avance('l1', 10, 1));
    await cola.encolar(nota('a1', 2));
    await cola.encolar(nota('a2', 3));
    await cola.encolar(nota('a1', 4, { z: 5 }));
    await cola.encolar({ op: 'annotationRemove', itemId: 'l1', id: 'a2', at: 5 });
    const hay = await cola.pendientes();
    expect(hay.map((e) => [e.op, e.op === 'annotation' ? e.annotation.id : e.op === 'annotationRemove' ? e.id : e.itemId])).toEqual([
      ['position', 'l1'],
      ['annotation', 'a1'],
      ['annotationRemove', 'a2'],
    ]);
    // El avance no se mezcla con lo anotado.
    expect(cola.aplicarPendientes([{ id: 'l1', progress: 0 }], hay)).toEqual([{ id: 'l1', progress: 0.1, last_position: { page: 10 } }]);
  });

  it('lo pendiente se ve encima de lo del servidor: lo nuevo aparece, lo cambiado gana y lo quitado se va', () => {
    const servidor = [
      { id: 'a1', item_id: 'l1', owner_id: 'u1', kind: 'postit', locator: { page: 1, x: 0, y: 0, w: 0.2 }, content: { text: 'viejo' }, z: 1, removed: false, locked: false, created_at: 'c', updated_at: 'u' },
      { id: 'a2', item_id: 'l1', owner_id: 'u1', kind: 'postit', locator: { page: 1, x: 0, y: 0, w: 0.2 }, content: {}, z: 2, removed: false, locked: false, created_at: 'c', updated_at: 'u' },
    ] as const;
    const resultado = cola.aplicarAnotacionesPendientes([...servidor], [nota('a1', 10, { z: 3 }), nota('a3', 11, { item_id: 'l1', z: 0 }), { op: 'annotationRemove', itemId: 'l1', id: 'a2', at: 12 }, { ...nota('otro', 13), itemId: 'l9' }], 'l1');
    expect(resultado.map((a) => [a.id, a.z, a.content])).toEqual([
      ['a3', 0, { text: 'hola' }],
      ['a1', 3, { text: 'hola' }],
    ]);
    expect(resultado[1].created_at).toBe('c');
    expect(resultado[0].owner_id).toBe('u1');
  });
});

it('una sesión de lectura ocupa un solo lugar en la cola: la última versión gana (T318)', async () => {
  const sesion = (seconds: number) =>
    ({ op: 'session', itemId: 'l1', userId: 'u1', session: { id: 's1', item_id: 'l1', started_at: 'a', ended_at: 'b', seconds, start_locator: null, end_locator: null, start_progress: null, end_progress: null }, at: seconds }) as const;
  await cola.encolar(sesion(60));
  await cola.encolar(sesion(120));
  const hay = await cola.pendientes();
  expect(hay).toHaveLength(1);
  expect(hay[0].op === 'session' && hay[0].session.seconds).toBe(120);
});

it('deshacer el quitar una imagen (guardarla otra vez) cancela el borrado de su archivo (T333)', async () => {
  const fila = { id: 'img1', item_id: 'l1', kind: 'image', locator: { page: 1, x: 0, y: 0, w: 0.4 }, content: { path: 'u1/l1/anotaciones/img1.jpg' }, z: 1, removed: false, locked: false } as const;
  await cola.encolar({ op: 'annotationRemove', itemId: 'l1', id: 'img1', at: 1 });
  await cola.encolar({ op: 'imageCleanup', itemId: 'l1', userId: 'u1', id: 'img1', due: 1 + cola.ESPERA_PARA_BORRAR_IMAGEN_MS, at: 1 });
  expect((await cola.pendientes()).map((e) => e.op)).toEqual(['annotationRemove', 'imageCleanup']);
  await cola.encolar({ op: 'annotation', itemId: 'l1', userId: 'u1', annotation: fila, at: 2 });
  expect((await cola.pendientes()).map((e) => e.op)).toEqual(['annotation']);
});

describe('lista guardada', () => {
  it('es de quien la guardó: otra cuenta en el mismo teléfono no la ve', async () => {
    await lista.guardarLista('u1', [{ id: 'l1' } as never]);
    expect(await lista.listaGuardada('u1')).toEqual([{ id: 'l1' }]);
    expect(await lista.listaGuardada('u2')).toBeNull();
    await lista.olvidarLista();
    expect(await lista.listaGuardada('u1')).toBeNull();
  });

  it('las anotaciones de cada libro también, y se olvidan con la lista', async () => {
    await lista.guardarAnotaciones('u1', 'l1', [{ id: 'a1' } as never]);
    await lista.guardarAnotaciones('u1', 'l2', [{ id: 'a2' } as never]);
    expect(await lista.anotacionesGuardadas('u1', 'l1')).toEqual([{ id: 'a1' }]);
    expect(await lista.anotacionesGuardadas('u1', 'l2')).toEqual([{ id: 'a2' }]);
    expect(await lista.anotacionesGuardadas('u2', 'l1')).toBeNull();
    // Otra cuenta que guarda empieza de cero: no hereda las de la anterior.
    await lista.guardarAnotaciones('u2', 'l3', []);
    expect(await lista.anotacionesGuardadas('u2', 'l1')).toBeNull();
    await lista.olvidarLista();
    expect(await lista.anotacionesGuardadas('u2', 'l3')).toBeNull();
  });
});

describe('lienzos en la cola (13h, RF-CC10; T351)', () => {
  const lienzo = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    owner_id: 'u1',
    context: 'book' as const,
    item_id: 'l1',
    title: '',
    orientation: 'portrait' as const,
    doc: { pages: 1, elements: [] },
    version: 1,
    thumb_path: null,
    created_at: '2026-10-20T10:00:00.000Z',
    updated_at: '2026-10-20T10:00:00.000Z',
    ...extra,
  });
  // Lo que va en la cola es lo que se guarda (sin dueño ni fechas: esas las pone la base).
  const entrada = (id: string, version: number, at: number) => {
    const { id: _id, context, item_id, title, orientation, doc } = lienzo(id);
    return { op: 'canvas' as const, itemId: 'l1', userId: 'u1', canvas: { id: _id, context, item_id, title, orientation, doc, version }, at };
  };

  it('lo guardado sin red se ve como quedó, uno nuevo aparece y lo borrado no vuelve', () => {
    const otroLibro = { ...entrada('otro', 1, 3), itemId: 'l9' };
    const entradas: EntradaDeLibreria[] = [entrada('r1', 5, 1), entrada('r3', 1, Date.parse('2026-10-21T10:00:00Z')), { op: 'canvasRemove', itemId: 'l1', id: 'r2', at: 2 }, otroLibro];
    const lista = cola.aplicarLienzosPendientes([lienzo('r1'), lienzo('r2')], entradas, 'l1');
    expect(lista.map((c) => [c.id, c.version])).toEqual([
      ['r3', 1],
      ['r1', 5],
    ]);
  });

  it('guardar otra vez el mismo lienzo reemplaza lo pendiente: el último gana', async () => {
    await cola.encolar(entrada('r1', 2, 10));
    await cola.encolar(entrada('r1', 3, 11));
    const pendientes = (await cola.pendientes()).filter((e) => e.op === 'canvas');
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].op === 'canvas' && pendientes[0].canvas.version).toBe(3);
  });
});
