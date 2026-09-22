/**
 * Toggle propio (no el `Switch` nativo): en iOS el control del sistema ignora
 * `thumbColor`, y con la paleta monocroma de KAVI el pulgar desaparecia sobre el
 * riel encendido. Lo que se prueba aqui es el contrato de accesibilidad, que es
 * lo que hace legible el estado sin depender del color.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { SwitchRow, Toggle } from '@/components/ui/switch-row';

describe('Toggle', () => {
  it('se anuncia como switch con su etiqueta', async () => {
    await render(<Toggle label="Recordatorios" value={false} onValueChange={jest.fn()} />);
    expect(screen.getByRole('switch', { name: 'Recordatorios' })).toBeTruthy();
  });

  it('comunica el estado encendido', async () => {
    await render(<Toggle label="Recordatorios" value onValueChange={jest.fn()} />);
    expect(screen.getByRole('switch').props.accessibilityState.checked).toBe(true);
  });

  it('comunica el estado apagado', async () => {
    await render(<Toggle label="Recordatorios" value={false} onValueChange={jest.fn()} />);
    expect(screen.getByRole('switch').props.accessibilityState.checked).toBe(false);
  });

  it('al tocarlo propone el valor contrario', async () => {
    const onValueChange = jest.fn();
    await render(<Toggle label="X" value={false} onValueChange={onValueChange} />);

    await fireEvent.press(screen.getByRole('switch'));

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('estando encendido propone apagarlo', async () => {
    const onValueChange = jest.fn();
    await render(<Toggle label="X" value onValueChange={onValueChange} />);

    await fireEvent.press(screen.getByRole('switch'));

    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('deshabilitado no responde', async () => {
    const onValueChange = jest.fn();
    await render(<Toggle label="X" value={false} disabled onValueChange={onValueChange} />);

    await fireEvent.press(screen.getByRole('switch'));

    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('switch').props.accessibilityState.disabled).toBe(true);
  });
});

describe('SwitchRow', () => {
  it('muestra la etiqueta', async () => {
    await render(<SwitchRow label="Recordatorios" value={false} onValueChange={jest.fn()} />);
    expect(screen.getAllByText('Recordatorios').length).toBeGreaterThan(0);
  });

  it('muestra el hint cuando lo hay', async () => {
    await render(<SwitchRow label="X" hint="Te avisamos antes" value={false} onValueChange={jest.fn()} />);
    expect(screen.getByText('Te avisamos antes')).toBeTruthy();
  });

  it('sin hint no pinta segunda linea', async () => {
    await render(<SwitchRow label="X" value={false} onValueChange={jest.fn()} />);
    expect(screen.queryByText('Te avisamos antes')).toBeNull();
  });

  it('el interruptor de la fila funciona', async () => {
    const onValueChange = jest.fn();
    await render(<SwitchRow label="X" value={false} onValueChange={onValueChange} />);

    await fireEvent.press(screen.getByRole('switch'));

    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});
