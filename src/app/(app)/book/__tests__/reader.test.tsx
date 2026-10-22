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

// Las hojas de un Journal (T364).
let mockLienzos: Record<string, unknown>[] | undefined;
jest.mock('@/hooks/use-canvases', () => ({ useCanvases: (id: string) => ({ data: id ? mockLienzos : undefined }) }));
const mockSinFuentes = { miniatura: { imagenes: new Map(), stickers: new Map() }, motor: { imagenes: new Map(), stickers: new Map(), libros: new Map(), datos: new Map() } };
jest.mock('@/hooks/use-canvas-sources', () => ({ useFuentesDeLienzos: () => mockSinFuentes }));
const mockAvisar = jest.fn();
const mockConfirmar = jest.fn(async () => true);
jest.mock('@/providers', () => ({ useSnackbar: () => mockAvisar, useAuth: () => ({ userId: 'u1' }), useConfirm: () => mockConfirmar }));
// Stickers propios (T335): el doble guarda lo que se le pide y deja borrar.
let mockMisStickers: Record<string, unknown>[] = [];
const mockCrearSticker = jest.fn();
const mockBorrarSticker = jest.fn();
const mockImagenesPropias = new Map<string, string>();
const mockFuentesPropias = new Map<string, string>();
const mockFuentesAjenas = new Map<string, string>();
jest.mock('@/hooks/use-user-stickers', () => ({
  PREFIJO_PROPIO: 'mios/',
  idPropio: (id: string) => `mios/${id}`,
  useUserStickers: () => ({ data: mockMisStickers }),
  useUserStickerImages: () => mockImagenesPropias,
  useUserStickerSources: () => mockFuentesPropias,
  useStickersDeOtros: () => mockFuentesAjenas,
  useCreateUserSticker: () => ({ mutate: mockCrearSticker, isPending: false }),
  useRemoveUserSticker: () => ({ mutate: mockBorrarSticker }),
}));
// Club de lectura (T307): los miembros los pone cada prueba.
let mockMiembros: Record<string, unknown>[] = [];
let mockAvance: Record<string, unknown>[] = [];
// Sesión en vivo (T309): el doble deja poner cómo está y anota lo que se manda.
const mockVivo = {
  presentes: [] as Record<string, unknown>[], hay: false, enSesion: false, siguiendo: true, lider: null as Record<string, unknown> | null, yoDirijo: false,
  empezar: jest.fn(), unirme: jest.fn(), salir: jest.fn(), pasarMando: jest.fn(), soltarme: jest.fn(), seguir: jest.fn(), moverme: jest.fn(), senalar: jest.fn(),
};
let mockVivoArgs: { alMover: (p: unknown) => void; alSenalar: (l: unknown) => void } | null = null;
jest.mock('@/hooks/use-club-live', () => ({
  useClubLive: (args: { alMover: (p: unknown) => void; alSenalar: (l: unknown) => void }) => ((mockVivoArgs = args), mockVivo),
}));
jest.mock('@/hooks/use-clubs', () => ({
  useClubs: () => ({ clubs: [], members: mockMiembros, isPending: false }),
  useClubProgress: () => ({ data: mockAvance }),
}));
const mockColores = new Map([['u-ana', '#E24947']]);
jest.mock('@/hooks/use-connections', () => ({ usePeopleColors: () => mockColores }));
// Fichas (T294): la lista la pone cada prueba.
let mockFichas: Record<string, unknown>[] = [];
let mockPlantillasDeFicha: Record<string, unknown>[] = [];
jest.mock('@/hooks/use-cards', () => ({
  useCards: () => ({ data: mockFichas, isSuccess: true }),
  useCardTemplates: () => ({ data: mockPlantillasDeFicha, isSuccess: true }),
}));
// Fragmentos (T317): el doble anota lo que se guarda.
const mockCrearFragmento = jest.fn();
jest.mock('@/hooks/use-clips', () => ({ useCreateClip: () => ({ mutate: mockCrearFragmento, isPending: false }) }));
jest.mock('@/lib/library/cover/prepare', () => ({
  prepararImagenPegada: async () => ({ jpeg: new Uint8Array([1, 2]), ancho: 800, alto: 400, vistaPrevia: 'data:image/jpeg;base64,AA' }),
  prepararSticker: async () => ({ dataUrl: 'data:image/png;base64,ORIGINAL', ancho: 400, alto: 300 }),
}));
// Elegir la imagen: el doble da una lista para pegar.
const mockElegirFoto = jest.fn(async () => 'file://foto.jpg');
jest.mock('@/lib/library/cover/sources', () => ({
  PUEDE_TOMAR_FOTO: true,
  desdeGaleria: () => mockElegirFoto(),
  desdeCamara: () => mockElegirFoto(),
  desdeArchivo: () => mockElegirFoto(),
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
const mockEditorClub: unknown[] = [];
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
  useClubAnnotationsLive: () => undefined,
  useAnnotationEditor: (_id: string, club?: unknown) => (mockEditorClub.push(club), {
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

// La tienda de stickers (T338): el doble trae un pack azul descargado y deja descargar.
const mockPacks = [
  { id: 'primer-rebote-blue', collection: 'primer-rebote', color: 'blue', name_es: 'Primer Rebote', name_en: 'First Bounce', sort_order: 1, stickers: [{ name: 'popcorn', ar: 0.833 }, { name: 'idea', ar: 0.81 }], bytes: 1150000, version: 1 },
  { id: 'primer-rebote-red', collection: 'primer-rebote', color: 'red', name_es: 'Primer Rebote', name_en: 'First Bounce', sort_order: 2, stickers: [{ name: 'idea', ar: 0.81 }], bytes: 1000000, version: 1 },
];
const mockDescargar = jest.fn();
const mockQuitarPack = jest.fn();
jest.mock('@/hooks/use-sticker-packs', () => ({
  useStickerPacks: () => ({ data: { packs: mockPacks, sinRed: false }, isLoading: false, isError: false, refetch: jest.fn() }),
  useMyStickerPacks: () => ({ data: ['primer-rebote-blue'] }),
  useStickerPackActions: () => ({
    descargar: { mutate: mockDescargar, isPending: false, isError: false, variables: undefined },
    quitar: { mutate: mockQuitarPack, isPending: false, isError: false, variables: undefined },
  }),
  useStickerSources: () => mockFuentes,
}));
const mockFuentes = new Map([['primer-rebote-blue/popcorn', 'data:image/png;base64,AZUL']]);

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
  mockLienzos = [];
  usePreferencesStore.setState({ readingModes: {} });
  mockPantallaCompleta.mockReset();
  mockAbrirCopia.mockReset();
  mockCrearFragmento.mockReset();
  mockFichas = [];
  mockPlantillasDeFicha = [];
  mockMiembros = [];
  mockAvance = [];
  Object.assign(mockVivo, { presentes: [], hay: false, enSesion: false, siguiendo: true, lider: null, yoDirijo: false });
  for (const k of ['empezar', 'unirme', 'salir', 'pasarMando', 'soltarme', 'seguir', 'moverme', 'senalar'] as const) mockVivo[k].mockReset();
  mockAbrirCopia.mockImplementation(async (pieza: { kind: string }, _ruta: string, forma: string, enviar: (m: MensajeAlMotor) => void, posicion?: unknown) => {
    const { posicionGuardada } = jest.requireActual<typeof import('@/lib/library/reader-protocol')>('@/lib/library/reader-protocol');
    enviar({ type: 'openBegin', format: pieza.kind === 'epub' ? 'epub' : 'pdf', size: 1, position: (posicion as never) ?? posicionGuardada(pieza as never), mode: forma as never });
  });
});

it('abre el PDF en la página donde se quedó y muestra que está abriendo', async () => {
  await render(<Lector />);
  expect(mockAbrirCopia).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1' }), 'u1/l1/rayuela.pdf', 'scroll', expect.any(Function), undefined);
  expect(mockEnviados[0]).toEqual({ type: 'openBegin', format: 'pdf', size: 1, position: { page: 120 }, mode: 'scroll' });
  expect(screen.getByText(R.opening)).toBeTruthy();
  await responder({ type: 'opened', total: 340 });
  expect(screen.queryByText(R.opening)).toBeNull();
  expect(screen.getByText('Rayuela')).toBeTruthy();
});

it('desde Mis fragmentos se abre en el lugar del fragmento y no donde se quedó (RF-BH21)', async () => {
  globalThis.setParametrosDeRuta({ id: 'l1', ir: JSON.stringify({ page: 7 }) });
  await render(<Lector />);
  expect(mockEnviados[0]).toEqual(expect.objectContaining({ type: 'openBegin', position: { page: 7 } }));
});

it('un lugar mal formado en la ruta se ignora', async () => {
  globalThis.setParametrosDeRuta({ id: 'l1', ir: '{nada' });
  await render(<Lector />);
  expect(mockEnviados[0]).toEqual(expect.objectContaining({ position: { page: 120 } }));
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
    mockLista = [postit('a1'), postit('quitado', { removed: true }), postit('nota', { kind: 'note' })];
    await render(<Lector />);
    expect(mockEnviados).toContainEqual({
      type: 'annotations',
      items: [{ id: 'a1', kind: 'postit', locator: { page: 3, x: 0.1, y: 0.2, w: 0.24 }, z: 1, locked: false, content: { color: '#F1D35D', text: 'nota a1', size: 1, rot: 0 } }],
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
    expect(mockEnviados).toContainEqual(expect.objectContaining({ type: 'annotations', items: [expect.objectContaining({ content: { color: '#F1D35D', text: 'grande', size: 2, rot: 0 } })] }));
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'select', id: 'a1' });
    await fireEvent.press(screen.getByRole('button', { name: A.styleColor }));
    await fireEvent.press(screen.getByRole('button', { name: A.textBigger }));
    await fireEvent.press(screen.getByRole('button', { name: A.save }));
    expect(mockCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a1' }), expect.objectContaining({ content: { color: '#F1D35D', text: 'grande', size: 2.25 } }));
  });

  it('un post-it se dobla desde la barra y tocarlo doblado lo abre; doblado no se escribe (T290)', async () => {
    mockLista = [postit('a1', { content: { color: '#F1D35D', text: 'oculto', rot: 350 } })];
    const { rerender } = await render(<Lector />);
    expect(mockEnviados).toContainEqual(expect.objectContaining({ type: 'annotations', items: [expect.objectContaining({ content: expect.objectContaining({ rot: 350 }) })] }));
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'select', id: 'a1' });
    await fireEvent.press(screen.getByRole('button', { name: A.fold }));
    expect(mockCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a1' }), expect.objectContaining({ content: expect.objectContaining({ folded: true }) }));
    mockLista = [postit('a1', { content: { color: '#F1D35D', text: 'oculto', folded: true } })];
    await rerender(<Lector />);
    expect(mockEnviados.filter((m) => m.type === 'annotations').at(-1)).toEqual(expect.objectContaining({ items: [expect.objectContaining({ content: expect.objectContaining({ folded: true }) })] }));
    expect(screen.getByRole('button', { name: A.write })).toBeDisabled();
    await responder({ type: 'fold', id: 'a1', folded: false });
    expect(mockCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a1' }), expect.objectContaining({ content: expect.objectContaining({ folded: false }) }));
  });

  it('con dos dedos se gira y se agranda a la vez: un solo cambio con posición y giro (T290)', async () => {
    mockLista = [{ ...postit('s1'), kind: 'sticker', content: { sticker: 'nobi-pink/idea', rot: 0 } }];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'move', id: 's1', locator: { page: 3, x: 0.1, y: 0.2, w: 0.4, ar: 0.81 }, rot: 30 });
    expect(mockCambiar).toHaveBeenCalledTimes(1);
    expect(mockCambiar).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 's1' }),
      expect.objectContaining({ locator: { page: 3, x: 0.1, y: 0.2, w: 0.4, ar: 0.81 }, content: { sticker: 'nobi-pink/idea', rot: 30 } }),
    );
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

  it('guardar fragmento guarda el texto con su libro y su página, y suelta la selección (RF-BH19)', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12, copiable: true });
    await seleccionar('la ciudad era un mapa');
    await fireEvent.press(screen.getByRole('button', { name: A.saveClip }));
    expect(mockCrearFragmento).toHaveBeenCalledWith(
      { clip: expect.objectContaining({ item_id: 'l1', book_title: 'Rayuela', kind: 'text', text: 'la ciudad era un mapa', locator: { page: 3 }, ar: null }) },
      expect.anything(),
    );
    expect(mockEnviados).toContainEqual({ type: 'clearSelection' });
    // Guardado: avisa con un atajo a Mis fragmentos.
    mockCrearFragmento.mock.calls[0][1].onSuccess();
    expect(mockAvisar).toHaveBeenCalledWith(expect.objectContaining({ message: es.library.clips.saved, actionLabel: es.library.clips.see }));
  });

  it('en un libro que no deja copiar, el fragmento guarda solo el lugar', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12, copiable: false });
    await seleccionar('la ciudad');
    await fireEvent.press(screen.getByRole('button', { name: A.saveClip }));
    expect(mockCrearFragmento.mock.calls[0][0].clip).toMatchObject({ kind: 'text', text: null, locator: { page: 3 } });
  });

  it('fragmento de imagen: pone la herramienta en el motor y guarda lo recortado con su página y rectángulo (RF-BH20)', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.clipImage }));
    expect(mockEnviados).toContainEqual({ type: 'clipTool', on: true });
    expect(screen.getByText(A.clipOn)).toBeTruthy();
    await responder({ type: 'clip', dataUrl: 'data:image/jpeg;base64,AAAA', width: 800, height: 400, page: 2, rect: { x: 0.1, y: 0.2, w: 0.5, h: 0.25 } });
    expect(mockCrearFragmento).toHaveBeenCalledWith(
      {
        clip: expect.objectContaining({ kind: 'image', text: null, ar: 0.5, locator: expect.objectContaining({ page: 2, x: 0.1, y: 0.2, w: 0.5, h: 0.25 }) }),
        dataUrl: 'data:image/jpeg;base64,AAAA',
      },
      expect.anything(),
    );
    expect(mockEnviados).toContainEqual({ type: 'clipTool', on: false });
    expect(screen.queryByText(A.clipOn)).toBeNull();
  });

  it('si en un EPUB no había imagen bajo el rectángulo, lo dice y la herramienta sigue puesta', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.clipImage }));
    await responder({ type: 'clip', error: 'empty' });
    expect(mockAvisar).toHaveBeenCalledWith({ message: es.library.clips.emptyImage });
    expect(mockCrearFragmento).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: A.clipCancel })).toBeTruthy();
  });

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

  it('quien marcó que lee inglés va a Merriam-Webster con una palabra en inglés (T339)', async () => {
    usePreferencesStore.setState({ readingLanguages: ['en'] });
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await seleccionar('book', { cfi: 'epubcfi(/6/4!/4/2,/1:3,/1:7)', fraction: 0.1 });
    await fireEvent.press(screen.getByRole('button', { name: A.define }));
    expect(screen.getByRole('button', { name: A.defineMerriam })).toBeTruthy();
    usePreferencesStore.setState({ readingLanguages: [] });
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

  it('en la hoja Lectura de un PDF, el tamaño de letra (acercar, desde 100 %) sin elegir letra (T340)', async () => {
    usePreferencesStore.setState({ readerText: { tamano: 80, letra: 'serif' } });
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: R.mode }));
    expect(screen.getByText(R.textPdfHint)).toBeTruthy();
    expect(screen.queryByText(R.fonts.serif)).toBeNull();
    // 80 % de un EPUB es la página entera en un PDF: no baja de 100 %.
    expect(screen.getByText(R.textSizeValue(100))).toBeTruthy();
    expect(screen.getByRole('button', { name: R.textSmaller })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: R.textBigger }));
    expect(usePreferencesStore.getState().readerText.tamano).toBe(110);
    expect(mockEnviados.at(-1)).toEqual({ type: 'text', size: 110, font: 'serif' });
  });

  it('con letra grande, la barra dice la pantalla de la página sin cambiar el total (T340)', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 340 });
    await responder({ type: 'position', page: 12, total: 340, fraction: 12 / 340, screen: 2, screens: 3 });
    expect(screen.getByText(`${es.library.progressPage(12, 340)} · 2/3`)).toBeTruthy();
    await responder({ type: 'position', page: 13, total: 340, fraction: 13 / 340 });
    expect(screen.getByText(es.library.progressPage(13, 340))).toBeTruthy();
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
    // El primero es el rosa incluido; abajo, el del pack azul descargado.
    await fireEvent.press(screen.getAllByRole('button', { name: S.pick(S.names.popcorn) })[0]);
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

  it('uno de un pack descargado se pega con su id de la tienda y el motor lo recibe con su imagen (T338)', async () => {
    const { rerender } = await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.sticker }));
    expect(screen.getByText(S.packName('Primer Rebote', es.colors.blue))).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: S.pick(S.names.popcorn) })[1]);
    await responder({ type: 'place', locator: { page: 2, x: 0.2, y: 0.2, w: 0.3, ar: 0.833 } });
    const nuevo = mockCrear.mock.calls[0][0] as { id: string; content: Record<string, unknown> };
    expect(nuevo.content).toEqual({ sticker: 'primer-rebote-blue/popcorn', rot: 0 });
    mockLista = [sticker(nuevo.id, { content: nuevo.content })];
    await rerender(<Lector />);
    expect(mockEnviados.filter((m) => m.type === 'annotations').at(-1)).toEqual(
      expect.objectContaining({ items: [expect.objectContaining({ content: expect.objectContaining({ sticker: 'primer-rebote-blue/popcorn', src: 'data:image/png;base64,AZUL', label: S.names.popcorn }) })] }),
    );
  });

  it('la tienda: cada pack con su color y cuántos trae; se descarga y se quita (T338)', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.sticker }));
    await fireEvent.press(screen.getByText(S.store));
    const rojo = S.packName('Primer Rebote', es.colors.red);
    const azul = S.packName('Primer Rebote', es.colors.blue);
    expect(screen.getByText(S.packMeta(1, '977 KB'))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: S.downloadA11y(rojo) }));
    expect(mockDescargar).toHaveBeenCalledWith(expect.objectContaining({ id: 'primer-rebote-red' }));
    expect(screen.getByText(S.downloaded)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: S.removePackA11y(azul) }));
    expect(mockQuitarPack).toHaveBeenCalledWith(expect.objectContaining({ id: 'primer-rebote-blue' }));
    // Al tocar la tarjeta se ven todas sus caras; tocar una la muestra en grande y se pasa a la siguiente.
    await fireEvent.press(screen.getByRole('button', { name: S.openPack(azul) }));
    await fireEvent.press(screen.getByRole('button', { name: S.previewA11y(S.names.popcorn) }));
    expect(screen.getByLabelText(S.names.popcorn)).toBeTruthy();
    expect(screen.getByText(S.previewCount(1, 2))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: S.next }));
    expect(screen.getByText(S.previewCount(2, 2))).toBeTruthy();
    expect(screen.getByLabelText(S.names.idea)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: S.closePreview }));
    expect(screen.queryByText(S.previewCount(2, 2))).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: S.backToStore }));
    expect(screen.getByRole('button', { name: S.downloadA11y(rojo) })).toBeTruthy();
  });

  it('la charola vacía explica para qué es', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.sticker }));
    await fireEvent.press(screen.getByText(S.removed(0)));
    expect(screen.getByText(S.removedEmpty)).toBeTruthy();
  });
});

