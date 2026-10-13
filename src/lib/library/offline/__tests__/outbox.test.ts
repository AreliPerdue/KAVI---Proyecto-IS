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
    expect((await cola.pendientes()).map((e) => [e.itemId, e.patch.last_position])).toEqual([
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

describe('lista guardada', () => {
  it('es de quien la guardó: otra cuenta en el mismo teléfono no la ve', async () => {
    await lista.guardarLista('u1', [{ id: 'l1' } as never]);
    expect(await lista.listaGuardada('u1')).toEqual([{ id: 'l1' }]);
    expect(await lista.listaGuardada('u2')).toBeNull();
    await lista.olvidarLista();
    expect(await lista.listaGuardada('u1')).toBeNull();
  });
});
