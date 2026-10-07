/**
 * KAVI Lists en memoria (spec 10). Mismo contrato que el backend real.
 *
 * El orden de listas e ítems es `number` con inserción fraccionaria: mover algo entre
 * dos vecinos escribe una sola fila en vez de renumerar todo lo de abajo. Aquí no hace
 * falta por rendimiento —son arreglos en memoria— pero se implementa igual, porque el
 * demo existe para que lo que se prueba aquí se comporte como en Supabase.
 */
import { addDays, format } from 'date-fns';

import type { ListDetail, ListSearchResults, ListShare, ListsApi } from '@/services/contracts';
import { fromDayKey } from '@/lib/dates';
import { graciaVencida } from '@/lib/list-runs';
import { occursOn, parseRRule } from '@/lib/recurrence';
import type { KaviList, ListItem, ListRun, ListSection, ListTag } from '@/types/domain';
import { delay, demoState, emitDataChange, nextId } from '@/services/demo/store';
import { AuthUiError } from '@/lib/auth-errors';
import { t } from '@/i18n';

type StoredList = Omit<KaviList, 'pending_count' | 'total_count' | 'tag_ids'>;

const lists: StoredList[] = [];
const sections: ListSection[] = [];
const items: ListItem[] = [];
const shares: Omit<ListShare, 'profile'>[] = [];
const tags: Omit<ListTag, 'list_count'>[] = [];
const tagLinks: { list_id: string; tag_id: string }[] = [];
const runs: (Omit<ListRun, 'completed_item_ids'> & { items: { item_id: string; by: string }[] })[] = [];

/** Separación entre órdenes contiguos, para que siempre quepa algo en medio. */
const STEP = 1024;

function ahora(): string {
  return new Date().toISOString();
}

function siguienteOrden(existentes: readonly { sort_order: number }[]): number {
  return existentes.length === 0 ? STEP : Math.max(...existentes.map((e) => e.sort_order)) + STEP;
}

/**
 * Copia superficial de un elemento antes de salir del backend demo.
 *
 * Sin esto se devolvían las **mismas referencias** que guarda el almacén, y quien tuviera
 * un elemento en la mano veía cambiar sus campos por debajo en cuanto alguien escribía. Lo
 * pagó el intercambio de orden: al leer el `sort_order` del primero para dárselo al
 * segundo, ese campo ya había sido mutado por la escritura anterior y los dos terminaban
 * igual. Supabase devuelve filas sueltas por construcción; el demo tiene que imitarlo o
 * deja de servir para probar.
 */
function copia<T>(fila: T): T {
  return { ...fila };
}

/**
 * Función suelta y no un método: la fachada reexporta los métodos desprendidos del objeto
 * (`export const shareList = listsApi.share`), así que dentro de una implementación `this`
 * llega `undefined`. Lo que se comparta entre métodos vive fuera del objeto.
 */
function conPerfil(fila: Omit<ListShare, 'profile'>): ListShare {
  const cuenta = demoState.accounts.find((a) => a.profile.id === fila.shared_with_id);
  if (!cuenta) throw new AuthUiError(t().errors.contactGone);
  return { ...fila, profile: cuenta.profile };
}

function conCuentas(lista: StoredList): KaviList {
  const suyos = items.filter((i) => i.list_id === lista.id);
  return {
    ...lista,
    total_count: suyos.length,
    pending_count: suyos.filter((i) => i.completed_at === null).length,
    tag_ids: tagLinks.filter((l) => l.list_id === lista.id).map((l) => l.tag_id),
  };
}

/** Fijadas primero; dentro de cada grupo, por su orden (RF-L3). */
function ordenar(a: StoredList, b: StoredList): number {
  if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
  return a.sort_order - b.sort_order;
}

function buscarLista(listId: string): StoredList {
  const lista = lists.find((l) => l.id === listId);
  if (!lista) throw new Error(t().errors.listGone);
  return lista;
}

function buscarItem(itemId: string): ListItem {
  const item = items.find((i) => i.id === itemId);
  if (!item) throw new Error(t().errors.itemGone);
  return item;
}

