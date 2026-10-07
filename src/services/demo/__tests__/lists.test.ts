/**
 * KAVI Lists en memoria (spec 10). El demo existe para que lo que se prueba aquí se comporte
 * como en Supabase, así que estas pruebas fijan las reglas de negocio de Listas: duplicar, buscar,
 * vencidos, bandeja "Algún día", etiquetas, compartir y las vueltas de las rutinas.
 */
import { addDays, format } from 'date-fns';

import type { ListsApi } from '@/services/contracts';

/** Sin espera artificial: el demo simula red con `setTimeout` y aquí solo estorba. */
jest.mock('@/services/demo/store', () => ({
  ...jest.requireActual('@/services/demo/store'),
  delay: () => Promise.resolve(),
}));

const YO = 'demo-user';
const ANA = 'demo-ana';
const dia = (offset: number) => format(addDays(new Date(), offset), 'yyyy-MM-dd');
const HOY = dia(0);

type Store = typeof import('@/services/demo/store');

/** Un almacén nuevo por prueba: las listas viven en el módulo. */
function fresh(): { api: ListsApi; store: Store } {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports -- recarga deliberada del estado demo */
  const store = require('@/services/demo/store') as Store;
  const api = (require('@/services/demo/lists') as typeof import('@/services/demo/lists')).demoLists;
  /* eslint-enable @typescript-eslint/no-require-imports */
  return { api, store };
}

describe('listas', () => {
  it('crear la pone al final, sin fijar y sin archivar', async () => {
    const { api } = fresh();
    const nueva = await api.create(YO, { name: '  Viaje  ', icon: 'plane', color: '#86CBF3' });
    expect(nueva).toMatchObject({ name: 'Viaje', is_pinned: false, is_archived: false, total_count: 0, pending_count: 0 });
    const mias = await api.list(YO);
    expect(mias.at(-1)?.id).toBe(nueva.id);
  });

  it('las fijadas van primero (RF-L3)', async () => {
    const { api } = fresh();
    const mias = await api.list(YO);
    expect(mias[0]?.is_pinned).toBe(true);
  });

  it('archivar la saca del inicio y la pone en Archivadas; restaurar la devuelve', async () => {
    const { api } = fresh();
    await api.update('list-casa', { is_archived: true });
    expect((await api.list(YO)).map((l) => l.id)).not.toContain('list-casa');
    expect((await api.listArchived(YO)).map((l) => l.id)).toContain('list-casa');
    await api.update('list-casa', { is_archived: false });
    expect((await api.list(YO)).map((l) => l.id)).toContain('list-casa');
  });

  it('borrar la lista se lleva sus elementos y secciones', async () => {
    const { api } = fresh();
    await api.remove('list-super');
    await expect(api.getById('list-super')).rejects.toThrow();
    expect((await api.search(YO, 'Manzanas')).items).toEqual([]);
  });

  it('la fecha de la lista completa sobrevive a otro cambio y se quita con null (T232)', async () => {
    const { api } = fresh();
    await api.update('list-casa', { due_date: '2026-12-24' });
    const renombrada = await api.update('list-casa', { name: 'Casa' });
    expect(renombrada.due_date).toBe('2026-12-24');
    expect((await api.update('list-casa', { due_date: null })).due_date).toBeNull();
  });
});

describe('duplicar (T198)', () => {
  it('copia solo los pendientes, con nombre "(copia)" y sin fijar', async () => {
    const { api } = fresh();
    const copia = await api.duplicate('list-super');
    const detalle = await api.getById(copia.id);
    expect(copia.name).toBe('Súper (copia)');
    expect(copia.is_pinned).toBe(false);
    // El súper tiene cuatro elementos y uno ya palomeado (Queso).
    expect(detalle.items.map((i) => i.title).sort()).toEqual(['Jitomate', 'Leche', 'Manzanas']);
  });

  it('las secciones se copian y cada elemento queda en la sección nueva, no en la original', async () => {
    const { api } = fresh();
    const copia = await api.duplicate('list-super');
    const detalle = await api.getById(copia.id);
    const idsNuevos = new Set(detalle.sections.map((s) => s.id));
    expect(detalle.sections.map((s) => s.name)).toEqual(['Frutas y verduras', 'Lácteos']);
    expect(detalle.items.every((i) => i.section_id !== null && idsNuevos.has(i.section_id))).toBe(true);
  });
});