describe('separadores (spec 13c, RF-BH15; T290)', () => {
  const sep = (id: string, cambio: Record<string, unknown> = {}) => ({
    id,
    item_id: 'l1',
    owner_id: 'u1',
    kind: 'bookmark',
    locator: { page: 50, x: 0, y: 0, w: 0 },
    content: { edge: 'top', pos: 0.3, color: '#E24947', label: 'Clave' },
    z: 1,
    removed: false,
    locked: false,
    created_at: 'c',
    updated_at: 'u',
    ...cambio,
  });

  it('poner uno lo deja en la página que se lee, a la derecha y sin encimarse, y abre su hoja', async () => {
    mockLista = [sep('s0', { locator: { page: 12, x: 0, y: 0, w: 0 }, content: { edge: 'right', pos: 0.1, color: '#E24947', label: '' } })];
    const { rerender } = await render(<Lector />);
    await responder({ type: 'opened', total: 340 });
    await responder({ type: 'position', page: 12, total: 340, fraction: 12 / 340 });
    await fireEvent.press(screen.getByRole('button', { name: A.bookmark }));
    const nuevo = mockCrear.mock.calls[0][0] as { id: string; locator: unknown; content: Record<string, unknown> };
    expect(nuevo).toMatchObject({ kind: 'bookmark', locator: { page: 12 }, content: { edge: 'right', pos: 0.2, color: '#E24947', label: '' } });
    expect(mockEnviados).toContainEqual({ type: 'select', id: nuevo.id });
    mockLista = [...mockLista, sep(nuevo.id, { locator: nuevo.locator, content: nuevo.content })];
    await rerender(<Lector />);
    await fireEvent.changeText(screen.getByLabelText(A.bookmarkWord), 'Capítulo tres y más');
    await fireEvent.press(screen.getByText(A.edges.top));
    await fireEvent.press(screen.getByRole('button', { name: A.save }));
    expect(mockCambiar).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: nuevo.id }),
      expect.objectContaining({ content: { edge: 'top', pos: 0.2, color: '#E24947', label: 'Capítulo tre' } }),
    );
  });

  it('se manda al motor con su borde, altura y palabra; tocar su pestaña abre su hoja y se puede quitar', async () => {
    mockLista = [sep('s1')];
    await render(<Lector />);
    expect(mockEnviados).toContainEqual(expect.objectContaining({ type: 'annotations', items: [expect.objectContaining({ kind: 'bookmark', content: expect.objectContaining({ edge: 'top', pos: 0.3, label: 'Clave' }) })] }));
    await responder({ type: 'opened', total: 340 });
    await responder({ type: 'select', id: 's1' });
    expect(screen.getByDisplayValue('Clave')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: A.removeBookmark }));
    expect(mockBorrar).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });

  it('en el canto se ven todos y tocar uno lleva a su página', async () => {
    mockLista = [sep('s1'), sep('s2', { locator: { page: 200, x: 0, y: 0, w: 0 }, content: { edge: 'right', pos: 0.5, color: '#4087EE', label: '' } })];
    await render(<Lector />);
    await responder({ type: 'opened', total: 340 });
    await responder({ type: 'position', page: 1, total: 340, fraction: 0 });
    await fireEvent.press(screen.getByRole('button', { name: A.bookmarkGoTo('Clave', es.library.progressPage(50, 340)) }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'goTo', page: 50 });
    expect(screen.getByRole('button', { name: A.bookmarkGoTo('', es.library.progressPage(200, 340)) })).toBeTruthy();
  });
});

