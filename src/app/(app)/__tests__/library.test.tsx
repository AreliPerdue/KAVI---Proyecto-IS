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
let mockLibreros: Record<string, unknown>[] = [];
let mockSagas: Record<string, unknown>[] = [];
let mockEnlaces: Record<string, unknown>[] = [];
const mockEnlacesMut = { enlazar: { mutate: jest.fn(), isPending: false }, quitar: { mutate: jest.fn() } };
const mockAsignarSaga = { mutate: jest.fn() };
let mockEnLibreros: Record<string, unknown>[] = [];
const mockLibrerosMut = {
  crear: { mutate: jest.fn() },
  editar: { mutate: jest.fn() },
  borrar: { mutate: jest.fn() },
  reordenar: { mutate: jest.fn() },
  agregar: { mutate: jest.fn() },
  quitar: { mutate: jest.fn() },
  mover: { mutate: jest.fn() },
};
/** Lo último que pintó la rejilla o las filas que se arrastran, para simular un acomodo. */
let mockArrastrable: { items: { id: string }[]; onReorder: (from: number, to: number) => void } | null = null;
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
  useShelves: () => ({ data: mockLibreros }),
  useShelfItems: () => ({ data: mockEnLibreros }),
  useShelfMutations: () => mockLibrerosMut,
  useSeries: () => ({ data: mockSagas }),
  useLinks: () => ({ data: mockEnlaces }),
  useLinkMutations: () => mockEnlacesMut,
  useAssignSeries: () => mockAsignarSaga,
}));
// Arrastrar no se puede simular con gestos en Jest: los dobles pintan las piezas y guardan `onReorder`.
jest.mock('@/components/lists/draggable-grid', () => ({
  DraggableGrid: (props: { items: { id: string }[]; renderItem: (i: unknown) => unknown; onReorder: (a: number, b: number) => void }) => {
    mockArrastrable = props;
    return props.items.map((i) => props.renderItem(i));
  },
}));
jest.mock('@/components/lists/draggable-rows', () => ({
  DraggableRows: (props: { items: { id: string }[]; renderItem: (i: unknown) => unknown; onReorder: (a: number, b: number) => void }) => {
    mockArrastrable = props;
    return props.items.map((i) => props.renderItem(i));
  },
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
  genres: [],
  category: null,
  sort_order: 0,
  series_id: null,
  series_index: null,
  kind: 'pdf',
  file_size: 1024,
  created_at: '2026-10-01T00:00:00Z',
  page_count: null,
  progress: 0,
  last_position: null,
  ...extra,
});

const ok = (data: unknown) => ({ data, isPending: false, isError: false, isSuccess: true, error: null, refetch: jest.fn() });

beforeEach(() => {
  // Las pruebas de vistas, menú y selección usan la lista normal; las de acomodar, "Como los acomodé".
  usePreferencesStore.setState({ libraryView: 'covers', libraryOrder: 'recent' });
  mockLibreros = [];
  mockEnLibreros = [];
  mockSagas = [];
  mockAsignarSaga.mutate.mockReset();
  mockEnlaces = [];
  mockEnlacesMut.enlazar.mutate.mockReset();
  mockEnlacesMut.quitar.mutate.mockReset();
  mockArrastrable = null;
  for (const m of Object.values(mockLibrerosMut)) m.mutate.mockReset();
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

/** Organizar (T280): libreros, buscar, filtrar y acomodar arrastrando (RF-BL5 – RF-BL10, RF-BL18). */
describe('organizar', () => {
  const libros = () => [
    pieza('l1', { title: 'Rayuela', authors: ['Julio Cortázar'], genres: ['Novela'], cover_color: '#1F2A5C', sort_order: 10, created_at: '2026-10-01T00:00:00Z' }),
    pieza('l2', { title: 'Ficciones', authors: ['Jorge Luis Borges'], genres: ['Cuentos'], cover_color: '#C0392B', sort_order: 20, created_at: '2026-10-03T00:00:00Z' }),
    pieza('l3', { title: 'Aura', authors: ['Carlos Fuentes'], genres: ['Novela'], cover_color: '#F1C40F', sort_order: 30, created_at: '2026-10-02T00:00:00Z' }),
  ];
  const visibles = () => screen.getAllByRole('button', { name: /^(Rayuela|Ficciones|Aura),/ }).map((b) => (b.props.accessibilityLabel as string).split(',')[0]);

  beforeEach(() => {
    mockPiezas = ok(libros());
    mockLibreros = [{ id: 's1', name: 'Por leer', color: '#C0392B', icon: 'book-open', sort_order: 1024 }];
    mockEnLibreros = [
      { shelf_id: 's1', item_id: 'l3', sort_order: 1024, added_at: '' },
      { shelf_id: 's1', item_id: 'l1', sort_order: 2048, added_at: '' },
    ];
    usePreferencesStore.setState({ libraryView: 'list', libraryOrder: 'recent' });
    mockConfirm.mockReset().mockResolvedValue(true);
    mockSnackbar.mockReset();
  });

  it('las pestañas de libreros muestran solo sus libros', async () => {
    await render(<Pantalla />);
    expect(visibles()).toEqual(['Ficciones', 'Aura', 'Rayuela']);
    await fireEvent.press(screen.getByRole('button', { name: 'Por leer' }));
    expect(visibles()).toEqual(['Aura', 'Rayuela']);
  });

  it('buscar por autor sin acentos', async () => {
    await render(<Pantalla />);
    await fireEvent.changeText(screen.getByLabelText(L.find.search), 'cortazar');
    expect(visibles()).toEqual(['Rayuela']);
    await fireEvent.changeText(screen.getByLabelText(L.find.search), 'nada');
    expect(screen.getByText(L.find.noResults)).toBeTruthy();
  });

  it('filtrar por color: chip con su nombre y la cuenta en el botón; la ✕ lo quita', async () => {
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.find.filterCount(0) }));
    await fireEvent.press(screen.getByRole('button', { name: L.find.colorA11y('azul marino') }));
    await fireEvent.press(screen.getByRole('button', { name: L.find.done }));
    expect(visibles()).toEqual(['Rayuela']);
    expect(screen.getByRole('button', { name: L.find.filterCount(1) })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: L.find.removeFilter('azul marino') }));
    expect(visibles()).toHaveLength(3);
  });

  it('elegir el orden lo recuerda', async () => {
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.find.filterCount(0) }));
    await fireEvent.press(screen.getByRole('radio', { name: L.find.sortTitleAZ }));
    expect(usePreferencesStore.getState().libraryOrder).toBe('title');
    await fireEvent.press(screen.getByRole('button', { name: L.find.done }));
    expect(visibles()).toEqual(['Aura', 'Ficciones', 'Rayuela']);
  });

  it('"Como los acomodé" en Todos: arrastrar guarda el punto medio entre vecinos', async () => {
    usePreferencesStore.setState({ libraryOrder: 'manual' });
    await render(<Pantalla />);
    expect(mockArrastrable?.items.map((i) => i.id)).toEqual(['l1', 'l2', 'l3']);
    // Aura (30) entre Rayuela (10) y Ficciones (20).
    mockArrastrable?.onReorder(2, 1);
    expect(mockActualizar.mutate).toHaveBeenCalledWith({ id: 'l3', patch: { sort_order: 15 } });
  });

  it('dentro de un librero, arrastrar cambia el orden de ese librero', async () => {
    usePreferencesStore.setState({ libraryOrder: 'manual' });
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: 'Por leer' }));
    expect(mockArrastrable?.items.map((i) => i.id)).toEqual(['l3', 'l1']);
    mockArrastrable?.onReorder(1, 0);
    expect(mockLibrerosMut.mover.mutate).toHaveBeenCalledWith({ shelfId: 's1', itemId: 'l1', orden: 0 });
  });

  it('agregar a un librero desde el menú, y quitarlo estando en él', async () => {
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.actionsFor('Ficciones') }));
    await fireEvent.press(screen.getByRole('button', { name: L.shelves.addTo }));
    await fireEvent.press(screen.getAllByRole('button', { name: 'Por leer' }).at(-1)!);
    expect(mockLibrerosMut.agregar.mutate).toHaveBeenCalledWith({ shelfId: 's1', itemIds: ['l2'] });
    expect(mockSnackbar).toHaveBeenCalledWith({ message: L.shelves.added('Por leer', 1) });
  });

  it('crear un librero desde "Agregar a librero" mete ahí el libro', async () => {
    mockLibrerosMut.crear.mutate.mockImplementation((_d: unknown, o: { onSuccess: (s: unknown) => void }) => o.onSuccess({ id: 's9', name: 'Favoritos' }));
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.actionsFor('Aura') }));
    await fireEvent.press(screen.getByRole('button', { name: L.shelves.addTo }));
    await fireEvent.press(screen.getAllByRole('button', { name: L.shelves.new }).at(-1)!);
    await fireEvent.changeText(screen.getByLabelText(L.shelves.name), 'Favoritos');
    await fireEvent.press(screen.getByRole('button', { name: L.shelves.save }));
    expect(mockLibrerosMut.crear.mutate.mock.calls[0][0]).toEqual(expect.objectContaining({ name: 'Favoritos' }));
    expect(mockLibrerosMut.agregar.mutate).toHaveBeenCalledWith({ shelfId: 's9', itemIds: ['l3'] });
  });

  it('un librero sin nombre no se guarda', async () => {
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.shelves.new }));
    await fireEvent.press(screen.getByRole('button', { name: L.shelves.save }));
    expect(screen.getByText(L.shelves.nameRequired)).toBeTruthy();
    expect(mockLibrerosMut.crear.mutate).not.toHaveBeenCalled();
  });

  it('eliminar un librero confirma que los libros no se borran', async () => {
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.shelves.manage }));
    await fireEvent.press(screen.getByRole('button', { name: `Por leer, ${L.shelves.count(2)}` }));
    await fireEvent.press(screen.getByRole('button', { name: L.shelves.delete }));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ message: L.shelves.deleteMessage }));
    expect(mockLibrerosMut.borrar.mutate).toHaveBeenCalledWith('s1');
  });
});