describe('secciones', () => {
  it('borrar una sección no borra sus elementos: vuelven a la lista sin agrupar', async () => {
    const { api } = fresh();
    await api.removeSection('sec-lacteos');
    const leche = (await api.getById('list-super')).items.find((i) => i.title === 'Leche');
    expect(leche?.section_id).toBeNull();
  });

  it('agregar dentro de una sección deja el elemento ahí (T200)', async () => {
    const { api } = fresh();
    const item = await api.addItem('list-super', YO, { title: 'Peras', section_id: 'sec-frutas' });
    expect(item.section_id).toBe('sec-frutas');
  });
});

describe('referencias vivas (T213)', () => {
  it('lo que sale del demo es una copia: cambiarlo no toca el almacén', async () => {
    const { api } = fresh();
    const [primero] = (await api.getById('list-super')).items;
    primero!.title = 'Cambiado a mano';
    const otra = (await api.getById('list-super')).items[0];
    expect(otra?.title).not.toBe('Cambiado a mano');
  });

  it('intercambiar el orden de dos elementos deja cada uno con el orden del otro', async () => {
    const { api } = fresh();
    const [a, b] = (await api.getById('list-super')).items;
    await api.reorderItem(a!.id, b!.sort_order, a!.section_id);
    await api.reorderItem(b!.id, a!.sort_order, b!.section_id);
    const despues = (await api.getById('list-super')).items;
    expect(despues.find((i) => i.id === a!.id)?.sort_order).toBe(b!.sort_order);
    expect(despues.find((i) => i.id === b!.id)?.sort_order).toBe(a!.sort_order);
  });
});

describe('fechas, vencidos y "Algún día"', () => {
  it('por rango de días: solo de listas activas y en orden de fecha', async () => {
    const { api } = fresh();
    const rango = await api.listByDateRange(YO, dia(-7), dia(7));
    expect(rango.map((i) => i.due_date)).toEqual([...rango.map((i) => i.due_date)].sort());
    await api.update('list-casa', { is_archived: true });
    expect(await api.listByDateRange(YO, dia(-7), dia(7))).toEqual([]);
  });

  it('vencidos: sin palomeados ni archivados, del más viejo al más nuevo (RF-L18)', async () => {
    const { api } = fresh();
    const vencidos = await api.listOverdue(YO, HOY);
    expect(vencidos.map((i) => i.title)).toEqual(['Comprar la bisagra', 'Llamar al plomero']);
    await api.toggleItem('it-bisagra', YO, true);
    expect((await api.listOverdue(YO, HOY)).map((i) => i.title)).toEqual(['Llamar al plomero']);
  });

  it('"Pasar todo a hoy" mueve los indicados y no toca el resto', async () => {
    const { api } = fresh();
    await api.rescheduleItems(['it-bisagra'], HOY);
    expect((await api.listOverdue(YO, HOY)).map((i) => i.id)).toEqual(['it-plomero']);
  });

  it('Algún día: sin fecha, sin palomear y fuera de rutinas y archivadas (T234)', async () => {
    const { api } = fresh();
    const sinFecha = await api.listUndated(YO);
    const titulos = sinFecha.map((i) => i.title);
    expect(titulos).toContain('Cambiar los focos del pasillo');
    expect(titulos).not.toContain('Queso');
    expect(titulos).not.toContain('Lavarme los dientes');
  });

  it('ponerle día a un elemento de Algún día lo saca de la bandeja', async () => {
    const { api } = fresh();
    await api.updateItem('it-focos', { due_date: HOY });
    expect((await api.listUndated(YO)).map((i) => i.id)).not.toContain('it-focos');
    expect((await api.listByDateRange(YO, HOY, HOY)).map((i) => i.id)).toContain('it-focos');
  });

  it('quitar el día deja el elemento sin hora también (la hora no vive sola)', async () => {
    const { api } = fresh();
    const item = await api.updateItem('it-plomero', { due_date: null, due_time: null });
    expect(item).toMatchObject({ due_date: null, due_time: null });
  });
});

