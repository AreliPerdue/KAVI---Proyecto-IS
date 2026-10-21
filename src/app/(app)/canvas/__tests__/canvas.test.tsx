/**
 * El lienzo creativo (spec 13h, RF-CC4 – RF-CC10, RF-CC14; T351): abre una página en blanco 1 : √2 en el motor del
 * lector, pega texto, formas, stickers e imágenes, y lo elegido se duplica, cambia de capa, se bloquea, se agrupa y
 * se quita; un grupo se mueve y se deshace en un solo paso; todo se guarda solo en la cola.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { es } from '@/i18n/es';
import type { AnotacionEnMotor, MensajeAlMotor, MensajeDelMotor } from '@/lib/library/reader-protocol';
import { usePreferencesStore } from '@/store/preferences-store';

const mockEnviados: MensajeAlMotor[] = [];
let mockResponder: (m: MensajeDelMotor) => void = () => undefined;
jest.mock('@/components/library/reader-engine', () => {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- dentro de la fábrica del mock */
  const React = require('react') as typeof import('react');
  const Motor = React.forwardRef(function Motor({ onMessage }: { onMessage: (m: MensajeDelMotor) => void }, ref) {
    mockResponder = onMessage;
    React.useImperativeHandle(ref, () => ({ send: (m: MensajeAlMotor) => mockEnviados.push(m) }));
    return null;
  });
  Motor.displayName = 'MotorDeLectura';
  return { ReaderEngine: Motor };
});

let mockLienzo: Record<string, unknown> | undefined;
jest.mock('@/hooks/use-canvases', () => ({
  ...jest.requireActual('@/hooks/use-canvases'),
  useCanvas: () => ({ data: mockLienzo, isError: !mockLienzo, refetch: jest.fn() }),
}));
const mockEncolar = jest.fn(async () => undefined);
jest.mock('@/lib/library/offline/outbox', () => ({ ...jest.requireActual('@/lib/library/offline/outbox'), encolar: (...a: unknown[]) => mockEncolar(...(a as [])) }));
jest.mock('@/hooks/use-library-sync', () => ({ subirPendientes: jest.fn() }));
const mockAvisar = jest.fn();
jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }), useSnackbar: () => mockAvisar }));
// "Mis colores" (T342): una paleta guardada.
const mockGuardarColores = jest.fn();
jest.mock('@/hooks/use-saved-colors', () => ({ useSavedColors: () => ({ data: ['#F2C14E'] }), useSaveColors: () => ({ mutate: mockGuardarColores }) }));
const mockCompartir = jest.fn(async () => 'shared');
jest.mock('@/lib/share', () => ({ shareImage: (...a: unknown[]) => mockCompartir(...(a as [])) }));
jest.mock('@/lib/library/canvas-export', () => ({ ...jest.requireActual('@/lib/library/canvas-export'), archivoDeExportacion: (_d: string, nombre: string) => `file:///cache/${nombre}` }));
const mockSubir = jest.fn(async () => undefined);
// Como los de verdad, el mismo mapa en cada render.
const mockVacio = new Map<string, string>();
const mockSinPacks = { data: undefined };
const mockSinStickers = { data: [] };
jest.mock('@/hooks/use-annotations', () => ({ useLibraryImageUrls: () => mockVacio, useUploadAnnotationImage: () => mockSubir }));
jest.mock('@/hooks/use-sticker-packs', () => ({ useStickerPacks: () => mockSinPacks, useStickerSources: () => mockVacio }));
jest.mock('@/hooks/use-user-stickers', () => ({
  useUserStickers: () => mockSinStickers,
  useUserStickerImages: () => mockVacio,
  useUserStickerSources: () => mockVacio,
}));
jest.mock('@/components/library/sticker-sheet', () => ({ StickerSheet: () => null }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/canvas/[id]').default as () => React.ReactElement;

const C = es.library.canvas;
const A = es.library.annotations;
const responder = async (m: MensajeDelMotor) => {
  await act(async () => mockResponder(m));
};
const ultimas = () => (mockEnviados.filter((m) => m.type === 'annotations').at(-1) as { items: AnotacionEnMotor[] } | undefined)?.items ?? [];
const ultimoSelect = () => mockEnviados.filter((m) => m.type === 'select').at(-1);

async function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } } });
  await render(
    <QueryClientProvider client={cliente}>
      <Pantalla />
    </QueryClientProvider>,
  );
  await responder({ type: 'opened', total: 1 });
}

