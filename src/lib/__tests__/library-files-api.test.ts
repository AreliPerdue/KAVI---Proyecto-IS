/**
 * Función de Vercel de los archivos de Library en R2 (T313). Sin red: Supabase y R2 están simulados.
 * Lo que importa es quién puede qué —la RLS decide con la sesión y las rutas son de su carpeta— y que
 * las firmas fijen tamaño, tipo y vigencia.
 */
/* eslint-disable-next-line @typescript-eslint/no-require-imports -- Web Crypto de Node para firmar; el proyecto no trae tipos de Node */
const { webcrypto } = require('node:crypto') as { webcrypto: Crypto };

type Fila = Record<string, unknown>;
let mockUsuario: { id: string } | null;
let mockPiezas: Fila[];
let mockFuentes: Fila[];
const mockConsultas: { tabla: string; filtros: unknown[][] }[] = [];

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: mockUsuario } }) },
    from: (tabla: string) => {
      const consulta = { tabla, filtros: [] as unknown[][] };
      mockConsultas.push(consulta);
      const cadena: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'or']) {
        cadena[m] = (...a: unknown[]) => {
          if (m !== 'select') consulta.filtros.push([m, ...a]);
          return cadena;
        };
      }
      cadena.limit = async () => {
        const filas = tabla === 'library_fonts' ? mockFuentes : mockPiezas;
        // Imita la RLS y los filtros: solo lo que coincide con el id o con alguna ruta.
        const coincide = (f: Fila) =>
          consulta.filtros.every(([m, col, val]) =>
            m === 'eq' ? f[col as string] === val : ['file_path', 'cover_path', 'custom_cover_path', 'spine_path', 'back_cover_path'].some((k) => f[k] && String(col).includes(`"${String(f[k])}"`)),
          );
        return { data: filas.filter(coincide), error: null };
      };
      return cadena;
    },
  }),
}));

const mockR2 = jest.fn();

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const { POST } = require('../../../api/library-files') as typeof import('../../../api/library-files');

const ENV = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  R2_ACCOUNT_ID: 'cuenta123',
  R2_ACCESS_KEY_ID: 'llave',
  R2_SECRET_ACCESS_KEY: 'secreto',
  R2_BUCKET: 'kavi-library',
};
const UID = 'aaaaaaaa-0000-4000-8000-000000000001';
const ITEM = 'bbbbbbbb-0000-4000-8000-000000000002';
const original = globalThis.fetch;

const pedir = async (body: unknown, jwt: string | null = 'jwt') => {
  const r = await POST(
    new Request('https://kavi.test/api/library-files', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(jwt ? { authorization: `Bearer ${jwt}` } : {}) },
      body: JSON.stringify(body),
    }),
  );
  return { status: r.status, body: (await r.json()) as Record<string, unknown> };
};

beforeAll(() => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => mockR2(input instanceof Request ? input : new Request(input, init))) as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = original;
  for (const k of Object.keys(ENV)) delete process.env[k];
});
beforeEach(() => {
  Object.assign(process.env, ENV);
  mockUsuario = { id: UID };
  mockPiezas = [
    {
      id: ITEM,
      owner_id: UID,
      file_path: `${UID}/${ITEM}/rayuela.pdf`,
      pdf_path: null,
      cover_path: `${UID}/${ITEM}/cover.png`,
      custom_cover_path: `${UID}/${ITEM}/cover-custom.jpg`,
      spine_path: `${UID}/${ITEM}/spine.jpg`,
      back_cover_path: `${UID}/${ITEM}/back.jpg`,
      file_size: 1000,
    },
  ];
  mockFuentes = [{ id: 'f1', file_path: `${UID}/fonts/Mi-letra.ttf`, file_size: 500 }];
  mockConsultas.length = 0;
  mockR2.mockReset();
});

it('sin las variables de R2 dice que no está disponible', async () => {
  delete process.env.R2_SECRET_ACCESS_KEY;
  expect(await pedir({ action: 'read', path: `${UID}/${ITEM}/rayuela.pdf` })).toEqual({ status: 503, body: expect.objectContaining({ code: 'unavailable' }) });
});

it('sin sesión, o con una sesión que no es válida, no firma nada', async () => {
  expect((await pedir({ action: 'deleteAll' }, null)).status).toBe(401);
  mockUsuario = null;
  expect((await pedir({ action: 'deleteAll' })).body.code).toBe('signIn');
  expect(mockR2).not.toHaveBeenCalled();
});

