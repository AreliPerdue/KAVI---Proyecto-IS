import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { AuthUiError } from '@/lib/auth-errors';
import { LIBRARY_LIMITS } from '@/constants/library';
import type { LibraryApi } from '@/services/contracts';
import { areConnected } from '@/services/demo/connections';
import { DEMO_CONTACTS, delay, demoState, emitDataChange, nextId } from '@/services/demo/store';
import { nombreSeguro } from '@/lib/library/files';
import type {
  LibraryAnnotation,
  LibraryCard,
  LibraryLayout,
  LibraryReadingSession,
  StickerPack,
  UserSticker,
  LibraryClip,
  LibraryClub,
  LibraryClubMember,
  LibraryClubBook,
  LibraryCardTemplate,
  LibraryFileBody,
  LibraryFont,
  LibraryItem,
  LibraryPage,
  LibraryLink,
  LibrarySeries,
  LibraryShelf,
  LibraryShelfItem,
} from '@/types/domain';
import { t } from '@/i18n';
import { STICKERS } from '@/constants/stickers';

/**
 * KAVI Library en memoria, con las mismas reglas que la base (`20261012100000_library.sql`):
 * tope de 500 MB por persona, 50 MB por archivo, una ficha por plantilla en cada pieza, y borrar
 * una pieza se lleva lo que cuelga de ella. Los archivos se guardan aquí mismo.
 */
const items: LibraryItem[] = [];
const shelves: LibraryShelf[] = [];
const series: LibrarySeries[] = [];
const links: LibraryLink[] = [];
const shelfItems: (LibraryShelfItem & { owner_id: string })[] = [];
const annotations: LibraryAnnotation[] = [];
const templates: LibraryCardTemplate[] = [];
const cards: LibraryCard[] = [];
const pages: LibraryPage[] = [];
const fonts: LibraryFont[] = [];
const layouts: LibraryLayout[] = [];
const sesiones: LibraryReadingSession[] = [];
const misPacks: { owner_id: string; pack_id: string }[] = [];
const stickersPropios: UserSticker[] = [];
const fragmentos: LibraryClip[] = [];
const clubes: LibraryClub[] = [];
const miembros: Omit<LibraryClubMember, 'profile'>[] = [];

/** Quien usa el demo en este momento (las reglas del club dependen de quién pide). */
const yo = () => demoState.currentUser?.id ?? '';
const esAnfitrion = (clubId: string) => clubes.some((c) => c.id === clubId && c.host_id === yo());

function perfilDe(id: string): LibraryClubMember['profile'] {
  const p = demoState.accounts.find((a) => a.user.id === id)?.profile;
  return p ? { display_name: p.display_name, username: p.username, avatar_url: p.avatar_url } : null;
}

/** Una copia de un libro de club para `ownerId`: el mismo archivo en su carpeta, sin su avance ni su saga. */
function copiaDeClub(fuente: LibraryItem, ownerId: string, clubId: string): LibraryItem {
  const id = nextId('libro');
  const nombre = (ruta: string) => ruta.split('/').pop() as string;
  const t0 = ahora();
  const nueva: LibraryItem = {
    ...copia(fuente),
    id,
    owner_id: ownerId,
    file_path: fuente.file_path ? `${ownerId}/${id}/${nombre(fuente.file_path)}` : null,
    cover_path: fuente.cover_path ? `${ownerId}/${id}/${nombre(fuente.cover_path)}` : null,
    custom_cover_path: null,
    spine_path: null,
    back_cover_path: null,
    series_id: null,
    series_index: null,
    progress: 0,
    last_position: null,
    sort_order: -Date.now() / 1000,
    spine_order: null,
    club_id: clubId,
    created_at: t0,
    updated_at: t0,
  };
  for (const [de, a] of [[fuente.file_path, nueva.file_path], [fuente.cover_path, nueva.cover_path]] as const) {
    const archivo = de ? archivos.get(de) : undefined;
    if (archivo && a) archivos.set(a, archivo);
  }
  items.push(nueva);
  return nueva;
}

/**
 * En el demo los otros miembros son contactos simulados (13f §5): aceptan solos al rato de invitarlos, con su
 * copia del libro.
 */
function aceptaSolo(clubId: string, personId: string) {
  const espera = setTimeout(() => {
    const m = miembros.find((x) => x.club_id === clubId && x.person_id === personId && x.status === 'pending');
    const club = clubes.find((c) => c.id === clubId);
    const fuente = club && items.find((i) => i.id === club.source_item_id);
    if (!m || !fuente) return;
    m.item_id = copiaDeClub(fuente, personId, clubId).id;
    m.status = 'accepted';
    m.joined_at = ahora();
    emitDataChange();
  }, 1500);
  // En las pruebas (Node) no detiene el cierre; en la app no hace nada.
  (espera as unknown as { unref?: () => void }).unref?.();
}

/**
 * Una invitación de Ana a su club, para ver en el demo cómo se acepta (13f, RF-BC3). Su libro es una muestra
 * de una página.
 */