describe('stickers propios (spec 13c, RF-BH13; T335)', () => {
  const S = es.library.stickers;
  beforeEach(() => {
    mockMisStickers = [];
    mockImagenesPropias.clear();
    mockFuentesPropias.clear();
    mockCrearSticker.mockReset();
    mockBorrarSticker.mockReset();
  });

  it('crear: elegir imagen, el motor le pone el margen elegido, se guarda y queda listo para pegar', async () => {
    mockCrearSticker.mockImplementation((_v: unknown, o: { onSuccess: () => void }) => o.onSuccess());
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.sticker }));
    await fireEvent.press(screen.getByRole('button', { name: S.createSticker }));
    await fireEvent.press(screen.getByRole('button', { name: S.fromFile }));
    const pedido = mockEnviados.filter((m) => m.type === 'outline').at(-1) as { id: string; src: string; margin: number };
    expect(pedido).toMatchObject({ src: 'data:image/png;base64,ORIGINAL', margin: 12 });
    await responder({ type: 'outline', id: pedido.id, dataUrl: 'data:image/png;base64,HECHO', width: 424, height: 324 });
    expect(screen.getByLabelText(S.createPreview)).toBeTruthy();
    // Otro margen: se vuelve a pedir.
    await fireEvent.press(screen.getByText(S.margins.thick));
    const otro = mockEnviados.filter((m) => m.type === 'outline').at(-1) as { id: string; margin: number };
    expect(otro.margin).toBe(20);
    await responder({ type: 'outline', id: otro.id, dataUrl: 'data:image/png;base64,GRUESO', width: 440, height: 340 });
    await fireEvent.press(screen.getByRole('button', { name: S.createSave }));
    const [datos] = mockCrearSticker.mock.calls[0] as [{ id: string; dataUrl: string; ar: number; margin: number }];
    expect(datos).toMatchObject({ dataUrl: 'data:image/png;base64,GRUESO', ar: 0.773, margin: 20 });
    expect(mockEnviados.at(-1)).toEqual({ type: 'tool', tool: 'sticker', ar: 0.773 });
    await responder({ type: 'place', locator: { page: 1, x: 0.1, y: 0.1, w: 0.3, ar: 0.773 } });
    expect(mockCrear).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'sticker', content: { sticker: `mios/${datos.id}`, rot: 0 } }));
  });

  it('si el motor no puede, lo dice', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.sticker }));
    await fireEvent.press(screen.getByRole('button', { name: S.createSticker }));
    await fireEvent.press(screen.getByRole('button', { name: S.fromFile }));
    const pedido = mockEnviados.filter((m) => m.type === 'outline').at(-1) as { id: string };
    await responder({ type: 'outline', id: pedido.id, error: true });
    expect(screen.getByText(S.createFailed)).toBeTruthy();
  });

  it('se ven en Mis stickers, se pegan con su imagen en el lector y se borran con confirmación', async () => {
    mockMisStickers = [{ id: 'p1', owner_id: 'u1', path: 'u1/stickers/p1.png', ar: 0.8, margin: 12, created_at: 'c' }];
    mockImagenesPropias.set('p1', 'file:///p1.png');
    mockFuentesPropias.set('mios/p1', 'data:image/png;base64,P1');
    mockLista = [{ id: 'k1', item_id: 'l1', owner_id: 'u1', kind: 'sticker', locator: { page: 1, x: 0, y: 0, w: 0.3, ar: 0.8 }, content: { sticker: 'mios/p1', rot: 0 }, z: 1, removed: false, locked: false, created_at: 'c', updated_at: 'u' }];
    await render(<Lector />);
    expect(mockEnviados).toContainEqual(expect.objectContaining({ type: 'annotations', items: [expect.objectContaining({ content: expect.objectContaining({ sticker: 'mios/p1', src: 'data:image/png;base64,P1' }) })] }));
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.sticker }));
    await fireEvent.press(screen.getByRole('button', { name: S.pick(S.mineName) }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'tool', tool: 'sticker', ar: 0.8 });
    await fireEvent.press(screen.getByRole('button', { name: A.cancelTool }));
    await fireEvent.press(screen.getByRole('button', { name: A.sticker }));
    await fireEvent.press(screen.getByRole('button', { name: S.removeMine }));
    expect(mockConfirmar).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
    expect(mockBorrarSticker).toHaveBeenCalledWith('p1');
  });
});