describe('subir', () => {
  it('firma un PUT a la ruta de la pieza con tamaño, tipo y vigencia fijos', async () => {
    const r = await pedir({ action: 'upload', itemId: ITEM, path: `${UID}/${ITEM}/rayuela.pdf`, contentType: 'application/pdf', size: 1000 });
    expect(r.status).toBe(200);
    const url = new URL(r.body.url as string);
    expect(url.host).toBe('cuenta123.r2.cloudflarestorage.com');
    expect(url.pathname).toBe(`/kavi-library/${UID}/${ITEM}/rayuela.pdf`);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;content-type;host');
    expect(url.searchParams.get('X-Amz-Credential')).toMatch(/^llave\/\d{8}\/auto\/s3\/aws4_request$/);
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(r.body.headers).toEqual({ 'content-type': 'application/pdf' });
  });

  it('el archivo tiene que medir lo que dice su fila (la que cuidó el tope de espacio)', async () => {
    const r = await pedir({ action: 'upload', itemId: ITEM, path: `${UID}/${ITEM}/rayuela.pdf`, contentType: 'application/pdf', size: 999_999 });
    expect(r).toEqual({ status: 413, body: expect.objectContaining({ code: 'tooBig' }) });
  });

  it('la portada propia (RF-BL23) también se sube y se lee, hasta 5 MB', async () => {
    const subir = await pedir({ action: 'upload', itemId: ITEM, path: `${UID}/${ITEM}/cover-custom.jpg`, contentType: 'image/jpeg', size: 200_000 });
    expect(subir.status).toBe(200);
    expect((await pedir({ action: 'read', path: `${UID}/${ITEM}/cover-custom.jpg` })).status).toBe(200);
    const grande = await pedir({ action: 'upload', itemId: ITEM, path: `${UID}/${ITEM}/cover-custom.jpg`, contentType: 'image/jpeg', size: 5 * 1024 * 1024 + 1 });
    expect(grande.status).toBe(413);
  });

  it('el lomo y la contraportada (RF-BL20, T311) se suben y se leen como portadas', async () => {
    for (const nombre of ['spine.jpg', 'back.jpg']) {
      expect((await pedir({ action: 'upload', itemId: ITEM, path: `${UID}/${ITEM}/${nombre}`, contentType: 'image/jpeg', size: 200_000 })).status).toBe(200);
      expect((await pedir({ action: 'read', path: `${UID}/${ITEM}/${nombre}` })).status).toBe(200);
      expect((await pedir({ action: 'upload', itemId: ITEM, path: `${UID}/${ITEM}/${nombre}`, contentType: 'image/jpeg', size: 5 * 1024 * 1024 + 1 })).status).toBe(413);
    }
  });

  it('una portada puede pesar hasta 5 MB', async () => {
    const ok = await pedir({ action: 'upload', itemId: ITEM, path: `${UID}/${ITEM}/cover.png`, contentType: 'image/png', size: 5 * 1024 * 1024 });
    expect(ok.status).toBe(200);
    const grande = await pedir({ action: 'upload', itemId: ITEM, path: `${UID}/${ITEM}/cover.png`, contentType: 'image/png', size: 5 * 1024 * 1024 + 1 });
    expect(grande.status).toBe(413);
  });

  it.each([
    ['una ruta que no es de la pieza', `${UID}/${ITEM}/otro.pdf`],
    ['la carpeta de otra persona', `cccccccc-0000-4000-8000-000000000003/${ITEM}/rayuela.pdf`],
    ['una ruta con ..', `${UID}/${ITEM}/../${ITEM}/rayuela.pdf`],
  ])('rechaza %s', async (_, path) => {
    const r = await pedir({ action: 'upload', itemId: ITEM, path, contentType: 'application/pdf', size: 1000 });
    expect(r).toEqual({ status: 403, body: expect.objectContaining({ code: 'forbidden' }) });
  });

  it('rechaza una pieza que la RLS no deja ver (de otra persona)', async () => {
    mockPiezas = [];
    const r = await pedir({ action: 'upload', itemId: ITEM, path: `${UID}/${ITEM}/rayuela.pdf`, contentType: 'application/pdf', size: 1000 });
    expect(r.status).toBe(403);
  });

  it('una fuente: su ruta y hasta 10 MB, del tamaño de su fila', async () => {
    const ok = await pedir({ action: 'upload', fontId: 'f1', path: `${UID}/fonts/Mi-letra.ttf`, contentType: 'font/ttf', size: 500 });
    expect(ok.status).toBe(200);
    expect((await pedir({ action: 'upload', fontId: 'f1', path: `${UID}/fonts/Otra.ttf`, contentType: 'font/ttf', size: 500 })).status).toBe(403);
    expect((await pedir({ action: 'upload', fontId: 'f1', path: `${UID}/fonts/Mi-letra.ttf`, contentType: 'font/ttf', size: 501 })).status).toBe(413);
  });
});