// Seed: dos listas que muestran los dos usos centrales —el súper con secciones y una
// lista con fecha que aparece en la franja del día del calendario (RF-L12).
(function seed() {
  const owner = demoState.currentUser?.id ?? 'demo-user';
  const t = ahora();

  const superLista: StoredList = {
    id: 'list-super', owner_id: owner, name: 'Súper', icon: 'shopping-cart', color: '#A2DD5C',
    view: 'checklist', is_pinned: true, is_archived: false, sort_order: STEP, created_at: t, updated_at: t,
    recurrence_rule: null, recurrence_start: null, due_date: null,
  };
  const casa: StoredList = {
    id: 'list-casa', owner_id: owner, name: 'Pendientes de casa', icon: 'house-heart', color: '#F68675',
    view: 'checklist', is_pinned: false, is_archived: false, sort_order: STEP * 2, created_at: t, updated_at: t,
    recurrence_rule: null, recurrence_start: null, due_date: null,
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
    due_date: null, due_time: null, reminder_offset_minutes: null, created_at: t, updated_at: t, ...extra,
  });

  /*
   * Una rutina con historial, para poder ver el resumen sin esperar días. Los conteos
   * imitan algo real: casi siempre completa, algunos días a medias, y uno flojo.
   */
  const rutina: StoredList = {
    id: 'list-rutina', owner_id: owner, name: 'Rutina de la mañana', icon: 'sun', color: '#C9AAEE',
    view: 'checklist', is_pinned: false, is_archived: false, sort_order: STEP * 3,
    created_at: t, updated_at: t,
    recurrence_rule: 'FREQ=DAILY', recurrence_start: format(addDays(new Date(), -14), 'yyyy-MM-dd'), due_date: null,
  };
  lists.push(rutina);
  items.push(
    crear('it-dientes', rutina.id, 'Lavarme los dientes', null, STEP),
    crear('it-cabello', rutina.id, 'Cepillarme el cabello', null, STEP * 2),
    crear('it-cama', rutina.id, 'Tender la cama', null, STEP * 3),
  );
  // Catorce vueltas cerradas hacia atrás, de más reciente a más antigua.
  const hechos = [3, 3, 2, 3, 3, 1, 3, 3, 3, 2, 3, 0, 3, 3];
  hechos.forEach((n, i) => {
    const dia = format(addDays(new Date(), -(i + 1)), 'yyyy-MM-dd');
    runs.push({
      id: `run-seed-${i}`,
      list_id: rutina.id,
      run_date: dia,
      closed_at: t,
      completed_count: n,
      total_count: 3,
      items: [],
    });
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
    // Vencidos: lo que no se hizo no desaparece, se muestra arriba con su fecha (RF-L18).
    crear('it-bisagra', casa.id, 'Comprar la bisagra', null, STEP * 3, {
      due_date: format(addDays(new Date(), -4), 'yyyy-MM-dd'),
    }),
    crear('it-plomero', casa.id, 'Llamar al plomero', null, STEP * 4, {
      due_date: format(addDays(new Date(), -1), 'yyyy-MM-dd'),
      // Con hora, como la guarda Postgres (`time`): se muestra en el formato elegido.
      due_time: '17:30:00',
    }),
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
      items: items.filter((i) => i.list_id === listId).sort((a, b) => a.sort_order - b.sort_order).map(copia),
    };
  },

  async create(userId, input) {
    await delay();
    const t = ahora();
    const lista: StoredList = {
      id: nextId('list'), owner_id: userId, name: input.name.trim(), icon: input.icon, color: input.color,
      view: input.view ?? 'checklist', is_pinned: false, is_archived: false,
      recurrence_rule: null, recurrence_start: null, due_date: null,
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
    if (patch.recurrence_rule !== undefined) lista.recurrence_rule = patch.recurrence_rule;
    if (patch.recurrence_start !== undefined) lista.recurrence_start = patch.recurrence_start;
    if (patch.due_date !== undefined) lista.due_date = patch.due_date;
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
    if (!seccion) throw new Error(t().errors.sectionGone);
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
      id: input.id ?? nextId('item'), list_id: listId, section_id: input.section_id ?? null,
      title: input.title.trim(), note: input.note ?? null,
      sort_order: input.sort_order ?? siguienteOrden(items.filter((i) => i.list_id === listId)),
      completed_at: null, completed_by: null, created_by: userId,
      due_date: input.due_date ?? null, due_time: input.due_time ?? null,
      reminder_offset_minutes: input.reminder_offset_minutes ?? null,
      created_at: t, updated_at: t,
    };
    items.push(item);
    emitDataChange();
    return copia(item);
  },

  async updateItem(itemId, patch) {
    await delay();
    const item = buscarItem(itemId);
    if (patch.title !== undefined) item.title = patch.title.trim();
    if (patch.note !== undefined) item.note = patch.note;
    if (patch.section_id !== undefined) item.section_id = patch.section_id;
    if (patch.due_date !== undefined) item.due_date = patch.due_date;
    if (patch.due_time !== undefined) item.due_time = patch.due_time;
    if (patch.reminder_offset_minutes !== undefined) item.reminder_offset_minutes = patch.reminder_offset_minutes;
    item.updated_at = ahora();
    emitDataChange();
    return copia(item);
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
    return copia(item);
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
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '') || a.sort_order - b.sort_order)
      .map(copia);
  },

  async listOverdue(userId, beforeDate) {
    await delay();
    const mias = new Set(lists.filter((l) => l.owner_id === userId && !l.is_archived).map((l) => l.id));
    return items
      .filter((i) => mias.has(i.list_id) && i.completed_at === null && i.due_date !== null && i.due_date < beforeDate)
      // Lo más viejo primero: es lo que lleva más tiempo esperando.
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
      .map(copia);
  },

  async listUndated(userId) {
    await delay();
    const mias = new Set(
      lists
        .filter((l) => l.owner_id === userId && !l.is_archived && l.recurrence_rule === null)
        .map((l) => l.id),
    );
    return items
      .filter((i) => mias.has(i.list_id) && i.due_date === null && i.completed_at === null)
      // Lo más reciente primero, igual que en Supabase.
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(copia);
  },

  async search(userId, term): Promise<ListSearchResults> {
    await delay();
    const q = term.trim().toLowerCase();
    if (!q) return { lists: [], items: [] };
    const mias = lists.filter((l) => l.owner_id === userId && !l.is_archived);
    const ids = new Set(mias.map((l) => l.id));
    return {
      lists: mias.filter((l) => l.name.toLowerCase().includes(q)).map(conCuentas),
      items: items.filter(
        (i) => ids.has(i.list_id) && (i.title.toLowerCase().includes(q) || (i.note ?? '').toLowerCase().includes(q)),
      ).map(copia),
    };
  },

  async listShares(listId) {
    await delay();
    return shares.filter((sh) => sh.list_id === listId).map(conPerfil);
  },

  async share(listId, userId, permission) {
    await delay();
    const existente = shares.find((sh) => sh.list_id === listId && sh.shared_with_id === userId);
    if (existente) existente.permission = permission;
    else shares.push({ id: nextId('lshare'), list_id: listId, shared_with_id: userId, permission });
    emitDataChange();
    const fila = shares.find((sh) => sh.list_id === listId && sh.shared_with_id === userId);
    if (!fila) throw new AuthUiError(t().errors.listShareFailed);
    return conPerfil(fila);
  },

  async unshare(listId, userId) {
    await delay();
    // Retirar el acceso no borra nada del contenido (RF-L17): la lista sigue entera.
    const i = shares.findIndex((sh) => sh.list_id === listId && sh.shared_with_id === userId);
    if (i >= 0) shares.splice(i, 1);
    emitDataChange();
  },

  async sharedWithMe(userId) {
    await delay();
    const mios = new Set(shares.filter((sh) => sh.shared_with_id === userId).map((sh) => sh.list_id));
    return lists.filter((l) => mios.has(l.id) && !l.is_archived).sort(ordenar).map(conCuentas);
  },

  async listTags(userId) {
    await delay();
    return tags
      .filter((t) => t.owner_id === userId)
      .map((t) => ({ ...t, list_count: tagLinks.filter((l) => l.tag_id === t.id).length }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  },

  async createTag(userId, name) {
    await delay();
    const limpio = name.trim();
    // Sin distinguir mayúsculas: "Casa" y "casa" serían dos montones para lo mismo.
    const ya = tags.find((t) => t.owner_id === userId && t.name.toLowerCase() === limpio.toLowerCase());
    if (ya) return { ...ya, list_count: tagLinks.filter((l) => l.tag_id === ya.id).length };
    const tag = { id: nextId('tag'), owner_id: userId, name: limpio };
    tags.push(tag);
    emitDataChange();
    return { ...tag, list_count: 0 };
  },

  async renameTag(tagId, name) {
    await delay();
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) throw new AuthUiError(t().errors.tagGone);
    tag.name = name.trim();
    emitDataChange();
    return { ...tag, list_count: tagLinks.filter((l) => l.tag_id === tag.id).length };
  },

  async removeTag(tagId) {
    await delay();
    const i = tags.findIndex((t) => t.id === tagId);
    if (i >= 0) tags.splice(i, 1);
    // Se van los vínculos, no las listas: borrar una forma de agrupar no borra lo agrupado.
    for (let k = tagLinks.length - 1; k >= 0; k--) if (tagLinks[k]!.tag_id === tagId) tagLinks.splice(k, 1);
    emitDataChange();
  },

  async tagsOfList(listId, userId) {
    await delay();
    const ids = new Set(tagLinks.filter((l) => l.list_id === listId).map((l) => l.tag_id));
    return tags
      .filter((t) => ids.has(t.id) && t.owner_id === userId)
      .map((t) => ({ ...t, list_count: tagLinks.filter((l) => l.tag_id === t.id).length }));
  },

  async setListTag(listId, tagId, puesta) {
    await delay();
    const i = tagLinks.findIndex((l) => l.list_id === listId && l.tag_id === tagId);
    if (puesta && i < 0) tagLinks.push({ list_id: listId, tag_id: tagId });
    if (!puesta && i >= 0) tagLinks.splice(i, 1);
    emitDataChange();
  },

  async syncRuns(listId, hoy) {
    await delay();
    const lista = buscarLista(listId);
    const regla = parseRRule(lista.recurrence_rule);
    if (!regla || !lista.recurrence_start) return [];

    const deLaLista = runs.filter((r) => r.list_id === listId);
    /*
     * Solo se avisa del cambio si de verdad hubo uno. Avisar siempre armaba un bucle: el
     * aviso invalida las consultas de listas, eso vuelve a llamar a `syncRuns`, que volvía
     * a avisar, y la pantalla de una rutina se recargaba cada 300 ms sin parar. En Supabase
     * no pasa porque el tiempo real solo dispara con escrituras reales; el demo tiene que
     * comportarse igual.
     */
    let cambio = false;

    // 1. Cerrar lo que ya caducó, con los conteos que tuviera en ese momento.
    for (const r of deLaLista) {
      if (r.closed_at || !graciaVencida(r.run_date)) continue;
      cambio = true;
      r.closed_at = ahora();
      r.completed_count = r.items.length;
      r.total_count = items.filter((i) => i.list_id === listId).length;
      r.items = [];
    }

    // 2. Abrir la de hoy si la regla cae hoy y no existe ya.
    if (occursOn(regla, lista.recurrence_start, fromDayKey(hoy)) && !deLaLista.some((r) => r.run_date === hoy)) {
      cambio = true;
      runs.push({
        id: nextId('run'),
        list_id: listId,
        run_date: hoy,
        closed_at: null,
        completed_count: 0,
        total_count: 0,
        items: [],
      });
    }

    if (cambio) emitDataChange();
    return runs
      .filter((r) => r.list_id === listId && r.closed_at === null)
      .sort((a, b) => b.run_date.localeCompare(a.run_date))
      .map((r) => ({ ...r, completed_item_ids: r.items.map((i) => i.item_id) }));
  },

  async setRunItem(runId, itemId, userId, done) {
    await delay(0);
    const vuelta = runs.find((r) => r.id === runId);
    if (!vuelta) throw new AuthUiError(t().errors.runClosed);
    const i = vuelta.items.findIndex((x) => x.item_id === itemId);
    if (done && i < 0) vuelta.items.push({ item_id: itemId, by: userId });
    if (!done && i >= 0) vuelta.items.splice(i, 1);
    emitDataChange();
  },

  async listRuns(listId, limit = 30) {
    await delay();
    return runs
      .filter((r) => r.list_id === listId && r.closed_at !== null)
      .sort((a, b) => b.run_date.localeCompare(a.run_date))
      .slice(0, limit)
      .map((r) => ({ ...r, completed_item_ids: [] }));
  },

  async listRunsByDateRange(userId, fromDate, toDate) {
    await delay();
    const mias = new Set(lists.filter((l) => l.owner_id === userId).map((l) => l.id));
    return runs
      .filter((r) => mias.has(r.list_id) && r.run_date >= fromDate && r.run_date <= toDate)
      .map(({ items: palomeados, ...r }) => ({ ...r, completed_item_ids: palomeados.map((x) => x.item_id) }));
  },

  async rescheduleItems(itemIds, dueDate) {
    await delay();
    const ids = new Set(itemIds);
    const t = ahora();
    for (const it of items) {
      if (!ids.has(it.id)) continue;
      it.due_date = dueDate;
      it.updated_at = t;
    }
    emitDataChange();
  },
};
