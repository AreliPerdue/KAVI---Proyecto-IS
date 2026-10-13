/**
 * Biblioteca en desarrollo (spec 13 §4, T276): avisa que está en construcción, muestra el espacio
 * usado (B2) y las piezas o su estado vacío.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { es } from '@/i18n/es';
import { usePreferencesStore } from '@/store/preferences-store';

const L = es.library;
const MB = 1024 * 1024;
let mockPiezas: Record<string, unknown>;
let mockEspacio: Record<string, unknown>;

const mockImportar = { mutate: jest.fn(), isPending: false, isError: false, error: null as Error | null };
const mockSnackbar = jest.fn();
const mockConfirm = jest.fn();
const mockEliminar = { mutate: jest.fn() };
const mockCategorizar = { mutate: jest.fn() };
const mockActualizar = { mutate: jest.fn(), isError: false };
const mockElegir = jest.fn();
const mockLeer = jest.fn();

jest.mock('@/hooks/use-library', () => ({
  useLibraryItems: () => mockPiezas,
  useLibraryUsage: () => mockEspacio,
  useLibraryFileUrl: () => ({ data: undefined }),
  useImportBook: () => mockImportar,
  useRemoveLibraryItems: () => mockEliminar,
  useSetLibraryCategory: () => mockCategorizar,
  useUpdateLibraryItem: () => mockActualizar,
}));
jest.mock('@/providers', () => ({ useSnackbar: () => mockSnackbar, useConfirm: () => mockConfirm }));
// El generador de portadas tiene su propia prueba; aquí solo estorba (abre un motor web).
jest.mock('@/components/library/pdf-cover-worker', () => ({ PdfCoverWorker: () => null }));
jest.mock('@/lib/library/import', () => ({ elegirLibro: () => mockElegir(), leerLibro: (a: unknown) => mockLeer(a) }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/library').default as () => React.ReactElement;

/** Una pieza con lo mínimo; lo demás, como recién importada. */
const pieza = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: id,
  authors: [],
  cover_path: null,
  cover_color: null,
  page_count: null,
  progress: 0,
  last_position: null,
  ...extra,
});

const ok = (data: unknown) => ({ data, isPending: false, isError: false, isSuccess: true, error: null, refetch: jest.fn() });

beforeEach(() => {
  usePreferencesStore.setState({ libraryView: 'covers' });
  mockPiezas = ok([]);
  mockEspacio = ok({ usedBytes: 0, limitBytes: 500 * MB });
});

it('dice que está en desarrollo y, sin piezas, invita a lo que viene', async () => {
  await render(<Pantalla />);
  expect(screen.getByText(L.inDevelopment)).toBeTruthy();
  expect(screen.getByText(L.emptyTitle)).toBeTruthy();
  expect(screen.getByText(L.usage('0 KB', '500 MB'))).toBeTruthy();
});

it('lista las piezas con su autor y cuenta cuántas son', async () => {
  mockPiezas = ok([pieza('l1', { title: 'Rayuela', authors: ['Julio Cortázar'] }), pieza('l2', { title: 'Ficciones' })]);
  usePreferencesStore.setState({ libraryView: 'list' });
  mockEspacio = ok({ usedBytes: 12 * MB, limitBytes: 500 * MB });
  await render(<Pantalla />);
  expect(screen.getByText('Rayuela')).toBeTruthy();
  expect(screen.getByText('Julio Cortázar')).toBeTruthy();
  expect(screen.getByText(L.pieces(2))).toBeTruthy();
  expect(screen.getByLabelText(L.usageA11y('12 MB', '500 MB', 2))).toBeTruthy();
  expect(screen.queryByText(L.emptyTitle)).toBeNull();
});

it('desde el 80 % avisa que está casi llena', async () => {
  mockEspacio = ok({ usedBytes: 420 * MB, limitBytes: 500 * MB });
  await render(<Pantalla />);
  expect(screen.getByText(L.usageAlmostFull)).toBeTruthy();
});

