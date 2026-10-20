import { File } from 'expo-file-system';
import { apiUrl } from '@/lib/api';
import { AUTH_MESSAGES, AuthUiError, isOfflineError } from '@/lib/auth-errors';
import { uuidv4 } from '@/lib/gym/ids';
import { getSupabase } from '@/lib/supabase';
import { LIBRARY_LIMITS } from '@/constants/library';
import { nombreSeguro } from '@/lib/library/files';
import type { LibraryApi } from '@/services/contracts';
import { toError, unwrap } from '@/services/supabase/errors';
import type {
  LibraryAnnotation,
  LibraryLayout,
  LibraryReadingSession,
  StickerPack,
  UserSticker,
  LibraryClip,
  LibraryClub,
  LibraryClubMember,
  LibraryClubBook,
  LibraryClubProgress,
  LibraryCard,
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

/**
 * KAVI Library sobre Supabase (spec 13 §6). La RLS deja a cada quien solo lo suyo; aquí no se
 * filtra por dueño más que para no pedir de más.
 *
 * Los archivos van en Cloudflare R2 (decisión B2, T313), en `<uid>/<pieza>/<archivo>`. La app no
 * tiene las llaves: le pide a la función `api/library-files` una dirección firmada y sube o baja
 * directo con ella.
 */
const db = () => getSupabase();

/** Errores de la función de archivos, en el idioma de la app (spec 12). */
const ERRORES: Record<string, () => string> = {
  unavailable: () => t().errors.libraryFilesUnavailable,
  signIn: () => t().errors.signInRequired,
  forbidden: () => t().errors.noPermission,
  tooBig: () => t().errors.libraryFileTooBig,
};

/** Llama a `api/library-files` con la sesión de quien usa la app. */
async function archivos<T>(cuerpo: Record<string, unknown>): Promise<T> {
  const { data } = await getSupabase().auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) throw new AuthUiError(t().errors.signInRequired);
  let respuesta: Response;
  try {
    respuesta = await fetch(apiUrl('library-files'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
      body: JSON.stringify(cuerpo),
    });
  } catch (e) {
    throw new AuthUiError(isOfflineError(e) ? AUTH_MESSAGES.offline : t().errors.libraryFilesFailed, e);
  }
  const json = (await respuesta.json().catch(() => null)) as (T & { code?: string }) | null;
  if (!respuesta.ok || !json) throw new AuthUiError((json?.code && ERRORES[json.code]?.()) || t().errors.libraryFilesFailed);
  return json;
}

/** Lanza si hubo error, sin esperar datos (borrar, `upsert` sin `select`). */
function sinError(result: { error: { message: string; code?: string; hint?: string } | null }): void {
  if (result.error) throw toError(result.error);
}

