/**
 * Controles de fila y botones de icono. Todos comparten la misma exigencia de
 * kavi-design §5: etiqueta accesible obligatoria y area tactil suficiente, porque
 * un icono sin texto no se puede anunciar de otra forma.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ActionRow } from '@/components/ui/action-row';
import { Fab } from '@/components/ui/fab';
import { IconButton } from '@/components/ui/icon-button';
import { SettingsGroup, SettingsRow } from '@/components/ui/settings-row';

const Icono = () => <Text>·</Text>;

describe('IconButton', () => {
  it('se anuncia con la etiqueta obligatoria', async () => {
    await render(<IconButton label="Buscar" onPress={jest.fn()}><Icono /></IconButton>);
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeTruthy();
  });

  it('avisa al tocarlo', async () => {
    const onPress = jest.fn();
    await render(<IconButton label="Buscar" onPress={onPress}><Icono /></IconButton>);

    await fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no responde y lo comunica', async () => {
    const onPress = jest.fn();
    await render(<IconButton label="Buscar" disabled onPress={onPress}><Icono /></IconButton>);

    await fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button').props.accessibilityState.disabled).toBe(true);
  });

  it('tiene area tactil ampliada con hitSlop', async () => {
    await render(<IconButton label="Buscar" onPress={jest.fn()}><Icono /></IconButton>);
    expect(screen.getByRole('button').props.hitSlop).toBeDefined();
  });
});

describe('Fab', () => {
  it('usa una etiqueta por defecto descriptiva', async () => {
    await render(<Fab onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Nueva actividad' })).toBeTruthy();
  });

  it('acepta una etiqueta propia', async () => {
    await render(<Fab label="Nuevo entrenamiento" onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Nuevo entrenamiento' })).toBeTruthy();
  });

  it('avisa al tocarlo', async () => {
    const onPress = jest.fn();
    await render(<Fab onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ActionRow', () => {
  it('muestra la etiqueta', async () => {
    await render(<ActionRow icon={<Icono />} label="Eliminar" onPress={jest.fn()} />);
    expect(screen.getByText('Eliminar')).toBeTruthy();
  });

  it('avisa al tocarla', async () => {
    const onPress = jest.fn();
    await render(<ActionRow icon={<Icono />} label="Compartir" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Compartir' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitada no responde', async () => {
    const onPress = jest.fn();
    await render(<ActionRow icon={<Icono />} label="Compartir" disabled onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('acepta el color destructivo', async () => {
    await render(<ActionRow icon={<Icono />} label="Eliminar" color="danger" onPress={jest.fn()} />);
    expect(screen.getByText('Eliminar')).toBeTruthy();
  });
});

describe('SettingsRow', () => {
  it('muestra etiqueta y valor', async () => {
    await render(<SettingsRow icon={<Icono />} label="Temas" value="7" />);
    expect(screen.getByText('Temas')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('sin onPress es informativa, no un boton', async () => {
    await render(<SettingsRow icon={<Icono />} label="Versión" value="1.0.0" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('con onPress es un boton que avisa', async () => {
    const onPress = jest.fn();
    await render(<SettingsRow icon={<Icono />} label="Cerrar sesión" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('se anuncia con etiqueta y valor juntos', async () => {
    await render(<SettingsRow icon={<Icono />} label="Temas" value="7" onPress={jest.fn()} />);
    expect(screen.getByLabelText('Temas, 7')).toBeTruthy();
  });

  it('deshabilitada deja de ser interactiva', async () => {
    const onPress = jest.fn();
    await render(<SettingsRow icon={<Icono />} label="Admin" disabled onPress={onPress} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('muestra el hint en segunda linea', async () => {
    await render(<SettingsRow icon={<Icono />} label="Recordatorios" hint="Actívalos en Ajustes" />);
    expect(screen.getByText('Actívalos en Ajustes')).toBeTruthy();
  });

  it('un control propio a la derecha sustituye al valor', async () => {
    await render(
      <SettingsRow icon={<Icono />} label="Modo oscuro" value="Sí" right={<Text>control</Text>} />,
    );
    expect(screen.getByText('control')).toBeTruthy();
    expect(screen.queryByText('Sí')).toBeNull();
  });

  it('la etiqueta no envuelve', async () => {
    await render(<SettingsRow icon={<Icono />} label="Una etiqueta larguísima" />);
    expect(screen.getByText('Una etiqueta larguísima').props.numberOfLines).toBe(1);
  });
});

describe('SettingsGroup', () => {
  it('muestra el titulo del grupo', async () => {
    await render(
      <SettingsGroup title="Avisos">
        <SettingsRow icon={<Icono />} label="Recordatorios" />
      </SettingsGroup>,
    );
    expect(screen.getByText('Avisos')).toBeTruthy();
  });

  it('muestra el pie del grupo', async () => {
    await render(
      <SettingsGroup footer="Solo en este dispositivo">
        <SettingsRow icon={<Icono />} label="X" />
      </SettingsGroup>,
    );
    expect(screen.getByText('Solo en este dispositivo')).toBeTruthy();
  });

  it('renderiza todas las filas', async () => {
    await render(
      <SettingsGroup>
        <SettingsRow icon={<Icono />} label="Una" />
        <SettingsRow icon={<Icono />} label="Dos" />
        <SettingsRow icon={<Icono />} label="Tres" />
      </SettingsGroup>,
    );
    for (const t of ['Una', 'Dos', 'Tres']) expect(screen.getByText(t)).toBeTruthy();
  });

  it('descarta los hijos falsos (filas condicionales)', async () => {
    await render(
      <SettingsGroup>
        <SettingsRow icon={<Icono />} label="Visible" />
        {null}
        {false}
      </SettingsGroup>,
    );
    expect(screen.getByText('Visible')).toBeTruthy();
  });
});
