/**
 * Encabezado de pantallas apiladas (T199, T189b): "Atrás" con flecha o "Cerrar" con X.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ModalHeader } from '@/components/modal-header';

describe('ModalHeader', () => {
  it('con back dice "Atrás" y usa la flecha, no la X', async () => {
    await render(<ModalHeader title="Archivadas" back />);
    expect(screen.getByRole('button', { name: 'Atrás' })).toBeTruthy();
    expect(screen.getByTestId('icono-ChevronLeft')).toBeTruthy();
    expect(screen.queryByTestId('icono-X')).toBeNull();
  });

  it('sin back dice "Cerrar" con la X', async () => {
    await render(<ModalHeader title="Nueva actividad" />);
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeTruthy();
    expect(screen.getByTestId('icono-X')).toBeTruthy();
  });

  it('vuelve atrás si hay a dónde; si no, al calendario', async () => {
    globalThis.mockRouter.canGoBack.mockReturnValueOnce(false);
    await render(<ModalHeader title="X" back />);
    await fireEvent.press(screen.getByRole('button', { name: 'Atrás' }));
    expect(globalThis.mockRouter.replace).toHaveBeenCalledWith('/(app)/(tabs)/calendar');
  });

  it('sin botón de la izquierda cuando la pantalla vive en la barra', async () => {
    await render(<ModalHeader title="Listas" leading={false} />);
    expect(screen.queryByRole('button', { name: 'Atrás' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull();
  });
});
