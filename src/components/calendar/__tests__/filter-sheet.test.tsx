/**
 * Filtros del calendario (RF-C11).
 *
 * Dimension y tema se combinan, no se excluyen, y el mismo estado alimenta las tres
 * vistas. El componente no guarda nada: emite el objeto de filtros completo, asi que
 * lo que se comprueba es que cada toque alterne un solo valor sin tocar el resto.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { FilterSheet } from '@/components/calendar/filter-sheet';
import type { CalendarFilters } from '@/store/calendar-store';
import type { Theme } from '@/types/domain';

const GIMNASIO = { id: 't1', name: 'Gimnasio', dimension: 'fisica', color: '#4CAF50', icon: 'dumbbell', owner_id: null, is_system: true, created_at: 'x' } as Theme;
const LECTURA = { id: 't2', name: 'Lectura', dimension: 'intelectual', color: '#2196F3', icon: 'book', owner_id: null, is_system: true, created_at: 'x' } as Theme;

let mockThemes: { data?: Theme[] } = { data: [GIMNASIO, LECTURA] };
jest.mock('@/hooks/use-themes', () => ({ useThemes: () => mockThemes }));

const VACIOS: CalendarFilters = { dimensions: [], themeIds: [] };

beforeEach(() => {
  mockThemes = { data: [GIMNASIO, LECTURA] };
});

const montar = async (filters: CalendarFilters = VACIOS) => {
  const onChange = jest.fn();
  const onClear = jest.fn();
  const onClose = jest.fn();
  await render(<FilterSheet visible filters={filters} onChange={onChange} onClear={onClear} onClose={onClose} />);
  return { onChange, onClear, onClose };
};

describe('lo que ofrece', () => {
  it('estan las 7 dimensiones del bienestar', async () => {
    await montar();
    for (const nombre of ['Física', 'Emocional', 'Social', 'Intelectual', 'Espiritual', 'Financiera', 'Ocupacional']) {
      expect(screen.getByLabelText(nombre)).toBeTruthy();
    }
  });

  it('estan los temas del usuario', async () => {
    await montar();
    expect(screen.getByLabelText('Gimnasio')).toBeTruthy();
    expect(screen.getByLabelText('Lectura')).toBeTruthy();
  });

  it('sin temas cargados no revienta', async () => {
    mockThemes = { data: undefined };
    await montar();
    expect(screen.getByLabelText('Física')).toBeTruthy();
  });
});

describe('dimensiones', () => {
  it('tocar una la activa', async () => {
    const { onChange } = await montar();

    await fireEvent.press(screen.getByLabelText('Física'));

    expect(onChange).toHaveBeenCalledWith({ dimensions: ['fisica'], themeIds: [] });
  });

  it('tocar una activa la apaga', async () => {
    const { onChange } = await montar({ dimensions: ['fisica'], themeIds: [] });

    await fireEvent.press(screen.getByLabelText('Física'));

    expect(onChange).toHaveBeenCalledWith({ dimensions: [], themeIds: [] });
  });

  it('se pueden acumular varias', async () => {
    const { onChange } = await montar({ dimensions: ['fisica'], themeIds: [] });

    await fireEvent.press(screen.getByLabelText('Social'));

    expect(onChange).toHaveBeenCalledWith({ dimensions: ['fisica', 'social'], themeIds: [] });
  });

  it('las activas se ven marcadas', async () => {
    await montar({ dimensions: ['fisica'], themeIds: [] });
    expect(screen.getByLabelText('Física').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Social').props.accessibilityState.selected).toBe(false);
  });
});

describe('temas', () => {
  it('tocar uno lo activa', async () => {
    const { onChange } = await montar();

    await fireEvent.press(screen.getByLabelText('Gimnasio'));

    expect(onChange).toHaveBeenCalledWith({ dimensions: [], themeIds: ['t1'] });
  });

  it('tocar uno activo lo apaga', async () => {
    const { onChange } = await montar({ dimensions: [], themeIds: ['t1'] });

    await fireEvent.press(screen.getByLabelText('Gimnasio'));

    expect(onChange).toHaveBeenCalledWith({ dimensions: [], themeIds: [] });
  });

  it('filtrar por tema no borra el filtro de dimension: se combinan', async () => {
    const { onChange } = await montar({ dimensions: ['fisica'], themeIds: [] });

    await fireEvent.press(screen.getByLabelText('Lectura'));

    expect(onChange).toHaveBeenCalledWith({ dimensions: ['fisica'], themeIds: ['t2'] });
  });
});

describe('acciones', () => {
  it('sin filtros activos no se ofrece limpiar', async () => {
    await montar();
    expect(screen.queryByText('Limpiar filtros')).toBeNull();
  });

  it('con una dimension activa si aparece', async () => {
    await montar({ dimensions: ['fisica'], themeIds: [] });
    expect(screen.getByText('Limpiar filtros')).toBeTruthy();
  });

  it('con solo un tema activo tambien', async () => {
    await montar({ dimensions: [], themeIds: ['t1'] });
    expect(screen.getByText('Limpiar filtros')).toBeTruthy();
  });

  it('limpiar avisa al calendario', async () => {
    const { onClear } = await montar({ dimensions: ['fisica'], themeIds: [] });

    await fireEvent.press(screen.getByText('Limpiar filtros'));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('"Listo" cierra la hoja', async () => {
    const { onClose } = await montar();

    await fireEvent.press(screen.getByText('Listo'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
