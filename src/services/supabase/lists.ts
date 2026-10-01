import { AuthUiError } from '@/lib/auth-errors';
import { getSupabase } from '@/lib/supabase';
import type { ListDetail, ListSearchResults, ListShare, ListsApi } from '@/services/contracts';
import { toError, unwrap } from '@/services/supabase/errors';
import { fromDayKey } from '@/lib/dates';
import { graciaVencida } from '@/lib/list-runs';
import { occursOn, parseRRule } from '@/lib/recurrence';
import type { KaviList, ListItem, ListRun, ListSection, ListTag } from '@/types/domain';

/** Separación entre órdenes contiguos, para que siempre quepa algo en medio. */
const STEP = 1024;

/**
 * `view` es palabra reservada en SQL, así que la columna se llama `view_mode` y el mapeo
 * vive aquí. La base y el dominio pueden llamarle distinto; lo que no puede es que la
 * pantalla se entere.
 */
type ListRow = Omit<KaviList, 'view' | 'pending_count' | 'total_count' | 'tag_ids'> & {
  view_mode: KaviList['view'];
  list_items: { completed_at: string | null }[];
  /* La RLS de `list_tag_links` ya limita esto a **mis** etiquetas, así que no hace falta
   * filtrar por dueño en la consulta: lo que vuelve es lo mío y nada más. */
  list_tag_links: { tag_id: string }[];
};

function toList(row: ListRow): KaviList {
  const { view_mode, list_items, list_tag_links, ...resto } = row;
  return {
    ...resto,
    view: view_mode,
    total_count: list_items.length,
    pending_count: list_items.filter((i) => i.completed_at === null).length,
    tag_ids: (list_tag_links ?? []).map((l) => l.tag_id),
  };
}

/** Las cuentas de la tarjeta del inicio se piden con la lista, no en una consulta aparte. */
const SELECT_LISTA = '*, list_items(completed_at), list_tag_links(tag_id)';

/**
 * El `!inner` con `lists` sirve para filtrar por dueño, pero PostgREST devuelve además la
 * fila unida dentro de cada elemento. Se quita aquí y no se deja pasar al dominio: quien
 * reciba un `ListItem` no tiene por qué saber cómo se filtró.
 */
function sinJoin(rows: unknown[]): ListItem[] {
  return rows.map((row) => {
    const { lists: _unido, ...item } = row as ListItem & { lists: unknown };
    return item as ListItem;
  });
}

async function listasDe(userId: string, archivadas: boolean): Promise<KaviList[]> {
  const rows = unwrap(
    await getSupabase()
      .from('lists')
      .select(SELECT_LISTA)
      .eq('owner_id', userId)
      .eq('is_archived', archivadas)
      // Fijadas primero; dentro de cada grupo, por su orden (RF-L3).
      .order('is_pinned', { ascending: false })
      .order('sort_order', { ascending: true }),
  );
  return (rows as unknown as ListRow[]).map(toList);
}

async function getLista(listId: string): Promise<KaviList> {
  const { data, error } = await getSupabase().from('lists').select(SELECT_LISTA).eq('id', listId).maybeSingle();
  if (error) throw toError(error);
  if (!data) throw new AuthUiError('Esa lista ya no existe.');
  return toList(data as unknown as ListRow);
}

/** Orden siguiente dentro de un conjunto, para no pisar lo que ya está colocado. */
async function siguienteOrden(tabla: 'lists' | 'list_sections' | 'list_items', columna: string, valor: string): Promise<number> {
  const rows = unwrap(
    await getSupabase().from(tabla).select('sort_order').eq(columna, valor).order('sort_order', { ascending: false }).limit(1),
  ) as { sort_order: number }[];
  return (rows[0]?.sort_order ?? 0) + STEP;
}

/**
 * Detalle de una lista. Función suelta y no método: la fachada reexporta los métodos
 * desprendidos del objeto (`export const getList = listsApi.getById`), así que dentro de una
 * implementación `this` llega `undefined`. `duplicate` lo usaba y habría fallado en cuanto
 * alguien tocara "Duplicar" con el backend real.
 */
