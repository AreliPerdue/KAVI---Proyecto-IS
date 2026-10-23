/**
 * La tienda contra Supabase (T337, T343c). Sin `kind` en la consulta, los packs de papeles y más se veían como
 * packs de stickers y no llegaban a "Papeles y más" (pasó en producción con Papelería, 22 oct 2026).
 */
import { fakeSupabase } from '@/services/supabase/__tests__/fake-supabase';

const mockSb = fakeSupabase();
jest.mock('@/lib/supabase', () => ({ getSupabase: () => mockSb.client }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { supabaseLibrary } = require('@/services/supabase/library') as typeof import('@/services/supabase/library');

it('pide el tipo de cada pack junto con sus piezas y su versión', async () => {
  mockSb.responder({ data: [], error: null });
  await supabaseLibrary.listStickerPacks();
  expect(mockSb.argsDe('from')).toEqual(['sticker_packs']);
  const columnas = String(mockSb.argsDe('select')?.[0]).split(',').map((c) => c.trim());
  expect(columnas).toEqual(expect.arrayContaining(['id', 'stickers', 'version', 'bytes', 'kind']));
});
