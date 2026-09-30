/**
 * KAVI Lists en memoria (spec 10). Mismo contrato que el backend real.
 *
 * El orden de listas e ítems es `number` con inserción fraccionaria: mover algo entre
 * dos vecinos escribe una sola fila en vez de renumerar todo lo de abajo. Aquí no hace
 * falta por rendimiento —son arreglos en memoria— pero se implementa igual, porque el
 * demo existe para que lo que se prueba aquí se comporte como en Supabase.
 */
import { format } from 'date-fns';

import type { ListDetail, ListsApi } from '@/services/contracts';
import { delay, demoState, emitDataChange, nextId } from '@/services/demo/store';
import type { KaviList, ListItem, ListSection } from '@/types/domain';

type StoredList = Omit<KaviList, 'pending_count' | 'total_count'>;

const lists: StoredList[] = [];
const sections: ListSection[] = [];
const items: ListItem[] = [];

/** Separación entre órdenes contiguos, para que siempre quepa algo en medio. */
const STEP = 1024;

function ahora(): string {
  return new Date().toISOString();
}

function siguienteOrden(existentes: readonly { sort_order: number }[]): number {
  return existentes.length === 0 ? STEP : Math.max(...existentes.map((e) => e.sort_order)) + STEP;
}

function conCuentas(lista: StoredList): KaviList {
  const suyos = items.filter((i) => i.list_id === lista.id);
  return {
    ...lista,
    total_count: suyos.length,
    pending_count: suyos.filter((i) => i.completed_at === null).length,
  };
}

/** Fijadas primero; dentro de cada grupo, por su orden (RF-L3). */
function ordenar(a: StoredList, b: StoredList): number {
  if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
  return a.sort_order - b.sort_order;
}

function buscarLista(listId: string): StoredList {
  const lista = lists.find((l) => l.id === listId);
  if (!lista) throw new Error('Esa lista ya no existe.');
  return lista;
}

function buscarItem(itemId: string): ListItem {
  const item = items.find((i) => i.id === itemId);
  if (!item) throw new Error('Ese elemento ya no existe.');
  return item;
}

// Seed: dos listas que muestran los dos usos centrales —el súper con secciones y una
// lista con fecha que aparece en la franja del día del calendario (RF-L12).
(function seed() {
  const owner = demoState.currentUser?.id ?? 'demo-user';
  const t = ahora();

  const superLista: StoredList = {
    id: 'list-super', owner_id: owner, name: 'Súper', icon: 'shopping-cart', color: '#1F8A4C',
    view: 'checklist', is_pinned: true, is_archived: false, sort_order: STEP, created_at: t, updated_at: t,
  };
  const casa: StoredList = {
    id: 'list-casa', owner_id: owner, name: 'Pendientes de casa', icon: 'house-heart', color: '#DA6C50',
    view: 'checklist', is_pinned: false, is_archived: false, sort_order: STEP * 2, created_at: t, updated_at: t,
  };
  lists.push(superLista, casa);

  const frutas: ListSection = { id: 'sec-frutas', list_id: superLista.id, name: 'Frutas y verduras', sort_order: STEP };
  const lacteos: ListSection = { id: 'sec-lacteos', list_id: superLista.id, name: 'Lácteos', sort_order: STEP * 2 };
  sections.push(frutas, lacteos);

  const crear = (
    id: string, listId: string, title: string, sectionId: string | null, orden: number,
    extra: Partial<ListItem> = {},
  ): ListItem => ({
    id, list_id: listId, section_id: sectionId, title, note: null, sort_order: orden,
    completed_at: null, completed_by: null, created_by: owner,
    due_date: null, due_time: null, created_at: t, updated_at: t, ...extra,
  });

  items.push(
    crear('it-manzanas', superLista.id, 'Manzanas', frutas.id, STEP),
    crear('it-jitomate', superLista.id, 'Jitomate', frutas.id, STEP * 2),
    crear('it-leche', superLista.id, 'Leche', lacteos.id, STEP * 3),
    crear('it-queso', superLista.id, 'Queso', lacteos.id, STEP * 4, { completed_at: t, completed_by: owner }),
    // Con fecha de hoy: es el que se ve en la franja de arriba del día (RF-L12).
    crear('it-puerta', casa.id, 'Arreglar la puerta de la entrada', null, STEP, {
      due_date: format(new Date(), 'yyyy-MM-dd'),
      note: 'Comprar la bisagra antes',
    }),
    crear('it-focos', casa.id, 'Cambiar los focos del pasillo', null, STEP * 2),
  );
})();