export const supabaseLibrary: LibraryApi = {
  async listItems(userId) {
    return unwrap(await db().from('library_items').select('*').eq('owner_id', userId).order('created_at', { ascending: false })) as LibraryItem[];
  },

  async getItem(itemId) {
    return unwrap(await db().from('library_items').select('*').eq('id', itemId).single()) as LibraryItem;
  },

  async createItem(userId, input) {
    if ((input.file_size ?? 0) > LIBRARY_LIMITS.fileBytes) throw new AuthUiError(t().errors.libraryFileTooBig);
    return unwrap(
      await db()
        .from('library_items')
        .insert({ ...input, owner_id: userId, title: input.title.trim() })
        .select('*')
        .single(),
    ) as LibraryItem;
  },

  async updateItem(itemId, patch) {
    const fila = patch.title !== undefined ? { ...patch, title: patch.title.trim() } : patch;
    return unwrap(await db().from('library_items').update(fila).eq('id', itemId).select('*').single()) as LibraryItem;
  },

  async removeItem(itemId, options) {
    const item = unwrap(await db().from('library_items').select('id, owner_id').eq('id', itemId).single()) as Pick<LibraryItem, 'id' | 'owner_id'>;
    // Primero los archivos: si se borrara antes la fila, quedarían huérfanos ocupando espacio.
    // Al deshacer una importación fallida (`force`) puede que R2 sea justo lo que falla; entonces
    // la fila se borra igual, porque una pieza sin archivo no se puede abrir.
    try {
      await archivos({ action: 'delete', itemId: item.id });
    } catch (e) {
      if (!options?.force) throw e;
    }
    sinError(await db().from('library_items').delete().eq('id', itemId));
  },

  async usage(userId) {
    const filas = unwrap(await db().from('library_items').select('file_size').eq('owner_id', userId)) as { file_size: number }[];
    return { usedBytes: filas.reduce((total, f) => total + (f.file_size ?? 0), 0), limitBytes: LIBRARY_LIMITS.userBytes };
  },

  async uploadFile(userId, itemId, fileName, body, contentType) {
    const tamano = tamanoDe(body);
    if (tamano > LIBRARY_LIMITS.fileBytes) throw new AuthUiError(t().errors.libraryFileTooBig);
    const ruta = `${userId}/${itemId}/${nombreSeguro(fileName)}`;
    await subir(archivos, { itemId, path: ruta, contentType, size: tamano }, body);
    return ruta;
  },

  async fileUrl(path) {
    return (await archivos<{ url: string }>({ action: 'read', path })).url;
  },

  async downloadFile(path, destinationUri) {
    const url = (await archivos<{ url: string }>({ action: 'read', path })).url;
    // Directo de R2 al disco: el libro no pasa por JavaScript.
    await File.downloadFileAsync(url, new File(destinationUri), { idempotent: true });
  },

  async removeAllFiles() {
    // La función borra la carpeta de la sesión, no la de un id que mande la app.
    await archivos({ action: 'deleteAll' });
  },

  async listSeries(userId) {
    return unwrap(await db().from('library_series').select('*').eq('owner_id', userId).order('name')) as LibrarySeries[];
  },

  async ensureSeries(userId, name) {
    const limpio = name.trim();
    const existentes = unwrap(await db().from('library_series').select('*').eq('owner_id', userId)) as LibrarySeries[];
    const igual = existentes.find((s) => s.name.trim().toLowerCase() === limpio.toLowerCase());
    if (igual) return igual;
    return unwrap(await db().from('library_series').insert({ owner_id: userId, name: limpio }).select('*').single()) as LibrarySeries;
  },

  async renameSeries(seriesId, name) {
    return unwrap(await db().from('library_series').update({ name: name.trim() }).eq('id', seriesId).select('*').single()) as LibrarySeries;
  },

  async removeSeries(seriesId) {
    sinError(await db().from('library_series').delete().eq('id', seriesId));
  },

  async listLinks(userId) {
    return unwrap(await db().from('library_links').select('*').eq('owner_id', userId).order('created_at')) as LibraryLink[];
  },

  async addLink(userId, fromItem, toItem, kind) {
    const r = await db().from('library_links').insert({ owner_id: userId, from_item: fromItem, to_item: toItem, kind }).select('*').single();
    // El índice único por pareja (en cualquier sentido) dice que ya estaban enlazados.
    if (r.error?.code === '23505') throw new AuthUiError(t().library.links.duplicate, r.error);
    return unwrap(r) as LibraryLink;
  },

  async removeLink(linkId) {
    sinError(await db().from('library_links').delete().eq('id', linkId));
  },

  async listShelves(userId) {
    return unwrap(await db().from('library_shelves').select('*').eq('owner_id', userId).order('sort_order')) as LibraryShelf[];
  },

  async createShelf(userId, input) {
    const existentes = unwrap(
      await db().from('library_shelves').select('sort_order').eq('owner_id', userId).order('sort_order', { ascending: false }).limit(1),
    ) as { sort_order: number }[];
    return unwrap(
      await db()
        .from('library_shelves')
        .insert({ ...input, name: input.name.trim(), owner_id: userId, sort_order: (existentes[0]?.sort_order ?? 0) + 1024 })
        .select('*')
        .single(),
    ) as LibraryShelf;
  },

  async updateShelf(shelfId, patch) {
    const fila = patch.name !== undefined ? { ...patch, name: patch.name.trim() } : patch;
    return unwrap(await db().from('library_shelves').update(fila).eq('id', shelfId).select('*').single()) as LibraryShelf;
  },

  async removeShelf(shelfId) {
    sinError(await db().from('library_shelves').delete().eq('id', shelfId));
  },

  async listShelfItems(userId) {
    return unwrap(await db().from('library_shelf_items').select('shelf_id, item_id, sort_order, spine_order, added_at').eq('owner_id', userId)) as LibraryShelfItem[];
  },

  async addToShelf(userId, shelfId, itemId) {
    const ultimos = unwrap(
      await db().from('library_shelf_items').select('sort_order').eq('shelf_id', shelfId).order('sort_order', { ascending: false }).limit(1),
    ) as { sort_order: number }[];
    // Ya estar en el librero no es un error: agregarla otra vez no hace nada.
    sinError(
      await db()
        .from('library_shelf_items')
        .upsert({ shelf_id: shelfId, item_id: itemId, owner_id: userId, sort_order: (ultimos[0]?.sort_order ?? 0) + 1024 }, { onConflict: 'shelf_id,item_id', ignoreDuplicates: true }),
    );
  },

  async removeFromShelf(shelfId, itemId) {
    sinError(await db().from('library_shelf_items').delete().eq('shelf_id', shelfId).eq('item_id', itemId));
  },

  async moveInShelf(shelfId, itemId, sortOrder, view = 'covers') {
    const cambio = view === 'spines' ? { spine_order: sortOrder } : { sort_order: sortOrder };
    sinError(await db().from('library_shelf_items').update(cambio).eq('shelf_id', shelfId).eq('item_id', itemId));
  },

  async uploadAnnotationImage(userId, itemId, annotationId, jpeg) {
    const ruta = `${userId}/${itemId}/anotaciones/${annotationId}.jpg`;
    await subir(archivos, { itemId, path: ruta, contentType: 'image/jpeg', size: tamanoDe(jpeg) }, jpeg);
    return ruta;
  },

  async removeAnnotationImage(userId, itemId, annotationId) {
    await archivos({ action: 'deleteFile', path: `${userId}/${itemId}/anotaciones/${annotationId}.jpg` });
  },

  async listReadingSessions(userId) {
    return unwrap(
      await db().from('library_reading_sessions').select('*').eq('owner_id', userId).order('started_at', { ascending: false }).limit(2000),
    ) as LibraryReadingSession[];
  },

  async listStickerPacks() {
    return unwrap(
      await db()
        .from('sticker_packs')
        .select('id, collection, color, name_es, name_en, sort_order, stickers, bytes, version')
        .order('collection')
        .order('sort_order'),
    ) as StickerPack[];
  },

  async listMyStickerPacks(userId) {
    return (unwrap(await db().from('user_sticker_packs').select('pack_id').eq('owner_id', userId)) as { pack_id: string }[]).map((r) => r.pack_id);
  },

  async addStickerPack(userId, packId) {
    sinError(await db().from('user_sticker_packs').upsert({ owner_id: userId, pack_id: packId }, { ignoreDuplicates: true }));
  },

  async removeStickerPack(userId, packId) {
    sinError(await db().from('user_sticker_packs').delete().eq('owner_id', userId).eq('pack_id', packId));
  },

  async listUserStickers(userId) {
    return unwrap(await db().from('library_user_stickers').select('*').eq('owner_id', userId).order('created_at', { ascending: false })) as UserSticker[];
  },

  async createUserSticker(userId, sticker, png) {
    const path = `${userId}/stickers/${sticker.id}.png`;
    await subir(archivos, { path, contentType: 'image/png', size: tamanoDe(png) }, png);
    return unwrap(
      await db().from('library_user_stickers').insert({ id: sticker.id, owner_id: userId, path, ar: sticker.ar, margin: sticker.margin }).select().single(),
    ) as UserSticker;
  },

  async removeUserSticker(userId, stickerId) {
    sinError(await db().from('library_user_stickers').delete().eq('owner_id', userId).eq('id', stickerId));
    await archivos({ action: 'deleteFile', path: `${userId}/stickers/${stickerId}.png` });
  },

  async listClips(userId) {
    return unwrap(await db().from('library_clips').select('*').eq('owner_id', userId).order('created_at', { ascending: false })) as LibraryClip[];
  },

  async createClip(userId, clip, jpeg) {
    const path = clip.kind === 'image' ? `${userId}/clips/${clip.id}.jpg` : null;
    if (path && jpeg) await subir(archivos, { path, contentType: 'image/jpeg', size: tamanoDe(jpeg) }, jpeg);
    return unwrap(
      await db()
        .from('library_clips')
        .insert({ ...clip, text: clip.kind === 'text' ? clip.text : null, ar: path ? clip.ar : null, owner_id: userId, path })
        .select()
        .single(),
    ) as LibraryClip;
  },

  async updateClipNote(userId, clipId, note) {
    const limpia = note?.trim() || null;
    return unwrap(await db().from('library_clips').update({ note: limpia }).eq('owner_id', userId).eq('id', clipId).select().single()) as LibraryClip;
  },

  async removeClip(userId, clipId) {
    const fila = unwrap(await db().from('library_clips').delete().eq('owner_id', userId).eq('id', clipId).select('path')) as { path: string | null }[];
    const path = fila[0]?.path;
    if (path) await archivos({ action: 'deleteFile', path });
  },

  async listClubs() {
    // La RLS deja ver los clubes que dirijo y en los que estoy o me invitaron.
    return unwrap(await db().from('library_clubs').select('*').order('created_at', { ascending: false })) as LibraryClub[];
  },

  async listClubMembers(clubIds) {
    if (!clubIds.length) return [];
    return unwrap(
      await db()
        .from('library_club_members')
        .select('*, profile:profiles!library_club_members_person_id_fkey(display_name, username, avatar_url)')
        .in('club_id', [...clubIds])
        .order('created_at'),
    ) as LibraryClubMember[];
  },

  async createClub(userId, input) {
    return unwrap(
      await db()
        .from('library_clubs')
        // El tipo y el tamaño los pone la base desde el libro (su huella); van solo para cumplir la tabla.
        .insert({ host_id: userId, name: input.name.trim(), source_item_id: input.sourceItemId, kind: 'pdf', file_size: 1 })
        .select('*')
        .single(),
    ) as LibraryClub;
  },

  async renameClub(clubId, name) {
    sinError(await db().from('library_clubs').update({ name: name.trim() }).eq('id', clubId));
  },

  async inviteToClub(clubId, personIds) {
    if (!personIds.length) return;
    sinError(await db().from('library_club_members').insert(personIds.map((person_id) => ({ club_id: clubId, person_id }))));
  },

  async removeClubInvite(clubId, personId) {
    sinError(await db().from('library_club_members').delete().eq('club_id', clubId).eq('person_id', personId).eq('status', 'pending'));
  },

  async leaveClub(clubId) {
    sinError(await db().rpc('library_leave_club', { p_club: clubId }));
  },

  async removeClubMember(clubId, personId) {
    sinError(await db().rpc('library_remove_club_member', { p_club: clubId, p_person: personId }));
  },

  async closeClub(clubId) {
    sinError(await db().from('library_clubs').delete().eq('id', clubId));
  },

  async setClubProgressVisible(userId, clubId, visible) {
    sinError(await db().from('library_club_members').update({ shows_progress: visible }).eq('club_id', clubId).eq('person_id', userId));
  },

  async getClubBook(clubId) {
    const f = unwrap(await db().rpc('library_club_source', { p_club: clubId })) as LibraryClubBook | null;
    // Solo lo que se muestra: las rutas del original son para la función de archivos.
    return f
      ? { title: f.title, authors: f.authors ?? [], kind: f.kind, file_size: f.file_size, cover_color: f.cover_color, page_count: f.page_count, host_name: f.host_name }
      : null;
  },

  async listClubProgress(clubId) {
    const filas = unwrap(await db().rpc('library_club_progress', { p_club: clubId })) as LibraryClubProgress[] | null;
    return (filas ?? []).map((f) => ({ ...f, progress: Number(f.progress) }));
  },

  async acceptClubInvite(userId, clubId) {
    const fuente = unwrap(await db().rpc('library_club_source', { p_club: clubId })) as
      | (LibraryClubBook & { file_path: string | null; cover_path: string | null })
      | null;
    if (!fuente?.file_path) throw new AuthUiError(t().errors.clubNoBook);
    // La copia vive en mi carpeta, con el mismo nombre de archivo; la base cuida mi tope de 500 MB.
    const id = uuidv4();
    const nombre = (ruta: string) => ruta.split('/').pop() as string;
    const copia = unwrap(
      await db()
        .from('library_items')
        .insert({
          id,
          owner_id: userId,
          family: 'book',
          kind: fuente.kind,
          title: fuente.title,
          authors: fuente.authors ?? [],
          file_size: fuente.file_size,
          file_path: `${userId}/${id}/${nombre(fuente.file_path)}`,
          cover_path: fuente.cover_path ? `${userId}/${id}/${nombre(fuente.cover_path)}` : null,
          cover_color: fuente.cover_color,
          page_count: fuente.page_count,
          club_id: clubId,
        })
        .select('*')
        .single(),
    ) as LibraryItem;
    try {
      await archivos({ action: 'clubCopy', clubId, itemId: id });
      sinError(await db().from('library_club_members').update({ status: 'accepted', item_id: id }).eq('club_id', clubId).eq('person_id', userId));
    } catch (e) {
      // Sin la copia completa no queda nada a medias (13f §7).
      await archivos({ action: 'delete', itemId: id }).catch(() => undefined);
      await db().from('library_items').delete().eq('id', id);
      throw e;
    }
    return copia;
  },

  async saveReadingSession(userId, session) {
    sinError(await db().from('library_reading_sessions').upsert({ ...session, owner_id: userId }));
  },

  async listLayouts(userId) {
    return unwrap(await db().from('library_layouts').select('*').eq('owner_id', userId).order('created_at')) as LibraryLayout[];
  },

  async saveLayout(userId, input) {
    return unwrap(
      await db()
        .from('library_layouts')
        .insert({ ...input, name: input.name.trim(), owner_id: userId })
        .select()
        .single(),
    ) as LibraryLayout;
  },

  async removeLayout(layoutId) {
    sinError(await db().from('library_layouts').delete().eq('id', layoutId));
  },

  async applyOrder(view, shelfId, itemIds) {
    sinError(await db().rpc('library_apply_order', { p_view: view, p_shelf: shelfId, p_ids: [...itemIds] }));
  },

  async listAnnotations(itemId, clubId) {
    const consulta = db().from('library_annotations').select('*');
    // En una copia de club: lo mío de esta pieza y lo del club de todos (la RLS deja ver solo eso).
    const filtrada = clubId ? consulta.or(`item_id.eq.${itemId},club_id.eq.${clubId}`) : consulta.eq('item_id', itemId);
    return unwrap(await filtrada.order('z')) as LibraryAnnotation[];
  },

  async saveAnnotations(userId, annotations) {
    if (annotations.length === 0) return;
    // Una anotación del club de otro miembro se cambia sin volverse mía: la base conserva su dueño (T305).
    sinError(await db().from('library_annotations').upsert(annotations.map((a) => ({ ...a, owner_id: userId }))));
  },

  async removeAnnotations(ids) {
    if (ids.length === 0) return;
    sinError(await db().from('library_annotations').delete().in('id', [...ids]));
  },

  async listCardTemplates(userId) {
    return unwrap(await db().from('library_card_templates').select('*').eq('owner_id', userId).order('created_at')) as LibraryCardTemplate[];
  },

  async saveCardTemplate(userId, input) {
    return unwrap(
      await db()
        .from('library_card_templates')
        .upsert({ ...input, name: input.name.trim(), owner_id: userId })
        .select('*')
        .single(),
    ) as LibraryCardTemplate;
  },

  async removeCardTemplate(templateId) {
    sinError(await db().from('library_card_templates').delete().eq('id', templateId));
  },

  async listCards(userId) {
    return unwrap(await db().from('library_cards').select('*').eq('owner_id', userId).order('updated_at', { ascending: false })) as LibraryCard[];
  },

  async saveCard(userId, input) {
    return unwrap(
      await db()
        .from('library_cards')
        // Una ficha por plantilla en cada pieza (RF-BF7): guardar otra vez la reemplaza.
        .upsert({ ...input, owner_id: userId }, { onConflict: 'item_id,template_id' })
        .select('*')
        .single(),
    ) as LibraryCard;
  },

  async removeCard(cardId) {
    sinError(await db().from('library_cards').delete().eq('id', cardId));
  },

  async listPages(itemId) {
    return unwrap(await db().from('library_pages').select('*').eq('item_id', itemId).order('sort_order')) as LibraryPage[];
  },

  async savePages(userId, pages) {
    if (pages.length === 0) return;
    sinError(await db().from('library_pages').upsert(pages.map((p) => ({ ...p, owner_id: userId }))));
  },

  async removePage(pageId) {
    sinError(await db().from('library_pages').delete().eq('id', pageId));
  },

  async listFonts(userId) {
    return unwrap(await db().from('library_fonts').select('*').eq('owner_id', userId).order('created_at')) as LibraryFont[];
  },

  async addFont(userId, input) {
    if (input.size > LIBRARY_LIMITS.fontBytes) throw new AuthUiError(t().errors.libraryFileTooBig);
    const ruta = `${userId}/fonts/${nombreSeguro(input.name)}.${input.format}`;
    // Primero la fila: la función de archivos solo firma rutas que ya están en la base.
    const fila = unwrap(
      await db()
        .from('library_fonts')
        .insert({
          owner_id: userId,
          name: input.name.trim(),
          file_path: ruta,
          format: input.format,
          file_size: input.size,
          license_accepted_at: input.licenseAcceptedAt,
        })
        .select('*')
        .single(),
    ) as LibraryFont;
    try {
      await subir(archivos, { fontId: fila.id, path: ruta, contentType: `font/${input.format}`, size: input.size }, input.body);
    } catch (e) {
      await db().from('library_fonts').delete().eq('id', fila.id);
      throw e;
    }
    return fila;
  },

  async removeFont(fontId) {
    await archivos({ action: 'delete', fontId });
    sinError(await db().from('library_fonts').delete().eq('id', fontId));
  },
};

/** Pide la firma de subida y manda el archivo directo a R2 con ella. */
async function subir(
  pedir: typeof archivos,
  datos: { itemId?: string; fontId?: string; path: string; contentType: string; size: number },
  body: LibraryFileBody,
): Promise<void> {
  const firma = await pedir<{ url: string; headers: Record<string, string> }>({ action: 'upload', ...datos });
  let respuesta: Response;
  try {
    // `content-length` lo pone la plataforma y tiene que coincidir con el tamaño firmado.
    respuesta = await fetch(firma.url, { method: 'PUT', headers: firma.headers, body: body as BodyInit });
  } catch (e) {
    // La firma acaba de llegar, así que hay conexión: en web, un rechazo de R2 sin encabezados de CORS
    // se ve igual que estar sin red. Decir "sin conexión" aquí confundía.
    console.warn('[library] subida a R2', e instanceof Error ? e.message : e);
    throw new AuthUiError(t().errors.libraryUploadFailed, e);
  }
  if (!respuesta.ok) throw new AuthUiError(t().errors.libraryUploadFailed);
}

function tamanoDe(body: LibraryFileBody): number {
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (body instanceof Uint8Array) return body.byteLength;
  return (body as Blob).size;
}