describe('lápiz y dedo (spec 13c, RF-BH11; T291)', () => {
  const { LAPIZ_POR_OMISION } = jest.requireActual<typeof import('@/lib/library/ink')>('@/lib/library/ink');
  const strokes = [{ t: 'pen' as const, c: '#1A1A1A', s: 0.01, p: [0.1, 0.2, 1, 0.3, 0.4, 1] }];
  const ultimoPen = () => [...mockEnviados].reverse().find((m) => m.type === 'pen');
  beforeEach(() => usePreferencesStore.setState({ readerPen: LAPIZ_POR_OMISION, readerTheme: { tema: 'light', propio: { pagina: '#F4ECD8', letra: '#5B4636' } } }));

  it('Dibujar pone el lápiz en el motor con la tinta del tema y cambia la barra; Listo lo quita', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    expect(ultimoPen()).toBeUndefined();
    await fireEvent.press(screen.getByRole('button', { name: A.pen }));
    expect(ultimoPen()).toMatchObject({ type: 'pen', on: true, tool: 'pen', size: 3, penOnly: false });
    expect(screen.getByRole('button', { name: A.penTools.eraser })).toBeTruthy();
    expect(screen.getByText(A.penOn)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: A.penTools.marker }));
    expect(ultimoPen()).toMatchObject({ tool: 'marker', color: '#F1D35D', size: 16 });
    expect(usePreferencesStore.getState().readerPen.tool).toBe('marker');
    await fireEvent.press(screen.getByRole('button', { name: A.penDone }));
    expect(ultimoPen()).toEqual({ type: 'pen', on: false });
    expect(screen.getByRole('button', { name: A.postit })).toBeTruthy();
  });

  it('color, grosor y "solo lápiz" se eligen en su hoja y van al motor', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: A.pen }));
    await fireEvent.press(screen.getByRole('button', { name: A.penSettings }));
    await fireEvent.press(screen.getByRole('button', { name: 'Coral' }));
    await fireEvent.press(screen.getByRole('tab', { name: A.penSizes[2] }));
    await fireEvent.press(screen.getByRole('switch', { name: A.penOnly }));
    expect(ultimoPen()).toMatchObject({ tool: 'pen', color: '#F68675', size: 5, penOnly: true });
    expect(screen.getByText(A.penOnlyOn)).toBeTruthy();
  });

  it('un dibujo del motor se guarda como anotación; el borrador lo cambia o lo quita; deshacer va primero al motor', async () => {
    const dibujo = { id: 'd1', item_id: 'l1', owner_id: 'u1', kind: 'ink', locator: { page: 2, x: 0.1, y: 0.1, w: 0.5, ar: 0.4 }, content: { strokes }, z: 1, removed: false, locked: false, created_at: 'c', updated_at: 'u' };
    mockLista = [dibujo];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    // Lo dibujado se manda al motor con sus trazos.
    const pintados = [...mockEnviados].reverse().find((m) => m.type === 'annotations');
    expect(pintados).toMatchObject({ items: [expect.objectContaining({ id: 'd1', kind: 'ink', content: expect.objectContaining({ strokes }) })] });
    await responder({ type: 'ink', locator: { page: 3, x: 0.2, y: 0.3, w: 0.4, ar: 0.5 }, strokes });
    expect(mockCrear).toHaveBeenCalledWith(expect.objectContaining({ kind: 'ink', item_id: 'l1', locator: { page: 3, x: 0.2, y: 0.3, w: 0.4, ar: 0.5 }, content: { strokes }, z: 2 }));
    await responder({ type: 'inkChange', id: 'd1', strokes: [strokes[0]] });
    expect(mockCambiar).toHaveBeenCalledWith(dibujo, expect.objectContaining({ content: { strokes: [strokes[0]] } }));
    await responder({ type: 'remove', id: 'd1' });
    expect(mockBorrar).toHaveBeenCalledWith(dibujo);
    await fireEvent.press(screen.getByRole('button', { name: A.pen }));
    await fireEvent.press(screen.getByRole('button', { name: A.undo }));
    expect(mockEnviados).toContainEqual({ type: 'penUndo' });
    expect(mockDeshacer).not.toHaveBeenCalled();
    await responder({ type: 'undo' });
    expect(mockDeshacer).toHaveBeenCalled();
  });

  it('lo dibujado dentro de un post-it se guarda en él y se manda al motor con el post-it (T291b)', async () => {
    const nota = { id: 'p1', item_id: 'l1', owner_id: 'u1', kind: 'postit', locator: { page: 2, x: 0.1, y: 0.1, w: 0.24 }, content: { color: '#F1D35D', text: 'Ojo', rot: 15 }, z: 1, removed: false, locked: false, created_at: 'c', updated_at: 'u' };
    mockLista = [nota];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'inkChange', id: 'p1', strokes });
    expect(mockCambiar).toHaveBeenCalledWith(nota, expect.objectContaining({ content: { color: '#F1D35D', text: 'Ojo', rot: 15, strokes } }));
    // Borrado todo su dibujo, el post-it se queda.
    await responder({ type: 'inkChange', id: 'p1', strokes: [] });
    expect(mockCambiar).toHaveBeenLastCalledWith(nota, expect.objectContaining({ content: expect.objectContaining({ strokes: [] }) }));
    expect(mockBorrar).not.toHaveBeenCalled();
  });

  it('el post-it con dibujo lo lleva al motor; uno bloqueado no recibe trazos', async () => {
    const nota = { id: 'p1', item_id: 'l1', owner_id: 'u1', kind: 'postit', locator: { page: 2, x: 0.1, y: 0.1, w: 0.24 }, content: { color: '#F1D35D', text: '', strokes }, z: 1, removed: false, locked: true, created_at: 'c', updated_at: 'u' };
    mockLista = [nota];
    await render(<Lector />);
    const pintados = [...mockEnviados].reverse().find((m) => m.type === 'annotations');
    expect(pintados).toMatchObject({ items: [expect.objectContaining({ id: 'p1', content: expect.objectContaining({ strokes }) })] });
    await responder({ type: 'inkChange', id: 'p1', strokes: [] });
    expect(mockCambiar).not.toHaveBeenCalled();
  });

  it('en el libro real no se dibuja', async () => {
    usePreferencesStore.setState({ readingModes: { l1: 'book' } });
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'tap' });
    expect(screen.getByRole('button', { name: A.pen })).toBeDisabled();
  });
});

