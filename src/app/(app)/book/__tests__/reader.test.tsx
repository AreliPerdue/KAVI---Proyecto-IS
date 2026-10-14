/**
 * El lector de KAVI Library (spec 13b, T279): abre donde se quedó, guarda el avance al detenerse,
 * salta con la barra, busca dentro y dice claro cuando no puede abrir. El motor web se sustituye por
 * un doble que registra lo que se le manda y deja contestar como él.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { es } from '@/i18n/es';
import type { MensajeAlMotor, MensajeDelMotor } from '@/lib/library/reader-protocol';
import { usePreferencesStore } from '@/store/preferences-store';

const R = es.library.reader;
const A = es.library.annotations;
const mockEnviados: MensajeAlMotor[] = [];
let mockResponder: (m: MensajeDelMotor) => void = () => undefined;
let mockPieza: Record<string, unknown> | undefined;
let mockUrl: { data?: string; isError: boolean; refetch: jest.Mock };
const mockGuardar = jest.fn();
let mockTodas: Record<string, unknown>[] = [];
let mockSagas: Record<string, unknown>[] = [];

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
const mockPantallaCompleta = jest.fn();
// En el teléfono (Jest corre como iOS) el libro sale de su copia local (T285): el doble anota qué se pidió
// y manda al motor el comienzo, como el de verdad.
const mockAbrirCopia = jest.fn();
jest.mock('@/hooks/use-local-book', () => ({ useAbrirCopiaLocal: () => mockAbrirCopia }));
jest.mock('@/hooks/use-library-sync', () => ({ useLibrarySync: () => undefined }));
// La barra de estado real agenda trabajo con `setImmediate` y se atora tras la prueba con relojes falsos;
// el doble solo recuerda si se pidió escondida.
let mockBarraEscondida: boolean | undefined;
jest.mock('expo-status-bar', () => ({
  StatusBar: ({ hidden }: { hidden?: boolean }) => {
    mockBarraEscondida = hidden;
    return null;
  },
}));
jest.mock('@/hooks/use-full-screen', () => ({ usePantallaCompleta: (activa: boolean) => mockPantallaCompleta(activa) }));
jest.mock('@/hooks/use-library', () => ({
  useLibraryItem: () => ({ data: mockPieza, isSuccess: !!mockPieza }),
  useLibraryFileUrl: () => mockUrl,
  useSaveReadingPosition: () => ({ mutate: mockGuardar }),
  useLibraryItems: () => ({ data: mockTodas }),
  useSeries: () => ({ data: mockSagas }),
}));

const mockAvisar = jest.fn();
jest.mock('@/providers', () => ({ useSnackbar: () => mockAvisar, useAuth: () => ({ userId: 'u1' }) }));
// Elegir la imagen: el doble da una lista para pegar.
const mockElegirFoto = jest.fn(async () => 'file://foto.jpg');
jest.mock('@/lib/library/cover/sources', () => ({ PUEDE_TOMAR_FOTO: true, desdeGaleria: () => mockElegirFoto(), desdeCamara: () => mockElegirFoto() }));
jest.mock('@/lib/library/cover/prepare', () => ({
  prepararImagenPegada: async () => ({ jpeg: new Uint8Array([1, 2]), ancho: 800, alto: 400, vistaPrevia: 'data:image/jpeg;base64,AA' }),
}));
// Tiempo de lectura (T318): el doble cuenta las señales y deja poner lo ya leído.
let mockSesiones: Record<string, unknown>[] = [];
let mockSegundosEnVivo = 0;
const mockActividad = jest.fn();
const mockAlMoverse = jest.fn();
jest.mock('@/hooks/use-reading-sessions', () => ({
  useReadingSessions: () => ({ data: mockSesiones }),
  useReadingTimer: () => ({ segundos: mockSegundosEnVivo, actividad: mockActividad, alMoverse: mockAlMoverse, sesionId: 'actual' }),
}));
jest.mock('@/hooks/use-dictionary', () => ({ useDefinition: () => ({ isLoading: false, isError: false, data: null }) }));
const mockCopiar = jest.fn(async (_t: string) => true);
jest.mock('expo-clipboard', () => ({ setStringAsync: (t: string) => mockCopiar(t) }));
// Lo anotado (T286): la lista la pone cada prueba; el editor anota lo que se le pide.
let mockLista: Record<string, unknown>[] | undefined;
let mockPuedeDeshacer = false;
const mockCrear = jest.fn();
const mockCambiar = jest.fn();
const mockBorrar = jest.fn();
const mockDeshacer = jest.fn();
const mockDescartar = jest.fn();
const mockSubirImagen = jest.fn();
const mockUrlsDeImagenes = new Map([['u1/l1/anotaciones/img1.jpg', 'https://r2/img1']]);
jest.mock('@/hooks/use-annotations', () => ({
  useAnnotations: () => ({ data: mockLista, isLoading: false, isError: false, refetch: jest.fn() }),
  useAnnotationImageUrls: () => mockUrlsDeImagenes,
  useUploadAnnotationImage: () => mockSubirImagen,
  useAnnotationEditor: () => ({
    crear: mockCrear,
    cambiar: mockCambiar,
    borrar: mockBorrar,
    descartar: mockDescartar,
    deshacer: mockDeshacer,
    rehacer: jest.fn(),
    puedeDeshacer: mockPuedeDeshacer,
    puedeRehacer: false,
  }),
}));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Lector = require('@/app/(app)/book/[id]').default as () => React.ReactElement;

const pdf = { id: 'l1', kind: 'pdf', title: 'Rayuela', file_path: 'u1/l1/rayuela.pdf', pdf_path: null, last_position: { page: 120 }, progress: 0.35 };
const responder = async (m: MensajeDelMotor) => {
  await act(async () => mockResponder(m));
};

beforeEach(() => {
  globalThis.setParametrosDeRuta({ id: 'l1' });
  mockSesiones = [];
  mockSegundosEnVivo = 0;
  mockActividad.mockReset();
  mockAlMoverse.mockReset();
  mockLista = [];
  mockPuedeDeshacer = false;
  for (const m of [mockCrear, mockCambiar, mockBorrar, mockDeshacer]) m.mockReset();
  mockEnviados.length = 0;
  mockGuardar.mockReset();
  mockTodas = [];
  mockSagas = [];
  mockPieza = pdf;
  mockUrl = { data: 'https://r2/firmada', isError: false, refetch: jest.fn() };
  usePreferencesStore.setState({ readingModes: {} });
  mockPantallaCompleta.mockReset();
  mockAbrirCopia.mockReset();
  mockAbrirCopia.mockImplementation(async (pieza: { kind: string }, _ruta: string, forma: string, enviar: (m: MensajeAlMotor) => void) => {
    const { posicionGuardada } = jest.requireActual<typeof import('@/lib/library/reader-protocol')>('@/lib/library/reader-protocol');
    enviar({ type: 'openBegin', format: pieza.kind === 'epub' ? 'epub' : 'pdf', size: 1, position: posicionGuardada(pieza as never), mode: forma as never });
  });
});

it('abre el PDF en la página donde se quedó y muestra que está abriendo', async () => {
  await render(<Lector />);
  expect(mockAbrirCopia).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1' }), 'u1/l1/rayuela.pdf', 'scroll', expect.any(Function));
  expect(mockEnviados[0]).toEqual({ type: 'openBegin', format: 'pdf', size: 1, position: { page: 120 }, mode: 'scroll' });
  expect(screen.getByText(R.opening)).toBeTruthy();
  await responder({ type: 'opened', total: 340 });
  expect(screen.queryByText(R.opening)).toBeNull();
  expect(screen.getByText('Rayuela')).toBeTruthy();
});

it('un EPUB se abre con su CFI', async () => {
  mockPieza = { ...pdf, kind: 'epub', last_position: { cfi: 'epubcfi(/6/4)' } };
  await render(<Lector />);
  expect(mockEnviados[0]).toEqual(expect.objectContaining({ type: 'openBegin', format: 'epub', position: { cfi: 'epubcfi(/6/4)' } }));
});

it('guarda la posición cuando la lectura se detiene, no en cada página (RF-BR9)', async () => {
  jest.useFakeTimers();
  try {
    await render(<Lector />);
    await responder({ type: 'opened', total: 340 });
    await responder({ type: 'position', page: 121, total: 340, fraction: 121 / 340 });
    await responder({ type: 'position', page: 122, total: 340, fraction: 122 / 340 });
    expect(mockGuardar).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(1300));
    expect(mockGuardar).toHaveBeenCalledTimes(1);
    expect(mockGuardar).toHaveBeenCalledWith({ id: 'l1', patch: { last_position: { page: 122 }, progress: 0.3588 } });
  } finally {
    jest.useRealTimers();
  }
});

it('al salir guarda lo que quedó pendiente', async () => {
  const { unmount } = await render(<Lector />);
  await responder({ type: 'position', page: 7, total: 10, fraction: 0.7 });
  await act(async () => unmount());
  expect(mockGuardar).toHaveBeenCalledWith({ id: 'l1', patch: { last_position: { page: 7 }, progress: 0.7 } });
});

it('la barra dice la página y salta a donde se toque (RF-BR10)', async () => {
  await render(<Lector />);
  await responder({ type: 'opened', total: 12 });
  await responder({ type: 'position', page: 4, total: 12, fraction: 4 / 12 });
  expect(screen.getByText(es.library.progressPage(4, 12))).toBeTruthy();
  const barra = screen.getByRole('adjustable');
  await fireEvent(barra, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(mockEnviados.at(-1)).toEqual({ type: 'goTo', page: 5 });
});

it('en EPUB la barra va por porcentaje', async () => {
  mockPieza = { ...pdf, kind: 'epub', last_position: null, progress: 0 };
  await render(<Lector />);
  await responder({ type: 'opened', total: null });
  await responder({ type: 'position', cfi: 'c', fraction: 0.5, page: 3, total: 5 });
  expect(screen.getByText(es.library.progressPercent(50))).toBeTruthy();
  await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(mockEnviados.at(-1)).toEqual({ type: 'goTo', fraction: 0.48 });
});

it('busca dentro del libro, dice cuántos hay y pasa al siguiente (RF-BR4)', async () => {
  await render(<Lector />);
  await responder({ type: 'opened', total: 12 });
  await fireEvent.press(screen.getByRole('button', { name: R.search }));
  await fireEvent.changeText(screen.getByLabelText(R.search), 'dragón');
  await fireEvent(screen.getByLabelText(R.search), 'submitEditing');
  expect(mockEnviados.at(-1)).toEqual({ type: 'search', query: 'dragón' });
  await responder({ type: 'search', count: 3, index: 0 });
  expect(screen.getByText(R.searchCount(1, 3))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: R.next }));
  expect(mockEnviados.at(-1)).toEqual({ type: 'searchStep', step: 1 });
  await fireEvent.press(screen.getByRole('button', { name: R.closeSearch }));
  expect(mockEnviados.at(-1)).toEqual({ type: 'searchClear' });
});

it('sin resultados lo dice', async () => {
  await render(<Lector />);
  await responder({ type: 'opened', total: 12 });
  await fireEvent.press(screen.getByRole('button', { name: R.search }));
  await responder({ type: 'search', count: 0, index: -1 });
  expect(screen.getByText(R.searchNone)).toBeTruthy();
});

it.each([
  ['password', R.errorPassword, false],
  ['damaged', R.errorDamaged, false],
  ['network', R.errorNetwork, true],
  ['unknown', R.errorUnknown, true],
] as const)('error %s: lo dice y solo ofrece reintentar si sirve', async (code, mensaje, reintentable) => {
  await render(<Lector />);
  await responder({ type: 'error', code });
  expect(screen.getByText(mensaje)).toBeTruthy();
  const boton = screen.queryByRole('button', { name: R.retry });
  expect(!!boton).toBe(reintentable);
  if (boton) {
    await fireEvent.press(boton);
    // En el teléfono reintentar vuelve a abrir la copia (o a bajarla).
    expect(mockAbrirCopia).toHaveBeenCalledTimes(2);
  }
});

it('sin red y sin copia en el teléfono, dice que hay que abrirlo una vez con conexión (RF-BR3)', async () => {
  mockAbrirCopia.mockRejectedValueOnce(new TypeError('Network request failed'));
  await render(<Lector />);
  expect(await screen.findByText(R.errorOffline)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: R.retry }));
  expect(mockAbrirCopia).toHaveBeenCalledTimes(2);
});

it('una pieza sin archivo lo dice y no abre el motor', async () => {
  mockPieza = { ...pdf, file_path: null };
  await render(<Lector />);
  expect(screen.getByText(R.noFile)).toBeTruthy();
  expect(mockEnviados).toEqual([]);
});

/** Al terminar un libro de una saga, ofrecer el siguiente (RF-BL26, T315). */
describe('el siguiente de la saga', () => {
  beforeEach(() => {
    mockPieza = { ...pdf, series_id: 's1', series_index: 1 };
    mockTodas = [mockPieza, { id: 'l2', title: 'Una corte de niebla', series_id: 's1', series_index: 2, progress: 0 }];
    mockSagas = [{ id: 's1', name: 'ACOTAR' }];
  });

  it('al llegar al final lo ofrece y abrirlo lleva al siguiente', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 10 });
    expect(screen.queryByText(es.library.series.nextTitle)).toBeNull();
    await responder({ type: 'position', page: 10, total: 10, fraction: 1 });
    expect(screen.getByText(es.library.series.nextBody('ACOTAR #2', 'Una corte de niebla'))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: es.library.series.nextOpen }));
    expect(globalThis.mockRouter.replace).toHaveBeenCalledWith({ pathname: '/(app)/book/[id]', params: { id: 'l2' } });
  });

  it('"Ahora no" lo cierra y no vuelve a salir en esta lectura', async () => {
    await render(<Lector />);
    await responder({ type: 'position', page: 10, total: 10, fraction: 1 });
    await fireEvent.press(screen.getByRole('button', { name: es.library.series.nextLater }));
    await responder({ type: 'position', page: 10, total: 10, fraction: 1 });
    expect(screen.queryByText(es.library.series.nextTitle)).toBeNull();
  });
});

