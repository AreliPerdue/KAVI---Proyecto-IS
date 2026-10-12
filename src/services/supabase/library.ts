import { AuthUiError } from '@/lib/auth-errors';
import { getSupabase } from '@/lib/supabase';
import { LIBRARY_BUCKET, LIBRARY_LIMITS, LIBRARY_URL_SECONDS } from '@/constants/library';
import { nombreSeguro } from '@/lib/library/files';
import type { LibraryApi } from '@/services/contracts';
import { toError, unwrap } from '@/services/supabase/errors';
import type {
  LibraryAnnotation,
  LibraryCard,
  LibraryCardTemplate,
  LibraryFileBody,
  LibraryFont,
  LibraryItem,
  LibraryPage,
  LibraryShelf,
  LibraryShelfItem,
} from '@/types/domain';
import { t } from '@/i18n';

/**
 * KAVI Library sobre Supabase (spec 13 §6). La RLS deja a cada quien solo lo suyo; aquí no se
 * filtra por dueño más que para no pedir de más. Los archivos van en el bucket privado
 * `library`, en `<uid>/<pieza>/<archivo>`.
 */
const db = () => getSupabase();
const bucket = () => getSupabase().storage.from(LIBRARY_BUCKET);

/** Lanza si hubo error, sin esperar datos (borrar, `upsert` sin `select`). */
function sinError(result: { error: { message: string; code?: string; hint?: string } | null }): void {
  if (result.error) throw toError(result.error);
}

/** Todas las rutas dentro de una carpeta, bajando por subcarpetas (Storage no lista en profundidad). */
async function rutasDe(prefijo: string): Promise<string[]> {
  const { data, error } = await bucket().list(prefijo, { limit: 1000 });
  if (error) throw toError(error);
  const rutas: string[] = [];
  for (const entrada of data ?? []) {
    const ruta = `${prefijo}/${entrada.name}`;
    // Las carpetas vienen sin id ni metadatos.
    if (entrada.id) rutas.push(ruta);
    else rutas.push(...(await rutasDe(ruta)));
  }
  return rutas;
}

async function borrarCarpeta(prefijo: string): Promise<void> {
  const rutas = await rutasDe(prefijo);
  for (let i = 0; i < rutas.length; i += 100) {
    const { error } = await bucket().remove(rutas.slice(i, i + 100));
    if (error) throw toError(error);
  }
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

  async removeItem(itemId) {
    const item = unwrap(await db().from('library_items').select('id, owner_id').eq('id', itemId).single()) as Pick<LibraryItem, 'id' | 'owner_id'>;
    // Primero los archivos: si se borrara antes la fila, quedarían huérfanos ocupando espacio.
    await borrarCarpeta(`${item.owner_id}/${item.id}`);
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
    const { error } = await bucket().upload(ruta, body, { contentType, upsert: true });
    if (error) {
      if (/payload too large|exceeded the maximum/i.test(error.message)) throw new AuthUiError(t().errors.libraryFileTooBig, error);
      throw toError(error);
    }
    return ruta;
  },

  async fileUrl(path) {
    const { data, error } = await bucket().createSignedUrl(path, LIBRARY_URL_SECONDS);
    if (error || !data) throw toError(error ?? { message: 'sin url' });
    return data.signedUrl;
  },

  async removeAllFiles(userId) {
    await borrarCarpeta(userId);
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
    return unwrap(await db().from('library_shelf_items').select('shelf_id, item_id, sort_order, added_at').eq('owner_id', userId)) as LibraryShelfItem[];
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

  async moveInShelf(shelfId, itemId, sortOrder) {
    sinError(await db().from('library_shelf_items').update({ sort_order: sortOrder }).eq('shelf_id', shelfId).eq('item_id', itemId));
  },

  async listAnnotations(itemId) {
    return unwrap(await db().from('library_annotations').select('*').eq('item_id', itemId).order('z')) as LibraryAnnotation[];
  },

  async saveAnnotations(userId, annotations) {
    if (annotations.length === 0) return;
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
    const { error } = await bucket().upload(ruta, input.body, { contentType: `font/${input.format}`, upsert: true });
    if (error) throw toError(error);
    return unwrap(
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
  },

  async removeFont(fontId) {
    const fuente = unwrap(await db().from('library_fonts').select('file_path').eq('id', fontId).single()) as Pick<LibraryFont, 'file_path'>;
    const { error } = await bucket().remove([fuente.file_path]);
    if (error) throw toError(error);
    sinError(await db().from('library_fonts').delete().eq('id', fontId));
  },
};

function tamanoDe(body: LibraryFileBody): number {
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (body instanceof Uint8Array) return body.byteLength;
  return (body as Blob).size;
}
