/** KAVI Library (spec 13). Fachada sobre el backend activo; hooks y UI solo importan esto. */
import { libraryApi } from '@/services/backend';

export type {
  CardField,
  LibraryAnnotation,
  LibraryAnnotationInput,
  LibraryCard,
  LibraryCardTemplate,
  LibraryFont,
  LibraryItem,
  LibraryItemInput,
  LibraryItemPatch,
  LibraryKind,
  LibraryPage,
  LibraryShelf,
  LibraryShelfItem,
} from '@/types/domain';

export const listLibraryItems = libraryApi.listItems;
export const getLibraryItem = libraryApi.getItem;
export const createLibraryItem = libraryApi.createItem;
export const updateLibraryItem = libraryApi.updateItem;
export const removeLibraryItem = libraryApi.removeItem;
export const libraryUsage = libraryApi.usage;
export const uploadLibraryFile = libraryApi.uploadFile;
export const libraryFileUrl = libraryApi.fileUrl;
export const listShelves = libraryApi.listShelves;
export const createShelf = libraryApi.createShelf;
export const updateShelf = libraryApi.updateShelf;
export const removeShelf = libraryApi.removeShelf;
export const listShelfItems = libraryApi.listShelfItems;
export const addToShelf = libraryApi.addToShelf;
export const removeFromShelf = libraryApi.removeFromShelf;
export const moveInShelf = libraryApi.moveInShelf;
export const listAnnotations = libraryApi.listAnnotations;
export const saveAnnotations = libraryApi.saveAnnotations;
export const removeAnnotations = libraryApi.removeAnnotations;
export const listCardTemplates = libraryApi.listCardTemplates;
export const saveCardTemplate = libraryApi.saveCardTemplate;
export const removeCardTemplate = libraryApi.removeCardTemplate;
export const listCards = libraryApi.listCards;
export const saveCard = libraryApi.saveCard;
export const removeCard = libraryApi.removeCard;
export const listPages = libraryApi.listPages;
export const savePages = libraryApi.savePages;
export const removePage = libraryApi.removePage;
export const listFonts = libraryApi.listFonts;
export const addFont = libraryApi.addFont;
export const removeFont = libraryApi.removeFont;
