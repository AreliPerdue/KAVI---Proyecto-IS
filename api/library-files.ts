/**
 * Función de Vercel: los archivos de KAVI Library en Cloudflare R2 (spec 13 §5, decisión B2, T313).
 *
 * Por qué R2 y por qué aquí: R2 da 10 GB gratis y no cobra las descargas, que es lo que más gasta
 * leer libros; Supabase Storage cobra la descarga y su plan gratis da 1 GB en total. Las llaves de
 * R2 no pueden vivir en la app (cualquiera las sacaría del APK), así que esta función las guarda y
 * solo **firma direcciones temporales**: el archivo va directo entre el dispositivo y R2.
 *
 * Quién puede qué: la app manda su sesión (`Authorization: Bearer <jwt>`). Con ella se consulta
 * `library_items` como esa persona, así que la RLS decide: si la fila no sale, la pieza no es suya.
 * Además toda ruta tiene que estar en la carpeta de quien pide (`<uid>/<pieza>/…`).
 *
 * Acciones (POST, JSON):
 * - `upload` `{ itemId | fontId, path, contentType, size }` → dirección para subir con `PUT`. La ruta
 *   debe ser el archivo, el PDF o una portada de esa pieza (la del archivo o la propia), una imagen pegada
 *   en ella (`<uid>/<pieza>/anotaciones/<id>.jpg`, 13c RF-BH12, T289), o el archivo de esa fuente. El
 *   tamaño queda
 *   firmado: el archivo debe medir lo que dice su fila (la base cuida el tope de 500 MB con ese número),
 *   una portada o una imagen pegada 5 MB o menos y una fuente 10 MB o menos.
 * - `read` `{ path }` → dirección para leer con `GET`, válida una hora. También la imagen pegada o el sticker propio
 *   de otra persona si quien pide ve una anotación que los usa (club de lectura, 13f, T307; la RLS decide).
 * - `delete` `{ itemId | fontId }` → borra la carpeta de la pieza o el archivo de la fuente (antes de
 *   borrar su fila).
 * - Stickers propios (T335): `upload`, `read` y `deleteFile` de `<uid>/stickers/<id>.png` (PNG de hasta 2 MB).
 * - Fragmentos de imagen (T317): lo mismo con `<uid>/clips/<id>.jpg` (JPEG de hasta 2 MB), fuera de la carpeta
 *   del libro para que borrarlo no los borre.
 * - `deleteFile` `{ path }` → borra una imagen pegada que ya no se usa (T333: una hora después de quitarla,
 *   si no se deshizo). Solo rutas `<uid>/<pieza>/anotaciones/<id>.jpg` de una pieza propia.
 * - `deleteAll` → borra la carpeta de la persona (al eliminar la cuenta, RF-A12).
 * - `clubCopy` `{ clubId, itemId }` → club de lectura (13f, RF-BC3; T306): copia dentro de R2 el libro del
 *   anfitrión (y su portada) a la copia de quien acepta, sin pasar por el teléfono. La copia es una pieza suya,
 *   ya creada con `club_id` (la base cuidó su espacio); el original lo da `library_club_source`, que solo
 *   responde a quien está invitado.
 *
 * Cada error lleva un `code` (`unavailable`, `signIn`, `forbidden`, `tooBig`, `badRequest`, `failed`)
 * que la app traduce a su idioma (spec 12); `error` es el mismo mensaje en español, para los registros.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables; nunca en el repo):
 * `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
 * `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AwsClient, AwsV4Signer } from 'aws4fetch';

/** Lo mismo que `LIBRARY_LIMITS` y `LIBRARY_URL_SECONDS` de la app (aquí no se importa código de `src/`). */
const MAX_ARCHIVO = 50 * 1024 * 1024;
const MAX_PORTADA = 5 * 1024 * 1024;
const MAX_FUENTE = 10 * 1024 * 1024;
const SEGUNDOS_LECTURA = 3600;
const SEGUNDOS_SUBIDA = 900;