it('si falla, lo dice y deja reintentar', async () => {
  const refetch = jest.fn();
  mockPiezas = { data: undefined, isPending: false, isError: true, isSuccess: false, error: new Error('Sin conexión.'), refetch };
  await render(<Pantalla />);
  expect(screen.getByText('Sin conexión.')).toBeTruthy();
});

/** La librería (spec 13a, T277): portadas en rejilla o lista, y la vista se recuerda (RF-BL4). */
describe('vistas', () => {
  const libros = () => [
    pieza('l1', { title: 'Rayuela', authors: ['Julio Cortázar'], page_count: 340, progress: 0.35, last_position: { page: 120 } }),
    pieza('l2', { title: 'Ficciones', progress: 0.5, last_position: { cfi: 'epubcfi(/6/4)' } }),
    pieza('l3', { title: 'Pedro Páramo' }),
    pieza('l4', { title: 'Aura', page_count: 60, progress: 1, last_position: { page: 60 } }),
  ];

  /** La rejilla se reparte según el ancho medido: sin medir no hay portadas que pintar. */
  async function medir(ancho: number) {
    await fireEvent(screen.getByTestId('library-list'), 'layout', { nativeEvent: { layout: { width: ancho, height: 800, x: 0, y: 0 } } });
  }

  it('portadas: cada pieza con su título y autor debajo, y el avance para el lector de pantalla', async () => {
    mockPiezas = ok(libros());
    await render(<Pantalla />);
    await medir(360);
    expect(screen.getByLabelText('Rayuela, Julio Cortázar, ' + L.progressPage(120, 340))).toBeTruthy();
    expect(screen.getByLabelText('Ficciones, ' + L.progressPercent(50))).toBeTruthy();
    expect(screen.getByLabelText('Pedro Páramo, ' + L.unread)).toBeTruthy();
    expect(screen.getByRole('tab', { name: L.viewCovers, selected: true })).toBeTruthy();
  });

  it('lista: el avance se ve a la derecha', async () => {
    mockPiezas = ok(libros());
    usePreferencesStore.setState({ libraryView: 'list' });
    await render(<Pantalla />);
    expect(screen.getByText(L.progressPage(120, 340))).toBeTruthy();
    expect(screen.getByText(L.progressPercent(50))).toBeTruthy();
    expect(screen.getByText(L.unread)).toBeTruthy();
    expect(screen.getByText(L.finished)).toBeTruthy();
  });

  it('cambiar de vista la guarda en las preferencias', async () => {
    mockPiezas = ok(libros());
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('tab', { name: L.viewList }));
    expect(usePreferencesStore.getState().libraryView).toBe('list');
    expect(screen.getByText(L.progressPage(120, 340))).toBeTruthy();
  });

  it('sin piezas no ofrece el selector de vista', async () => {
    await render(<Pantalla />);
    expect(screen.queryByRole('tab', { name: L.viewList })).toBeNull();
  });
});