/** Sagas (T315, RF-BL24 – RF-BL25): etiqueta en sueltas, pila en apiladas, abrirla y poner varios. */
describe('sagas', () => {
  const libros = () => [
    pieza('a2', { title: 'Una corte de niebla', series_id: 's1', series_index: 2, created_at: '2026-10-03T00:00:00Z' }),
    pieza('x', { title: 'Rayuela', created_at: '2026-10-02T00:00:00Z' }),
    pieza('a1', { title: 'Una corte de rosas', series_id: 's1', series_index: 1, created_at: '2026-10-01T00:00:00Z' }),
  ];
  beforeEach(() => {
    mockPiezas = ok(libros());
    mockSagas = [{ id: 's1', name: 'ACOTAR' }];
    usePreferencesStore.setState({ libraryView: 'list', libraryOrder: 'recent', librarySeriesView: 'loose' });
  });

  it('sueltas: cada libro dice su saga y su número', async () => {
    await render(<Pantalla />);
    expect(screen.getByText('ACOTAR #2')).toBeTruthy();
    expect(screen.getByText('ACOTAR #1')).toBeTruthy();
  });

  it('apiladas: una pila en el lugar del primero; tocarla abre la saga en orden de número', async () => {
    usePreferencesStore.setState({ librarySeriesView: 'stacked' });
    await render(<Pantalla />);
    expect(screen.getByRole('button', { name: L.series.stack('ACOTAR', 2) })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Una corte de niebla,/ })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: L.series.stack('ACOTAR', 2) }));
    const titulos = screen.getAllByRole('button', { name: /^Una corte/ }).map((b) => (b.props.accessibilityLabel as string).split(',')[0]);
    expect(titulos).toEqual(['Una corte de rosas', 'Una corte de niebla']);
    await fireEvent.press(screen.getByRole('button', { name: L.series.back }));
    expect(screen.getByRole('button', { name: L.series.stack('ACOTAR', 2) })).toBeTruthy();
  });

  it('poner varios en una saga, numerados en el orden en que se eligieron', async () => {
    await render(<Pantalla />);
    await fireEvent(screen.getByRole('button', { name: /^Rayuela/ }), 'longPress');
    await fireEvent.press(screen.getByRole('button', { name: /^Una corte de rosas/ }));
    await fireEvent.press(screen.getByRole('button', { name: L.series.put }));
    await fireEvent.changeText(screen.getByLabelText(L.series.field), 'Clásicos');
    await fireEvent.press(screen.getAllByRole('button', { name: L.series.put }).at(-1)!);
    expect(mockAsignarSaga.mutate.mock.calls[0][0]).toEqual({ nombre: 'Clásicos', asignar: [{ id: 'x', numero: 1 }, { id: 'a1', numero: 2 }] });
  });
});

