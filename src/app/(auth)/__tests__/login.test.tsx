/**
 * Pantalla de inicio de sesion (RF-A3).
 *
 * El aviso de modo demo solo debe aparecer cuando no hay backend real: en
 * produccion anunciaria que cualquier correo entra con una contrasena de ocho
 * caracteres, que es justo lo que no pasa.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Pantalla from '@/app/(auth)/login';

const mockMutate = jest.fn();
let mockEstado: { error: Error | null; isPending: boolean } = { error: null, isPending: false };
let mockDemo = false;

jest.mock('@/hooks/use-auth-actions', () => ({
  useSignIn: () => ({ mutate: mockMutate, ...mockEstado }),
}));
jest.mock('@/lib/env', () => ({ env: { get isDemoMode() { return mockDemo; }, supabaseUrl: '', supabaseAnonKey: '' } }));

const campo = (label: string) => screen.getByLabelText(label, { includeHiddenElements: true });

beforeEach(() => {
  mockMutate.mockReset();
  mockEstado = { error: null, isPending: false };
  mockDemo = false;
});

describe('LoginScreen', () => {
  it('muestra el titulo y los dos campos', async () => {
    await render(<Pantalla />);
    expect(screen.getByText('Inicia sesión')).toBeTruthy();
    expect(campo('Correo')).toBeTruthy();
    expect(campo('Contraseña')).toBeTruthy();
  });

  it('la contrasena nace oculta', async () => {
    await render(<Pantalla />);
    expect(campo('Contraseña').props.secureTextEntry).toBe(true);
  });

  it('ofrece recuperar contrasena y crear cuenta', async () => {
    await render(<Pantalla />);
    expect(screen.getByRole('button', { name: 'Olvidé mi contraseña' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeTruthy();
  });

  it('envia las credenciales escritas', async () => {
    await render(<Pantalla />);

    await fireEvent.changeText(campo('Correo'), 'areli@kavi.app');
    await fireEvent.changeText(campo('Contraseña'), 'secreta123');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith({ email: 'areli@kavi.app', password: 'secreta123' }),
    );
  });

  it('no envia con un correo invalido', async () => {
    await render(<Pantalla />);

    await fireEvent.changeText(campo('Correo'), 'no-es-correo');
    await fireEvent.changeText(campo('Contraseña'), 'secreta123');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(screen.getByText('Inicia sesión')).toBeTruthy());
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('no envia sin contrasena', async () => {
    await render(<Pantalla />);

    await fireEvent.changeText(campo('Correo'), 'areli@kavi.app');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(mockMutate).not.toHaveBeenCalled());
  });

  it('muestra el error de credenciales', async () => {
    mockEstado = { error: new Error('Credenciales incorrectas. Revisa tu correo y contraseña.'), isPending: false };
    await render(<Pantalla />);

    expect(screen.getByText(/credenciales incorrectas/i)).toBeTruthy();
  });

  it('durante el envio el boton queda ocupado', async () => {
    mockEstado = { error: null, isPending: true };
    await render(<Pantalla />);

    const botones = screen.getAllByRole('button');
    expect(botones.some((b) => b.props.accessibilityState?.busy)).toBe(true);
  });

  it('sin modo demo no anuncia las credenciales de prueba', async () => {
    await render(<Pantalla />);
    expect(screen.queryByText(/modo demo/i)).toBeNull();
  });

  it('en modo demo si las anuncia', async () => {
    mockDemo = true;
    await render(<Pantalla />);
    expect(screen.getByText(/modo demo/i)).toBeTruthy();
  });
});