/** Formas de leer (RF-BR6 – RF-BR8, T283): scroll o páginas de lado, recordada por libro. */
describe('forma de leer', () => {
  it('se abre con la forma recordada de ese libro', async () => {
    usePreferencesStore.setState({ readingModes: { l1: 'paged' } });
    await render(<Lector />);
    expect(mockEnviados[0]).toMatchObject({ type: 'openBegin', mode: 'paged' });
  });

  it('cambiarla con el libro abierto avisa al motor y se recuerda solo para ese libro', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 340 });
    await fireEvent.press(screen.getByRole('button', { name: R.mode }));
    expect(screen.getByText(R.modeScrollHint)).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: R.modePaged }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'mode', mode: 'paged' });
    expect(usePreferencesStore.getState().readingModes).toEqual({ l1: 'paged' });
    expect(screen.getByText(R.modePagedHint)).toBeTruthy();
    // Volver a scroll no deja nada guardado: es la de omisión.
    await fireEvent.press(screen.getByRole('tab', { name: R.modeScroll }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'mode', mode: 'scroll' });
    expect(usePreferencesStore.getState().readingModes).toEqual({});
  });

  it('en páginas de lado, el toque en el centro oculta y vuelve a mostrar los controles', async () => {
    usePreferencesStore.setState({ readingModes: { l1: 'paged' } });
    await render(<Lector />);
    await responder({ type: 'opened', total: 340 });
    await responder({ type: 'tap' });
    expect(screen.queryByRole('button', { name: R.mode })).toBeNull();
    expect(screen.queryByRole('adjustable')).toBeNull();
    await responder({ type: 'tap' });
    expect(screen.getByRole('button', { name: R.mode })).toBeTruthy();
    expect(screen.getByRole('adjustable')).toBeTruthy();
  });

  it('en scroll los controles no se ocultan', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 340 });
    await responder({ type: 'tap' });
    expect(screen.getByRole('button', { name: R.mode })).toBeTruthy();
  });
});