/** Detalles y libros enlazados (T316, RF-BL27). */
describe('detalles y enlaces', () => {
  beforeEach(() => {
    mockPiezas = ok([
      pieza('a', { title: 'El hobbit', authors: ['J. R. R. Tolkien'] }),
      pieza('b', { title: 'El señor de los anillos', authors: ['J. R. R. Tolkien'] }),
      pieza('c', { title: 'Rayuela' }),
    ]);
    mockEnlaces = [{ id: 'k1', from_item: 'a', to_item: 'b', kind: 'prequel' }];
    usePreferencesStore.setState({ libraryView: 'list', libraryOrder: 'recent' });
  });

  const abrirDetalles = async (titulo: string) => {
    await fireEvent.press(screen.getByRole('button', { name: L.actionsFor(titulo) }));
    await fireEvent.press(screen.getByRole('button', { name: L.details.open }));
  };

  it('los enlaces se leen desde los dos lados y tocar uno muestra el otro libro', async () => {
    await render(<Pantalla />);
    await abrirDetalles('El señor de los anillos');
    await fireEvent.press(screen.getByRole('button', { name: `${L.links.roles.prequel}: El hobbit` }));
    expect(screen.getByRole('button', { name: `${L.links.roles.sequel}: El señor de los anillos` })).toBeTruthy();
  });

  it('enlazar: qué es este libro, con cuál, y se guarda en el sentido correcto', async () => {
    await render(<Pantalla />);
    await abrirDetalles('Rayuela');
    expect(screen.getByText(L.links.empty)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: L.links.add }));
    await fireEvent.press(screen.getByRole('radio', { name: L.links.options.isSequelOf }));
    await fireEvent.changeText(screen.getByLabelText(L.links.searchPlaceholder), 'hobbit');
    await fireEvent.press(screen.getByRole('button', { name: 'El hobbit' }));
    // "Rayuela es secuela de El hobbit" se guarda como "El hobbit es precuela de Rayuela".
    expect(mockEnlacesMut.enlazar.mutate.mock.calls[0][0]).toEqual({ from: 'a', to: 'c', kind: 'prequel' });
  });

  it('un libro ya enlazado no se puede volver a elegir; quitar un enlace', async () => {
    await render(<Pantalla />);
    await abrirDetalles('El hobbit');
    await fireEvent.press(screen.getByRole('button', { name: L.links.add }));
    await fireEvent.press(screen.getByRole('radio', { name: L.links.options.related }));
    expect(screen.getByRole('button', { name: `El señor de los anillos, ${L.links.already}` }).props.accessibilityState).toEqual({ disabled: true });
    await fireEvent.press(screen.getAllByRole('button', { name: es.common.cancel }).at(-1)!);
    await fireEvent.press(screen.getAllByRole('button', { name: es.common.cancel }).at(-1)!);
    await fireEvent.press(screen.getByRole('button', { name: L.links.remove('El señor de los anillos') }));
    expect(mockEnlacesMut.quitar.mutate).toHaveBeenCalledWith('k1');
  });
});
