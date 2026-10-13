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

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Lector = require('@/app/(app)/book/[id]').default as () => React.ReactElement;

const pdf = { id: 'l1', kind: 'pdf', title: 'Rayuela', file_path: 'u1/l1/rayuela.pdf', pdf_path: null, last_position: { page: 120 }, progress: 0.35 };
const responder = async (m: MensajeDelMotor) => {
  await act(async () => mockResponder(m));
};

beforeEach(() => {
  globalThis.setParametrosDeRuta({ id: 'l1' });
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