export const demoLists: ListsApi = {
  async list(userId) {
    await delay();
    return lists.filter((l) => l.owner_id === userId && !l.is_archived).sort(ordenar).map(conCuentas);
  },

  async listArchived(userId) {
    await delay();
    return lists.filter((l) => l.owner_id === userId && l.is_archived).sort(ordenar).map(conCuentas);
  },

  async getById(listId): Promise<ListDetail> {
    await delay();
    const lista = buscarLista(listId);
    return {
      list: conCuentas(lista),
      sections: sections.filter((s) => s.list_id === listId).sort((a, b) => a.sort_order - b.sort_order),
      items: items.filter((i) => i.list_id === listId).sort((a, b) => a.sort_order - b.sort_order),
    };
  },

  async create(userId, input) {
    await delay();
    const t = ahora();
    const lista: StoredList = {
      id: nextId('list'), owner_id: userId, name: input.name.trim(), icon: input.icon, color: input.color,
      view: input.view ?? 'checklist', is_pinned: false, is_archived: false,
      sort_order: siguienteOrden(lists.filter((l) => l.owner_id === userId)),
      created_at: t, updated_at: t,
    };
    lists.push(lista);
    emitDataChange();
    return conCuentas(lista);
  },

  async update(listId, patch) {
    await delay();
    const lista = buscarLista(listId);
    if (patch.name !== undefined) lista.name = patch.name.trim();
    if (patch.icon !== undefined) lista.icon = patch.icon;
    if (patch.color !== undefined) lista.color = patch.color;
    if (patch.view !== undefined) lista.view = patch.view;
    if (patch.is_pinned !== undefined) lista.is_pinned = patch.is_pinned;
    if (patch.is_archived !== undefined) lista.is_archived = patch.is_archived;
    lista.updated_at = ahora();
    emitDataChange();
    return conCuentas(lista);
  },

  async remove(listId) {
    await delay();
    const i = lists.findIndex((l) => l.id === listId);
    if (i >= 0) lists.splice(i, 1);
    // En Supabase esto lo hace el `on delete cascade`; aquí a mano.
    for (let k = items.length - 1; k >= 0; k--) if (items[k]!.list_id === listId) items.splice(k, 1);
    for (let k = sections.length - 1; k >= 0; k--) if (sections[k]!.list_id === listId) sections.splice(k, 1);
    emitDataChange();
  },

  async duplicate(listId) {
    await delay();
    const origen = buscarLista(listId);
    const t = ahora();
    const copia: StoredList = {
      ...origen, id: nextId('list'), name: `${origen.name} (copia)`, is_pinned: false,
      sort_order: siguienteOrden(lists.filter((l) => l.owner_id === origen.owner_id)),
      created_at: t, updated_at: t,
    };
    lists.push(copia);

    const mapaSecciones = new Map<string, string>();
    for (const s of sections.filter((s) => s.list_id === listId)) {
      const nueva: ListSection = { ...s, id: nextId('sec'), list_id: copia.id };
      mapaSecciones.set(s.id, nueva.id);
      sections.push(nueva);
    }
    // Solo los pendientes: duplicar una lista es volver a usarla, no copiar su historial.
    for (const it of items.filter((i) => i.list_id === listId && i.completed_at === null)) {
      items.push({
        ...it, id: nextId('item'), list_id: copia.id,
        section_id: it.section_id ? (mapaSecciones.get(it.section_id) ?? null) : null,
        created_at: t, updated_at: t,
      });
    }
    emitDataChange();
    return conCuentas(copia);
  },

  async reorder(listId, sortOrder) {
    await delay(0);
    buscarLista(listId).sort_order = sortOrder;
    emitDataChange();
  },

  async addSection(listId, name) {
    await delay();
    const seccion: ListSection = {
      id: nextId('sec'), list_id: listId, name: name.trim(),
      sort_order: siguienteOrden(sections.filter((s) => s.list_id === listId)),
    };
    sections.push(seccion);
    emitDataChange();
    return seccion;
  },

  async renameSection(sectionId, name) {
    await delay();
    const seccion = sections.find((s) => s.id === sectionId);
    if (!seccion) throw new Error('Esa sección ya no existe.');
    seccion.name = name.trim();
    emitDataChange();
    return seccion;
  },

  async removeSection(sectionId) {
    await delay();
    const i = sections.findIndex((s) => s.id === sectionId);
    if (i >= 0) sections.splice(i, 1);
    // Los ítems no se van con la sección: vuelven a la lista sin agrupar.
    for (const it of items) if (it.section_id === sectionId) it.section_id = null;
    emitDataChange();
  },

  async addItem(listId, userId, input) {
    await delay();
    const t = ahora();
    const item: ListItem = {
      id: nextId('item'), list_id: listId, section_id: input.section_id ?? null,
      title: input.title.trim(), note: input.note ?? null,
      sort_order: siguienteOrden(items.filter((i) => i.list_id === listId)),
      completed_at: null, completed_by: null, created_by: userId,
      due_date: input.due_date ?? null, due_time: input.due_time ?? null,
      created_at: t, updated_at: t,
    };
    items.push(item);
    emitDataChange();
    return item;
  },

  async updateItem(itemId, patch) {
    await delay();
    const item = buscarItem(itemId);
    if (patch.title !== undefined) item.title = patch.title.trim();
    if (patch.note !== undefined) item.note = patch.note;
    if (patch.section_id !== undefined) item.section_id = patch.section_id;
    if (patch.due_date !== undefined) item.due_date = patch.due_date;
    if (patch.due_time !== undefined) item.due_time = patch.due_time;
    item.updated_at = ahora();
    emitDataChange();
    return item;
  },

  async removeItem(itemId) {
    await delay();
    const i = items.findIndex((it) => it.id === itemId);
    if (i >= 0) items.splice(i, 1);
    emitDataChange();
  },

  async toggleItem(itemId, userId, done) {
    await delay(0);
    const item = buscarItem(itemId);
    item.completed_at = done ? ahora() : null;
    item.completed_by = done ? userId : null;
    item.updated_at = ahora();
    emitDataChange();
    return item;
  },

  async reorderItem(itemId, sortOrder, sectionId) {
    await delay(0);
    const item = buscarItem(itemId);
    item.sort_order = sortOrder;
    item.section_id = sectionId;
    emitDataChange();
  },

  async listByDateRange(userId, fromDate, toDate) {
    await delay();
    const mias = new Set(lists.filter((l) => l.owner_id === userId && !l.is_archived).map((l) => l.id));
    return items
      .filter((i) => mias.has(i.list_id) && i.due_date !== null && i.due_date >= fromDate && i.due_date <= toDate)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '') || a.sort_order - b.sort_order);
  },
};
