/**
 * Snackbar (NFR-12). Dos cosas que importan: que se anuncie con
 * `accessibilityLiveRegion` —si no, quien usa lector de pantalla nunca se entera
 * de que la accion tuvo efecto— y que se oculte solo pasado su tiempo.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { SnackbarProvider, useSnackbar } from '@/providers/snackbar-provider';
import type { SnackbarOptions } from '@/providers/snackbar-provider';

function Disparador({ opciones }: { opciones: SnackbarOptions }) {
  const mostrar = useSnackbar();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="mostrar" onPress={() => mostrar(opciones)}>
      <Text>mostrar</Text>
    </Pressable>
  );
}

const montar = (opciones: SnackbarOptions) =>
  render(
    <SnackbarProvider>
      <Disparador opciones={opciones} />
    </SnackbarProvider>,
  );

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('SnackbarProvider', () => {
  it('no muestra nada hasta que se pide', async () => {
    await montar({ message: 'Guardado' });
    expect(screen.queryByText('Guardado')).toBeNull();
  });

  it('muestra el mensaje al pedirlo', async () => {
    await montar({ message: 'Actividad creada' });

    await fireEvent.press(screen.getByLabelText('mostrar'));

    expect(screen.getByText('Actividad creada')).toBeTruthy();
  });

  it('se oculta solo a los 3 s cuando no hay accion', async () => {
    await montar({ message: 'Guardado' });
    await fireEvent.press(screen.getByLabelText('mostrar'));

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Guardado')).toBeNull();
  });

  it('con accion dura mas: sigue visible a los 3 s', async () => {
    await montar({ message: 'Eliminada', actionLabel: 'Deshacer', onAction: jest.fn() });
    await fireEvent.press(screen.getByLabelText('mostrar'));

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Eliminada')).toBeTruthy();
  });

  it('respeta una duracion propia', async () => {
    await montar({ message: 'Breve', duration: 1000 });
    await fireEvent.press(screen.getByLabelText('mostrar'));

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('Breve')).toBeNull();
  });

  it('muestra la accion y la ejecuta', async () => {
    const onAction = jest.fn();
    await montar({ message: 'Eliminada', actionLabel: 'Deshacer', onAction });
    await fireEvent.press(screen.getByLabelText('mostrar'));

    await fireEvent.press(screen.getByLabelText('Deshacer'));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('al usar la accion el aviso desaparece', async () => {
    await montar({ message: 'Eliminada', actionLabel: 'Deshacer', onAction: jest.fn() });
    await fireEvent.press(screen.getByLabelText('mostrar'));

    await fireEvent.press(screen.getByLabelText('Deshacer'));

    expect(screen.queryByText('Eliminada')).toBeNull();
  });

  it('sin onAction no pinta boton aunque haya etiqueta', async () => {
    await montar({ message: 'Sin accion', actionLabel: 'Deshacer' });
    await fireEvent.press(screen.getByLabelText('mostrar'));

    expect(screen.queryByLabelText('Deshacer')).toBeNull();
  });

  it('se anuncia a los lectores de pantalla', async () => {
    await montar({ message: 'Guardado' });
    await fireEvent.press(screen.getByLabelText('mostrar'));

    expect(JSON.stringify(screen.toJSON())).toContain('"accessibilityLiveRegion":"polite"');
  });

  it('un aviso nuevo reemplaza al anterior', async () => {
    function Doble() {
      const mostrar = useSnackbar();
      return (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="uno" onPress={() => mostrar({ message: 'Uno' })}>
            <Text>uno</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="dos" onPress={() => mostrar({ message: 'Dos' })}>
            <Text>dos</Text>
          </Pressable>
        </>
      );
    }
    await render(
      <SnackbarProvider>
        <Doble />
      </SnackbarProvider>,
    );

    await fireEvent.press(screen.getByLabelText('uno'));
    await fireEvent.press(screen.getByLabelText('dos'));

    expect(screen.queryByText('Uno')).toBeNull();
    expect(screen.getByText('Dos')).toBeTruthy();
  });
});

describe('useSnackbar', () => {
  it('falla con un mensaje util si se usa fuera del provider', async () => {
    const silencio = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Disparador opciones={{ message: 'x' }} />)).rejects.toThrow(
      /dentro de <SnackbarProvider>/,
    );
    silencio.mockRestore();
  });
});
