/**
 * TextField: el campo de todos los formularios. Se fija el contrato de error/hint
 * —que error gana sobre hint y se anuncia— y el boton de mostrar contrasena.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextField } from '@/components/ui/text-field';

/**
 * RNTL 14 excluye de las consultas los elementos que considera inaccesibles
 * —un TextInput no editable o con `secureTextEntry`—, asi que para inspeccionar
 * sus props hay que pedirlos explicitamente.
 */
const campo = (label: string) => screen.getByLabelText(label, { includeHiddenElements: true });

describe('TextField', () => {
  it('muestra la etiqueta', async () => {
    await render(<TextField label="Correo" />);
    expect(screen.getByText('Correo')).toBeTruthy();
  });

  it('el campo se anuncia con la etiqueta', async () => {
    await render(<TextField label="Correo" />);
    expect(screen.getByLabelText('Correo')).toBeTruthy();
  });

  it('la etiqueta no envuelve, para no desalinear filas de dos columnas', async () => {
    await render(<TextField label="Duración" />);
    expect(screen.getByText('Duración').props.numberOfLines).toBe(1);
  });

  it('muestra el hint cuando no hay error', async () => {
    await render(<TextField label="Usuario" hint="Sin arroba" />);
    expect(screen.getByText('Sin arroba')).toBeTruthy();
  });

  it('el error sustituye al hint', async () => {
    await render(<TextField label="Usuario" hint="Sin arroba" error="Ya está en uso" />);
    expect(screen.getByText('Ya está en uso')).toBeTruthy();
    expect(screen.queryByText('Sin arroba')).toBeNull();
  });

  it('el error se anuncia a los lectores de pantalla', async () => {
    await render(<TextField label="Usuario" error="Ya está en uso" />);
    expect(screen.getByText('Ya está en uso').props.accessibilityLiveRegion).toBe('polite');
  });

  it('sin mensaje no pinta nada debajo', async () => {
    await render(<TextField label="Correo" />);
    expect(screen.queryByText('Sin arroba')).toBeNull();
  });

  it('propaga el texto escrito', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Correo" onChangeText={onChangeText} />);

    await fireEvent.changeText(screen.getByLabelText('Correo'), 'areli@kavi.app');

    expect(onChangeText).toHaveBeenCalledWith('areli@kavi.app');
  });

  it('avisa del foco y del blur sin tragarse los callbacks', async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    await render(<TextField label="Correo" onFocus={onFocus} onBlur={onBlur} />);
    const campo = screen.getByLabelText('Correo');

    await fireEvent(campo, 'focus');
    await fireEvent(campo, 'blur');

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('un campo seguro nace oculto', async () => {
    await render(<TextField label="Contraseña" secure />);
    // RNTL considera "oculto" al campo con secureTextEntry, de ahi la opcion.
    expect(campo('Contraseña').props.secureTextEntry).toBe(true);
  });

  it('el boton del ojo revela y vuelve a ocultar', async () => {
    await render(<TextField label="Contraseña" secure />);

    await fireEvent.press(screen.getByLabelText('Mostrar contraseña'));
    expect(campo('Contraseña').props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByLabelText('Ocultar contraseña'));
    expect(campo('Contraseña').props.secureTextEntry).toBe(true);
  });

  it('un campo normal no trae boton de ojo', async () => {
    await render(<TextField label="Correo" />);
    expect(screen.queryByLabelText('Mostrar contraseña')).toBeNull();
  });

  it('no editable se refleja en el campo', async () => {
    await render(<TextField label="Correo" editable={false} />);
    expect(campo('Correo').props.editable).toBe(false);
  });

  it('deja pasar el tipo de teclado', async () => {
    await render(<TextField label="Correo" keyboardType="email-address" />);
    expect(campo('Correo').props.keyboardType).toBe('email-address');
  });
});