/** "+ Agregar" y la pieza (RF-CC19). */
async function agregar(nombre: string) {
  await fireEvent.press(screen.getByRole('button', { name: C.add }));
  await fireEvent.press(screen.getByRole('button', { name: nombre }));
}

/** Pega con la herramienta puesta donde "se tocó" la página. */
const tocarPagina = (x = 0.2, y = 0.2) => responder({ type: 'place', locator: { page: 1, x, y, w: 0.24, ar: 1 } });

beforeEach(() => {
  globalThis.setParametrosDeRuta({ id: 'r1', item: 'l1' });
  mockEnviados.length = 0;
  mockEncolar.mockClear();
  mockAvisar.mockReset();
  mockCompartir.mockClear();
  mockLienzo = {
    id: 'r1',
    owner_id: 'u1',
    context: 'book',
    item_id: 'l1',
    title: '',
    orientation: 'landscape',
    doc: { pages: 1, elements: [] },
    version: 3,
    thumb_path: null,
    created_at: 'c',
    updated_at: 'u',
  };
});

it('abre una página en blanco con la forma del recorte, entera a la vista', async () => {
  await montar();
  expect(mockEnviados[0]).toEqual({ type: 'openCanvas', orientation: 'landscape', pages: 1, mode: 'paged' });
  expect(screen.getByText(C.untitled)).toBeTruthy();
});

it('sin el recorte, lo dice y deja reintentar', async () => {
  mockLienzo = undefined;
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } })}>
      <Pantalla />
    </QueryClientProvider>,
  );
  expect(screen.getByText(C.notFound)).toBeTruthy();
});

it('texto: se pega donde se toca, se escribe ahí mismo y, si queda vacío, se quita', async () => {
  await montar();
  await agregar(C.text);
  expect(mockEnviados.at(-1)).toEqual({ type: 'tool', tool: 'textbox' });
  expect(screen.getByText(A.textboxOn)).toBeTruthy();
  await tocarPagina();
  const [texto] = ultimas();
  expect(texto).toMatchObject({ kind: 'textbox', locator: { page: 1, x: 0.2, y: 0.2 } });
  expect(mockEnviados).toContainEqual({ type: 'write', id: texto.id });
  await responder({ type: 'text', id: texto.id, text: 'Mi personaje' });
  expect(ultimas()[0].content.text).toBe('Mi personaje');
  await responder({ type: 'text', id: texto.id, text: '  ' });
  expect(ultimas()).toEqual([]);
});

it('forma: se elige en su hoja y se pega en gris neutro, sin paleta de KAVI', async () => {
  await montar();
  await agregar(C.shape);
  await fireEvent.press(screen.getByRole('button', { name: C.shapes.heart }));
  expect(mockEnviados.at(-1)).toEqual({ type: 'tool', tool: 'shape', ar: 1 });
  await tocarPagina(0.4, 0.5);
  const [forma] = ultimas();
  expect(forma).toMatchObject({ kind: 'shape', content: { shape: 'heart' } });
  expect(forma.content.color).toBeUndefined();
});

it('lo elegido se duplica, se manda atrás, se bloquea y se quita; deshacer regresa', async () => {
  await montar();
  await agregar(C.shape);
  await fireEvent.press(screen.getByRole('button', { name: C.shapes.star }));
  await tocarPagina();
  await fireEvent.press(screen.getByRole('button', { name: C.duplicate }));
  expect(ultimas()).toHaveLength(2);
  const copia = ultimas()[1];
  expect(ultimoSelect()).toEqual({ type: 'select', id: copia.id, also: [] });
  await fireEvent.press(screen.getByRole('button', { name: A.toBack }));
  expect(ultimas()[0].id).toBe(copia.id);
  await fireEvent.press(screen.getByRole('button', { name: A.lock }));
  expect(ultimas().find((x) => x.id === copia.id)?.locked).toBe(true);
  expect(screen.getByText(A.lockedHint)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: A.remove }));
  expect(ultimas()).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: A.undo }));
  expect(ultimas()).toHaveLength(2);
});