/**
 * El dueño de una fila nueva se toma de la **sesión viva**, no del id que viaja por la app.
 *
 * La política de inserción exige `owner_id = auth.uid()`, y `auth.uid()` lo resuelve el
 * servidor a partir del token de esa petición. Si el id que lleva la app se quedó atrás —una
 * sesión renovada, una cuenta distinta antes, un estado restaurado a medias— el insert se
 * rechaza con "no tienes permiso" y desde fuera parece que el botón no hace nada.
 *
 * Preguntarle al cliente quién es antes de escribir cuesta una llamada local y vuelve la
 * operación correcta por construcción.
 */
async function dueñoActual(fallback: string): Promise<string> {
  const { data } = await getSupabase().auth.getUser();
  const sesion = data.user?.id;
  if (sesion && sesion !== fallback) {
    // eslint-disable-next-line no-console -- divergencia que explica fallos de permiso
    console.warn('[kavi] el id de la app y el de la sesión no coinciden:', fallback, '≠', sesion);
  }
  return sesion ?? fallback;
}

async function crearLista(userId: string, input: Parameters<ListsApi['create']>[1]): Promise<KaviList> {
  const owner = await dueñoActual(userId);
  const row = unwrap(
    await getSupabase()
      .from('lists')
      .insert({
        owner_id: owner,
        name: input.name.trim(),
        icon: input.icon,
        color: input.color,
        view_mode: input.view ?? 'checklist',
        sort_order: await siguienteOrden('lists', 'owner_id', owner),
      })
      .select(SELECT_LISTA)
      .single(),
  );
  return toList(row as unknown as ListRow);
}

async function detalleDe(listId: string): Promise<ListDetail> {
  const [list, sections, items] = await Promise.all([
    getLista(listId),
    getSupabase().from('list_sections').select('*').eq('list_id', listId).order('sort_order'),
    getSupabase().from('list_items').select('*').eq('list_id', listId).order('sort_order'),
  ]);
  return {
    list,
    sections: unwrap(sections) as ListSection[],
    items: unwrap(items) as ListItem[],
  };
}

