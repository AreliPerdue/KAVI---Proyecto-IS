/** KAVI Lists (spec 10). Fachada sobre el backend activo. */
import { listsApi } from '@/services/backend';

export type { ListDetail } from '@/services/contracts';
export type { KaviList, ListInput, ListItem, ListItemInput, ListSection, ListView } from '@/types/domain';

export const listLists = listsApi.list;
export const listArchivedLists = listsApi.listArchived;
export const getList = listsApi.getById;
export const createList = listsApi.create;
export const updateList = listsApi.update;
export const removeList = listsApi.remove;
export const duplicateList = listsApi.duplicate;
export const reorderList = listsApi.reorder;

export const addSection = listsApi.addSection;
export const renameSection = listsApi.renameSection;
export const removeSection = listsApi.removeSection;

export const addListItem = listsApi.addItem;
export const updateListItem = listsApi.updateItem;
export const removeListItem = listsApi.removeItem;
export const toggleListItem = listsApi.toggleItem;
export const reorderListItem = listsApi.reorderItem;

export const listItemsByDateRange = listsApi.listByDateRange;
export const listOverdueItems = listsApi.listOverdue;
export const rescheduleListItems = listsApi.rescheduleItems;