/** Importar un libro (RF-BL11 – RF-BL14, T278): el + elige el archivo y una hoja deja corregir los datos. */
describe('importar', () => {
  const archivo = { name: 'rayuela.pdf', mime: 'application/pdf', bytes: new Uint8Array(2048) };
  const leido = {
    formato: 'pdf',
    archivo,
    datos: { title: 'Rayuela', authors: ['Cortázar, Julio'], genres: [], pageCount: 340, cover: null },
    color: null,
  };

  beforeEach(() => {
    mockImportar.mutate.mockReset();
    mockLeer.mockClear();
    mockImportar.isError = false;
    mockElegir.mockResolvedValue(archivo);
    mockLeer.mockResolvedValue(leido);
  });

  it('propone lo que leyó del archivo y guarda lo corregido', async () => {
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.importBook }));
    expect(await screen.findByText(L.reviewTitle)).toBeTruthy();
    expect(screen.getByText(L.bookMeta('PDF', '2 KB', 340))).toBeTruthy();
    expect(screen.getByDisplayValue('Cortázar, Julio')).toBeTruthy();

    await fireEvent.changeText(screen.getByDisplayValue('Rayuela'), 'Rayuela (edición conmemorativa)');
    await fireEvent.changeText(screen.getByLabelText(L.fieldGenres), 'Novela, Clásicos');
    await fireEvent.press(screen.getByRole('button', { name: L.add }));

    const [datos, opciones] = mockImportar.mutate.mock.calls[0];
    // El autor sin tocar se guarda tal cual: la coma de "Cortázar, Julio" no lo parte en dos.
    expect(datos).toEqual(expect.objectContaining({ title: 'Rayuela (edición conmemorativa)', authors: ['Cortázar, Julio'], genres: ['Novela', 'Clásicos'] }));
    await opciones.onSuccess({ title: 'Rayuela (edición conmemorativa)' });
    expect(mockSnackbar).toHaveBeenCalledWith({ message: L.added('Rayuela (edición conmemorativa)') });
  });

  it('cancelar el selector no hace nada', async () => {
    mockElegir.mockResolvedValue(null);
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.importBook }));
    expect(mockLeer).not.toHaveBeenCalled();
    expect(screen.queryByText(L.reviewTitle)).toBeNull();
  });

  it('un archivo con candado se rechaza con su motivo y no abre la hoja', async () => {
    mockLeer.mockRejectedValue(new Error(es.errors.libraryDrm));
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.importBook }));
    expect(await screen.findByText(es.errors.libraryDrm)).toBeTruthy();
    expect(screen.queryByText(L.reviewTitle)).toBeNull();
  });
});

it('tocar un libro lo abre en el lector (RF-BL17)', async () => {
  mockPiezas = ok([pieza('l1', { title: 'Rayuela', authors: ['Julio Cortázar'] })]);
  usePreferencesStore.setState({ libraryView: 'list' });
  await render(<Pantalla />);
  await fireEvent.press(screen.getByRole('button', { name: /^Rayuela/ }));
  expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/book/[id]', params: { id: 'l1' } });
});