describe('fichas en el libro (spec 13d, RF-BF4, RF-BF6; T294)', () => {
  const romance = { id: 'r', owner_id: 'u1', name: 'Romance', fields: [{ id: 'stars', type: 'scale', label: 'Estrellas', max: 5, symbol: 'heart' }], look: {}, created_at: 'c', updated_at: 'u' };
  const rapida = { ...romance, id: 'q', name: 'Reseña rápida' };
  const router = (globalThis as unknown as { mockRouter: { push: jest.Mock } }).mockRouter;
  const O = es.library.cards.offer;

  it('al terminar un libro sin ficha la ofrece; con un solo diseño, "Llenar ficha" lo abre', async () => {
    mockPlantillasDeFicha = [romance];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    expect(screen.queryByText(O.body)).toBeNull();
    await responder({ type: 'position', page: 12, total: 12, fraction: 1 });
    expect(screen.getByText(O.title('Rayuela'))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: O.fill }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/(app)/card/[itemId]', params: { itemId: 'l1', plantilla: 'r' } });
    expect(screen.queryByText(O.body)).toBeNull();
  });

  it('con varios diseños pregunta cuál; "Ahora no" la cierra', async () => {
    mockPlantillasDeFicha = [romance, rapida];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'position', page: 12, total: 12, fraction: 1 });
    await fireEvent.press(screen.getByRole('button', { name: O.fill }));
    await fireEvent.press(screen.getByRole('button', { name: 'Reseña rápida' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/(app)/card/[itemId]', params: { itemId: 'l1', plantilla: 'q' } });
  });

  it('una ficha en la contraportada asoma al terminar y tocarla la abre; no se ofrece otra', async () => {
    mockPlantillasDeFicha = [romance];
    mockFichas = [{ id: 'f1', item_id: 'l1', template_id: 'r', owner_id: 'u1', values: { stars: 4 }, placement: 'back', created_at: 'c', updated_at: 'u' }];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'position', page: 5, total: 12, fraction: 5 / 12 });
    expect(screen.queryByRole('button', { name: O.peek('Romance') })).toBeNull();
    await responder({ type: 'position', page: 12, total: 12, fraction: 1 });
    expect(screen.queryByText(O.body)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: O.peek('Romance') }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/(app)/card/[itemId]', params: { itemId: 'l1', plantilla: 'r' } });
  });

  it('una en la portada asoma al empezar', async () => {
    mockPlantillasDeFicha = [romance];
    mockFichas = [{ id: 'f1', item_id: 'l1', template_id: 'r', owner_id: 'u1', values: {}, placement: 'front', created_at: 'c', updated_at: 'u' }];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'position', page: 1, total: 12, fraction: 1 / 12 });
    expect(screen.getByRole('button', { name: O.peek('Romance') })).toBeTruthy();
  });
});