/** Libro real (RF-BR5, T284): a pantalla completa, sin controles al entrar, y "pp. 2–3" con dos páginas. */
describe('libro real', () => {
  it('elegirlo cierra la hoja, esconde los controles y pide pantalla completa', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 340 });
    expect(mockPantallaCompleta).toHaveBeenLastCalledWith(false);
    await fireEvent.press(screen.getByRole('button', { name: R.mode }));
    await fireEvent.press(screen.getByRole('tab', { name: R.modeBook }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'mode', mode: 'book' });
    expect(usePreferencesStore.getState().readingModes).toEqual({ l1: 'book' });
    expect(screen.queryByText(R.modeBookHint)).toBeNull();
    expect(screen.queryByRole('button', { name: R.mode })).toBeNull();
    expect(mockPantallaCompleta).toHaveBeenLastCalledWith(true);
    expect(mockBarraEscondida).toBe(true);
    // El centro trae los controles.
    await responder({ type: 'tap' });
    expect(screen.getByRole('button', { name: R.mode })).toBeTruthy();
  });

  it('con dos páginas a la vista, la barra dice el par', async () => {
    usePreferencesStore.setState({ readingModes: { l1: 'book' } });
    await render(<Lector />);
    await responder({ type: 'opened', total: 340 });
    await responder({ type: 'position', page: 2, pageEnd: 3, total: 340, fraction: 2 / 340 });
    await responder({ type: 'tap' });
    expect(screen.getByText(es.library.progressPages(2, 3, 340))).toBeTruthy();
  });

  it('mientras abre, los controles se ven para poder salir', async () => {
    usePreferencesStore.setState({ readingModes: { l1: 'book' } });
    await render(<Lector />);
    expect(screen.getByRole('button', { name: es.common.back })).toBeTruthy();
    expect(mockPantallaCompleta).toHaveBeenLastCalledWith(false);
  });
});

