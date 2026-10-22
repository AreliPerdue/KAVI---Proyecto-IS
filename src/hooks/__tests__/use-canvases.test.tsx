/**
 * Volver a abrir un lienzo en la misma sesión (13h, RF-CC10; arreglo del 22 oct 2026): se abre como quedó, no como se
 * creó. Pasaba con las tapas del Journal: "Decorar portada" la segunda vez la abría vacía.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useCanvasEditor, useCreateCanvas } from '@/hooks/use-canvases';
import { libraryKeys } from '@/hooks/use-library';
import { agregar } from '@/lib/library/canvas';
import type { LibraryCanvas } from '@/types/domain';

jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));
jest.mock('@/hooks/use-library-sync', () => ({ subirPendientes: jest.fn() }));
jest.mock('@/lib/library/offline/outbox', () => ({ ...jest.requireActual('@/lib/library/offline/outbox'), encolar: jest.fn(async () => undefined) }));

it('lo editado queda también en el lienzo solo, no solo en la lista de su libro o Journal', async () => {
  // Como en la app: lo que nadie mira se conserva un rato (el envoltorio de pruebas lo borra al instante).
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const crear = await renderHook(() => useCreateCanvas(), { wrapper: Wrapper });
  let id = '';
  await act(async () => {
    id = crear.result.current('j1', 'portrait', '', undefined, 'cover', 'front');
  });
  const lienzo = client.getQueryData<LibraryCanvas>(libraryKeys.canvas(id));
  expect(lienzo?.doc.elements).toEqual([]);
  const editor = await renderHook(() => useCanvasEditor(lienzo), { wrapper: Wrapper });
  await act(async () => {
    editor.result.current.aplicar((d) => agregar(d, { id: 'e', type: 'shape', page: 1, x: 0.1, y: 0.1, w: 0.3, ar: 1, rot: 0, locked: false, group: null, style: {}, content: { shape: 'star' } }));
    editor.result.current.guardarYa();
  });
  expect(client.getQueryData<LibraryCanvas>(libraryKeys.canvas(id))?.doc.elements.map((e) => e.id)).toEqual(['e']);
  expect(client.getQueryData<LibraryCanvas>(libraryKeys.canvas(id))?.face).toBe('front');
  client.clear();
});