it('elegir varios y agrupar; el grupo se mueve en un paso y se deshace junto', async () => {
  await montar();
  for (const [x, y] of [
    [0.1, 0.1],
    [0.5, 0.5],
  ]) {
    await agregar(C.shape);
    await fireEvent.press(screen.getByRole('button', { name: C.shapes.rect }));
    await tocarPagina(x, y);
    await fireEvent.press(screen.getByRole('button', { name: A.done }));
  }
  const [a, b] = ultimas();
  await responder({ type: 'select', id: a.id });
  await fireEvent.press(screen.getByRole('button', { name: C.selectMany }));
  await responder({ type: 'select', id: b.id });
  expect(ultimoSelect()).toEqual({ type: 'select', id: a.id, also: [b.id] });
  expect(screen.getByText(new RegExp(C.chosen(2)))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: C.group }));
  const grupo = ultimas()[0].content.group;
  expect(grupo).toBeTruthy();
  expect(ultimas()[1].content.group).toBe(grupo);
  expect(screen.getByText(C.grouped)).toBeTruthy();

  await responder({
    type: 'moves',
    items: [
      { id: a.id, locator: { page: 1, x: 0.3, y: 0.3, w: 0.24, ar: 0.7 } },
      { id: b.id, locator: { page: 1, x: 0.7, y: 0.7, w: 0.24, ar: 0.7 } },
    ],
  });
  expect(ultimas().map((x) => x.locator.x)).toEqual([0.3, 0.7]);
  await fireEvent.press(screen.getByRole('button', { name: A.undo }));
  expect(ultimas().map((x) => x.locator.x)).toEqual([0.1, 0.5]);

  await fireEvent.press(screen.getByRole('button', { name: C.ungroup }));
  expect(ultimas().every((x) => !x.content.group)).toBe(true);
});

it('se guarda solo en la cola con la versión siguiente, sin red incluida', async () => {
  await montar();
  await agregar(C.shape);
  await fireEvent.press(screen.getByRole('button', { name: C.shapes.blob }));
  await tocarPagina();
  await waitFor(() => expect(mockEncolar).toHaveBeenCalled(), { timeout: 2000 });
  expect(mockEncolar).toHaveBeenCalledWith(
    expect.objectContaining({
      op: 'canvas',
      itemId: 'l1',
      canvas: expect.objectContaining({ id: 'r1', version: 4, orientation: 'landscape', doc: expect.objectContaining({ elements: [expect.objectContaining({ type: 'shape' })] }) }),
    }),
  );
});

it('Supr en el motor quita lo elegido', async () => {
  await montar();
  await agregar(C.text);
  await tocarPagina();
  await responder({ type: 'text', id: ultimas()[0].id, text: 'Hola' });
  await responder({ type: 'remove', id: ultimas()[0].id });
  expect(ultimas()).toEqual([]);
});