export const supabaseLists: ListsApi = {
  list: (userId) => listasDe(userId, false),
  listArchived: (userId) => listasDe(userId, true),

  getById: detalleDe,

  create: crearLista,

  async update(listId, patch) {
    const { view, name, ...resto } = patch;
    const row = unwrap(
      await getSupabase()
        .from('lists')
        .update({
          ...resto,
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(view !== undefined ? { view_mode: view } : {}),
        })
        .eq('id', listId)
        .select(SELECT_LISTA)
        .single(),
    );
    return toList(row as unknown as ListRow);
  },

  async remove(listId) {
    // Secciones y elementos se van con la lista por `on delete cascade`.
    const { error } = await getSupabase().from('lists').delete().eq('id', listId);
    if (error) throw toError(error);
  },

  async duplicate(listId) {
    const origen = await detalleDe(listId);
    const copia = await crearLista(origen.list.owner_id, {
      name: `${origen.list.name} (copia)`,
      icon: origen.list.icon,
      color: origen.list.color,
      view: origen.list.view,
    });

    const mapaSecciones = new Map<string, string>();
    if (origen.sections.length > 0) {
      const nuevas = unwrap(
        await getSupabase()
          .from('list_sections')
          .insert(origen.sections.map((s) => ({ list_id: copia.id, name: s.name, sort_order: s.sort_order })))
          .select('*'),
      ) as ListSection[];
      // Se emparejan por orden porque se insertaron en el mismo orden en que se leyeron.
      origen.sections.forEach((s, i) => {
        const nueva = nuevas[i];
        if (nueva) mapaSecciones.set(s.id, nueva.id);
      });
    }

    // Solo los pendientes: duplicar una lista es volver a usarla, no copiar su historial.
    const pendientes = origen.items.filter((i) => i.completed_at === null);
    if (pendientes.length > 0) {
      const { error } = await getSupabase()
        .from('list_items')
        .insert(
          pendientes.map((it) => ({
            list_id: copia.id,
            section_id: it.section_id ? (mapaSecciones.get(it.section_id) ?? null) : null,
            title: it.title,
            note: it.note,
            sort_order: it.sort_order,
            created_by: it.created_by,
            due_date: it.due_date,
            due_time: it.due_time,
          })),
        );
      if (error) throw toError(error);
    }
    return getLista(copia.id);
  },

  async reorder(listId, sortOrder) {
    const { error } = await getSupabase().from('lists').update({ sort_order: sortOrder }).eq('id', listId);
    if (error) throw toError(error);
  },

  async addSection(listId, name) {
    return unwrap(
      await getSupabase()
        .from('list_sections')
        .insert({ list_id: listId, name: name.trim(), sort_order: await siguienteOrden('list_sections', 'list_id', listId) })
        .select('*')
        .single(),
    ) as ListSection;
  },

  async renameSection(sectionId, name) {
    return unwrap(
      await getSupabase().from('list_sections').update({ name: name.trim() }).eq('id', sectionId).select('*').single(),
    ) as ListSection;
  },

  async removeSection(sectionId) {
    // Los elementos no se van con la sección: la FK es `on delete set null`.
    const { error } = await getSupabase().from('list_sections').delete().eq('id', sectionId);
    if (error) throw toError(error);
  },

  async addItem(listId, userId, input) {
    const autor = await dueñoActual(userId);
    return unwrap(
      await getSupabase()
        .from('list_items')
        .insert({
          list_id: listId,
          section_id: input.section_id ?? null,
          title: input.title.trim(),
          note: input.note ?? null,
          created_by: autor,
          due_date: input.due_date ?? null,
          due_time: input.due_time ?? null,
          reminder_offset_minutes: input.reminder_offset_minutes ?? null,
          sort_order: await siguienteOrden('list_items', 'list_id', listId),
        })
        .select('*')
        .single(),
    ) as ListItem;
  },

  async updateItem(itemId, patch) {
    const { title, ...resto } = patch;
    return unwrap(
      await getSupabase()
        .from('list_items')
        .update({ ...resto, ...(title !== undefined ? { title: title.trim() } : {}) })
        .eq('id', itemId)
        .select('*')
        .single(),
    ) as ListItem;
  },

  async removeItem(itemId) {
    const { error } = await getSupabase().from('list_items').delete().eq('id', itemId);
    if (error) throw toError(error);
  },

  async toggleItem(itemId, userId, done) {
    // `completed_at` y `completed_by` van juntos o ninguno: hay un check que lo exige.
    return unwrap(
      await getSupabase()
        .from('list_items')
        .update({
          completed_at: done ? new Date().toISOString() : null,
          completed_by: done ? userId : null,
        })
        .eq('id', itemId)
        .select('*')
        .single(),
    ) as ListItem;
  },

  async reorderItem(itemId, sortOrder, sectionId) {
    const { error } = await getSupabase()
      .from('list_items')
      .update({ sort_order: sortOrder, section_id: sectionId })
      .eq('id', itemId);
    if (error) throw toError(error);
  },

  async listByDateRange(userId, fromDate, toDate) {
    /*
     * El filtro por dueño se hace sobre la lista, no sobre el elemento: `list_items` no
     * guarda `owner_id`, y añadirlo sería duplicar un dato que la FK ya garantiza. El
     * `!inner` convierte la relación en un join que además excluye las archivadas.
     */
    const rows = unwrap(
      await getSupabase()
        .from('list_items')
        .select('*, lists!inner(owner_id, is_archived)')
        .eq('lists.owner_id', userId)
        .eq('lists.is_archived', false)
        .gte('due_date', fromDate)
        .lte('due_date', toDate)
        .order('due_date')
        .order('sort_order'),
    );
    return sinJoin(rows as unknown[]);
  },

  async listOverdue(userId, beforeDate) {
    const rows = unwrap(
      await getSupabase()
        .from('list_items')
        .select('*, lists!inner(owner_id, is_archived)')
        .eq('lists.owner_id', userId)
        .eq('lists.is_archived', false)
        .is('completed_at', null)
        .lt('due_date', beforeDate)
        // Lo más viejo primero: es lo que lleva más tiempo esperando.
        .order('due_date', { ascending: true }),
    );
    return sinJoin(rows as unknown[]);
  },

  async listUndated(userId) {
    const rows = unwrap(
      await getSupabase()
        .from('list_items')
        .select('*, lists!inner(owner_id, is_archived, recurrence_rule)')
        .eq('lists.owner_id', userId)
        .eq('lists.is_archived', false)
        // Las rutinas no entran: sus elementos los repite la lista, no esperan fecha.
        .is('lists.recurrence_rule', null)
        .is('due_date', null)
        .is('completed_at', null)
        // Lo más reciente primero: lo que acabas de apuntar es lo que ibas a agendar.
        .order('created_at', { ascending: false }),
    );
    return sinJoin(rows as unknown[]);
  },

  async search(userId, term): Promise<ListSearchResults> {
    const q = term.trim();
    if (!q) return { lists: [], items: [] };
    // `%` y `_` son comodines de LIKE: sin escaparlos, buscar "50%" traería cualquier cosa.
    const patron = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const [listas, elementos] = await Promise.all([
      getSupabase().from('lists').select(SELECT_LISTA).eq('owner_id', userId).eq('is_archived', false).ilike('name', patron),
      getSupabase()
        .from('list_items')
        .select('*, lists!inner(owner_id, is_archived)')
        .eq('lists.owner_id', userId)
        .eq('lists.is_archived', false)
        .or(`title.ilike.${patron},note.ilike.${patron}`),
    ]);
    return {
      lists: (unwrap(listas) as unknown as ListRow[]).map(toList),
      items: sinJoin(unwrap(elementos) as unknown[]),
    };
  },

  async listShares(listId) {
    return unwrap(
      await getSupabase()
        .from('list_shares')
        .select('id, list_id, shared_with_id, permission, profile:profiles!list_shares_shared_with_id_fkey(*)')
        .eq('list_id', listId),
    ) as unknown as ListShare[];
  },

  async share(listId, userId, permission) {
    return unwrap(
      await getSupabase()
        .from('list_shares')
        // `upsert` sobre (list_id, shared_with_id): cambiar el permiso de alguien que ya
        // está es la misma acción que agregarlo, y separarlas obligaría a consultar antes.
        .upsert({ list_id: listId, shared_with_id: userId, permission }, { onConflict: 'list_id,shared_with_id' })
        .select('id, list_id, shared_with_id, permission, profile:profiles!list_shares_shared_with_id_fkey(*)')
        .single(),
    ) as unknown as ListShare;
  },

  async unshare(listId, userId) {
    const { error } = await getSupabase()
      .from('list_shares')
      .delete()
      .eq('list_id', listId)
      .eq('shared_with_id', userId);
    if (error) throw toError(error);
  },

  async sharedWithMe(userId) {
    /*
     * Se consulta desde `lists` con un join interno a los shares del usuario, en vez de
     * pedir los shares y luego las listas: una sola ida y vuelta, y la RLS de `lists` ya
     * garantiza que no vuelva nada que no se pueda ver.
     */
    const rows = unwrap(
      await getSupabase()
        .from('lists')
        .select(`${SELECT_LISTA}, list_shares!inner(shared_with_id)`)
        .eq('list_shares.shared_with_id', userId)
        .eq('is_archived', false)
        .order('is_pinned', { ascending: false })
        .order('sort_order', { ascending: true }),
    );
    return (rows as unknown as ListRow[]).map(toList);
  },

  async listTags(userId) {
    const rows = unwrap(
      await getSupabase()
        .from('list_tags')
        .select('*, list_tag_links(count)')
        .eq('owner_id', userId)
        .order('name'),
    ) as unknown as (Omit<ListTag, 'list_count'> & { list_tag_links: { count: number }[] })[];
    return rows.map(({ list_tag_links, ...t }) => ({ ...t, list_count: list_tag_links[0]?.count ?? 0 }));
  },

  async createTag(userId, name) {
    const owner = await dueñoActual(userId);
    const row = unwrap(
      await getSupabase()
        .from('list_tags')
        // `upsert` sobre (owner_id, name): pedir una etiqueta que ya existe devuelve esa,
        // que es lo que uno espera al volver a escribir "Casa".
        .upsert({ owner_id: owner, name: name.trim() }, { onConflict: 'owner_id,name' })
        .select('*')
        .single(),
    ) as unknown as Omit<ListTag, 'list_count'>;
    return { ...row, list_count: 0 };
  },

  async renameTag(tagId, name) {
    const row = unwrap(
      await getSupabase().from('list_tags').update({ name: name.trim() }).eq('id', tagId).select('*').single(),
    ) as unknown as Omit<ListTag, 'list_count'>;
    return { ...row, list_count: 0 };
  },

  async removeTag(tagId) {
    // Los vínculos se van con la etiqueta por `on delete cascade`; las listas no se tocan.
    const { error } = await getSupabase().from('list_tags').delete().eq('id', tagId);
    if (error) throw toError(error);
  },

  async tagsOfList(listId, userId) {
    const rows = unwrap(
      await getSupabase()
        .from('list_tag_links')
        .select('tag:list_tags!inner(*)')
        .eq('list_id', listId)
        .eq('list_tags.owner_id', userId),
    ) as unknown as { tag: Omit<ListTag, 'list_count'> }[];
    return rows.map((r) => ({ ...r.tag, list_count: 0 }));
  },

  async setListTag(listId, tagId, puesta) {
    const q = getSupabase().from('list_tag_links');
    const { error } = puesta
      ? await q.upsert({ list_id: listId, tag_id: tagId })
      : await q.delete().eq('list_id', listId).eq('tag_id', tagId);
    if (error) throw toError(error);
  },

  async syncRuns(listId, hoy) {
    const lista = await getLista(listId);
    const regla = parseRRule(lista.recurrence_rule);
    if (!regla || !lista.recurrence_start) return [];

    const abiertas = unwrap(
      await getSupabase()
        .from('list_runs')
        .select('*, list_run_items(item_id)')
        .eq('list_id', listId)
        .is('closed_at', null)
        .order('run_date', { ascending: false }),
    ) as unknown as (Omit<ListRun, 'completed_item_ids'> & { list_run_items: { item_id: string }[] })[];

    /*
     * Cerrar lo caducado. Los conteos se congelan aquí y las filas de palomeo se descartan:
     * el historial guarda cuántos de cuántos, no cuáles (RF-L20).
     */
    const vencidas = abiertas.filter((r) => graciaVencida(r.run_date));
    if (vencidas.length > 0) {
      const total = lista.total_count;
      for (const r of vencidas) {
        const { error } = await getSupabase()
          .from('list_runs')
          .update({
            closed_at: new Date().toISOString(),
            completed_count: r.list_run_items.length,
            total_count: total,
          })
          .eq('id', r.id);
        if (error) throw toError(error);
      }
      const { error } = await getSupabase()
        .from('list_run_items')
        .delete()
        .in('run_id', vencidas.map((r) => r.id));
      if (error) throw toError(error);
    }

    const vivas = abiertas.filter((r) => !graciaVencida(r.run_date));
    if (occursOn(regla, lista.recurrence_start, fromDayKey(hoy)) && !vivas.some((r) => r.run_date === hoy)) {
      const { error } = await getSupabase()
        .from('list_runs')
        // `upsert` porque la vuelta de hoy puede haberla creado ya otro dispositivo: la
        // unicidad es (list_id, run_date) y chocar ahí no es un error, es llegar segundo.
        .upsert({ list_id: listId, run_date: hoy }, { onConflict: 'list_id,run_date' });
      if (error) throw toError(error);
      return supabaseLists.syncRuns(listId, hoy);
    }

    return vivas.map(({ list_run_items, ...r }) => ({
      ...r,
      completed_item_ids: list_run_items.map((x) => x.item_id),
    }));
  },

  async setRunItem(runId, itemId, userId, done) {
    const quien = await dueñoActual(userId);
    const q = getSupabase().from('list_run_items');
    const { error } = done
      ? await q.upsert({ run_id: runId, item_id: itemId, completed_by: quien })
      : await q.delete().eq('run_id', runId).eq('item_id', itemId);
    if (error) throw toError(error);
  },

  async listRuns(listId, limit = 30) {
    const rows = unwrap(
      await getSupabase()
        .from('list_runs')
        .select('*')
        .eq('list_id', listId)
        .not('closed_at', 'is', null)
        .order('run_date', { ascending: false })
        .limit(limit),
    ) as unknown as Omit<ListRun, 'completed_item_ids'>[];
    return rows.map((r) => ({ ...r, completed_item_ids: [] }));
  },

  async rescheduleItems(itemIds, dueDate) {
    if (itemIds.length === 0) return;
    const { error } = await getSupabase().from('list_items').update({ due_date: dueDate }).in('id', [...itemIds]);
    if (error) throw toError(error);
  },
};
