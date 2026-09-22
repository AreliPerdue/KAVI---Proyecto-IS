/**
 * Picker de temas (RF-T1).
 *
 * Los temas se ensenan agrupados por dimension del bienestar, que es el lenguaje con
 * el que KAVI clasifica el tiempo. Lo que mas se prueba aqui es la busqueda: tiene
 * que ignorar acentos —nadie escribe "Física" con tilde en un buscador— y encontrar
 * tanto por nombre del tema como por nombre de la dimension.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemePicker } from '@/components/calendar/theme-picker';
import type { Theme } from '@/types/domain';

const tema = (over: Partial<Theme>): Theme =>
  ({ id: 't', name: 'Tema', dimension: 'fisica', color: '#4CAF50', icon: 'dumbbell', owner_id: null, is_system: true, created_at: 'x', ...over }) as Theme;

const GIMNASIO = tema({ id: 't1', name: 'Gimnasio', dimension: 'fisica' });
const LECTURA = tema({ id: 't2', name: 'Lectura', dimension: 'intelectual', color: '#2196F3', icon: 'book' });
const FAMILIA = tema({ id: 't3', name: 'Familia', dimension: 'social', color: '#FF9800', icon: 'users' });

let mockThemes: { data?: Theme[]; isPending: boolean; isSuccess: boolean } = {
  data: [GIMNASIO, LECTURA, FAMILIA], isPending: false, isSuccess: true,
};

jest.mock('@/hooks/use-themes', () => ({
  ...(jest.requireActual('@/hooks/use-themes') as object),
  useThemes: () => mockThemes,
}));

beforeEach(() => {
  mockThemes = { data: [GIMNASIO, LECTURA, FAMILIA], isPending: false, isSuccess: true };
  globalThis.mockRouter.push.mockClear();
});

const montar = async (value: string | null = null) => {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  await render(<ThemePicker visible value={value} onSelect={onSelect} onClose={onClose} />);
  return { onSelect, onClose };
};

describe('listado', () => {
  it('muestra los temas disponibles', async () => {
    await montar();
    expect(screen.getByLabelText('Gimnasio')).toBeTruthy();
    expect(screen.getByLabelText('Lectura')).toBeTruthy();
  });

  it('los agrupa bajo el nombre de su dimension', async () => {
    await montar();
    expect(screen.getByText('Física')).toBeTruthy();
    expect(screen.getByText('Intelectual')).toBeTruthy();
  });

  it('ofrece siempre la opcion de no poner tema (RF-T4)', async () => {
    await montar();
    expect(screen.getByText('Sin tema')).toBeTruthy();
  });

  it('mientras cargan lo dice', async () => {
    mockThemes = { data: undefined, isPending: true, isSuccess: false };
    await montar();
    expect(screen.getByText(/cargando temas/i)).toBeTruthy();
  });

  it('marca cual esta elegido', async () => {
    await montar('t2');
    expect(screen.getByLabelText('Lectura').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Gimnasio').props.accessibilityState.selected).toBe(false);
  });
});

describe('elegir', () => {
  it('tocar un tema lo devuelve entero, no solo su id', async () => {
    const { onSelect } = await montar();

    await fireEvent.press(screen.getByLabelText('Gimnasio'));

    expect(onSelect).toHaveBeenCalledWith(GIMNASIO);
  });

  it('"Sin tema" devuelve null', async () => {
    const { onSelect } = await montar('t1');

    await fireEvent.press(screen.getByText('Sin tema'));

    expect(onSelect).toHaveBeenCalledWith(null);
  });
});

describe('busqueda', () => {
  const buscar = async (texto: string) => {
    await fireEvent.changeText(screen.getByLabelText('Buscar'), texto);
  };

  it('filtra por nombre del tema', async () => {
    await montar();

    await buscar('gim');

    expect(screen.getByLabelText('Gimnasio')).toBeTruthy();
    expect(screen.queryByLabelText('Lectura')).toBeNull();
  });

  it('ignora mayusculas', async () => {
    await montar();
    await buscar('LECTURA');
    expect(screen.getByLabelText('Lectura')).toBeTruthy();
  });

  /** "Física" lleva tilde; quien busca escribe "fisica". */
  it('ignora acentos', async () => {
    await montar();

    await buscar('fisica');

    expect(screen.getByLabelText('Gimnasio')).toBeTruthy();
    expect(screen.queryByLabelText('Lectura')).toBeNull();
  });

  it('tambien encuentra por el nombre de la dimension', async () => {
    await montar();

    await buscar('social');

    expect(screen.getByLabelText('Familia')).toBeTruthy();
    expect(screen.queryByLabelText('Gimnasio')).toBeNull();
  });

  it('esconde las dimensiones que se quedan sin temas', async () => {
    await montar();

    await buscar('gimnasio');

    expect(screen.queryByText('Intelectual')).toBeNull();
  });

  it('sin coincidencias lo dice en vez de dejar el hueco vacio', async () => {
    await montar();

    await buscar('zzz');

    expect(screen.getByText(/no hay temas con ese nombre/i)).toBeTruthy();
  });

  it('borrar la busqueda devuelve la lista completa', async () => {
    await montar();

    await buscar('gim');
    await buscar('');

    expect(screen.getByLabelText('Lectura')).toBeTruthy();
  });

  it('los espacios sobrantes no cuentan', async () => {
    await montar();
    await buscar('  gimnasio  ');
    expect(screen.getByLabelText('Gimnasio')).toBeTruthy();
  });
});

describe('gestionar temas', () => {
  it('cierra el picker antes de navegar, para no dejarlo abierto detras', async () => {
    const { onClose } = await montar();

    await fireEvent.press(screen.getByText('Gestionar mis temas'));

    expect(onClose).toHaveBeenCalled();
    expect(globalThis.mockRouter.push).toHaveBeenCalledWith('/(app)/themes');
  });
});