describe('leer', () => {
  it('firma un GET de una hora para el archivo o la portada de una pieza propia', async () => {
    const r = await pedir({ action: 'read', path: `${UID}/${ITEM}/cover.png` });
    expect(r.status).toBe(200);
    const url = new URL(r.body.url as string);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('3600');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('host');
  });

  it('también una fuente propia', async () => {
    expect((await pedir({ action: 'read', path: `${UID}/fonts/Mi-letra.ttf` })).status).toBe(200);
  });

  it('no firma rutas fuera de su carpeta ni de piezas que no existen', async () => {
    expect((await pedir({ action: 'read', path: `cccccccc-0000-4000-8000-000000000003/x/a.pdf` })).status).toBe(403);
    mockPiezas = [];
    mockFuentes = [];
    expect((await pedir({ action: 'read', path: `${UID}/${ITEM}/rayuela.pdf` })).status).toBe(403);
  });
});

describe('borrar', () => {
  const lista = (llaves: string[], siguiente?: string) =>
    new Response(
      `<ListBucketResult>${llaves.map((k) => `<Contents><Key>${k}</Key></Contents>`).join('')}<IsTruncated>${siguiente ? 'true' : 'false'}</IsTruncated>${siguiente ? `<NextContinuationToken>${siguiente}</NextContinuationToken>` : ''}</ListBucketResult>`,
    );

  it('una pieza: lista su carpeta y borra cada archivo', async () => {
    mockR2.mockImplementation(async (req: Request) => (req.method === 'GET' ? lista([`${UID}/${ITEM}/rayuela.pdf`, `${UID}/${ITEM}/cover.png`]) : new Response(null, { status: 204 })));
    const r = await pedir({ action: 'delete', itemId: ITEM });
    expect(r).toEqual({ status: 200, body: { removed: 2 } });
    const listado = new URL(mockR2.mock.calls[0][0].url);
    expect(listado.searchParams.get('prefix')).toBe(`${UID}/${ITEM}/`);
    // Se borran en paralelo: el orden en que terminan no importa.
    const borrados = mockR2.mock.calls.filter(([req]) => req.method === 'DELETE').map(([req]) => new URL(req.url).pathname);
    expect(borrados.sort()).toEqual([`/kavi-library/${UID}/${ITEM}/cover.png`, `/kavi-library/${UID}/${ITEM}/rayuela.pdf`]);
    // Las peticiones a R2 van firmadas en el encabezado.
    expect(mockR2.mock.calls[0][0].headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256 /);
  });

  it('toda la cuenta: la carpeta de la sesión, página por página', async () => {
    mockR2.mockImplementation(async (req: Request) => {
      if (req.method !== 'GET') return new Response(null, { status: 204 });
      return new URL(req.url).searchParams.get('continuation-token') ? lista([`${UID}/b`]) : lista([`${UID}/a`], 'pagina-2');
    });
    const r = await pedir({ action: 'deleteAll' });
    expect(r.body).toEqual({ removed: 2 });
    expect(new URL(mockR2.mock.calls[0][0].url).searchParams.get('prefix')).toBe(`${UID}/`);
  });

  it('una pieza ajena no se borra', async () => {
    mockPiezas = [];
    expect((await pedir({ action: 'delete', itemId: ITEM })).status).toBe(403);
    expect(mockR2).not.toHaveBeenCalled();
  });

  it('si R2 falla, avisa y no dice que se borró', async () => {
    mockR2.mockResolvedValue(new Response('error', { status: 500 }));
    expect(await pedir({ action: 'delete', itemId: ITEM })).toEqual({ status: 502, body: expect.objectContaining({ code: 'failed' }) });
  });
});

it('una acción desconocida es un error de la petición', async () => {
  expect((await pedir({ action: 'hackear' })).status).toBe(400);
});
