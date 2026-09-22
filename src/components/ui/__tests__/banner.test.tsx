/**
 * Banner: mensajes en linea. Se anuncia como `alert` para que un lector de
 * pantalla lo lea sin que la persona tenga que buscarlo (kavi-design §5).
 */
import { render, screen } from '@testing-library/react-native';

import { Banner } from '@/components/ui/banner';


/**
 * RNTL no indexa por rol los `View` contenedores que no llevan `accessible`,
 * asi que el rol se comprueba sobre el arbol renderizado.
 */
const tieneRol = (rol: string) => JSON.stringify(screen.toJSON()).includes(`"accessibilityRole":"${rol}"`);

describe('Banner', () => {
  it('muestra el mensaje', async () => {
    await render(<Banner message="Credenciales incorrectas." />);
    expect(screen.getByText('Credenciales incorrectas.')).toBeTruthy();
  });

  it('se anuncia como alerta', async () => {
    await render(<Banner message="Algo salió mal." />);
    expect(tieneRol('alert')).toBe(true);
  });

  it.each(['error', 'success', 'info'] as const)('renderiza el tono %s', async (tone) => {
    await render(<Banner tone={tone} message="Mensaje" />);
    expect(screen.getByText('Mensaje')).toBeTruthy();
  });

  it('el tono por defecto es informativo', async () => {
    await render(<Banner message="Aviso" />);
    expect(tieneRol('alert')).toBe(true);
  });
});
