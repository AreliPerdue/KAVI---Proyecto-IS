/**
 * Pantalla de recuperacion de contrasena (RF-A7).
 *
 * El mensaje de exito es deliberadamente ambiguo ("si el correo existe"): decir
 * si una direccion esta registrada convertiria esta pantalla en una forma de
 * comprobar quien tiene cuenta.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Pantalla from '@/app/(auth)/forgot-password';

const mockMutate = jest.fn();
let mockEstado: { error: Error | null; isSuccess: boolean; isPending: boolean } = {
  error: null, isSuccess: false, isPending: false,
};

jest.mock('@/hooks/use-auth-actions', () => ({
  useResetPassword: () => ({ mutate: mockMutate, ...mockEstado }),
}));

beforeEach(() => {
  mockMutate.mockReset();
  mockEstado = { error: null, isSuccess: false, isPending: false };
});

describe('ForgotPasswordScreen', () => {
  it('muestra el titulo y el campo de correo', async () => {
    await render(<Pantalla />);
    expect(screen.getByText('Recupera tu contraseña')).toBeTruthy();
    expect(screen.getByLabelText('Correo')).toBeTruthy();
  });

  it('ofrece volver a iniciar sesion', async () => {
    await render(<Pantalla />);
    expect(screen.getByRole('button', { name: 'Volver a iniciar sesión' })).toBeTruthy();
  });

  it('envia el correo escrito', async () => {
    await render(<Pantalla />);

    await fireEvent.changeText(screen.getByLabelText('Correo'), 'areli@kavi.app');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar enlace' }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledWith('areli@kavi.app'));
  });

  it('no envia si el correo no es valido', async () => {
    await render(<Pantalla />);

    await fireEvent.changeText(screen.getByLabelText('Correo'), 'no-es-un-correo');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar enlace' }));

    await waitFor(() => expect(screen.queryByText('Enviar enlace')).toBeTruthy());
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('no envia con el campo vacio', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Enviar enlace' }));

    await waitFor(() => expect(mockMutate).not.toHaveBeenCalled());
  });

  it('muestra el error del backend', async () => {
    mockEstado = { error: new Error('Demasiados intentos. Espera un momento.'), isSuccess: false, isPending: false };
    await render(<Pantalla />);

    expect(screen.getByText('Demasiados intentos. Espera un momento.')).toBeTruthy();
  });

  it('el mensaje de exito no revela si el correo existe', async () => {
    mockEstado = { error: null, isSuccess: true, isPending: false };
    await render(<Pantalla />);

    expect(screen.getByText(/si el correo existe/i)).toBeTruthy();
  });

  it('durante el envio el boton queda ocupado', async () => {
    mockEstado = { error: null, isSuccess: false, isPending: true };
    await render(<Pantalla />);

    const botones = screen.getAllByRole('button');
    expect(botones.some((b) => b.props.accessibilityState?.busy)).toBe(true);
  });
});