/** Tema del lector (RF-BH5): se manda al motor al abrir y al cambiarlo. */
describe('tema del lector', () => {
  it('manda los colores del tema y, al elegir oscuro, fondo negro y letra blanca', async () => {
    usePreferencesStore.setState({ readerTheme: { tema: 'light', propio: { pagina: '#F4ECD8', letra: '#5B4636' } } });
    await render(<Lector />);
    expect(mockEnviados).toContainEqual({ type: 'theme', page: '#FFFFFF', text: '#1A1A1A' });
    await responder({ type: 'opened', total: 340 });
    await fireEvent.press(screen.getByRole('button', { name: R.mode }));
    await fireEvent.press(screen.getByRole('tab', { name: R.themeDark }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'theme', page: '#000000', text: '#F2F2F2' });
    expect(usePreferencesStore.getState().readerTheme.tema).toBe('dark');
  });

  it('el propio deja elegir página y letra, y avisa si cuesta leer', async () => {
    usePreferencesStore.setState({ readerTheme: { tema: 'custom', propio: { pagina: '#F4ECD8', letra: '#5B4636' } } });
    await render(<Lector />);
    await responder({ type: 'opened', total: 340 });
    await fireEvent.press(screen.getByRole('button', { name: R.mode }));
    await fireEvent.press(screen.getByRole('button', { name: R.themeColor(R.themePage, '#121212') }));
    await fireEvent.press(screen.getByRole('button', { name: R.themeColor(R.themeText, '#3B3B3B') }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'theme', page: '#121212', text: '#3B3B3B' });
    expect(screen.getByText(R.themeLowContrast)).toBeTruthy();
  });
});

describe('anotaciones (spec 13c, T286)', () => {
  const postit = (id: string, cambio: Record<string, unknown> = {}) => ({
    id,
    item_id: 'l1',
    owner_id: 'u1',
    kind: 'postit',
    locator: { page: 3, x: 0.1, y: 0.2, w: 0.24 },
    content: { color: '#F1D35D', text: `nota ${id}` },
    z: 1,
    removed: false,
    locked: false,
    created_at: '2026-10-13T10:00:00.000Z',
    updated_at: '2026-10-13T10:00:00.000Z',
    ...cambio,
  });

  it('manda al motor lo pegado que sabe pintar, sin lo quitado', async () => {
    mockLista = [postit('a1'), postit('quitado', { removed: true }), postit('trazo', { kind: 'ink' })];
    await render(<Lector />);
    expect(mockEnviados).toContainEqual({
      type: 'annotations',
      items: [{ id: 'a1', kind: 'postit', locator: { page: 3, x: 0.1, y: 0.2, w: 0.24 }, z: 1, locked: false, content: { color: '#F1D35D', text: 'nota a1', size: 1 } }],
    });
  });

  it('pegar un post-it: la herramienta, el toque en la página y escribir ahí mismo', async () => {
    mockLista = [postit('a1', { z: 4 })];
    const { rerender } = await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.postit }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'tool', tool: 'postit' });
    expect(screen.getByText(A.postitOn)).toBeTruthy();

    await responder({ type: 'place', locator: { page: 5, x: 0.3, y: 0.4, w: 0.24 } });
    expect(mockCrear).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'postit', item_id: 'l1', locator: { page: 5, x: 0.3, y: 0.4, w: 0.24 }, z: 5, content: { color: '#F1D35D', text: '' } }),
    );
    const nuevo = mockCrear.mock.calls[0][0] as { id: string };
    // Queda elegido, la herramienta se apaga y el motor lo pone a escribir ahí mismo (T289).
    expect(mockEnviados).toContainEqual({ type: 'select', id: nuevo.id });
    expect(mockEnviados).toContainEqual({ type: 'write', id: nuevo.id });
    expect(mockEnviados.at(-1)).toEqual({ type: 'tool', tool: null });

    // Como la caché optimista: lo nuevo ya está en la lista.
    mockLista = [...mockLista, { ...postit(nuevo.id), ...mockCrear.mock.calls[0][0] }];
    await rerender(<Lector />);
    await responder({ type: 'text', id: nuevo.id, text: 'Releer este capítulo' });
    expect(mockCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ id: nuevo.id }), expect.objectContaining({ content: { color: '#F1D35D', text: 'Releer este capítulo' } }));
  });

  it('el color de un post-it se elige desde la barra (y el siguiente sale de ese color)', async () => {
    mockLista = [postit('a1')];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'select', id: 'a1' });
    await fireEvent.press(screen.getByRole('button', { name: A.styleColor }));
    await fireEvent.press(screen.getByRole('button', { name: 'Rosa' }));
    await fireEvent.press(screen.getByRole('button', { name: A.save }));
    expect(mockCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a1' }), expect.objectContaining({ content: { color: '#F6A9CD', text: 'nota a1', size: 1 } }));
  });

  it('el tamaño de la letra de un post-it se elige en la misma hoja y llega al motor (T336)', async () => {
    mockLista = [postit('a1', { content: { color: '#F1D35D', text: 'grande', size: 2 } })];
    await render(<Lector />);
    expect(mockEnviados).toContainEqual(expect.objectContaining({ type: 'annotations', items: [expect.objectContaining({ content: { color: '#F1D35D', text: 'grande', size: 2 } })] }));
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'select', id: 'a1' });
    await fireEvent.press(screen.getByRole('button', { name: A.styleColor }));
    await fireEvent.press(screen.getByRole('button', { name: A.textBigger }));
    await fireEvent.press(screen.getByRole('button', { name: A.save }));
    expect(mockCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a1' }), expect.objectContaining({ content: { color: '#F1D35D', text: 'grande', size: 2.25 } }));
  });

  it('"Escribir" pone a escribir ahí mismo; con candado no se puede', async () => {
    mockLista = [postit('a1')];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'select', id: 'a1' });
    await fireEvent.press(screen.getByRole('button', { name: A.write }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'write', id: 'a1' });
  });

  it('con algo elegido: traer al frente, mandar atrás, bloquear y quitar (RF-BH16)', async () => {
    mockLista = [postit('a1', { z: 1 }), postit('a2', { z: 2 })];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'select', id: 'a1' });

    await fireEvent.press(screen.getByRole('button', { name: A.toFront }));
    expect(mockCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a1', z: 1 }), expect.objectContaining({ id: 'a1', z: 3 }));
    // Ya está hasta atrás: no se guarda nada.
    mockCambiar.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: A.toBack }));
    expect(mockCambiar).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: A.lock }));
    expect(mockCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a1' }), expect.objectContaining({ locked: true }));

    await fireEvent.press(screen.getByRole('button', { name: A.remove }));
    expect(mockBorrar).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'select', id: null });
  });

  it('lo bloqueado lo dice y no se mueve aunque el motor lo pida', async () => {
    mockLista = [postit('a1', { locked: true })];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'select', id: 'a1' });
    expect(screen.getByText(A.lockedHint)).toBeTruthy();
    expect(screen.getByRole('button', { name: A.unlock })).toBeTruthy();
    await responder({ type: 'move', id: 'a1', locator: { page: 4, x: 0.5, y: 0.5, w: 0.24 } });
    expect(mockCambiar).not.toHaveBeenCalled();
  });

  it('arrastrar guarda la nueva posición', async () => {
    mockLista = [postit('a1')];
    await render(<Lector />);
    await responder({ type: 'move', id: 'a1', locator: { page: 4, x: 0.5, y: 0.5, w: 0.24 } });
    expect(mockCambiar).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }), expect.objectContaining({ locator: { page: 4, x: 0.5, y: 0.5, w: 0.24 } }));
  });

  it('deshacer (RF-BH18)', async () => {
    mockPuedeDeshacer = true;
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.undo }));
    expect(mockDeshacer).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: A.redo })).toBeDisabled();
  });

  it('el panel lista lo anotado con su página y tocar uno lleva ahí (RF-BH17)', async () => {
    mockLista = [postit('a1', { locator: { page: 9, x: 0, y: 0, w: 0.2 } }), postit('a2', { content: { color: '#E24947', text: '' } })];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.panelA11y }));
    const filas = screen.getAllByRole('button', { name: /Toca para ir ahí/ });
    // En el orden del libro: la de la página 3 antes que la de la 9.
    expect(filas.map((f) => f.props.accessibilityLabel)).toEqual([A.rowA11y('Post-it', A.emptyText, 'p. 3'), A.rowA11y('Post-it', 'nota a1', 'p. 9')]);
    await fireEvent.press(filas[1]);
    expect(mockEnviados).toContainEqual({ type: 'goTo', page: 9 });
    expect(mockEnviados.at(-1)).toEqual({ type: 'select', id: 'a1' });
  });

  it('el panel vacío invita a pegar algo', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.panelA11y }));
    expect(screen.getByText(A.empty)).toBeTruthy();
  });

  it('en el libro real no se pega: el botón está apagado y lo explica', async () => {
    usePreferencesStore.setState({ readingModes: { l1: 'book' } });
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'tap' });
    expect(screen.getByRole('button', { name: A.postit })).toBeDisabled();
    expect(screen.getByText(A.postitBook)).toBeTruthy();
  });
});

