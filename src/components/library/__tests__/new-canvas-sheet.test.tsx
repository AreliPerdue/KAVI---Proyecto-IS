/** Empezar un recorte o una página (13h, RF-CC18 – RF-CC21): una plantilla propia se borra con su botón (T365). */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { NewCanvasSheet } from '@/components/library/new-canvas-sheet';
import { es } from '@/i18n/es';

const mockBorrar = jest.fn();
const mockConfirmar = jest.fn(async () => true);
const mockMias = { data: [{ id: 'p1', owner_id: 'u1', name: 'Por error', orientation: 'portrait', doc: { pages: 1, elements: [] }, created_at: 'c', updated_at: 'u' }] };
jest.mock('@/hooks/use-canvas-templates', () => ({ useCanvasTemplates: () => mockMias, useRemoveCanvasTemplate: () => ({ mutate: mockBorrar }) }));
jest.mock('@/hooks/use-annotations', () => ({ useLibraryImageUrls: () => new Map() }));
jest.mock('@/hooks/use-canvas-sources', () => ({ useDatosDeBiblioteca: () => new Map() }));
jest.mock('@/providers', () => ({ useConfirm: () => mockConfirmar, useSnackbar: () => jest.fn() }));
// El selector de color: sus colores guardados, los recientes y los de las portadas.
jest.mock('@/hooks/use-saved-colors', () => ({ useSavedColors: () => ({ data: [] }), useSaveColors: () => ({ mutate: jest.fn() }) }));
jest.mock('@/hooks/use-library', () => ({ useLibraryItems: () => ({ data: [] }) }));

const T = es.library.canvas.templates;
const libro = { id: 'l1', title: 'Rayuela', kind: 'pdf', family: 'book', authors: [], cover_path: null, cover_color: '#2E7D32' } as never;

it('una plantilla propia tiene su botón de borrar, que pide confirmar', async () => {
  await render(<NewCanvasSheet item={libro} onClose={jest.fn()} onCrear={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: T.remove('Por error') }));
  expect(mockConfirmar).toHaveBeenCalledWith(expect.objectContaining({ title: T.removeTitle, destructive: true }));
  await waitFor(() => expect(mockBorrar).toHaveBeenCalledWith('p1', expect.anything()));
});

it('las de KAVI no se borran', async () => {
  await render(<NewCanvasSheet item={libro} onClose={jest.fn()} onCrear={jest.fn()} />);
  expect(screen.queryByRole('button', { name: T.remove(T.names.bookReview) })).toBeNull();
});

it('una plantilla se personaliza antes de usarla: su tinta se aplica a los textos (T368)', async () => {
  const onCrear = jest.fn();
  const C = es.library.canvas;
  await render(<NewCanvasSheet item={libro} onClose={jest.fn()} onCrear={onCrear} />);
  await fireEvent.press(screen.getByRole('button', { name: T.use(T.names.moodboard) }));
  await fireEvent.press(screen.getByRole('button', { name: `${C.pageColors.ink} · ${C.pageColors.asIs}` }));
  await fireEvent.press(screen.getByRole('button', { name: C.color.named(C.color.names.darkRed, '#C00000') }));
  await fireEvent.press(screen.getByRole('button', { name: C.color.use }));
  expect(screen.getByRole('button', { name: `${C.pageColors.ink} · #C00000` })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: C.pageColors.use }));
  const como = onCrear.mock.calls[0][1] as { doc: { elements: { type: string; style: { color?: string } }[] }; titulo: string };
  expect(como.titulo).toBe(T.names.moodboard);
  expect(como.doc.elements.filter((e) => e.type === 'textbox').every((e) => e.style.color === '#C00000')).toBe(true);
});
