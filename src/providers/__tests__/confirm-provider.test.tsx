/**
 * Dialogo de confirmacion (NFR-12). Su contrato es una promesa: `confirm()`
 * resuelve `true` o `false`, y cerrar por fuera equivale a cancelar — nunca debe
 * quedarse colgada, o la accion destructiva se bloquearia para siempre.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { useState } from 'react';

import { ConfirmProvider, useConfirm } from '@/providers/confirm-provider';
import type { ConfirmOptions } from '@/providers/confirm-provider';

function Disparador({ opciones }: { opciones: ConfirmOptions }) {
  const confirmar = useConfirm();
  const [resultado, setResultado] = useState<string>('sin responder');
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="abrir"
        onPress={() => void confirmar(opciones).then((r) => setResultado(r ? 'confirmado' : 'cancelado'))}>
        <Text>abrir</Text>
      </Pressable>
      <Text>{resultado}</Text>
    </>
  );
}

const montar = (opciones: ConfirmOptions) =>
  render(
    <ConfirmProvider>
      <Disparador opciones={opciones} />
    </ConfirmProvider>,
  );

const BORRAR: ConfirmOptions = { title: 'Eliminar actividad', message: '¿Seguro?', destructive: true };

describe('ConfirmProvider', () => {
  it('no muestra el dialogo hasta pedirlo', async () => {
    await montar(BORRAR);
    expect(screen.queryByText('Eliminar actividad')).toBeNull();
  });

  it('muestra titulo y mensaje', async () => {
    await montar(BORRAR);

    await fireEvent.press(screen.getByLabelText('abrir'));

    expect(screen.getByText('Eliminar actividad')).toBeTruthy();
    expect(screen.getByText('¿Seguro?')).toBeTruthy();
  });

  it('usa etiquetas por defecto', async () => {
    await montar({ title: 'X' });
    await fireEvent.press(screen.getByLabelText('abrir'));

    expect(screen.getByText('Cancelar')).toBeTruthy();
    expect(screen.getByText('Confirmar')).toBeTruthy();
  });

  it('acepta etiquetas propias', async () => {
    await montar({ title: 'X', confirmLabel: 'Cerrar sesión', cancelLabel: 'Mejor no' });
    await fireEvent.press(screen.getByLabelText('abrir'));

    expect(screen.getByText('Cerrar sesión')).toBeTruthy();
    expect(screen.getByText('Mejor no')).toBeTruthy();
  });

  it('confirmar resuelve true', async () => {
    await montar(BORRAR);
    await fireEvent.press(screen.getByLabelText('abrir'));

    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar' }));

    expect(screen.getByText('confirmado')).toBeTruthy();
  });

  it('cancelar resuelve false', async () => {
    await montar(BORRAR);
    await fireEvent.press(screen.getByLabelText('abrir'));

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByText('cancelado')).toBeTruthy();
  });

  it('al responder el dialogo se cierra', async () => {
    await montar(BORRAR);
    await fireEvent.press(screen.getByLabelText('abrir'));

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('¿Seguro?')).toBeNull();
  });

  it('sin mensaje solo muestra el titulo', async () => {
    await montar({ title: 'Solo título' });
    await fireEvent.press(screen.getByLabelText('abrir'));

    expect(screen.getByText('Solo título')).toBeTruthy();
    expect(screen.queryByText('¿Seguro?')).toBeNull();
  });

  it('se puede volver a abrir despues de responder', async () => {
    await montar(BORRAR);
    await fireEvent.press(screen.getByLabelText('abrir'));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    await fireEvent.press(screen.getByLabelText('abrir'));

    expect(screen.getByText('Eliminar actividad')).toBeTruthy();
  });
});

describe('useConfirm', () => {
  it('falla con un mensaje util fuera del provider', async () => {
    const silencio = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Disparador opciones={BORRAR} />)).rejects.toThrow(/dentro de <ConfirmProvider>/);
    silencio.mockRestore();
  });
});