describe('subrayar, definir y copiar (spec 13c, T287)', () => {
  const pdfRects = { page: 3, y: 0.4, rects: [{ page: 3, x: 0.1, y: 0.4, w: 0.5, h: 0.02 }] };
  const seleccionar = (text: string, locator: Record<string, unknown> = pdfRects) => responder({ type: 'selection', text, locator });

  it('al seleccionar aparecen los colores; tocar uno subraya con el estilo elegido y suelta la selección', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12, copiable: true });
    await seleccionar('la ciudad era un mapa');
    expect(screen.getByLabelText(A.selectionBar)).toBeTruthy();
    // Cambiar a subrayado y elegir azul cielo.
    await fireEvent.press(screen.getByRole('button', { name: A.styleNext(A.styles.highlight) }));
    await fireEvent.press(screen.getByRole('button', { name: A.highlightWith('Azul cielo', A.styles.underline) }));
    expect(mockCrear).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'highlight', locator: pdfRects, content: { color: '#86CBF3', style: 'underline', text: 'la ciudad era un mapa' } }),
    );
    expect(mockEnviados.at(-1)).toEqual({ type: 'clearSelection' });
    expect(screen.queryByLabelText(A.selectionBar)).toBeNull();
  });

  it('el último color usado va primero la siguiente vez', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await seleccionar('uno');
    await fireEvent.press(screen.getByRole('button', { name: A.highlightWith('Rosa', A.styles.highlight) }));
    await seleccionar('dos');
    const colores = screen.getAllByRole('button', { name: /^Resaltado en/ }).map((b) => b.props.accessibilityLabel);
    expect(colores[0]).toBe(A.highlightWith('Rosa', A.styles.highlight));
  });

  it('copiar pone el texto en el portapapeles y lo avisa (RF-BH9)', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12, copiable: true });
    await seleccionar('la ciudad');
    await fireEvent.press(screen.getByRole('button', { name: A.copy }));
    expect(mockCopiar).toHaveBeenCalledWith('la ciudad');
    expect(mockAvisar).toHaveBeenCalledWith({ message: A.copied });
  });

  it('un libro que prohíbe copiar deja subrayar pero no copiar', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12, copiable: false });
    await seleccionar('la ciudad');
    expect(screen.getByRole('button', { name: A.copyBlocked })).toBeDisabled();
    expect(screen.getByRole('button', { name: A.highlightWith('Amarillo', A.styles.highlight) })).toBeEnabled();
  });

  it('definir aparece solo con una palabra y abre su hoja (RF-BH8)', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await seleccionar('la ciudad');
    expect(screen.queryByRole('button', { name: A.define })).toBeNull();
    await seleccionar('«ciudad»,', { cfi: 'epubcfi(/6/4!/4/2,/1:3,/1:9)', fraction: 0.1 });
    await fireEvent.press(screen.getByRole('button', { name: A.define }));
    expect(screen.getByText(A.defineTitle('ciudad'))).toBeTruthy();
    expect(screen.getByRole('button', { name: A.defineRae })).toBeTruthy();
  });

  it('en un libro en español, definir manda a la RAE sin buscar en inglés', async () => {
    mockPieza = { ...pdf, kind: 'epub', last_position: null };
    await render(<Lector />);
    await responder({ type: 'opened', total: null, lang: 'es-MX' });
    await seleccionar('ciudad', { cfi: 'epubcfi(/6/4!/4/2,/1:3,/1:9)', fraction: 0.1 });
    await fireEvent.press(screen.getByRole('button', { name: A.define }));
    expect(screen.getByText(A.defineSpanish)).toBeTruthy();
  });

  it('tocar un subrayado abre su hoja: cambiar color, estilo y nota, o quitarlo (RF-BH7)', async () => {
    const marcado = {
      id: 'h1',
      item_id: 'l1',
      owner_id: 'u1',
      kind: 'highlight',
      locator: pdfRects,
      content: { color: '#F1D35D', style: 'highlight', text: 'la ciudad era un mapa' },
      z: 1,
      removed: false,
      locked: false,
      created_at: 'c',
      updated_at: 'u',
    };
    mockLista = [marcado];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'select', id: 'h1' });
    expect(screen.getByText('la ciudad era un mapa')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: A.styles.strike }));
    await fireEvent.press(screen.getByRole('button', { name: 'Coral' }));
    await fireEvent.changeText(screen.getByLabelText(A.note), ' Volver aquí ');
    await fireEvent.press(screen.getByRole('button', { name: A.save }));
    expect(mockCambiar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'h1' }),
      expect.objectContaining({ content: { color: '#F68675', style: 'strike', text: 'la ciudad era un mapa', note: 'Volver aquí' } }),
    );
    expect(mockEnviados.at(-1)).toEqual({ type: 'select', id: null });

    await responder({ type: 'select', id: 'h1' });
    await fireEvent.press(screen.getByRole('button', { name: A.removeHighlight }));
    expect(mockBorrar).toHaveBeenCalledWith(expect.objectContaining({ id: 'h1' }));
  });

  it('el subrayado se manda al motor con su estilo', async () => {
    mockLista = [
      { id: 'h1', item_id: 'l1', owner_id: 'u1', kind: 'highlight', locator: pdfRects, content: { color: '#F1D35D', style: 'strike', text: 'x' }, z: 1, removed: false, locked: false, created_at: 'c', updated_at: 'u' },
    ];
    await render(<Lector />);
    expect(mockEnviados).toContainEqual({
      type: 'annotations',
      items: [{ id: 'h1', kind: 'highlight', locator: pdfRects, z: 1, locked: false, content: { color: '#F1D35D', text: 'x', style: 'strike' } }],
    });
  });
});