describe('buscar (T213)', () => {
  it('vacío no trae nada', async () => {
    const { api } = fresh();
    expect(await api.search(YO, '   ')).toEqual({ lists: [], items: [] });
  });

  it('encuentra listas por nombre y elementos por título o nota, también palomeados', async () => {
    const { api } = fresh();
    expect((await api.search(YO, 'súp')).lists.map((l) => l.id)).toEqual(['list-super']);
    expect((await api.search(YO, 'queso')).items.map((i) => i.id)).toEqual(['it-queso']);
    expect((await api.search(YO, 'bisagra antes')).items.map((i) => i.id)).toEqual(['it-puerta']);
  });

  it('no busca en listas archivadas', async () => {
    const { api } = fresh();
    await api.update('list-super', { is_archived: true });
    expect((await api.search(YO, 'queso')).items).toEqual([]);
  });
});

describe('compartir (T219 – T221)', () => {
  it('retirar el acceso no borra contenido', async () => {
    const { api } = fresh();
    await api.share('list-super', ANA, 'edit');
    await api.unshare('list-super', ANA);
    expect((await api.getById('list-super')).items).toHaveLength(4);
    expect(await api.listShares('list-super')).toEqual([]);
  });

  it('compartir dos veces actualiza el permiso en vez de duplicar', async () => {
    const { api } = fresh();
    await api.share('list-super', ANA, 'view');
    await api.share('list-super', ANA, 'edit');
    const filas = await api.listShares('list-super');
    expect(filas).toHaveLength(1);
    expect(filas[0]?.permission).toBe('edit');
  });

  it('"Compartidas conmigo" no trae archivadas ni las propias', async () => {
    const { api } = fresh();
    await api.share('list-super', ANA, 'view');
    await api.share('list-casa', ANA, 'view');
    await api.update('list-casa', { is_archived: true });
    expect((await api.sharedWithMe(ANA)).map((l) => l.id)).toEqual(['list-super']);
    expect(await api.sharedWithMe(YO)).toEqual([]);
  });

  it('ninguna implementación usa `this`: la fachada reexporta los métodos sueltos (T221)', async () => {
    const { api } = fresh();
    for (const [nombre, fn] of Object.entries(api)) {
      expect({ nombre, usaThis: /\bthis\./.test(String(fn)) }).toEqual({ nombre, usaThis: false });
    }
    const { duplicate } = api;
    await expect(duplicate('list-casa')).resolves.toMatchObject({ name: 'Pendientes de casa (copia)' });
  });
});

describe('etiquetas (T211)', () => {
  it('crear una que ya existe (sin importar mayúsculas) devuelve la existente', async () => {
    const { api } = fresh();
    const casa = await api.createTag(YO, 'Casa');
    const otra = await api.createTag(YO, '  casa ');
    expect(otra.id).toBe(casa.id);
    expect(await api.listTags(YO)).toHaveLength(1);
  });

  it('borrar una etiqueta no borra ninguna lista', async () => {
    const { api } = fresh();
    const tag = await api.createTag(YO, 'Casa');
    await api.setListTag('list-casa', tag.id, true);
    await api.removeTag(tag.id);
    expect((await api.list(YO)).map((l) => l.id)).toContain('list-casa');
    expect((await api.getById('list-casa')).list.tag_ids).toEqual([]);
  });

  it('en una lista compartida, cada quien ve solo sus etiquetas', async () => {
    const { api } = fresh();
    const mia = await api.createTag(YO, 'Casa');
    const deAna = await api.createTag(ANA, 'Pendientes');
    await api.setListTag('list-casa', mia.id, true);
    await api.setListTag('list-casa', deAna.id, true);
    expect((await api.tagsOfList('list-casa', YO)).map((t) => t.id)).toEqual([mia.id]);
    expect((await api.tagsOfList('list-casa', ANA)).map((t) => t.id)).toEqual([deAna.id]);
  });
});