describe('C2: color, estilo, nombre y exportar (T342)', () => {
  const S = C.style;
  const K = C.color;
  const ultimoFondo = () => mockEnviados.filter((m) => m.type === 'canvasBackground').at(-1);

  it('el fondo se elige en HEX y se puede volver al papel blanco; el color queda en recientes', async () => {
    await montar();
    expect(ultimoFondo()).toEqual({ type: 'canvasBackground', color: null });
    await fireEvent.press(screen.getByRole('button', { name: C.background }));
    await fireEvent.changeText(screen.getByLabelText(K.hex), '#7a1e3a');
    await fireEvent.press(screen.getByRole('button', { name: K.use }));
    expect(ultimoFondo()).toEqual({ type: 'canvasBackground', color: '#7A1E3A' });
    expect(usePreferencesStore.getState().recentColors[0]).toBe('#7A1E3A');
    await fireEvent.press(screen.getByRole('button', { name: C.background }));
    await fireEvent.press(screen.getByRole('button', { name: C.paper }));
    expect(ultimoFondo()).toEqual({ type: 'canvasBackground', color: null });
  });

  it('un HEX que no es color se dice; "Mis colores" se usa con un toque y guarda el de ahora', async () => {
    await montar();
    await fireEvent.press(screen.getByRole('button', { name: C.background }));
    await fireEvent.changeText(screen.getByLabelText(K.hex), 'rojo');
    await fireEvent(screen.getByLabelText(K.hex), 'blur');
    expect(screen.getByText(K.hexInvalid)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '#F2C14E' }));
    await fireEvent.press(screen.getByRole('button', { name: K.use }));
    expect(ultimoFondo()).toEqual({ type: 'canvasBackground', color: '#F2C14E' });
    await fireEvent.press(screen.getByRole('button', { name: C.background }));
    await fireEvent.changeText(screen.getByLabelText(K.hex), '#112233');
    await fireEvent.press(screen.getByRole('button', { name: K.save('#112233') }));
    expect(mockGuardarColores).toHaveBeenCalledWith(['#F2C14E', '#112233']);
  });

  it('estilo de lo elegido: color, opacidad, borde y sombra, y se deshace', async () => {
    await montar();
    await agregar(C.shape);
    await fireEvent.press(screen.getByRole('button', { name: C.shapes.star }));
    await tocarPagina();
    await fireEvent.press(screen.getByRole('button', { name: S.open }));
    await fireEvent.press(screen.getByRole('tab', { name: '50 %' }));
    expect(ultimas()[0].content.opacity).toBe(0.5);
    await fireEvent.press(screen.getByRole('tab', { name: S.borderThick }));
    expect(ultimas()[0].content.border).toEqual({ width: 0.012, color: expect.stringMatching(/^#/) });
    await fireEvent.press(screen.getByRole('switch', { name: S.shadow }));
    expect(ultimas()[0].content.shadow).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: S.color }));
    await fireEvent.changeText(screen.getByLabelText(K.hex), '#2E7D32');
    await fireEvent.press(screen.getByRole('button', { name: K.use }));
    expect(ultimas()[0].content.color).toBe('#2E7D32');
    await fireEvent.press(screen.getByRole('button', { name: A.undo }));
    expect(ultimas()[0].content.color).toBeUndefined();
  });

  it('cambiar el nombre se guarda con el recorte', async () => {
    await montar();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(C.rename) }));
    await fireEvent.changeText(screen.getByLabelText(C.renameLabel), '  Personajes ');
    await fireEvent.press(screen.getByRole('button', { name: C.save }));
    expect(screen.getByText('Personajes')).toBeTruthy();
    expect(mockEncolar).toHaveBeenCalledWith(expect.objectContaining({ op: 'canvas', canvas: expect.objectContaining({ title: 'Personajes' }) }));
  });

  it('exportar pide la imagen al motor y la comparte con el nombre del recorte; si falla, lo dice', async () => {
    mockLienzo = { ...mockLienzo, title: 'Mis quotes' };
    await montar();
    await fireEvent.press(screen.getByRole('button', { name: C.export }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'export', width: 1600 });
    expect(screen.getByText(C.exporting)).toBeTruthy();
    await responder({ type: 'exported', dataUrl: 'data:image/png;base64,AAAA' });
    expect(mockCompartir).toHaveBeenCalledWith('file:///cache/Mis-quotes.png', 'Mis-quotes.png');
    await fireEvent.press(screen.getByRole('button', { name: C.export }));
    await responder({ type: 'exported', error: true });
    expect(mockAvisar).toHaveBeenCalledWith({ message: C.exportFailed });
  });

  it('quitar una imagen deja su archivo para borrarse en una hora, revisando el recorte', async () => {
    mockLienzo = {
      ...mockLienzo,
      doc: { pages: 1, elements: [{ id: 'img1', type: 'image', page: 1, x: 0.1, y: 0.1, w: 0.3, ar: 1, rot: 0, z: 1, locked: false, group: null, style: {}, content: { path: 'u1/l1/anotaciones/img1.jpg' } }] },
    };
    await montar();
    await responder({ type: 'remove', id: 'img1' });
    expect(ultimas()).toEqual([]);
    expect(mockEncolar).toHaveBeenCalledWith(expect.objectContaining({ op: 'imageCleanup', itemId: 'l1', id: 'img1', canvasId: 'r1', due: expect.any(Number) }));
  });
});