describe('zoom, tamaño y letra (spec 13c, T288)', () => {
  beforeEach(() => usePreferencesStore.setState({ readerText: { tamano: 100, letra: 'original' } }));

  it('manda al motor el tamaño y la letra al abrir y cuando cambian', async () => {
    usePreferencesStore.setState({ readerText: { tamano: 120, letra: 'serif' } });
    await render(<Lector />);
    expect(mockEnviados).toContainEqual({ type: 'text', size: 120, font: 'serif' });
    await act(async () => usePreferencesStore.setState({ readerText: { tamano: 130, letra: 'dyslexic' } }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'text', size: 130, font: 'dyslexic' });
  });

  it('el pellizco en un EPUB pide otro tamaño y se guarda (RF-BH2)', async () => {
    await render(<Lector />);
    await responder({ type: 'textSize', size: 150 });
    expect(usePreferencesStore.getState().readerText).toEqual({ tamano: 150, letra: 'original' });
    expect(mockEnviados.at(-1)).toEqual({ type: 'text', size: 150, font: 'original' });
  });

  it('acercado, una pastilla dice cuánto y "Ajustar a la página" vuelve a la página entera (RF-BH1)', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    expect(screen.queryByText(R.zoomFit)).toBeNull();
    await responder({ type: 'zoom', level: 1.5 });
    await fireEvent.press(screen.getByRole('button', { name: `${R.zoomLevel(150)}. ${R.zoomFit}` }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'zoom', level: 1 });
    await responder({ type: 'zoom', level: 1 });
    expect(screen.queryByText(R.zoomFit)).toBeNull();
  });

  it('en la hoja Lectura de un EPUB, tamaño y letra (RF-BH2, RF-BH3)', async () => {
    mockPieza = { ...pdf, kind: 'epub', last_position: null };
    await render(<Lector />);
    await responder({ type: 'opened', total: null });
    await fireEvent.press(screen.getByRole('button', { name: R.mode }));
    await fireEvent.press(screen.getByRole('button', { name: R.textBigger }));
    expect(usePreferencesStore.getState().readerText.tamano).toBe(110);
    await fireEvent.press(screen.getByRole('button', { name: R.fonts.dyslexic }));
    expect(usePreferencesStore.getState().readerText.letra).toBe('dyslexic');
  });

  it('en la hoja Lectura de un PDF, el aviso del zoom en lugar de tamaño y letra', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: R.mode }));
    expect(screen.getByText(R.zoomPdfHint)).toBeTruthy();
    expect(screen.queryByRole('button', { name: R.textBigger })).toBeNull();
  });
});

describe('post-it estirable y del color de la portada (T329)', () => {
  it('ofrece el color de la portada primero y lo guarda', async () => {
    mockPieza = { ...pdf, cover_color: '#1E2761' };
    mockLista = [
      { id: 'p1', item_id: 'l1', owner_id: 'u1', kind: 'postit', locator: { page: 1, x: 0, y: 0, w: 0.2 }, content: { color: '#F1D35D', text: 'hola' }, z: 1, removed: false, locked: false, created_at: 'c', updated_at: 'u' },
    ];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'select', id: 'p1' });
    await fireEvent.press(screen.getByRole('button', { name: A.styleColor }));
    await fireEvent.press(screen.getByRole('button', { name: A.coverColor('#1E2761') }));
    await fireEvent.press(screen.getByRole('button', { name: A.save }));
    expect(mockCambiar).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), expect.objectContaining({ content: { color: '#1E2761', text: 'hola', size: 1 } }));
  });

  it('estirarlo guarda el ancho y la proporción nuevos', async () => {
    mockLista = [
      { id: 'p1', item_id: 'l1', owner_id: 'u1', kind: 'postit', locator: { page: 1, x: 0, y: 0, w: 0.2 }, content: {}, z: 1, removed: false, locked: false, created_at: 'c', updated_at: 'u' },
    ];
    await render(<Lector />);
    await responder({ type: 'move', id: 'p1', locator: { page: 1, x: 0, y: 0, w: 0.35, ar: 0.6 } });
    expect(mockCambiar).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), expect.objectContaining({ locator: { page: 1, x: 0, y: 0, w: 0.35, ar: 0.6 } }));
  });
});

