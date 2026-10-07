/**
 * Hoja de eliminar cuenta (RF-A12): el botón destructivo solo se activa con la contraseña
 * escrita **y** el interruptor "Entiendo…" prendido; al terminar cierra y avisa.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DeleteAccountSheet } from '@/components/account/delete-account-sheet';
import { es } from '@/i18n/es';

const d = es.account.deletion;
const mockMutate = jest.fn();
const mockSnackbar = jest.fn();
let mockError: Error | null = null;

jest.mock('@/hooks/use-auth-actions', () => ({
  useDeleteAccount: () => ({ mutate: mockMutate, isPending: false, error: mockError }),
}));
jest.mock('@/providers', () => ({ useSnackbar: () => mockSnackbar }));

beforeEach(() => {
  mockMutate.mockReset();
  mockSnackbar.mockReset();
  mockError = null;
});

const boton = () => screen.getByRole('button', { name: d.deleteForever });
const deshabilitado = () => boton().props.accessibilityState?.disabled === true;

it('el botón solo se activa con contraseña y "Entiendo…"', async () => {
  await render(<DeleteAccountSheet visible email="a@b.c" onClose={jest.fn()} />);
  expect(deshabilitado()).toBe(true);

  await fireEvent.press(screen.getByRole('switch', { name: d.iUnderstand }));
  expect(deshabilitado()).toBe(true); // falta la contraseña

  await fireEvent.changeText(screen.getByLabelText(d.yourPassword), 'secreta');
  expect(deshabilitado()).toBe(false);

  await fireEvent.press(screen.getByRole('switch', { name: d.iUnderstand }));
  expect(deshabilitado()).toBe(true); // apagar el interruptor la vuelve a bloquear
  await fireEvent.press(boton());
  expect(mockMutate).not.toHaveBeenCalled();
});

it('al confirmar manda correo y contraseña; si sale bien cierra y avisa', async () => {
  const onClose = jest.fn();
  mockMutate.mockImplementation((_v, opts: { onSuccess: () => void }) => opts.onSuccess());
  await render(<DeleteAccountSheet visible email="a@b.c" onClose={onClose} />);
  await fireEvent.changeText(screen.getByLabelText(d.yourPassword), 'secreta');
  await fireEvent.press(screen.getByRole('switch', { name: d.iUnderstand }));
  await fireEvent.press(boton());
  expect(mockMutate).toHaveBeenCalledWith({ email: 'a@b.c', password: 'secreta' }, expect.anything());
  expect(onClose).toHaveBeenCalled();
  expect(mockSnackbar).toHaveBeenCalledWith({ message: d.deleted });
});

it('muestra el error del servidor', async () => {
  mockError = new Error('Credenciales incorrectas');
  await render(<DeleteAccountSheet visible email="a@b.c" onClose={jest.fn()} />);
  expect(screen.getByText('Credenciales incorrectas')).toBeTruthy();
});