const PDF_DE_MUESTRA =
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 360 480]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n' +
  '4 0 obj<</Length 92>>stream\nBT /F1 22 Tf 40 400 Td (Cuentos de la selva) Tj 0 -40 Td /F1 14 Tf (Muestra para el club) Tj ET\nendstream endobj\n' +
  '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n';
let clubDeAnaSembrado = false;
function sembrarClubDeAna() {
  if (clubDeAnaSembrado) return;
  clubDeAnaSembrado = true;
  const ana = DEMO_CONTACTS.ana.id;
  const bytes = new TextEncoder().encode(PDF_DE_MUESTRA);
  const t0 = ahora();
  const libroId = nextId('libro');
  const ruta = `${ana}/${libroId}/cuentos-de-la-selva.pdf`;
  archivos.set(ruta, { body: bytes, type: 'application/pdf' });
  const libro: LibraryItem = {
    id: libroId,
    owner_id: ana,
    family: 'book',
    kind: 'pdf',
    title: 'Cuentos de la selva',
    authors: ['Horacio Quiroga'],
    category: null,
    genres: [],
    cover_path: null,
    cover_color: '#3E7C47',
    custom_cover_path: null,
    custom_cover_color: null,
    spine_path: null,
    spine_color: null,
    back_cover_path: null,
    back_cover_color: null,
    sort_order: 0,
    spine_order: null,
    series_id: null,
    series_index: null,
    publisher: null,
    publish_place: null,
    edition: null,
    chapter_count: null,
    synopsis: null,
    file_path: ruta,
    pdf_path: null,
    file_size: bytes.length,
    page_count: 1,
    progress: 0,
    last_position: null,
    reading_mode: null,
    style: null,
    base_color: null,
    created_at: t0,
    updated_at: t0,
  };
  items.push(libro);
  const club: LibraryClub = { id: nextId('club'), host_id: ana, name: 'Club de Ana', source_item_id: libroId, kind: 'pdf', file_size: bytes.length, created_at: t0, updated_at: t0 };
  clubes.push(club);
  libro.club_id = club.id;
  miembros.push(
    { club_id: club.id, person_id: ana, status: 'accepted', item_id: libroId, shows_progress: true, invited_by: ana, created_at: t0, joined_at: t0 },
    { club_id: club.id, person_id: 'demo-user', status: 'pending', item_id: null, shows_progress: true, invited_by: ana, created_at: t0, joined_at: null },
  );
}

/**
 * Como `library_club_disconnect` en la base (RF-BC8): a la copia de la persona pasan, como suyas, las
 * anotaciones del club de los demás (con su autor); las suyas dejan de ser del club; su copia sale del club.
 */
function desconectar(clubId: string, personId: string) {
  const m = miembros.find((x) => x.club_id === clubId && x.person_id === personId);
  if (m?.status === 'accepted' && m.item_id) {
    const t0 = ahora();
    for (const a of annotations.filter((x) => x.club_id === clubId && x.owner_id !== personId && !x.removed)) {
      annotations.push({ ...copia(a), id: nextId('anotacion'), item_id: m.item_id, owner_id: personId, club_id: null, author_id: a.author_id ?? a.owner_id, updated_by: null, removed: false, updated_at: t0 });
    }
    for (const a of annotations) if (a.club_id === clubId && a.owner_id === personId) a.club_id = null;
    const item = items.find((i) => i.id === m.item_id);
    if (item?.club_id === clubId) item.club_id = null;
  }
  quitarDe(miembros, (x) => x.club_id === clubId && x.person_id === personId);
}
const archivos = new Map<string, { body: LibraryFileBody; type: string }>();

/**
 * El catálogo de la tienda en el demo (T338): el mismo que en la nube (Primer Rebote en 24 colores, las
 * mismas caras que los rosas incluidos). Las imágenes se piden al bucket público, como en la app de verdad.
 */
const COLORES_DEMO = ['baby_blue', 'orange', 'lime_green', 'turquois', 'yellow', 'lilac', 'coral', 'gray', 'olive_green', 'white', 'magenta', 'light_purple', 'red', 'indigo', 'blue', 'deep_red', 'green', 'navy_blue', 'purple', 'black', 'gold', 'beige', 'brown', 'silver'];
const PACKS_DEMO: StickerPack[] = COLORES_DEMO.map((color, i) => ({
  id: `primer-rebote-${color.replace(/_/g, '-')}`,
  collection: 'primer-rebote',
  color,
  name_es: 'Primer Rebote',
  name_en: 'First Bounce',
  sort_order: i + 1,
  stickers: [...STICKERS].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((s) => ({ name: s.nombre, ar: s.ar })),
  bytes: 1_150_000,
  version: 1,
}));

const ahora = () => new Date().toISOString();
const copia = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function buscar<T extends { id: string }>(lista: T[], id: string): T {
  const x = lista.find((e) => e.id === id);
  if (!x) throw new AuthUiError(t().errors.noPermission);
  return x;
}

