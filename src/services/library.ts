/** KAVI Library (spec 13). Fachada sobre el backend activo; hooks y UI solo importan esto. */
import { nombreSeguro } from '@/lib/library/files';
import { COLUMNAS_DE_PARTE, type ParteDeTapa } from '@/lib/library/cover/parts';
import type { LibroLeido } from '@/lib/library/import';
import { libraryApi } from '@/services/backend';
import type { LibraryItem } from '@/types/domain';

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
  LibraryLayout,
  LibraryLayoutView,
  LibraryLink,
  LibraryReadingSession,
  LibraryReadingSessionInput,
  StickerPack,
  UserSticker,
  LibraryClip,
  NuevoFragmento,
  LibraryClub,
  LibraryClubMember,
  LibraryClubBook,
  LibraryClubProgress,
  LibraryLinkKind,
  LibrarySeries,
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
export const downloadLibraryFile = libraryApi.downloadFile;
export const listLinks = libraryApi.listLinks;
export const addLink = libraryApi.addLink;
export const removeLink = libraryApi.removeLink;
export const listSeries = libraryApi.listSeries;
export const ensureSeries = libraryApi.ensureSeries;
export const renameSeries = libraryApi.renameSeries;
export const removeSeries = libraryApi.removeSeries;
export const listShelves = libraryApi.listShelves;
export const createShelf = libraryApi.createShelf;
export const updateShelf = libraryApi.updateShelf;
export const removeShelf = libraryApi.removeShelf;
export const listShelfItems = libraryApi.listShelfItems;
export const addToShelf = libraryApi.addToShelf;
export const removeFromShelf = libraryApi.removeFromShelf;
export const moveInShelf = libraryApi.moveInShelf;
export const listLayouts = libraryApi.listLayouts;
export const listReadingSessions = libraryApi.listReadingSessions;
export const uploadAnnotationImage = libraryApi.uploadAnnotationImage;
export const removeAnnotationImage = libraryApi.removeAnnotationImage;
export const saveReadingSession = libraryApi.saveReadingSession;
export const listStickerPacks = libraryApi.listStickerPacks;
export const listMyStickerPacks = libraryApi.listMyStickerPacks;
export const addStickerPack = libraryApi.addStickerPack;
export const removeStickerPack = libraryApi.removeStickerPack;
export const listUserStickers = libraryApi.listUserStickers;
export const createUserSticker = libraryApi.createUserSticker;
export const removeUserSticker = libraryApi.removeUserSticker;
export const listClips = libraryApi.listClips;
export const createClip = libraryApi.createClip;
export const updateClipNote = libraryApi.updateClipNote;
export const removeClip = libraryApi.removeClip;
export const listClubs = libraryApi.listClubs;
export const listClubMembers = libraryApi.listClubMembers;
export const createClub = libraryApi.createClub;
export const renameClub = libraryApi.renameClub;
export const inviteToClub = libraryApi.inviteToClub;
export const removeClubInvite = libraryApi.removeClubInvite;
export const leaveClub = libraryApi.leaveClub;
export const removeClubMember = libraryApi.removeClubMember;
export const closeClub = libraryApi.closeClub;
export const setClubProgressVisible = libraryApi.setClubProgressVisible;
export const getClubBook = libraryApi.getClubBook;
export const acceptClubInvite = libraryApi.acceptClubInvite;
export const listClubProgress = libraryApi.listClubProgress;
export const saveLayout = libraryApi.saveLayout;
export const removeLayout = libraryApi.removeLayout;
export const applyOrder = libraryApi.applyOrder;
export const listAnnotations = libraryApi.listAnnotations;
export const saveAnnotations = libraryApi.saveAnnotations;
export const removeAnnotations = libraryApi.removeAnnotations;
export const listCardTemplates = libraryApi.listCardTemplates;
export const saveCardTemplate = libraryApi.saveCardTemplate;
export const removeCardTemplate = libraryApi.removeCardTemplate;
export const listCanvases = libraryApi.listCanvases;
export const getCanvas = libraryApi.getCanvas;
export const saveCanvas = libraryApi.saveCanvas;
export const removeCanvas = libraryApi.removeCanvas;
export const listCards = libraryApi.listCards;
export const saveCard = libraryApi.saveCard;
export const removeCard = libraryApi.removeCard;
export const listPages = libraryApi.listPages;
export const savePages = libraryApi.savePages;
export const removePage = libraryApi.removePage;
export const listFonts = libraryApi.listFonts;
export const addFont = libraryApi.addFont;
export const removeFont = libraryApi.removeFont;

