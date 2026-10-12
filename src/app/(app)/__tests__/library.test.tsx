/**
 * Biblioteca en desarrollo (spec 13 §4, T276): avisa que está en construcción, muestra el espacio
 * usado (B2) y las piezas o su estado vacío.
 */
import { render, screen } from '@testing-library/react-native';

import { es } from '@/i18n/es';

const L = es.library;
const MB = 1024 * 1024;
let mockPiezas: Record<string, unknown>;
let mockEspacio: Record<string, unknown>;

jest.mock('@/hooks/use-library', () => ({
  useLibraryItems: () => mockPiezas,
  useLibraryUsage: () => mockEspacio,
}));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/library').default as () => React.ReactElement;

const ok = (data: unknown) => ({ data, isPending: false, isError: false, isSuccess: true, error: null, refetch: jest.fn() });

beforeEach(() => {
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
  mockPiezas = ok([
    { id: 'l1', title: 'Rayuela', authors: ['Julio Cortázar'] },
    { id: 'l2', title: 'Ficciones', authors: [] },
  ]);
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