function tamanoDe(body: LibraryFileBody): number {
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (body instanceof Uint8Array) return body.byteLength;
  return (body as Blob).size;
}

function usado(userId: string, salvo?: string): number {
  return items.filter((i) => i.owner_id === userId && i.id !== salvo).reduce((total, i) => total + i.file_size, 0);
}

function revisarEspacio(userId: string, tamano: number, salvo?: string) {
  if (tamano > LIBRARY_LIMITS.fileBytes) throw new AuthUiError(t().errors.libraryFileTooBig);
  if (usado(userId, salvo) + tamano > LIBRARY_LIMITS.userBytes) throw new AuthUiError(t().errors.libraryQuota);
}

function borrarCarpeta(prefijo: string) {
  for (const ruta of [...archivos.keys()]) if (ruta.startsWith(`${prefijo}/`)) archivos.delete(ruta);
}

function quitarDe<T>(lista: T[], quitar: (x: T) => boolean) {
  for (let i = lista.length - 1; i >= 0; i--) if (quitar(lista[i] as T)) lista.splice(i, 1);
}

export const demoLibrary: LibraryApi = {
  async listItems(userId) {
    await delay();
    return copia(items.filter((i) => i.owner_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },

  async getItem(itemId) {
    await delay();
    return copia(buscar(items, itemId));
  },

  async createItem(userId, input) {
    await delay();
    revisarEspacio(userId, input.file_size ?? 0);
    const t0 = ahora();
    const item: LibraryItem = {
      id: input.id ?? nextId('libro'),
      owner_id: userId,
      family: input.family,
      kind: input.kind,
      title: input.title.trim(),
      authors: input.authors ?? [],
      category: input.category ?? null,
      genres: input.genres ?? [],
      cover_path: input.cover_path ?? null,
      cover_color: input.cover_color ?? null,
      custom_cover_path: null,
      custom_cover_color: null,
      spine_path: null,
      spine_color: null,
      back_cover_path: null,
      back_cover_color: null,
      // Como la base: lo nuevo entra al principio.
      sort_order: -Date.now() / 1000,
      spine_order: null,
      series_id: input.series_id ?? null,
      series_index: input.series_index ?? null,
      publisher: input.publisher ?? null,
      publish_place: input.publish_place ?? null,
      edition: input.edition ?? null,
      chapter_count: input.chapter_count ?? null,
      synopsis: input.synopsis ?? null,
      file_path: input.file_path ?? null,
      pdf_path: input.pdf_path ?? null,
      file_size: input.file_size ?? 0,
      page_count: input.page_count ?? null,
      progress: 0,
      last_position: null,
      reading_mode: null,
      style: input.style ?? null,
      base_color: input.base_color ?? null,
      created_at: t0,
      updated_at: t0,
    };
    items.push(item);
    emitDataChange();
    return copia(item);
  },

  async updateItem(itemId, patch) {
    await delay();
    const item = buscar(items, itemId);
    if (patch.file_size !== undefined) revisarEspacio(item.owner_id, patch.file_size, item.id);
    Object.assign(item, patch, patch.title !== undefined ? { title: patch.title.trim() } : {}, { updated_at: ahora() });
    emitDataChange();
    return copia(item);
  },

  async removeItem(itemId) {
    await delay();
    const item = buscar(items, itemId);
    borrarCarpeta(`${item.owner_id}/${item.id}`);
    quitarDe(items, (i) => i.id === itemId);
    quitarDe(links, (k) => k.from_item === itemId || k.to_item === itemId);
    quitarDe(shelfItems, (s) => s.item_id === itemId);
    quitarDe(annotations, (a) => a.item_id === itemId);
    quitarDe(sesiones, (x) => x.item_id === itemId);
    quitarDe(cards, (c) => c.item_id === itemId);
    quitarDe(pages, (p) => p.item_id === itemId);
    // Los fragmentos se quedan, con su título (RF-BH21).
    for (const f of fragmentos) if (f.item_id === itemId) f.item_id = null;
    // Un club pierde su libro de origen o la copia de alguien, pero sigue (13f).
    for (const c of clubes) if (c.source_item_id === itemId) c.source_item_id = null;
    for (const m of miembros) if (m.item_id === itemId) m.item_id = null;
    emitDataChange();
  },

  async usage(userId) {
    await delay();
    return { usedBytes: usado(userId), limitBytes: LIBRARY_LIMITS.userBytes };
  },

  async uploadFile(userId, itemId, fileName, body, contentType) {
    await delay();
    if (tamanoDe(body) > LIBRARY_LIMITS.fileBytes) throw new AuthUiError(t().errors.libraryFileTooBig);
    const ruta = `${userId}/${itemId}/${nombreSeguro(fileName)}`;
    archivos.set(ruta, { body, type: contentType });
    return ruta;
  },

  async fileUrl(path) {
    await delay();
    const archivo = archivos.get(path);
    if (!archivo) throw new AuthUiError(t().errors.noPermission);
    // En web el archivo se abre con una URL local, venga como Blob o como bytes (lo que sube la
    // importación, T278); en Jest o en el teléfono basta con la ruta.
    if (Platform.OS === 'web' && typeof Blob !== 'undefined' && typeof URL !== 'undefined' && 'createObjectURL' in URL) {
      const blob = archivo.body instanceof Blob ? archivo.body : new Blob([archivo.body as BlobPart], { type: archivo.type });
      return URL.createObjectURL(blob);
    }
    return `demo://${path}`;
  },

  async downloadFile(path, destinationUri) {
    await delay();
    const archivo = archivos.get(path);
    if (!archivo) throw new AuthUiError(t().errors.noPermission);
    const { body } = archivo;
    const bytes = body instanceof Uint8Array ? body : body instanceof ArrayBuffer ? new Uint8Array(body) : new Uint8Array(await body.arrayBuffer());
    new File(destinationUri).write(bytes);
  },

  async removeAllFiles(userId) {
    await delay();
    borrarCarpeta(userId);
  },

  async listSeries(userId) {
    await delay();
    return copia(series.filter((s) => s.owner_id === userId).sort((a, b) => a.name.localeCompare(b.name, 'es')));
  },

  async ensureSeries(userId, name) {
    await delay();
    const limpio = name.trim();
    const igual = series.find((s) => s.owner_id === userId && s.name.trim().toLowerCase() === limpio.toLowerCase());
    if (igual) return copia(igual);
    const t0 = ahora();
    const nueva: LibrarySeries = { id: nextId('series'), owner_id: userId, name: limpio, created_at: t0, updated_at: t0 };
    series.push(nueva);
    emitDataChange();
    return copia(nueva);
  },

  async renameSeries(seriesId, name) {
    await delay();
    const s = buscar(series, seriesId);
    s.name = name.trim();
    s.updated_at = ahora();
    emitDataChange();
    return copia(s);
  },

  async removeSeries(seriesId) {
    await delay();
    quitarDe(series, (s) => s.id === seriesId);
    // Como la base (`on delete set null`): los libros se quedan, sin saga.
    for (const i of items) if (i.series_id === seriesId) i.series_id = null;
    emitDataChange();
  },

  async listLinks(userId) {
    await delay();
    return copia(links.filter((k) => k.owner_id === userId));
  },

  async addLink(userId, fromItem, toItem, kind) {
    await delay();
    // Las mismas reglas que la base: piezas propias, distintas, y un solo enlace por pareja.
    if (fromItem === toItem) throw new AuthUiError(t().errors.noPermission);
    const mias = (id: string) => items.some((i) => i.id === id && i.owner_id === userId);
    if (!mias(fromItem) || !mias(toItem)) throw new AuthUiError(t().errors.noPermission);
    if (links.some((k) => k.owner_id === userId && ((k.from_item === fromItem && k.to_item === toItem) || (k.from_item === toItem && k.to_item === fromItem)))) {
      throw new AuthUiError(t().library.links.duplicate);
    }
    const nuevo: LibraryLink = { id: nextId('link'), owner_id: userId, from_item: fromItem, to_item: toItem, kind, created_at: ahora() };
    links.push(nuevo);
    emitDataChange();
    return copia(nuevo);
  },

  async removeLink(linkId) {
    await delay();
    quitarDe(links, (k) => k.id === linkId);
    emitDataChange();
  },

  async listShelves(userId) {
    await delay();
    return copia(shelves.filter((s) => s.owner_id === userId).sort((a, b) => a.sort_order - b.sort_order));
  },

  async createShelf(userId, input) {
    await delay();
    const mias = shelves.filter((s) => s.owner_id === userId);
    const t0 = ahora();
    const shelf: LibraryShelf = {
      id: nextId('librero'),
      owner_id: userId,
      name: input.name.trim(),
      color: input.color ?? null,
      icon: input.icon ?? null,
      sort_order: (mias.reduce((m, s) => Math.max(m, s.sort_order), 0) || 0) + 1024,
      created_at: t0,
      updated_at: t0,
    };
    shelves.push(shelf);
    emitDataChange();
    return copia(shelf);
  },

  async updateShelf(shelfId, patch) {
    await delay();
    const shelf = buscar(shelves, shelfId);
    Object.assign(shelf, patch, patch.name !== undefined ? { name: patch.name.trim() } : {}, { updated_at: ahora() });
    emitDataChange();
    return copia(shelf);
  },

  async removeShelf(shelfId) {
    await delay();
    quitarDe(shelves, (s) => s.id === shelfId);
    quitarDe(shelfItems, (s) => s.shelf_id === shelfId);
    quitarDe(layouts, (x) => x.shelf_id === shelfId);
    emitDataChange();
  },

  async listShelfItems(userId) {
    await delay();
    return copia(shelfItems.filter((s) => s.owner_id === userId).map(({ owner_id: _o, ...resto }) => resto));
  },

  async addToShelf(userId, shelfId, itemId) {
    await delay();
    if (shelfItems.some((s) => s.shelf_id === shelfId && s.item_id === itemId)) return;
    const enEse = shelfItems.filter((s) => s.shelf_id === shelfId);
    shelfItems.push({
      shelf_id: shelfId,
      item_id: itemId,
      owner_id: userId,
      sort_order: enEse.reduce((m, s) => Math.max(m, s.sort_order), 0) + 1024,
      added_at: ahora(),
    });
    emitDataChange();
  },

  async removeFromShelf(shelfId, itemId) {
    await delay();
    quitarDe(shelfItems, (s) => s.shelf_id === shelfId && s.item_id === itemId);
    emitDataChange();
  },

  async moveInShelf(shelfId, itemId, sortOrder, view = 'covers') {
    await delay();
    const fila = shelfItems.find((s) => s.shelf_id === shelfId && s.item_id === itemId);
    if (fila && view === 'spines') fila.spine_order = sortOrder;
    else if (fila) fila.sort_order = sortOrder;
    emitDataChange();
  },

  async uploadAnnotationImage(userId, itemId, annotationId, jpeg) {
    await delay();
    if (!items.some((i) => i.id === itemId && i.owner_id === userId)) throw new AuthUiError(t().errors.noPermission);
    if (tamanoDe(jpeg) > 5 * 1024 * 1024) throw new AuthUiError(t().errors.libraryFileTooBig);
    const ruta = `${userId}/${itemId}/anotaciones/${annotationId}.jpg`;
    archivos.set(ruta, { body: jpeg, type: 'image/jpeg' });
    return ruta;
  },

  async removeAnnotationImage(userId, itemId, annotationId) {
    await delay();
    if (!items.some((i) => i.id === itemId && i.owner_id === userId)) throw new AuthUiError(t().errors.noPermission);
    archivos.delete(`${userId}/${itemId}/anotaciones/${annotationId}.jpg`);
  },

  async listReadingSessions(userId) {
    await delay();
    return copia(sesiones.filter((x) => x.owner_id === userId).sort((a, b) => b.started_at.localeCompare(a.started_at)));
  },

  async listStickerPacks() {
    await delay();
    return copia(PACKS_DEMO);
  },

  async listMyStickerPacks(userId) {
    await delay();
    return misPacks.filter((x) => x.owner_id === userId).map((x) => x.pack_id);
  },

  async addStickerPack(userId, packId) {
    await delay();
    if (!PACKS_DEMO.some((p) => p.id === packId)) throw new AuthUiError(t().errors.noPermission);
    if (!misPacks.some((x) => x.owner_id === userId && x.pack_id === packId)) misPacks.push({ owner_id: userId, pack_id: packId });
    emitDataChange();
  },

  async removeStickerPack(userId, packId) {
    await delay();
    const i = misPacks.findIndex((x) => x.owner_id === userId && x.pack_id === packId);
    if (i >= 0) misPacks.splice(i, 1);
    emitDataChange();
  },

  async listUserStickers(userId) {
    await delay();
    return copia(stickersPropios.filter((s) => s.owner_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },

  async createUserSticker(userId, sticker, png) {
    await delay();
    if (tamanoDe(png) > 2 * 1024 * 1024) throw new AuthUiError(t().errors.libraryFileTooBig);
    if (!(sticker.ar >= 0.25 && sticker.ar <= 4)) throw new AuthUiError(t().errors.noPermission);
    const path = `${userId}/stickers/${sticker.id}.png`;
    archivos.set(path, { body: png, type: 'image/png' });
    const fila: UserSticker = { id: sticker.id, owner_id: userId, path, ar: sticker.ar, margin: sticker.margin, created_at: ahora() };
    stickersPropios.push(fila);
    emitDataChange();
    return copia(fila);
  },

  async removeUserSticker(userId, stickerId) {
    await delay();
    const i = stickersPropios.findIndex((s) => s.owner_id === userId && s.id === stickerId);
    if (i >= 0) {
      archivos.delete(stickersPropios[i].path);
      stickersPropios.splice(i, 1);
    }
    emitDataChange();
  },

  async listClips(userId) {
    await delay();
    return copia(fragmentos.filter((f) => f.owner_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },

  async createClip(userId, clip, jpeg) {
    await delay();
    if (clip.item_id && !items.some((i) => i.id === clip.item_id && i.owner_id === userId)) throw new AuthUiError(t().errors.noPermission);
    const titulo = clip.book_title.trim().slice(0, 300);
    if (!titulo) throw new AuthUiError(t().errors.noPermission);
    let path: string | null = null;
    if (clip.kind === 'image') {
      if (!jpeg || !(clip.ar !== null && clip.ar >= 0.05 && clip.ar <= 20)) throw new AuthUiError(t().errors.noPermission);
      if (tamanoDe(jpeg) > 2 * 1024 * 1024) throw new AuthUiError(t().errors.libraryFileTooBig);
      path = `${userId}/clips/${clip.id}.jpg`;
      archivos.set(path, { body: jpeg, type: 'image/jpeg' });
    }
    const fila: LibraryClip = {
      ...clip,
      book_title: titulo,
      text: clip.kind === 'text' ? (clip.text?.slice(0, 5000) ?? null) : null,
      ar: path ? clip.ar : null,
      owner_id: userId,
      path,
      note: null,
      created_at: ahora(),
      updated_at: ahora(),
    };
    fragmentos.push(fila);
    emitDataChange();
    return copia(fila);
  },

  async updateClipNote(userId, clipId, note) {
    await delay();
    const fila = fragmentos.find((f) => f.owner_id === userId && f.id === clipId);
    if (!fila) throw new AuthUiError(t().errors.noPermission);
    fila.note = note?.trim().slice(0, 2000) || null;
    fila.updated_at = ahora();
    emitDataChange();
    return copia(fila);
  },

  async removeClip(userId, clipId) {
    await delay();
    const i = fragmentos.findIndex((f) => f.owner_id === userId && f.id === clipId);
    if (i >= 0) {
      if (fragmentos[i].path) archivos.delete(fragmentos[i].path as string);
      fragmentos.splice(i, 1);
    }
    emitDataChange();
  },

  async listClubs(userId) {
    await delay();
    sembrarClubDeAna();
    return copia(clubes.filter((c) => c.host_id === userId || miembros.some((m) => m.club_id === c.id && m.person_id === userId)));
  },

  async listClubMembers(clubIds) {
    await delay();
    return copia(miembros.filter((m) => clubIds.includes(m.club_id)).map((m) => ({ ...m, profile: perfilDe(m.person_id) })));
  },

  async createClub(userId, input) {
    await delay();
    const libro = items.find((i) => i.id === input.sourceItemId && i.owner_id === userId);
    if (!libro || libro.family !== 'book' || (libro.kind !== 'pdf' && libro.kind !== 'epub') || !libro.file_size) throw new AuthUiError(t().errors.clubSource);
    if (libro.club_id) throw new AuthUiError(t().errors.clubAlready);
    const t0 = ahora();
    const club: LibraryClub = {
      id: nextId('club'),
      host_id: userId,
      name: input.name.trim().slice(0, 120) || libro.title,
      source_item_id: libro.id,
      kind: libro.kind,
      file_size: libro.file_size,
      created_at: t0,
      updated_at: t0,
    };
    clubes.push(club);
    miembros.push({ club_id: club.id, person_id: userId, status: 'accepted', item_id: libro.id, shows_progress: true, invited_by: userId, created_at: t0, joined_at: t0 });
    libro.club_id = club.id;
    emitDataChange();
    return copia(club);
  },

  async renameClub(clubId, name) {
    await delay();
    const club = clubes.find((c) => c.id === clubId);
    if (!club || club.host_id !== yo()) throw new AuthUiError(t().errors.clubNotHost);
    club.name = name.trim().slice(0, 120) || club.name;
    club.updated_at = ahora();
    emitDataChange();
  },

  async inviteToClub(clubId, personIds) {
    await delay();
    if (!esAnfitrion(clubId)) throw new AuthUiError(t().errors.clubNotHost);
    const nuevos = personIds.filter((p) => p !== yo() && !miembros.some((m) => m.club_id === clubId && m.person_id === p));
    if (nuevos.some((p) => !areConnected(yo(), p))) throw new AuthUiError(t().errors.clubOnlyContacts);
    if (miembros.filter((m) => m.club_id === clubId).length + nuevos.length > 12) throw new AuthUiError(t().errors.clubFull);
    const t0 = ahora();
    for (const p of nuevos) {
      miembros.push({ club_id: clubId, person_id: p, status: 'pending', item_id: null, shows_progress: true, invited_by: yo(), created_at: t0, joined_at: null });
      aceptaSolo(clubId, p);
    }
    emitDataChange();
  },

  async removeClubInvite(clubId, personId) {
    await delay();
    if (personId !== yo() && !esAnfitrion(clubId)) throw new AuthUiError(t().errors.clubNotHost);
    quitarDe(miembros, (m) => m.club_id === clubId && m.person_id === personId && m.status === 'pending');
    emitDataChange();
  },

  async leaveClub(clubId) {
    await delay();
    if (!miembros.some((m) => m.club_id === clubId && m.person_id === yo())) throw new AuthUiError(t().errors.clubNotMember);
    if (esAnfitrion(clubId)) throw new AuthUiError(t().errors.clubHostLeaves);
    desconectar(clubId, yo());
    emitDataChange();
  },

  async removeClubMember(clubId, personId) {
    await delay();
    if (!esAnfitrion(clubId) || personId === yo()) throw new AuthUiError(t().errors.clubNotHost);
    desconectar(clubId, personId);
    emitDataChange();
  },

  async closeClub(clubId) {
    await delay();
    if (!esAnfitrion(clubId)) throw new AuthUiError(t().errors.clubNotHost);
    for (const m of miembros.filter((x) => x.club_id === clubId && x.status === 'accepted')) desconectar(clubId, m.person_id);
    quitarDe(miembros, (m) => m.club_id === clubId);
    quitarDe(clubes, (c) => c.id === clubId);
    emitDataChange();
  },

  async setClubProgressVisible(userId, clubId, visible) {
    await delay();
    const m = miembros.find((x) => x.club_id === clubId && x.person_id === userId);
    if (m) m.shows_progress = visible;
    emitDataChange();
  },

  async getClubBook(clubId) {
    await delay();
    const club = clubes.find((c) => c.id === clubId);
    const invitado = miembros.some((m) => m.club_id === clubId && m.person_id === yo());
    const fuente = club && invitado ? items.find((i) => i.id === club.source_item_id) : undefined;
    if (!club || !fuente) return null;
    const libro: LibraryClubBook = {
      title: fuente.title,
      authors: [...fuente.authors],
      kind: club.kind,
      file_size: club.file_size,
      cover_color: fuente.cover_color,
      page_count: fuente.page_count,
      host_name: perfilDe(club.host_id)?.display_name ?? null,
    };
    return libro;
  },

  async acceptClubInvite(userId, clubId) {
    await delay();
    const m = miembros.find((x) => x.club_id === clubId && x.person_id === userId && x.status === 'pending');
    if (!m) throw new AuthUiError(t().errors.clubNotMember);
    const club = clubes.find((c) => c.id === clubId);
    const fuente = club && items.find((i) => i.id === club.source_item_id);
    if (!club || !fuente) throw new AuthUiError(t().errors.clubNoBook);
    // Como la base: la copia cuenta en mi espacio (B2).
    revisarEspacio(userId, club.file_size);
    const nueva = copiaDeClub(fuente, userId, clubId);
    m.status = 'accepted';
    m.item_id = nueva.id;
    m.joined_at = ahora();
    emitDataChange();
    return copia(nueva);
  },

  async saveReadingSession(userId, session) {
    await delay();
    // Las mismas reglas que la base: de 1 min a 24 h, nunca más que lo que duró, y en un libro propio.
    const duro = (Date.parse(session.ended_at) - Date.parse(session.started_at)) / 1000;
    const pieza = items.find((i) => i.id === session.item_id && i.owner_id === userId);
    if (!pieza || session.seconds < 60 || session.seconds > 86400 || duro < 0 || session.seconds > duro + 60) throw new AuthUiError(t().errors.noPermission);
    const t0 = ahora();
    const previa = sesiones.find((x) => x.id === session.id);
    if (previa) Object.assign(previa, session, { updated_at: t0 });
    else sesiones.push({ ...session, owner_id: userId, created_at: t0, updated_at: t0 });
    emitDataChange();
  },

  async listLayouts(userId) {
    await delay();
    return copia(layouts.filter((x) => x.owner_id === userId).sort((a, b) => a.created_at.localeCompare(b.created_at)));
  },

  async saveLayout(userId, input) {
    await delay();
    const nombre = input.name.trim();
    if (!nombre || nombre.length > 60) throw new AuthUiError(t().errors.noPermission);
    if (input.shelf_id && !shelves.some((s) => s.id === input.shelf_id && s.owner_id === userId)) throw new AuthUiError(t().errors.noPermission);
    const t0 = ahora();
    const nuevo: LibraryLayout = { id: nextId('acomodo'), owner_id: userId, name: nombre, view: input.view, shelf_id: input.shelf_id, item_ids: [...input.item_ids], created_at: t0, updated_at: t0 };
    layouts.push(nuevo);
    emitDataChange();
    return copia(nuevo);
  },

  async removeLayout(layoutId) {
    await delay();
    quitarDe(layouts, (x) => x.id === layoutId);
    emitDataChange();
  },

  async applyOrder(view, shelfId, itemIds) {
    await delay();
    itemIds.forEach((id, i) => {
      const orden = (i + 1) * 1024;
      if (shelfId) {
        const fila = shelfItems.find((s) => s.shelf_id === shelfId && s.item_id === id);
        if (fila && view === 'spines') fila.spine_order = orden;
        else if (fila) fila.sort_order = orden;
      } else {
        const item = items.find((x) => x.id === id);
        if (item && view === 'spines') item.spine_order = orden;
        else if (item) item.sort_order = orden;
      }
    });
    emitDataChange();
  },

  async listAnnotations(itemId) {
    await delay();
    return copia(annotations.filter((a) => a.item_id === itemId).sort((a, b) => a.z - b.z));
  },

  async saveAnnotations(userId, entradas) {
    await delay();
    const t0 = ahora();
    for (const e of entradas) {
      const previa = annotations.find((a) => a.id === e.id);
      if (previa) {
        // Otro miembro del club solo cambia el contenido: ni la pieza ni el club (como la base, T305).
        const ajena = previa.owner_id !== userId;
        Object.assign(previa, ajena ? { ...e, item_id: previa.item_id, club_id: previa.club_id } : e, { updated_by: userId, updated_at: t0 });
      } else {
        if (e.club_id) {
          const item = items.find((i) => i.id === e.item_id);
          const miembro = miembros.some((m) => m.club_id === e.club_id && m.person_id === userId && m.status === 'accepted');
          if (!miembro || item?.club_id !== e.club_id) throw new AuthUiError(t().errors.clubAnnotation);
        }
        annotations.push({
          id: e.id, item_id: e.item_id, owner_id: userId, kind: e.kind, locator: e.locator,
          content: e.content ?? {}, z: e.z ?? 0, removed: e.removed ?? false, locked: e.locked ?? false,
          club_id: e.club_id ?? null, author_id: userId, updated_by: null,
          created_at: t0, updated_at: t0,
        });
      }
    }
    emitDataChange();
  },

  async removeAnnotations(ids) {
    await delay();
    const quitar = new Set(ids);
    quitarDe(annotations, (a) => quitar.has(a.id));
    emitDataChange();
  },

  async listCardTemplates(userId) {
    await delay();
    return copia(templates.filter((p) => p.owner_id === userId));
  },

  async saveCardTemplate(userId, input) {
    await delay();
    const t0 = ahora();
    const previa = input.id ? templates.find((p) => p.id === input.id) : undefined;
    if (previa) {
      Object.assign(previa, input, { name: input.name.trim(), updated_at: t0 });
      emitDataChange();
      return copia(previa);
    }
    const nueva: LibraryCardTemplate = {
      id: input.id ?? nextId('plantilla'), owner_id: userId, name: input.name.trim(), fields: input.fields, look: input.look ?? {},
      archived: input.archived ?? false, created_at: t0, updated_at: t0,
    };
    templates.push(nueva);
    emitDataChange();
    return copia(nueva);
  },

  async removeCardTemplate(templateId) {
    await delay();
    quitarDe(templates, (p) => p.id === templateId);
    quitarDe(cards, (c) => c.template_id === templateId);
    emitDataChange();
  },

  async listCards(userId) {
    await delay();
    return copia(cards.filter((c) => c.owner_id === userId).sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
  },

  async saveCard(userId, input) {
    await delay();
    const t0 = ahora();
    // Una ficha por plantilla en cada pieza (RF-BF7): guardar otra vez la reemplaza.
    const previa = cards.find((c) => c.item_id === input.item_id && c.template_id === input.template_id);
    if (previa) {
      Object.assign(previa, input, { id: previa.id, updated_at: t0 });
      emitDataChange();
      return copia(previa);
    }
    const nueva: LibraryCard = {
      id: input.id ?? nextId('ficha'), item_id: input.item_id, template_id: input.template_id, owner_id: userId,
      values: input.values ?? {}, placement: input.placement ?? 'back', created_at: t0, updated_at: t0,
    };
    cards.push(nueva);
    emitDataChange();
    return copia(nueva);
  },

  async removeCard(cardId) {
    await delay();
    quitarDe(cards, (c) => c.id === cardId);
    emitDataChange();
  },

  async listPages(itemId) {
    await delay();
    return copia(pages.filter((p) => p.item_id === itemId).sort((a, b) => a.sort_order - b.sort_order));
  },

  async savePages(userId, entradas) {
    await delay();
    const t0 = ahora();
    for (const e of entradas) {
      const previa = pages.find((p) => p.id === e.id);
      if (previa) Object.assign(previa, e, { updated_at: t0 });
      else
        pages.push({
          id: e.id, item_id: e.item_id, owner_id: userId, template: e.template, sort_order: e.sort_order ?? 1024,
          layers: e.layers ?? {}, created_at: t0, updated_at: t0,
        });
    }
    emitDataChange();
  },

  async removePage(pageId) {
    await delay();
    quitarDe(pages, (p) => p.id === pageId);
    emitDataChange();
  },

  async listFonts(userId) {
    await delay();
    return copia(fonts.filter((f) => f.owner_id === userId));
  },

  async addFont(userId, input) {
    await delay();
    if (input.size > LIBRARY_LIMITS.fontBytes) throw new AuthUiError(t().errors.libraryFileTooBig);
    const ruta = `${userId}/fonts/${nombreSeguro(input.name)}.${input.format}`;
    archivos.set(ruta, { body: input.body, type: `font/${input.format}` });
    const fuente: LibraryFont = {
      id: nextId('fuente'), owner_id: userId, name: input.name.trim(), file_path: ruta, format: input.format,
      file_size: input.size, license_accepted_at: input.licenseAcceptedAt, created_at: ahora(),
    };
    fonts.push(fuente);
    emitDataChange();
    return copia(fuente);
  },

  async removeFont(fontId) {
    await delay();
    const fuente = buscar(fonts, fontId);
    archivos.delete(fuente.file_path);
    quitarDe(fonts, (f) => f.id === fontId);
    emitDataChange();
  },
};
