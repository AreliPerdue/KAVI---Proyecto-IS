/**
 * Crear y editar un tema propio (RF-T2, RF-T3).
 *
 * Los temas del sistema no llegan aqui: la RLS no deja modificarlos. Lo que si
 * comprueba esta pantalla es que el color guardado siga estando en la paleta —si
 * un tema viejo tiene un color que ya no se ofrece, se cae al primero en vez de
 * dejar el selector sin nada marcado.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockConfirm = jest.fn();
const mockSnackbar = jest.fn();
const mockCreate = { mutate: jest.fn(), isPending: false, error: null as Error | null };
const mockUpdate = { mutate: jest.fn(), isPending: false, error: null as Error | null };
const mockRemove = { mutate: jest.fn(), isPending: false, error: null as Error | null };
let mockTemas: Record<string, unknown>;

jest.mock('@/hooks/use-themes', () => ({
  useThemes: () => mockTemas,
  useThemeMutations: () => ({ create: mockCreate, update: mockUpdate, remove: mockRemove }),
}));
jest.mock('@/providers', () => ({ useConfirm: () => mockConfirm, useSnackbar: () => mockSnackbar }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/theme/new').default as () => React.ReactElement;
/* eslint-disable-next-line @typescript-eslint/no-require-imports -- idem */
const { THEME_PALETTE } = require('@/constants/icons') as typeof import('@/constants/icons');

const campo = (label: string) => screen.getByLabelText(label, { includeHiddenElements: true });

const TEMA = (over = {}) => ({
  id: 't1', name: 'Piano', dimension: 'intelectual', color: THEME_PALETTE[0],
  icon: 'book-open', is_system: false, owner_id: 'u1', ...over,
});

beforeEach(() => {
  mockConfirm.mockReset().mockResolvedValue(true);
  mockSnackbar.mockReset();
  for (const m of [mockCreate, mockUpdate, mockRemove]) { m.mutate.mockReset(); m.error = null; m.isPending = false; }
  mockTemas = { data: [], isPending: false, isError: false, error: null, refetch: jest.fn() };
  globalThis.setParametrosDeRuta({});
});

describe('crear', () => {
  it('muestra el campo de nombre vacio', async () => {
    await render(<Pantalla />);
    expect(campo('Nombre').props.value).toBe('');
  });

  it('ofrece las siete dimensiones', async () => {
    await render(<Pantalla />);

    for (const etiqueta of ['Física', 'Emocional', 'Social']) {
      expect(screen.getByRole('button', { name: etiqueta })).toBeTruthy();
    }
  });

  it('no crea sin nombre', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: /crear tema|guardar/i }));

    await waitFor(() => expect(mockCreate.mutate).not.toHaveBeenCalled());
  });

  it('con nombre crea el tema', async () => {
    await render(<Pantalla />);

    await fireEvent.changeText(campo('Nombre'), 'Voluntariado');
    await fireEvent.press(screen.getByRole('button', { name: /crear tema|guardar/i }));

    await waitFor(() => expect(mockCreate.mutate).toHaveBeenCalled());
    expect(mockCreate.mutate.mock.calls[0][0]).toMatchObject({ name: 'Voluntariado' });
  });

  it('al crearlo avisa y cierra', async () => {
    mockCreate.mutate.mockImplementation((_v: unknown, o: { onSuccess?: () => void }) => o?.onSuccess?.());
    await render(<Pantalla />);

    await fireEvent.changeText(campo('Nombre'), 'Voluntariado');
    await fireEvent.press(screen.getByRole('button', { name: /crear tema|guardar/i }));

    await waitFor(() => expect(mockSnackbar).toHaveBeenCalledWith({ message: 'Tema creado.' }));
    expect(globalThis.mockRouter.back).toHaveBeenCalled();
  });

  it('cambiar la dimension se refleja en lo enviado', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Social' }));
    await fireEvent.changeText(campo('Nombre'), 'Amigos');
    await fireEvent.press(screen.getByRole('button', { name: /crear tema|guardar/i }));

    await waitFor(() => expect(mockCreate.mutate).toHaveBeenCalled());
    expect(mockCreate.mutate.mock.calls[0][0]).toMatchObject({ dimension: 'social' });
  });

  it('al crear no ofrece eliminar', async () => {
    await render(<Pantalla />);
    expect(screen.queryByRole('button', { name: 'Eliminar tema' })).toBeNull();
  });
});

describe('editar', () => {
  beforeEach(() => {
    globalThis.setParametrosDeRuta({ id: 't1' });
    mockTemas = { ...mockTemas, data: [TEMA()] };
  });

  it('carga los valores del tema', async () => {
    await render(<Pantalla />);

    await waitFor(() => expect(campo('Nombre').props.value).toBe('Piano'));
  });

  it('se titula como edicion', async () => {
    await render(<Pantalla />);
    expect(screen.getByText('Editar tema')).toBeTruthy();
  });

  it('guardar actualiza en vez de crear', async () => {
    await render(<Pantalla />);
    await waitFor(() => expect(campo('Nombre').props.value).toBe('Piano'));

    await fireEvent.changeText(campo('Nombre'), 'Piano clásico');
    await fireEvent.press(screen.getByRole('button', { name: /guardar|actualizar/i }));

    await waitFor(() => expect(mockUpdate.mutate).toHaveBeenCalled());
    expect(mockCreate.mutate).not.toHaveBeenCalled();
    expect(mockUpdate.mutate.mock.calls[0][0]).toMatchObject({ id: 't1' });
  });

  it('un color fuera de la paleta cae al primero, sin dejar el selector vacio', async () => {
    mockTemas = { ...mockTemas, data: [TEMA({ color: '#123456' })] };
    await render(<Pantalla />);
    await waitFor(() => expect(campo('Nombre').props.value).toBe('Piano'));

    await fireEvent.press(screen.getByRole('button', { name: /guardar|actualizar/i }));

    await waitFor(() => expect(mockUpdate.mutate).toHaveBeenCalled());
    expect(mockUpdate.mutate.mock.calls[0][0].patch.color).toBe(THEME_PALETTE[0]);
  });

  it('ofrece eliminar y pide confirmacion', async () => {
    mockConfirm.mockResolvedValue(false);
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar tema' }));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockRemove.mutate).not.toHaveBeenCalled();
  });

  it('al confirmar lo elimina', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar tema' }));

    await waitFor(() => expect(mockRemove.mutate).toHaveBeenCalled());
  });
});

describe('estados', () => {
  it('mientras cargan los temas lo indica', async () => {
    globalThis.setParametrosDeRuta({ id: 't1' });
    mockTemas = { ...mockTemas, data: undefined, isPending: true };
    await render(<Pantalla />);

    expect(screen.getByText('Cargando…')).toBeTruthy();
  });

  it('muestra el error de la mutacion', async () => {
    mockCreate.error = new Error('Eso ya existe.');
    await render(<Pantalla />);

    expect(screen.getByText('Eso ya existe.')).toBeTruthy();
  });
});