type Pieza = {
  id: string;
  owner_id: string;
  file_path: string | null;
  pdf_path: string | null;
  cover_path: string | null;
  custom_cover_path: string | null;
  spine_path: string | null;
  back_cover_path: string | null;
  file_size: number;
  club_id?: string | null;
};
type Fuente = { id: string; file_path: string; file_size: number };

type R2 = { cuenta: string; llave: string; secreto: string; bucket: string };

function responder(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** Ruta de un objeto en R2 (estilo ruta, con cada parte codificada). */
function direccion(r2: R2, ruta = ''): URL {
  const codificada = ruta
    .split('/')
    .map((p) => encodeURIComponent(p))
    .join('/');
  return new URL(`https://${r2.cuenta}.r2.cloudflarestorage.com/${r2.bucket}${ruta ? `/${codificada}` : ''}`);
}

async function firmar(r2: R2, metodo: 'GET' | 'PUT', ruta: string, segundos: number, encabezados: Record<string, string> = {}): Promise<string> {
  const url = direccion(r2, ruta);
  url.searchParams.set('X-Amz-Expires', String(segundos));
  const firmado = await new AwsV4Signer({
    method: metodo,
    url: url.toString(),
    headers: encabezados,
    accessKeyId: r2.llave,
    secretAccessKey: r2.secreto,
    service: 's3',
    region: 'auto',
    signQuery: true,
    // Firma también `content-length`: R2 rechaza una subida de otro tamaño.
    allHeaders: true,
  }).sign();
  return firmado.url.toString();
}

/** Cliente firmado para hablar con R2. Dos reintentos y no diez: la función tiene poco tiempo en Vercel. */
function cliente(r2: R2): AwsClient {
  return new AwsClient({ accessKeyId: r2.llave, secretAccessKey: r2.secreto, service: 's3', region: 'auto', retries: 2 });
}

/** Borra todo lo que hay bajo un prefijo, página por página. */
async function borrarPrefijo(r2: R2, prefijo: string): Promise<number> {
  const r2c = cliente(r2);
  let borrados = 0;
  let continuar: string | null = null;
  do {
    const lista = direccion(r2);
    lista.searchParams.set('list-type', '2');
    lista.searchParams.set('prefix', prefijo);
    if (continuar) lista.searchParams.set('continuation-token', continuar);
    const respuesta = await r2c.fetch(lista.toString());
    if (!respuesta.ok) throw new Error(`list ${respuesta.status}`);
    const xml = await respuesta.text();
    const llaves = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => entidades(m[1]));
    for (let i = 0; i < llaves.length; i += 10) {
      await Promise.all(
        llaves.slice(i, i + 10).map(async (llave) => {
          const r = await r2c.fetch(direccion(r2, llave).toString(), { method: 'DELETE' });
          if (!r.ok && r.status !== 404) throw new Error(`delete ${r.status}`);
        }),
      );
    }
    borrados += llaves.length;
    continuar = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? entidades(/<NextContinuationToken>([^<]+)</.exec(xml)?.[1] ?? '') || null : null;
  } while (continuar);
  return borrados;
}

/** Copia un objeto dentro de R2 (CopyObject), sin bajarlo. */
async function copiar(r2: R2, de: string, a: string): Promise<void> {
  const origen = `/${r2.bucket}/${de.split('/').map((p) => encodeURIComponent(p)).join('/')}`;
  const r = await cliente(r2).fetch(direccion(r2, a).toString(), { method: 'PUT', headers: { 'x-amz-copy-source': origen } });
  if (!r.ok) throw new Error(`copy ${r.status}`);
}

