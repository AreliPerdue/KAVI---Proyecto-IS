/** Cola local de KAVI Library (RF-BR3, T285): el avance leído sin red se guarda y sube al volver. */
const mockDisco = new Map<string, unknown>();
jest.mock('@/lib/storage', () => ({
  getJson: async (k: string) => (mockDisco.has(k) ? JSON.parse(JSON.stringify(mockDisco.get(k))) : null),
  setJson: async (k: string, v: unknown) => {
    mockDisco.set(k, JSON.parse(JSON.stringify(v)));
  },
  storage: { removeItem: async (k: string) => mockDisco.delete(k) },
}));

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
