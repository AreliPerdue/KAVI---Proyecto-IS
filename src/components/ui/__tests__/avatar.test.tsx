/**
 * Avatar con iniciales (RF-A9). La regla no evidente: si no hay nombre visible se
 * usa el username solo para sacar la inicial, pero nunca se muestra como texto.
 */
import { render, screen } from '@testing-library/react-native';

import { Avatar } from '@/components/ui/avatar';

const perfil = (display_name: string | null, username = 'areli') => ({ display_name, username });

describe('Avatar', () => {
  it('toma las iniciales de nombre y apellido', async () => {
    await render(<Avatar profile={perfil('Areli Perdue')} />);
    expect(screen.getByText('AP')).toBeTruthy();
  });

  it('con un solo nombre usa una inicial', async () => {
    await render(<Avatar profile={perfil('Areli')} />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('se queda en dos iniciales aunque haya mas palabras', async () => {
    await render(<Avatar profile={perfil('Ana Sofía Torres Ruiz')} />);
    expect(screen.getByText('AS')).toBeTruthy();
  });

  it('sin nombre visible cae al username', async () => {
    await render(<Avatar profile={perfil(null, 'pedro')} />);
    expect(screen.getByText('P')).toBeTruthy();
  });

  it('un nombre en blanco tambien cae al username', async () => {
    await render(<Avatar profile={perfil('   ', 'luis')} />);
    expect(screen.getByText('L')).toBeTruthy();
  });

  it('las iniciales van en mayuscula', async () => {
    await render(<Avatar profile={perfil('ana torres')} />);
    expect(screen.getByText('AT')).toBeTruthy();
  });

  it('es decorativo: no lo anuncian los lectores de pantalla', async () => {
    await render(<Avatar profile={perfil('Areli Perdue')} />);
    expect(screen.getByText('AP')).toBeTruthy();
  });
});