/** Cada pieza (T281): su menú, editar datos, eliminar y la selección múltiple (RF-BL15, RF-BL16). */
describe('menú y selección', () => {
  const libros = () => [
    pieza('l1', { title: 'Rayuela', authors: ['Julio Cortázar'], genres: ['Novela'], category: null }),
    pieza('l2', { title: 'Ficciones', genres: [], category: null }),
    pieza('l3', { title: 'Aura', genres: [], category: 'Escuela' }),
  ];

  beforeEach(() => {
    mockPiezas = ok(libros());
    usePreferencesStore.setState({ libraryView: 'list' });
    for (const m of [mockConfirm, mockEliminar.mutate, mockCategorizar.mutate, mockActualizar.mutate, mockSnackbar]) m.mockReset();
    mockConfirm.mockResolvedValue(true);
  });

  it('el ⋯ abre el menú; Abrir lleva al lector', async () => {
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.actionsFor('Rayuela') }));
    expect(screen.getByText(L.item.edit)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: L.item.open }));
    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/book/[id]', params: { id: 'l1' } });
  });

  it('editar datos: título, categoría con sugerencia y géneros; lo no tocado se queda igual', async () => {
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.actionsFor('Rayuela') }));
    await fireEvent.press(screen.getByRole('button', { name: L.item.edit }));
    await fireEvent.changeText(screen.getByDisplayValue('Rayuela'), '  Rayuela (1963) ');
    await fireEvent.press(screen.getByText(L.item.categorySuggestions[0]));
    await fireEvent.changeText(screen.getByLabelText(L.fieldGenres), 'Novela, Clásicos');
    await fireEvent.press(screen.getByRole('button', { name: L.item.save }));
    expect(mockActualizar.mutate).toHaveBeenCalledWith(
      { id: 'l1', patch: { title: 'Rayuela (1963)', authors: ['Julio Cortázar'], genres: ['Novela', 'Clásicos'], category: L.item.categorySuggestions[0] } },
      expect.anything(),
    );
  });

  it('un título vacío no se guarda', async () => {
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.actionsFor('Rayuela') }));
    await fireEvent.press(screen.getByRole('button', { name: L.item.edit }));
    await fireEvent.changeText(screen.getByDisplayValue('Rayuela'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: L.item.save }));
    expect(screen.getByText(L.item.titleRequired)).toBeTruthy();
    expect(mockActualizar.mutate).not.toHaveBeenCalled();
  });

  it('eliminar pide confirmación, dice qué se borra y avisa al terminar', async () => {
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.actionsFor('Ficciones') }));
    await fireEvent.press(screen.getByRole('button', { name: L.item.delete }));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: L.item.deleteTitle('Ficciones'), message: L.item.deleteMessage, destructive: true }));
    const [ids, opciones] = mockEliminar.mutate.mock.calls[0];
    expect(ids).toEqual(['l2']);
    opciones.onSuccess();
    expect(mockSnackbar).toHaveBeenCalledWith({ message: L.item.deleted('Ficciones') });
  });

  it('si no confirma, no se borra nada', async () => {
    mockConfirm.mockResolvedValue(false);
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.actionsFor('Ficciones') }));
    await fireEvent.press(screen.getByRole('button', { name: L.item.delete }));
    expect(mockEliminar.mutate).not.toHaveBeenCalled();
  });

  it('mantener presionado selecciona; tocar agrega; cambiar la categoría a todas', async () => {
    await render(<Pantalla />);
    await fireEvent(screen.getByRole('button', { name: /^Rayuela/ }), 'longPress');
    expect(screen.getByLabelText(L.selection.count(1))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /^Aura/ }));
    expect(screen.getByLabelText(L.selection.count(2))).toBeTruthy();
    // Mientras se selecciona, tocar no abre el libro y el + se esconde.
    expect(globalThis.mockRouter.push).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: L.importBook })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: L.selection.category }));
    await fireEvent.press(screen.getByText(L.item.categorySuggestions[1]));
    const [datos, opciones] = mockCategorizar.mutate.mock.calls[0];
    expect(datos).toEqual({ ids: ['l1', 'l3'], category: L.item.categorySuggestions[1] });
    opciones.onSuccess();
    expect(mockSnackbar).toHaveBeenCalledWith({ message: L.selection.categorized(L.item.categorySuggestions[1], 2) });
    expect(screen.queryByLabelText(L.selection.count(2))).toBeNull();
  });

  it('eliminar varias confirma con la cuenta y borra todas', async () => {
    await render(<Pantalla />);
    await fireEvent(screen.getByRole('button', { name: /^Rayuela/ }), 'longPress');
    await fireEvent.press(screen.getByRole('button', { name: /^Ficciones/ }));
    await fireEvent.press(screen.getByRole('button', { name: L.selection.delete }));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: L.selection.deleteTitle(2) }));
    expect(mockEliminar.mutate.mock.calls[0][0]).toEqual(['l1', 'l2']);
  });

  it('tocar una elegida la suelta, y la X sale de la selección', async () => {
    await render(<Pantalla />);
    await fireEvent(screen.getByRole('button', { name: /^Rayuela/ }), 'longPress');
    await fireEvent.press(screen.getByRole('button', { name: /^Aura/ }));
    await fireEvent.press(screen.getByRole('button', { name: /^Rayuela/ }));
    expect(screen.getByLabelText(L.selection.count(1))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: L.selection.cancel }));
    expect(screen.getByRole('button', { name: L.importBook })).toBeTruthy();
  });
});