describe('club de lectura: anotar juntos (spec 13f, RF-BC6 – RF-BC7; T307)', () => {
  const T = es.library.annotations.club;
  const enClub = (a: Record<string, unknown>) => ({ ...a, club_id: 'c1' });
  const postit = (id: string, owner_id: string, extra: Record<string, unknown> = {}) =>
    enClub({ id, item_id: owner_id === 'u1' ? 'l1' : 'otra', owner_id, kind: 'postit', locator: { page: 3, x: 0.1, y: 0.2, w: 0.24 }, content: { color: '#F1D35D', text: id }, z: 1, removed: false, locked: false, created_at: 'c', updated_at: 'u', ...extra });
  const ultimasAnotaciones = () => [...mockEnviados].reverse().find((m) => m.type === 'annotations') as { items: { id: string; content: Record<string, unknown> }[] } | undefined;
  beforeEach(() => {
    mockPieza = { ...pdf, club_id: 'c1' };
    mockMiembros = [
      { club_id: 'c1', person_id: 'u1', status: 'accepted', profile: { display_name: 'Areli', username: 'areli' } },
      { club_id: 'c1', person_id: 'u-ana', status: 'accepted', profile: { display_name: 'Ana Torres', username: 'ana' } },
    ];
    mockEditorClub.length = 0;
  });

  it('en una copia de club lo nuevo es del club; "Solo para mí" en Ajustes lo cambia', async () => {
    await render(<Lector />);
    expect(mockEditorClub.at(-1)).toEqual({ clubId: 'c1', compartir: true });
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: R.mode }));
    await fireEvent.press(screen.getByRole('tab', { name: T.forMe }));
    expect(mockEditorClub.at(-1)).toEqual({ clubId: 'c1', compartir: false });
  });

  it('lo de otro miembro lleva su inicial y su color; ocultar la capa del club lo quita', async () => {
    mockLista = [postit('mio', 'u1'), postit('de-ana', 'u-ana')];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    const items = ultimasAnotaciones()?.items ?? [];
    expect(items.find((x) => x.id === 'de-ana')?.content.author).toEqual({ initial: 'A', color: '#E24947', name: 'Ana Torres' });
    expect(items.find((x) => x.id === 'mio')?.content.author).toBeUndefined();
    await fireEvent.press(screen.getByRole('button', { name: R.mode }));
    await fireEvent.press(screen.getByRole('switch', { name: T.showClub }));
    expect((ultimasAnotaciones()?.items ?? []).map((x) => x.id)).toEqual(['mio']);
  });

  it('elegir lo de Ana dice que es suyo y no ofrece "Solo para mí"; lo mío sí, y lo pasa a privado', async () => {
    mockLista = [postit('mio', 'u1'), postit('de-ana', 'u-ana', { updated_by: 'u1' })];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await responder({ type: 'select', id: 'de-ana' });
    expect(screen.getByText(T.by('Ana Torres'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: T.onlyMe })).toBeNull();
    await responder({ type: 'select', id: 'mio' });
    await fireEvent.press(screen.getByRole('button', { name: T.onlyMe }));
    expect(mockCambiar).toHaveBeenCalledWith(expect.objectContaining({ id: 'mio' }), expect.objectContaining({ club_id: null }));
  });
});

