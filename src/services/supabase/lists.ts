/**
 * KAVI Lists sobre Supabase (spec 10).
 *
 * Pendiente de la migración de T195. Se declara con el contrato completo para que el
 * cascarón compile y las pantallas se puedan armar contra la implementación demo; cada
 * método falla con un mensaje que la UI puede mostrar en su estado de error, en vez de
 * devolver datos vacíos que se verían como "no tienes listas".
 */
import type { ListsApi } from '@/services/contracts';

const PENDIENTE = 'Las listas todavía no están disponibles en tu cuenta.';

function falta(): never {
  throw new Error(PENDIENTE);
}

export const supabaseLists: ListsApi = {
  list: falta,
  listArchived: falta,
  getById: falta,
  create: falta,
  update: falta,
  remove: falta,
  duplicate: falta,
  reorder: falta,
  addSection: falta,
  renameSection: falta,
  removeSection: falta,
  addItem: falta,
  updateItem: falta,
  removeItem: falta,
  toggleItem: falta,
  reorderItem: falta,
  listByDateRange: falta,
  listOverdue: falta,
  rescheduleItems: falta,
};