/** Lo que la persona confirmó al importar (RF-BL12): los datos ya corregidos y el libro leído. */
export type ImportarLibro = {
  /** Se decide al leer el archivo, para que la portada generada de la vista previa sea la misma. */
  id: string;
  libro: LibroLeido;
  title: string;
  authors: string[];
  genres: string[];
  /** La saga y su número (RF-BL24); se busca por nombre o se crea. */
  serie?: { nombre: string; numero: number | null } | null;
  /** Más datos (RF-BL19). */
  mas?: Partial<Pick<LibraryItem, 'publisher' | 'publish_place' | 'edition' | 'chapter_count' | 'synopsis'>>;
};

const TIPO_CONTENIDO: Record<LibroLeido['formato'], string> = { pdf: 'application/pdf', epub: 'application/epub+zip' };

/**
 * Guarda un libro importado (RF-BL11 – RF-BL14). Primero la fila, porque es la base la que cuida
 * el tope de 500 MB (B2) y así no se sube un archivo que no cabe; después el archivo y la portada
 * en `<uid>/<pieza>/`. Si la subida falla, se borra la pieza: un libro sin archivo no se puede
 * abrir y no debe quedarse en la librería (RF-BR2).
 */
export async function importLibraryBook(userId: string, { id, libro, title, authors, genres, serie, mas }: ImportarLibro): Promise<LibraryItem> {
  const { archivo, formato, datos, color } = libro;
  const nombre = /\.(pdf|epub)$/i.test(archivo.name) ? archivo.name : `${archivo.name}.${formato}`;
  const portada = datos.cover ? `cover.${datos.cover.ext}` : null;
  const saga = serie?.nombre.trim() ? await libraryApi.ensureSeries(userId, serie.nombre) : null;
  const item = await libraryApi.createItem(userId, {
    id,
    family: 'book',
    kind: formato,
    title: title.trim() || datos.title,
    authors,
    genres,
    file_path: `${userId}/${id}/${nombreSeguro(nombre)}`,
    cover_path: portada ? `${userId}/${id}/${portada}` : null,
    cover_color: color,
    file_size: archivo.bytes.length,
    page_count: datos.pageCount,
    ...(saga ? { series_id: saga.id, series_index: serie?.numero ?? null } : {}),
    ...mas,
  });
  try {
    await libraryApi.uploadFile(userId, id, nombre, archivo.bytes, TIPO_CONTENIDO[formato]);
    if (datos.cover && portada) await libraryApi.uploadFile(userId, id, portada, datos.cover.bytes, datos.cover.mime);
  } catch (e) {
    await libraryApi.removeItem(id, { force: true }).catch(() => undefined);
    throw e;
  }
  return item;
}

/**
 * La portada de un PDF es su primera página (RF-BL12): el motor la dibuja después de subir el libro
 * y aquí se guarda. Primero la ruta en la fila —la función de archivos solo firma rutas que ya están
 * en la base— y después la imagen; si la subida falla, la fila vuelve a quedar sin portada.
 */
export async function saveLibraryCover(userId: string, itemId: string, jpeg: Uint8Array, color: string | null): Promise<void> {
  await libraryApi.updateItem(itemId, { cover_path: `${userId}/${itemId}/cover.jpg`, cover_color: color });
  try {
    await libraryApi.uploadFile(userId, itemId, 'cover.jpg', jpeg, 'image/jpeg');
  } catch (e) {
    await libraryApi.updateItem(itemId, { cover_path: null, cover_color: null }).catch(() => undefined);
    throw e;
  }
}

/**
 * Poner la imagen propia de una cara del libro (RF-BL20, RF-BL23): la portada (aparte de la del archivo,
 * para poder volver a ella), el lomo o la contraportada. Primero la ruta en la fila —la función de
 * archivos solo firma rutas que ya están en la base— y después la imagen; si la subida falla, la pieza
 * se queda como estaba.
 */
export async function setCoverPart(userId: string, item: LibraryItem, parte: ParteDeTapa, jpeg: Uint8Array, color: string | null): Promise<void> {
  const { ruta, color: columnaColor, archivo } = COLUMNAS_DE_PARTE[parte];
  await libraryApi.updateItem(item.id, { [ruta]: `${userId}/${item.id}/${archivo}`, [columnaColor]: color });
  try {
    await libraryApi.uploadFile(userId, item.id, archivo, jpeg, 'image/jpeg');
  } catch (e) {
    await libraryApi.updateItem(item.id, { [ruta]: item[ruta], [columnaColor]: item[columnaColor] }).catch(() => undefined);
    throw e;
  }
}

/** Quitar la imagen propia de una cara: la portada vuelve a la del archivo; el lomo y la contraportada, al color. */
export async function clearCoverPart(itemId: string, parte: ParteDeTapa): Promise<void> {
  const { ruta, color } = COLUMNAS_DE_PARTE[parte];
  await libraryApi.updateItem(itemId, { [ruta]: null, [color]: null });
}