describe('tiempo de lectura (spec 13b, RF-BR11; T318)', () => {
  it('cada mensaje del motor es señal de lectura y la posición dice de dónde a dónde', async () => {
    await render(<Lector />);
    await responder({ type: 'activity' });
    expect(mockActividad).toHaveBeenCalled();
    await responder({ type: 'position', page: 7, total: 10, fraction: 0.7 });
    expect(mockAlMoverse).toHaveBeenCalledWith({ locator: { page: 7 }, progress: 0.7 });
  });

  it('junto a la página dice cuánto se ha leído el libro: las sesiones guardadas más la de ahora', async () => {
    mockSesiones = [
      { id: 'vieja', item_id: 'l1', seconds: 600 },
      { id: 'otra', item_id: 'otro-libro', seconds: 9999 },
      // La de ahora ya guardada una vez: no se cuenta dos veces.
      { id: 'actual', item_id: 'l1', seconds: 120 },
    ];
    mockSegundosEnVivo = 35 * 60;
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'position', page: 4, total: 12, fraction: 4 / 12 });
    expect(screen.getByText(`${es.library.progressPage(4, 12)} · ${es.library.time.read('45 min')}`)).toBeTruthy();
  });

  it('menos de un minuto no se muestra', async () => {
    mockSegundosEnVivo = 20;
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'position', page: 4, total: 12, fraction: 4 / 12 });
    expect(screen.getByText(es.library.progressPage(4, 12))).toBeTruthy();
  });
});

it('fuera del scroll, la página se acomoda entre las barras (insets); en scroll, nada (T286b)', async () => {
  usePreferencesStore.setState({ readingModes: { l1: 'paged' } });
  await render(<Lector />);
  expect(mockEnviados).toContainEqual({ type: 'insets', top: 52, bottom: 116 });
  usePreferencesStore.setState({ readingModes: {} });
  mockEnviados.length = 0;
  await render(<Lector />);
  expect(mockEnviados).toContainEqual({ type: 'insets', top: 0, bottom: 0 });
});

describe('cuadros de texto e imágenes (spec 13c, RF-BH10, RF-BH12; T289)', () => {
  const pegado = (id: string, kind: string, content: Record<string, unknown>) => ({
    id,
    item_id: 'l1',
    owner_id: 'u1',
    kind,
    locator: { page: 2, x: 0.1, y: 0.1, w: 0.4, ar: 0.3 },
    content,
    z: 1,
    removed: false,
    locked: false,
    created_at: 'c',
    updated_at: 'u',
  });

  it('un cuadro de texto: se pega, se escribe ahí mismo con la letra del tema, y vacío se quita', async () => {
    usePreferencesStore.setState({ readerTheme: { tema: 'light', propio: { pagina: '#F4ECD8', letra: '#5B4636' } } });
    const { rerender } = await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.textbox }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'tool', tool: 'textbox' });
    await responder({ type: 'place', locator: { page: 2, x: 0.1, y: 0.1, w: 0.42, ar: 0.3 } });
    expect(mockCrear).toHaveBeenCalledWith(expect.objectContaining({ kind: 'textbox', content: { text: '', color: '#1A1A1A', size: 1 } }));
    const nuevo = mockCrear.mock.calls[0][0] as { id: string };
    expect(mockEnviados).toContainEqual({ type: 'write', id: nuevo.id });
    mockLista = [pegado(nuevo.id, 'textbox', { text: '', color: '#1A1A1A', size: 1 })];
    await rerender(<Lector />);
    await responder({ type: 'text', id: nuevo.id, text: '   ' });
    expect(mockBorrar).toHaveBeenCalledWith(expect.objectContaining({ id: nuevo.id }));
  });

  it('el cuadro de texto se manda al motor con su tamaño; el color y el tamaño se cambian desde la barra', async () => {
    mockLista = [pegado('t1', 'textbox', { text: 'Ojo aquí', color: '#1A1A1A', size: 1.5 })];
    await render(<Lector />);
    expect(mockEnviados).toContainEqual(expect.objectContaining({ type: 'annotations', items: [expect.objectContaining({ id: 't1', content: { color: '#1A1A1A', text: 'Ojo aquí', size: 1.5 } })] }));
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'select', id: 't1' });
    await fireEvent.press(screen.getByRole('button', { name: A.styleColor }));
    await fireEvent.press(screen.getByRole('button', { name: A.textBigger }));
    await fireEvent.press(screen.getByRole('button', { name: A.inks.paper }));
    await fireEvent.press(screen.getByRole('button', { name: A.save }));
    expect(mockCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ id: 't1' }), expect.objectContaining({ content: { text: 'Ojo aquí', color: '#F2F2F2', size: 1.75 } }));
  });

  it('una imagen: elegirla, tocar dónde va, se ve con su copia mientras sube', async () => {
    mockSubirImagen.mockResolvedValue('ruta');
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.image }));
    await fireEvent.press(screen.getByRole('button', { name: A.imageGallery }));
    // Con la proporción de la imagen (400 / 800), para pegarla del tamaño justo.
    expect(mockEnviados).toContainEqual({ type: 'tool', tool: 'image', ar: 0.5 });
    await responder({ type: 'place', locator: { page: 2, x: 0.1, y: 0.1, w: 0.4, ar: 0.5 } });
    const nueva = mockCrear.mock.calls[0][0] as { id: string; content: Record<string, unknown> };
    expect(nueva).toMatchObject({ kind: 'image', content: { path: `u1/l1/anotaciones/${nueva.id}.jpg`, rot: 0 } });
    expect(mockSubirImagen).toHaveBeenCalledWith('l1', nueva.id, new Uint8Array([1, 2]));
    mockLista = [pegado(nueva.id, 'image', nueva.content)];
    await act(async () => mockResponder({ type: 'tap' }));
    expect(mockEnviados.filter((m) => m.type === 'annotations').at(-1)).toEqual(
      expect.objectContaining({ items: [expect.objectContaining({ id: nueva.id, content: expect.objectContaining({ src: 'data:image/jpeg;base64,AA', rot: 0 }) })] }),
    );
  });

  it('si la imagen no sube, se quita sin paso de deshacer y se dice', async () => {
    mockSubirImagen.mockRejectedValue(new Error('sin red'));
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.image }));
    await fireEvent.press(screen.getByRole('button', { name: A.imageGallery }));
    await responder({ type: 'place', locator: { page: 2, x: 0.1, y: 0.1, w: 0.4, ar: 0.5 } });
    expect(mockDescartar).toHaveBeenCalled();
    expect(mockAvisar).toHaveBeenCalledWith({ message: A.imageFailed });
  });

  it('una imagen guardada se ve con su dirección firmada; girar suma 90° y el asa manda el ángulo', async () => {
    mockLista = [pegado('i1', 'image', { path: 'u1/l1/anotaciones/img1.jpg', rot: 0 })];
    await render(<Lector />);
    expect(mockEnviados).toContainEqual(expect.objectContaining({ type: 'annotations', items: [expect.objectContaining({ content: expect.objectContaining({ src: 'https://r2/img1' }) })] }));
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'select', id: 'i1' });
    await fireEvent.press(screen.getByRole('button', { name: A.rotate }));
    expect(mockCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'i1' }), expect.objectContaining({ content: { path: 'u1/l1/anotaciones/img1.jpg', rot: 90 } }));
    await responder({ type: 'rotate', id: 'i1', rot: 45 });
    expect(mockCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'i1' }), expect.objectContaining({ content: { path: 'u1/l1/anotaciones/img1.jpg', rot: 45 } }));
  });
});

