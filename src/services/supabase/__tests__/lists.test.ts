/**
 * Listas contra Supabase (spec 10). Lo que no se ve en el esquema: duplicar remapea las
 * secciones y copia solo los pendientes, buscar escapa los comodines de LIKE, las consultas por
 * fecha excluyen las listas archivadas con el join, y ningún método usa `this`.
 */
import { fakeSupabase } from '@/services/supabase/__tests__/fake-supabase';

const mockSb = fakeSupabase();
jest.mock('@/lib/supabase', () => ({ getSupabase: () => mockSb.client }));
// El dueño de una fila nueva sale de la sesión viva (`dueñoActual`).
(mockSb.client as unknown as { auth: unknown }).auth = { getUser: async () => ({ data: { user: { id: 'u1' } } }) };

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { supabaseLists } = require('@/services/supabase/lists') as typeof import('@/services/supabase/lists');

const lista = (over = {}) => ({
  id: 'l1', owner_id: 'u1', name: 'Súper', icon: 'cart', color: '#A2DD5C', view_mode: 'checklist',
  is_pinned: true, is_archived: false, sort_order: 1024, created_at: 'x', updated_at: 'x',
  recurrence_rule: null, recurrence_start: null, due_date: null, list_items: [], list_tag_links: [],
  ...over,
});
const item = (over = {}) => ({
  id: 'i1', list_id: 'l1', section_id: null, title: 'Leche', note: null, sort_order: 1024, completed_at: null,
  completed_by: null, created_by: 'u1', due_date: null, due_time: null, reminder_offset_minutes: null, created_at: 'x', updated_at: 'x',
  ...over,
});
const ok = (data: unknown) => ({ data, error: null });

beforeEach(() => {
  mockSb.llamadas.length = 0;
  mockSb.responder(ok([]));
});

describe('duplicar', () => {
  it('copia las secciones y deja cada pendiente en su sección nueva; los palomeados no van', async () => {
    mockSb.encolar(
      ok(lista()), // la lista original
      ok([{ id: 's-frutas', list_id: 'l1', name: 'Frutas', sort_order: 1 }, { id: 's-lacteos', list_id: 'l1', name: 'Lácteos', sort_order: 2 }]),
      ok([
        item({ id: 'a', title: 'Manzanas', section_id: 's-frutas' }),
        item({ id: 'b', title: 'Queso', section_id: 's-lacteos', completed_at: 'ayer' }),
        item({ id: 'c', title: 'Leche', section_id: 's-lacteos' }),
      ]),
      ok([{ sort_order: 2048 }]), // siguiente orden para la copia
      ok(lista({ id: 'l2', name: 'Súper (copia)', is_pinned: false })), // la copia creada
      ok([{ id: 'n-frutas' }, { id: 'n-lacteos' }]), // secciones nuevas, en el mismo orden
      ok(null), // elementos insertados
      ok(lista({ id: 'l2', name: 'Súper (copia)', is_pinned: false })), // la copia releída
    );

    const copia = await supabaseLists.duplicate('l1');

    expect(copia.name).toBe('Súper (copia)');
    const inserciones = mockSb.llamadas.filter((l) => l[0] === 'insert').map((l) => l[1]);
    const elementos = inserciones.at(-1) as { title: string; section_id: string; list_id: string }[];
    expect(elementos.map((e) => [e.title, e.section_id, e.list_id])).toEqual([
      ['Manzanas', 'n-frutas', 'l2'],
      ['Leche', 'n-lacteos', 'l2'],
    ]);
  });
});

describe('buscar', () => {
  it('vacío no consulta', async () => {
    expect(await supabaseLists.search('u1', '  ')).toEqual({ lists: [], items: [] });
    expect(mockSb.llamadas).toEqual([]);
  });

  it('escapa % y _: buscar "50%" no trae de más', async () => {
    await supabaseLists.search('u1', '50%_x');
    expect(mockSb.argsDe('ilike')).toEqual(['name', '%50\\%\\_x%']);
    expect(mockSb.argsDe('or')).toEqual(['title.ilike.%50\\%\\_x%,note.ilike.%50\\%\\_x%']);
  });

  it('solo en listas propias y sin archivar', async () => {
    await supabaseLists.search('u1', 'queso');
    const eqs = mockSb.llamadas.filter((l) => l[0] === 'eq').map((l) => l.slice(1));
    expect(eqs).toEqual(expect.arrayContaining([['owner_id', 'u1'], ['is_archived', false], ['lists.owner_id', 'u1'], ['lists.is_archived', false]]));
  });
});

describe('consultas por fecha', () => {
  it.each([
    ['listByDateRange', () => supabaseLists.listByDateRange('u1', '2026-10-01', '2026-10-07')],
    ['listOverdue', () => supabaseLists.listOverdue('u1', '2026-10-07')],
    ['listUndated', () => supabaseLists.listUndated('u1')],
  ])('%s excluye las listas archivadas por el join', async (_n, consulta) => {
    await consulta();
    expect(mockSb.argsDe('select')?.[0]).toMatch(/lists!inner/);
    expect(mockSb.llamadas).toContainEqual(['eq', 'lists.is_archived', false]);
  });

  it('el join no sale al dominio: el elemento llega sin `lists` dentro', async () => {
    mockSb.responder(ok([{ ...item(), lists: { owner_id: 'u1', is_archived: false } }]));
    const [primero] = await supabaseLists.listOverdue('u1', '2026-10-07');
    expect(primero).not.toHaveProperty('lists');
  });

  it('vencidos: sin palomear y del más viejo al más nuevo', async () => {
    await supabaseLists.listOverdue('u1', '2026-10-07');
    expect(mockSb.llamadas).toContainEqual(['is', 'completed_at', null]);
    expect(mockSb.llamadas).toContainEqual(['order', 'due_date', { ascending: true }]);
  });

  it('Algún día deja fuera las rutinas', async () => {
    await supabaseLists.listUndated('u1');
    expect(mockSb.llamadas).toContainEqual(['is', 'lists.recurrence_rule', null]);
  });
});

describe('estructura', () => {
  it('ningún método usa `this`: la fachada los reexporta sueltos (T221)', () => {
    for (const [nombre, fn] of Object.entries(supabaseLists)) {
      expect({ nombre, usaThis: /\bthis\./.test(String(fn)) }).toEqual({ nombre, usaThis: false });
    }
  });
});
