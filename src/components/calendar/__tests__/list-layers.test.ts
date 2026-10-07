/**
 * Pendientes y rutinas de Listas en el calendario (spec 10, RF-L12, RF-L26; T217).
 */
import { listItemsToActivities, routinesToActivities } from '@/components/calendar/derived';
import type { KaviList, ListItem } from '@/types/domain';

const lista = { id: 'l1', owner_id: 'u1', name: 'Casa', color: '#F68675', created_at: 'x', updated_at: 'x' } as KaviList;
const item = (over: Partial<ListItem>): ListItem =>
  ({ id: 'i1', list_id: 'l1', title: 'Pagar la luz', due_date: '2026-10-07', due_time: null, created_by: 'u1', created_at: 'x', updated_at: 'x', ...over }) as ListItem;

describe('listItemsToActivities', () => {
  it('un pendiente con hora sigue siendo de todo el día: el chip del mes no pinta hora', () => {
    const [a] = listItemsToActivities([item({ due_time: '17:30:00' })], [lista]);
    expect(a?.all_day).toBe(true);
    expect(new Date(a!.start_at).getHours()).toBe(0);
  });

  it('lleva el color de su lista y el id derivado (no se edita ni comparte)', () => {
    const [a] = listItemsToActivities([item({})], [lista]);
    expect(a).toMatchObject({ id: 'listitem-i1', color: '#F68675', title: 'Pagar la luz' });
  });

  it('sin fecha no entra al calendario', () => {
    expect(listItemsToActivities([item({ due_date: null })], [lista])).toEqual([]);
  });
});

describe('routinesToActivities', () => {
  it('una pieza por rutina y día, con el avance en el título', () => {
    const [a] = routinesToActivities([{ list: lista, day: '2026-10-07', hechos: 2, total: 3, completa: false }]);
    expect(a).toMatchObject({ id: 'listrutina-l1@2026-10-07', title: 'Casa 2/3', all_day: true });
  });
});
