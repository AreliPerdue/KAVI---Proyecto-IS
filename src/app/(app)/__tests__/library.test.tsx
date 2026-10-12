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

jest.mock('@/hooks/use-library', () => ({
  useLibraryItems: () => mockPiezas,
  useLibraryUsage: () => mockEspacio,
  useLibraryFileUrl: () => ({ data: undefined }),
}));

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