describe('rutinas: vueltas (T208 – T210)', () => {
  it('una lista sin repetición no tiene vueltas', async () => {
    const { api } = fresh();
    expect(await api.syncRuns('list-super', HOY)).toEqual([]);
  });

  it('abre la vuelta de hoy una sola vez', async () => {
    const { api } = fresh();
    const primera = await api.syncRuns('list-rutina', HOY);
    const segunda = await api.syncRuns('list-rutina', HOY);
    expect(primera.map((r) => r.run_date)).toEqual([HOY]);
    expect(segunda.map((r) => r.id)).toEqual(primera.map((r) => r.id));
  });

  it('sin cambios no avisa (evita el bucle que recargaba la pantalla cada 300 ms)', async () => {
    const { api, store } = fresh();
    await api.syncRuns('list-rutina', HOY);
    const oyente = jest.fn();
    const quitar = store.subscribeDataChanges(oyente);
    await api.syncRuns('list-rutina', HOY);
    quitar();
    expect(oyente).not.toHaveBeenCalled();
  });

  it('palomear en la vuelta la cuenta, y desmarcar la descuenta', async () => {
    const { api } = fresh();
    const [vuelta] = await api.syncRuns('list-rutina', HOY);
    await api.setRunItem(vuelta!.id, 'it-dientes', YO, true);
    await api.setRunItem(vuelta!.id, 'it-cama', YO, true);
    await api.setRunItem(vuelta!.id, 'it-cama', YO, false);
    const [actual] = await api.syncRuns('list-rutina', HOY);
    expect(actual?.completed_item_ids).toEqual(['it-dientes']);
  });

  it('las vueltas cerradas salen de la más reciente a la más vieja', async () => {
    const { api } = fresh();
    const cerradas = await api.listRuns('list-rutina');
    expect(cerradas[0]?.run_date).toBe(dia(-1));
    expect(cerradas.at(-1)?.run_date).toBe(dia(-14));
  });

  it('consultar por rango no abre ni cierra vueltas', async () => {
    const { api } = fresh();
    const antes = await api.listRunsByDateRange(YO, dia(-30), dia(30));
    const despues = await api.listRunsByDateRange(YO, dia(-30), dia(30));
    expect(despues).toEqual(antes);
    expect(antes.some((r) => r.run_date === HOY)).toBe(false);
  });
});

describe('rutinas: el paso de los días (T208, RF-L20)', () => {
  afterEach(() => jest.useRealTimers());

  it('al día siguiente después de las 15:00, la vuelta de ayer se cierra con sus conteos y se abre la de hoy', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    jest.setSystemTime(new Date(2026, 9, 7, 10, 0));
    const { api } = fresh();
    const [ayer] = await api.syncRuns('list-rutina', '2026-10-07');
    await api.setRunItem(ayer!.id, 'it-dientes', YO, true);
    await api.setRunItem(ayer!.id, 'it-cama', YO, true);

    jest.setSystemTime(new Date(2026, 9, 8, 16, 0));
    const abiertas = await api.syncRuns('list-rutina', '2026-10-08');
    expect(abiertas.map((r) => r.run_date)).toEqual(['2026-10-08']);
    const cerrada = (await api.listRuns('list-rutina')).find((r) => r.run_date === '2026-10-07');
    expect(cerrada).toMatchObject({ completed_count: 2, total_count: 3 });
  });

  it('antes de las 15:00, palomear en la vuelta de ayer suma a ayer y no a hoy', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    jest.setSystemTime(new Date(2026, 9, 7, 10, 0));
    const { api } = fresh();
    const [ayer] = await api.syncRuns('list-rutina', '2026-10-07');

    jest.setSystemTime(new Date(2026, 9, 8, 9, 0));
    const abiertas = await api.syncRuns('list-rutina', '2026-10-08');
    expect(abiertas.map((r) => r.run_date)).toEqual(['2026-10-08', '2026-10-07']);
    await api.setRunItem(ayer!.id, 'it-dientes', YO, true);
    const despues = await api.syncRuns('list-rutina', '2026-10-08');
    expect(despues.find((r) => r.run_date === '2026-10-07')?.completed_item_ids).toEqual(['it-dientes']);
    expect(despues.find((r) => r.run_date === '2026-10-08')?.completed_item_ids).toEqual([]);
  });

  it('en una rutina, palomear no mueve el elemento a completados: se registra en la vuelta', async () => {
    const { api } = fresh();
    const [hoy] = await api.syncRuns('list-rutina', HOY);
    await api.setRunItem(hoy!.id, 'it-dientes', YO, true);
    const dientes = (await api.getById('list-rutina')).items.find((i) => i.id === 'it-dientes');
    expect(dientes?.completed_at).toBeNull();
  });
});
