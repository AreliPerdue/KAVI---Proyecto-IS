/**
 * Selector segmentado: es el cambio de vista del calendario (Mes/Semana/Día).
 * Se anuncia como tablist para que la navegacion asistida lo entienda.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Segmented } from '@/components/ui/segmented';

const VISTAS = [
  { value: 'month', label: 'Mes' },
  { value: 'week', label: 'Semana' },
  { value: 'day', label: 'Día' },
] as const;


/**
 * RNTL no indexa por rol los `View` contenedores que no llevan `accessible`,
 * asi que el rol se comprueba sobre el arbol renderizado.
 */
const tieneRol = (rol: string) => JSON.stringify(screen.toJSON()).includes(`"accessibilityRole":"${rol}"`);

describe('Segmented', () => {
  it('muestra todas las opciones', async () => {
    await render(<Segmented options={VISTAS} value="month" onChange={jest.fn()} />);
    for (const v of VISTAS) expect(screen.getByText(v.label)).toBeTruthy();
  });

  it('se anuncia como tablist', async () => {
    await render(<Segmented options={VISTAS} value="month" onChange={jest.fn()} />);
    expect(tieneRol('tablist')).toBe(true);
  });

  it('marca como seleccionada solo la opcion activa', async () => {
    await render(<Segmented options={VISTAS} value="week" onChange={jest.fn()} />);
    const tabs = screen.getAllByRole('tab');
    const seleccionadas = tabs.filter((t) => t.props.accessibilityState?.selected);
    expect(seleccionadas).toHaveLength(1);
    expect(seleccionadas[0]?.props.accessibilityLabel).toBe('Semana');
  });

  it('avisa del valor elegido', async () => {
    const onChange = jest.fn();
    await render(<Segmented options={VISTAS} value="month" onChange={onChange} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Día' }));

    expect(onChange).toHaveBeenCalledWith('day');
  });

  it('tocar la ya seleccionada tambien avisa', async () => {
    const onChange = jest.fn();
    await render(<Segmented options={VISTAS} value="month" onChange={onChange} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Mes' }));

    expect(onChange).toHaveBeenCalledWith('month');
  });

  it('funciona con dos opciones', async () => {
    const dos = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] as const;
    await render(<Segmented options={dos} value="a" onChange={jest.fn()} />);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});