function entidades(texto: string): string {
  return texto.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

const texto = (v: unknown) => (typeof v === 'string' ? v : '');

/** Una imagen pegada en una pieza (T289): `<uid>/<pieza>/anotaciones/<uuid>.jpg`. Devuelve la pieza. */
const IMAGEN_PEGADA = /^([0-9a-f-]{36})\/([0-9a-f-]{36})\/anotaciones\/([0-9a-f-]{36})\.jpg$/i;
function piezaDeImagenPegada(ruta: string, uid: string): string | null {
  const m = ruta.match(IMAGEN_PEGADA);
  return m && m[1] === uid ? m[2] : null;
}

/**
 * Una imagen suelta de la persona, fuera de la carpeta de un libro: un sticker propio (T335),
 * `<uid>/stickers/<id>.png`, o un fragmento de imagen (T317), `<uid>/clips/<id>.jpg`. Devuelve el tipo que
 * tiene que tener, o null si la ruta no es de esas o no es suya.
 */
const SUELTA_PROPIA = /^([0-9a-f-]{36})\/(stickers\/[0-9a-f-]{36}\.png|clips\/[0-9a-f-]{36}\.jpg)$/i;
const MAX_SUELTA = 2 * 1024 * 1024;
function tipoDeSueltaPropia(ruta: string, uid: string): 'image/png' | 'image/jpeg' | null {
  const m = ruta.match(SUELTA_PROPIA);
  if (!m || m[1] !== uid) return null;
  return m[2].startsWith('stickers/') ? 'image/png' : 'image/jpeg';
}

async function pieza(supabase: SupabaseClient, filtro: { id?: string; ruta?: string }): Promise<Pieza | null> {
  let consulta = supabase.from('library_items').select('id, owner_id, file_path, pdf_path, cover_path, custom_cover_path, spine_path, back_cover_path, file_size, club_id');
  if (filtro.id) consulta = consulta.eq('id', filtro.id);
  if (filtro.ruta) {
    const r = filtro.ruta.replace(/[,()"]/g, '');
    consulta = consulta.or(
      `file_path.eq."${r}",pdf_path.eq."${r}",cover_path.eq."${r}",custom_cover_path.eq."${r}",spine_path.eq."${r}",back_cover_path.eq."${r}"`,
    );
  }
  const { data, error } = await consulta.limit(1);
  if (error) throw new Error(`select ${error.code ?? ''} ${error.message}`);
  return ((data as Pieza[] | null) ?? [])[0] ?? null;
}

/**
 * Una imagen pegada o un sticker propio de otra persona (club de lectura, 13f, T307): se deja ver si quien pide ve
 * una anotación que lo usa. La RLS decide qué anotaciones ve: las del club si es miembro, y las que le quedaron
 * en su copia al desconectarse.
 */
const IMAGEN_AJENA = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/anotaciones\/[0-9a-f-]{36}\.jpg$/i;
const STICKER_AJENO = /^([0-9a-f-]{36})\/stickers\/([0-9a-f-]{36})\.png$/i;
async function deOtroEnUnaAnotacion(supabase: SupabaseClient, ruta: string): Promise<boolean> {
  let consulta = supabase.from('library_annotations').select('id');
  const sticker = ruta.match(STICKER_AJENO);
  if (IMAGEN_AJENA.test(ruta)) consulta = consulta.eq('content->>path', ruta);
  else if (sticker) consulta = consulta.eq('content->>sticker', `mios/${sticker[2]}`).eq('author_id', sticker[1]);
  else return false;
  const { data, error } = await consulta.limit(1);
  if (error) throw new Error(`select annotations ${error.code ?? ''} ${error.message}`);
  return ((data as unknown[] | null) ?? []).length > 0;
}

async function fuente(supabase: SupabaseClient, filtro: { id?: string; ruta?: string }): Promise<Fuente | null> {
  let consulta = supabase.from('library_fonts').select('id, file_path, file_size');
  if (filtro.id) consulta = consulta.eq('id', filtro.id);
  if (filtro.ruta) consulta = consulta.eq('file_path', filtro.ruta);
  const { data, error } = await consulta.limit(1);
  if (error) throw new Error(`select fonts ${error.code ?? ''} ${error.message}`);
  return ((data as Fuente[] | null) ?? [])[0] ?? null;
}

export async function POST(request: Request): Promise<Response> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const r2: R2 = {
    cuenta: process.env.R2_ACCOUNT_ID ?? '',
    llave: process.env.R2_ACCESS_KEY_ID ?? '',
    secreto: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.R2_BUCKET ?? '',
  };
  if (!url || !anon || !r2.cuenta || !r2.llave || !r2.secreto || !r2.bucket) {
    return responder(503, { code: 'unavailable', error: 'La biblioteca no está disponible por ahora. Inténtalo más tarde.' });
  }

  const jwt = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!jwt) return responder(401, { code: 'signIn', error: 'Necesitas iniciar sesión.' });

  let cuerpo: Record<string, unknown> = {};
  try {
    cuerpo = (await request.json()) as Record<string, unknown>;
  } catch {
    // cuerpo inválido: cae en "acción desconocida"
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: sesion } = await supabase.auth.getUser(jwt);
  const uid = sesion.user?.id;
  if (!uid) return responder(401, { code: 'signIn', error: 'Necesitas iniciar sesión.' });

  /** Toda ruta vive en la carpeta de quien pide; nada de `..` ni rutas absolutas. */
  const suya = (ruta: string) => ruta.startsWith(`${uid}/`) && !ruta.split('/').some((p) => p === '..' || p === '.' || p === '');

  try {
    switch (cuerpo.action) {
      case 'upload': {
        const ruta = texto(cuerpo.path);
        const tipo = texto(cuerpo.contentType) || 'application/octet-stream';
        const tamano = typeof cuerpo.size === 'number' && Number.isInteger(cuerpo.size) ? cuerpo.size : -1;
        if (cuerpo.fontId) {
          const f = suya(ruta) ? await fuente(supabase, { id: texto(cuerpo.fontId) }) : null;
          if (!f || f.file_path !== ruta) return responder(403, { code: 'forbidden', error: 'No tienes permiso para guardar ese archivo.' });
          if (tamano <= 0 || tamano > MAX_FUENTE || tamano !== f.file_size) return responder(413, { code: 'tooBig', error: 'El archivo pesa más de lo permitido.' });
          const firmada = await firmar(r2, 'PUT', ruta, SEGUNDOS_SUBIDA, { 'content-type': tipo, 'content-length': String(tamano) });
          return responder(200, { url: firmada, headers: { 'content-type': tipo } });
        }
        // Un sticker propio (T335, PNG) o un fragmento de imagen (T317, JPEG): chicos, en su carpeta.
        const suelta = tipoDeSueltaPropia(ruta, uid);
        if (suelta) {
          if (tipo !== suelta) return responder(403, { code: 'forbidden', error: 'No tienes permiso para guardar ese archivo.' });
          if (tamano <= 0 || tamano > MAX_SUELTA) return responder(413, { code: 'tooBig', error: 'El archivo pesa más de lo permitido.' });
          const firmada = await firmar(r2, 'PUT', ruta, SEGUNDOS_SUBIDA, { 'content-type': tipo, 'content-length': String(tamano) });
          return responder(200, { url: firmada, headers: { 'content-type': tipo } });
        }
        const item = suya(ruta) ? await pieza(supabase, { id: texto(cuerpo.itemId) }) : null;
        if (!item || !ruta.startsWith(`${uid}/${item.id}/`)) return responder(403, { code: 'forbidden', error: 'No tienes permiso para guardar ese archivo.' });
        // Las imágenes de las caras del libro (RF-BL20, RF-BL23): la portada del archivo o la propia, el lomo
        // y la contraportada. Todas son chicas.
        // Y las imágenes pegadas sobre la página (T289): chicas también, y en la carpeta de esa pieza.
        const esPortada =
          [item.cover_path, item.custom_cover_path, item.spine_path, item.back_cover_path].includes(ruta) || piezaDeImagenPegada(ruta, uid) === item.id;
        const esArchivo = ruta === item.file_path || ruta === item.pdf_path;
        if (!esPortada && !esArchivo) return responder(403, { code: 'forbidden', error: 'No tienes permiso para guardar ese archivo.' });
        const tope = esPortada ? MAX_PORTADA : MAX_ARCHIVO;
        // El archivo principal mide lo que dice su fila: con ese número la base cuidó el tope de espacio.
        if (tamano <= 0 || tamano > tope || (ruta === item.file_path && tamano !== item.file_size)) {
          return responder(413, { code: 'tooBig', error: 'El archivo pesa más de lo permitido.' });
        }
        const firmada = await firmar(r2, 'PUT', ruta, SEGUNDOS_SUBIDA, { 'content-type': tipo, 'content-length': String(tamano) });
        return responder(200, { url: firmada, headers: { 'content-type': tipo } });
      }
      case 'read': {
        const ruta = texto(cuerpo.path);
        const deImagen = piezaDeImagenPegada(ruta, uid);
        const permitido =
          !!tipoDeSueltaPropia(ruta, uid) ||
          (suya(ruta) && (deImagen ? await pieza(supabase, { id: deImagen }) : (await pieza(supabase, { ruta })) || (await fuente(supabase, { ruta })))) ||
          (!suya(ruta) && (await deOtroEnUnaAnotacion(supabase, ruta)));
        if (!permitido) return responder(403, { code: 'forbidden', error: 'No tienes permiso para ver ese archivo.' });
        return responder(200, { url: await firmar(r2, 'GET', ruta, SEGUNDOS_LECTURA) });
      }
      case 'delete': {
        if (cuerpo.fontId) {
          const f = await fuente(supabase, { id: texto(cuerpo.fontId) });
          if (!f || !suya(f.file_path)) return responder(403, { code: 'forbidden', error: 'No tienes permiso para borrar esa fuente.' });
          const r = await cliente(r2).fetch(direccion(r2, f.file_path).toString(), { method: 'DELETE' });
          if (!r.ok && r.status !== 404) throw new Error(`delete ${r.status}`);
          return responder(200, { removed: 1 });
        }
        const item = await pieza(supabase, { id: texto(cuerpo.itemId) });
        if (!item) return responder(403, { code: 'forbidden', error: 'No tienes permiso para borrar esa pieza.' });
        return responder(200, { removed: await borrarPrefijo(r2, `${uid}/${item.id}/`) });
      }
      case 'deleteFile': {
        const ruta = texto(cuerpo.path);
        const deImagen = piezaDeImagenPegada(ruta, uid);
        const item = deImagen && suya(ruta) ? await pieza(supabase, { id: deImagen }) : null;
        if (!item && !tipoDeSueltaPropia(ruta, uid)) return responder(403, { code: 'forbidden', error: 'No tienes permiso para borrar ese archivo.' });
        const r = await cliente(r2).fetch(direccion(r2, ruta).toString(), { method: 'DELETE' });
        if (!r.ok && r.status !== 404) throw new Error(`delete ${r.status}`);
        return responder(200, { removed: 1 });
      }
      case 'deleteAll':
        return responder(200, { removed: await borrarPrefijo(r2, `${uid}/`) });
      case 'clubCopy': {
        const clubId = texto(cuerpo.clubId);
        const item = await pieza(supabase, { id: texto(cuerpo.itemId) });
        const { data: original, error } = await supabase.rpc('library_club_source', { p_club: clubId });
        if (error) throw new Error(`club ${error.code ?? ''} ${error.message}`);
        const o = original as { file_path?: string; file_size?: number; cover_path?: string | null } | null;
        // La copia es mía, de este club, en mi carpeta y del tamaño del original.
        if (!item || !o?.file_path || item.club_id !== clubId || !item.file_path || !item.file_path.startsWith(`${uid}/${item.id}/`) || item.file_size !== o.file_size) {
          return responder(403, { code: 'forbidden', error: 'No tienes permiso para copiar ese libro.' });
        }
        await copiar(r2, o.file_path, item.file_path);
        if (o.cover_path && item.cover_path?.startsWith(`${uid}/${item.id}/`)) await copiar(r2, o.cover_path, item.cover_path).catch(() => undefined);
        return responder(200, { copied: 1 });
      }
      default:
        return responder(400, { code: 'badRequest', error: 'Acción desconocida.' });
    }
  } catch (e) {
    console.error('[library-files]', cuerpo.action, e instanceof Error ? e.message : e);
    return responder(502, { code: 'failed', error: 'No se pudo completar. Revisa tu conexión e inténtalo de nuevo.' });
  }
}