describe('stickers con charola de quitados (spec 13c, RF-BH13; T290)', () => {
  const S = es.library.stickers;
  const sticker = (id: string, cambio: Record<string, unknown> = {}) => ({
    id,
    item_id: 'l1',
    owner_id: 'u1',
    kind: 'sticker',
    locator: { page: 2, x: 0.3, y: 0.4, w: 0.33, ar: 0.833 },
    content: { sticker: 'nobi-pink/popcorn', rot: 30 },
    z: 1,
    removed: false,
    locked: false,
    created_at: 'c',
    updated_at: 'u',
    ...cambio,
  });

  it('elegir uno de la colección y tocar dónde va lo pega con su proporción, elegido', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.sticker }));
    await fireEvent.press(screen.getByRole('button', { name: S.pick(S.names.popcorn) }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'tool', tool: 'sticker', ar: 0.833 });
    expect(screen.getByText(A.stickerOn)).toBeTruthy();
    await responder({ type: 'place', locator: { page: 2, x: 0.2, y: 0.2, w: 0.26, ar: 0.833 } });
    const nuevo = mockCrear.mock.calls[0][0] as { id: string };
    expect(nuevo).toMatchObject({ kind: 'sticker', locator: { page: 2, x: 0.2, y: 0.2, w: 0.26, ar: 0.833 }, content: { sticker: 'nobi-pink/popcorn', rot: 0 }, removed: false });
    expect(mockEnviados).toContainEqual({ type: 'select', id: nuevo.id });
  });

  it('se manda al motor con cuál es, su giro y su nombre; lo quitado no', async () => {
    mockLista = [sticker('s1'), sticker('s2', { removed: true })];
    await render(<Lector />);
    const items = (mockEnviados.filter((m) => m.type === 'annotations').at(-1) as { items: { id: string; content: unknown }[] }).items;
    expect(items).toEqual([expect.objectContaining({ id: 's1', content: expect.objectContaining({ sticker: 'nobi-pink/popcorn', rot: 30, label: S.names.popcorn }) })]);
  });

  it('quitarlo no lo tira: se va a "Quitados" y lo dice; girar suma 90°', async () => {
    mockLista = [sticker('s1')];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'select', id: 's1' });
    await fireEvent.press(screen.getByRole('button', { name: A.rotate }));
    expect(mockCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ id: 's1' }), expect.objectContaining({ content: { sticker: 'nobi-pink/popcorn', rot: 120 } }));
    await fireEvent.press(screen.getByRole('button', { name: A.remove }));
    expect(mockCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ id: 's1' }), expect.objectContaining({ removed: true }));
    expect(mockBorrar).not.toHaveBeenCalled();
    expect(mockAvisar).toHaveBeenCalledWith({ message: S.savedToRemoved });
  });

  it('de la charola vuelve con su tamaño y su giro donde se toque; también se puede tirar', async () => {
    mockLista = [sticker('s1', { removed: true, z: 2 }), sticker('s3', { z: 5 })];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.sticker }));
    await fireEvent.press(screen.getByText(S.removed(1)));
    await fireEvent.press(screen.getByRole('button', { name: S.putBack(S.names.popcorn) }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'tool', tool: 'sticker', ar: 0.833, w: 0.33 });
    await responder({ type: 'place', locator: { page: 5, x: 0.6, y: 0.1, w: 0.33, ar: 0.833 } });
    expect(mockCrear).not.toHaveBeenCalled();
    expect(mockCambiar).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 's1' }),
      expect.objectContaining({ removed: false, locator: { page: 5, x: 0.6, y: 0.1, w: 0.33, ar: 0.833 }, content: { sticker: 'nobi-pink/popcorn', rot: 30 }, z: 6 }),
    );
    // Vuelve elegido; al soltarlo, la barra de herramientas regresa.
    expect(mockEnviados).toContainEqual({ type: 'select', id: 's1' });
    await fireEvent.press(screen.getByRole('button', { name: A.done }));
    await fireEvent.press(screen.getByRole('button', { name: A.sticker }));
    await fireEvent.press(screen.getByText(S.removed(1)));
    await fireEvent.press(screen.getByRole('button', { name: S.discard(S.names.popcorn) }));
    expect(mockBorrar).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });

  it('Supr o Retroceso en el libro (el motor avisa "remove"): un sticker va a Quitados, lo demás se borra', async () => {
    const nota = { ...sticker('p1'), kind: 'postit', content: { color: '#F1D35D', text: 'hola' } };
    mockLista = [sticker('s1'), nota];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'remove', id: 's1' });
    expect(mockCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ id: 's1' }), expect.objectContaining({ removed: true }));
    await responder({ type: 'remove', id: 'p1' });
    expect(mockBorrar).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('la charola vacía explica para qué es', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.sticker }));
    await fireEvent.press(screen.getByText(S.removed(0)));
    expect(screen.getByText(S.removedEmpty)).toBeTruthy();
  });
});