describe('club de lectura: por dónde va cada quien (spec 13f, RF-BC9; T308)', () => {
  it('en la barra de avance sale la inicial de cada miembro que lo deja ver, no la mía', async () => {
    mockPieza = { ...pdf, club_id: 'c1' };
    mockMiembros = [
      { club_id: 'c1', person_id: 'u1', status: 'accepted', profile: { display_name: 'Areli', username: 'areli' } },
      { club_id: 'c1', person_id: 'u-ana', status: 'accepted', profile: { display_name: 'Ana Torres', username: 'ana' } },
    ];
    mockAvance = [
      { person_id: 'u1', progress: 0.2, page: 3, cfi: null, updated_at: 'u' },
      { person_id: 'u-ana', progress: 0.4, page: 5, cfi: null, updated_at: 'u' },
    ];
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    expect(screen.getByLabelText('Ana Torres')).toBeTruthy();
    expect(screen.queryByLabelText('Areli')).toBeNull();
  });
});


describe('club de lectura: leer en vivo (spec 13f, RF-BC10 – RF-BC14; T309)', () => {
  const L = es.library.clubs.live;
  const ana = { id: 'u-ana', nombre: 'Ana Torres', desde: 1, enSesion: true, dirige: true };
  const yo = { id: 'u1', nombre: 'Areli', desde: 2, enSesion: true, dirige: false };
  beforeEach(() => {
    mockPieza = { ...pdf, club_id: 'c1' };
    mockMiembros = [
      { club_id: 'c1', person_id: 'u1', status: 'accepted', profile: { display_name: 'Areli', username: 'areli' } },
      { club_id: 'c1', person_id: 'u-ana', status: 'accepted', profile: { display_name: 'Ana Torres', username: 'ana' } },
    ];
  });

  it('en una copia de club, "Leer en vivo" empieza la sesión', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    await fireEvent.press(screen.getByRole('button', { name: L.start }));
    expect(mockVivo.empezar).toHaveBeenCalled();
  });

  it('sin club no hay botón de leer en vivo', async () => {
    mockPieza = pdf;
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    expect(screen.queryByRole('button', { name: L.start })).toBeNull();
  });

  it('si Ana lee en vivo, invita a unirme; dentro, la sigo y puedo leer por mi cuenta', async () => {
    Object.assign(mockVivo, { presentes: [ana, { ...yo, enSesion: false }], hay: true, lider: ana });
    const { rerender } = await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    expect(screen.queryByRole('button', { name: L.start })).toBeNull();
    expect(screen.getByText(L.someoneLive('Ana Torres'))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: L.join }));
    expect(mockVivo.unirme).toHaveBeenCalled();

    Object.assign(mockVivo, { presentes: [ana, yo], enSesion: true });
    await rerender(<Lector />);
    expect(screen.getByText(L.leads('Ana Torres'))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: L.own }));
    expect(mockVivo.soltarme).toHaveBeenCalled();
    // Lo que manda quien dirige mueve el libro y destella lo señalado.
    await act(async () => mockVivoArgs?.alMover({ page: 9 }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'goTo', page: 9 });
    await act(async () => mockVivoArgs?.alSenalar({ page: 3 }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'flash', locator: { page: 3 } });
  });

  it('si dirijo, mi lugar va a los demás y puedo señalar lo que seleccioné', async () => {
    Object.assign(mockVivo, { presentes: [{ ...yo, dirige: true, desde: 1 }, { ...ana, dirige: false, desde: 2 }], hay: true, enSesion: true, yoDirijo: true, lider: { ...yo, dirige: true } });
    await render(<Lector />);
    await responder({ type: 'opened', total: 12 });
    expect(screen.getByText(L.youLead)).toBeTruthy();
    await responder({ type: 'position', page: 7, total: 12, fraction: 7 / 12 });
    expect(mockVivo.moverme).toHaveBeenLastCalledWith({ page: 7 });
    const locator = { page: 3, y: 0.4, rects: [{ page: 3, x: 0.1, y: 0.4, w: 0.5, h: 0.02 }] };
    await responder({ type: 'selection', text: 'la Maga', locator });
    await fireEvent.press(screen.getByRole('button', { name: L.signal }));
    expect(mockVivo.senalar).toHaveBeenCalledWith(locator);
    await fireEvent.press(screen.getByRole('button', { name: L.handOff }));
    await fireEvent.press(screen.getByText('Ana Torres'));
    expect(mockVivo.pasarMando).toHaveBeenCalledWith('u-ana');
  });

  it('al entrar desde el aviso (vivo=1) me une sola una vez', async () => {
    globalThis.setParametrosDeRuta({ id: 'l1', vivo: '1' });
    Object.assign(mockVivo, { presentes: [ana], hay: true, lider: ana });
    const { rerender } = await render(<Lector />);
    await rerender(<Lector />);
    expect(mockVivo.unirme).toHaveBeenCalledTimes(1);
  });
});

describe('un Journal se lee como un libro (13i; T364)', () => {
  const texto = (id: string, extra: Record<string, unknown> = {}) => ({ id, type: 'textbox', page: 1, x: 0.1, y: 0.1, w: 0.4, ar: 0.3, rot: 0, z: 1, locked: false, group: null, style: {}, content: { text: id }, ...extra });
  const lienzo = (id: string, created_at: string, extra: Record<string, unknown> = {}) => ({ id, context: 'journal', face: null, item_id: 'j1', title: '', orientation: 'portrait', doc: { pages: 1, elements: [texto(`t-${id}`)] }, version: 1, created_at, updated_at: created_at, ...extra });
  const journal = { id: 'j1', kind: 'journal', family: 'creation', title: 'Mi año', file_path: null, pdf_path: null, last_position: null, progress: 0, page_count: 120, journal: { orientation: 'portrait', binding: 'hardcover', material: 'linen', color: '#3B2A20', back: null, edges: '#F7F5EF', accent: '#B9B9B9' } };

  beforeEach(() => {
    globalThis.setParametrosDeRuta({ id: 'j1' });
    mockPieza = journal;
    mockLienzos = [lienzo('p2', '2026-10-22T10:00:00Z'), lienzo('p1', '2026-10-21T10:00:00Z'), lienzo('tapa', '2026-10-20T10:00:00Z', { context: 'cover', face: 'front' })];
  });

  it('abre con la portada, sus páginas y la contraportada, sin archivo y para leer (no para componer)', async () => {
    await render(<Lector />);
    expect(mockAbrirCopia).not.toHaveBeenCalled();
    // Portada · guarda · 2 páginas · guarda · contraportada (T367).
    expect(mockEnviados.find((m) => m.type === 'openCanvas')).toEqual({ type: 'openCanvas', orientation: 'portrait', pages: 6, mode: 'scroll', canvas: false, position: undefined });
    await responder({ type: 'opened', total: 6 });
    const base = mockEnviados.find((m) => m.type === 'baseLayer');
    expect(base && 'items' in base ? base.items.map((a) => [a.id, a.locator.page, a.locked]) : null).toEqual([
      ['t-tapa', 1, true],
      ['t-p1', 3, true],
      ['t-p2', 4, true],
    ]);
    const tapa = { color: '#3B2A20', material: 'linen' };
    const guarda = { color: '#EDE3CF', material: 'parchment' };
    expect(mockEnviados).toContainEqual({ type: 'canvasBackground', color: null, pages: { '1': tapa, '2': guarda, '5': guarda, '6': tapa } });
    expect(screen.queryByText(R.noFile)).toBeNull();
  });

  it('"Editar" lleva a editarlo, y "Páginas" lo ve en miniaturas: tocar una va a esa hoja', async () => {
    await render(<Lector />);
    await responder({ type: 'opened', total: 6 });
    await fireEvent.press(screen.getByRole('button', { name: es.library.journal.edit }));
    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/journal/[id]', params: { id: 'j1' } });
    await fireEvent.press(screen.getByRole('button', { name: R.mode }));
    await fireEvent.press(screen.getByRole('tab', { name: R.modePages }));
    await fireEvent.press(screen.getByRole('button', { name: es.library.journal.pageN(2) }));
    expect(mockEnviados.at(-1)).toEqual({ type: 'goTo', page: 4 });
    expect(screen.queryByRole('button', { name: es.library.journal.pageN(2) })).toBeNull();
  });
});
