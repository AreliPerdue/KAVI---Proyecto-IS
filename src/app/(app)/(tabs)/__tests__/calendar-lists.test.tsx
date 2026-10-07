/**
 * Lists dentro del calendario (RF-L12, RF-L18, RF-L27): la franja de pendientes del día en la
 * vista diaria, los vencidos solo hoy, y el panel lateral en web ancho en lugar de la franja.
 * Las vistas del calendario son dobles; la franja y el panel son los reales.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { toDayKey } from '@/lib/dates';

const mockSnackbar = jest.fn();
const mockExtend = jest.fn().mockResolvedValue(undefined);
let mockActividades: Record<string, unknown>;
let mockContactos: Record<string, unknown>;
let mockDisponibilidad: Record<string, unknown>;

let mockPerfil: { data?: unknown } = { data: null };
let mockEntrenamientos: { data?: unknown[] } = { data: [] };

jest.mock('@/providers', () => ({
  useSnackbar: () => mockSnackbar,
  useAuth: () => ({ userId: 'u1' }),
}));
jest.mock('@/hooks/use-activities-range', () => ({
  activityKeys: { all: ['activities'] },
  useActivitiesRange: () => mockActividades,
  usePrefetchAdjacentRanges: () => undefined,
}));
jest.mock('@/hooks/use-connections', () => ({
  useContacts: () => mockContactos,
  usePeopleColors: () => new Map([['u1', '#4C8DFF'], ['u2', '#B06BFF']]),
}));
jest.mock('@/hooks/use-availability', () => ({ useAvailability: () => mockDisponibilidad }));
// Capas derivadas del calendario: entrenamientos y cumpleaños (RF-F10, RF-A10).
jest.mock('@/hooks/use-profile', () => ({ useMyProfile: () => mockPerfil }));
jest.mock('@/hooks/use-workouts', () => ({ useWorkouts: () => mockEntrenamientos }));
jest.mock('@/services/activities', () => ({ extendRecurrenceHorizon: () => mockExtend() }));
// Lists en el calendario (RF-L12, RF-L26): aquí solo importa que no estorben. Sin
// pendientes ni rutinas, la franja y el panel no se dibujan.
const mockToggle = jest.fn();
const mockReschedule = jest.fn();
let mockListasDatos: { lists: unknown[]; delDia: unknown[]; vencidos: unknown[] } = { lists: [], delDia: [], vencidos: [] };
/** Con qué `enabled` se pidieron los vencidos: la pantalla solo los quiere si el día es hoy. */
const mockPidioVencidos = jest.fn();
let mockDims = { width: 390, height: 800, scale: 2, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => mockDims }));
jest.mock('@/hooks/use-lists', () => ({
  useLists: () => ({ data: mockListasDatos.lists, isSuccess: true }),
  useListItemsByDate: (desde: string, hasta: string, enabled = true) => ({ data: enabled && desde === hasta ? mockListasDatos.delDia : [], isSuccess: true }),
  useOverdueListItems: (_hoy: string, enabled: boolean) => {
    mockPidioVencidos(enabled);
    return { data: enabled ? mockListasDatos.vencidos : undefined, isSuccess: true };
  },
  useListRunsByDate: () => ({ data: [], isSuccess: true }),
  useListMutations: () => ({ toggleItem: { mutate: mockToggle }, reschedule: { mutate: mockReschedule } }),
}));

/**
 * Las vistas del calendario se prueban por separado. Aqui cada una se sustituye
 * por un marcador que dice cual se pinto, cuantas actividades recibio y con que
 * color, y que permite disparar sus callbacks.
 *
 * Nota: dentro de una fabrica de `jest.mock` no se pueden usar aserciones de
 * tipo con funciones (`as (x: unknown) => void`); Babel las lee como acceso a
 * variables de fuera. Por eso los props van tipados en la firma.
 */
jest.mock('@/components/calendar', () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- las fabricas de jest.mock se elevan */
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */

  const vista = (nombre: string) => {
    const Vista = (props: {
    activities?: { id: string; title: string; color?: string }[];
    onPressActivity?: (a: unknown) => void;
    onPressSlot?: (dia: Date, minutos?: number) => void;
    onSelectDay?: (dia: Date) => void;
  }) => {
    const actividades = props.activities ?? [];
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, nombre),
      ...actividades.map((a) =>
        React.createElement(
          Pressable,
          {
            key: a.id,
            accessibilityRole: 'button',
            accessibilityLabel: `abrir ${a.title}`,
            onPress: () => props.onPressActivity?.(a),
          },
          React.createElement(Text, null, `${a.title}|${a.color ?? 'sin-color'}`),
        ),
      ),
      React.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: 'tocar hueco',
          onPress: () => {
            if (props.onPressSlot) props.onPressSlot(new Date(2026, 8, 7), 540);
            else props.onSelectDay?.(new Date(2026, 8, 7));
          },
        },
        React.createElement(Text, null, 'hueco'),
      ),
    );
    };
    Vista.displayName = nombre;
    return Vista;
  };

  return {
    MonthView: vista('vista-mes'),
    WeekView: vista('vista-semana'),
    DayView: vista('vista-dia'),
    CalendarHeader: (props: { activeFilterCount: number; onOpenFilters: () => void }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, `filtros:${props.activeFilterCount}`),
        React.createElement(
          Pressable,
          { accessibilityRole: 'button', accessibilityLabel: 'abrir filtros', onPress: props.onOpenFilters },
          React.createElement(Text, null, 'filtros'),
        ),
      ),
    DueRemindersBanner: () => null,
    FilterSheet: (props: { visible: boolean }) =>
      props.visible ? React.createElement(Text, null, 'hoja de filtros') : null,
    applyFilters: (actividades: unknown[]) => actividades,
  };
});

/** Superposicion de calendarios: vive en su propio modulo, no en el indice. */
jest.mock('@/components/calendar/overlay', () => ({
  blocksToActivities: () => [
    { id: 'ov1', title: 'Ocupado', owner_id: 'u2', owner_name: 'Ana', color: '#000000', __overlay: true },
  ],
  isOverlayActivity: (a: { __overlay?: boolean }) => !!a.__overlay,
}));

jest.mock('@/components/calendar/people-tabs', () => {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- fabrica elevada */
  const React = require('react');
  return { PeopleTabs: () => React.createElement(React.Fragment, null) };
});

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/(tabs)/calendar').default as () => React.ReactElement;
/* eslint-disable-next-line @typescript-eslint/no-require-imports -- idem */
const { useCalendarStore } = require('@/store/calendar-store') as typeof import('@/store/calendar-store');

beforeEach(() => {
  mockSnackbar.mockReset();
  mockExtend.mockClear();
  mockActividades = { data: [], isPending: false, isError: false, isSuccess: true, error: null, refetch: jest.fn() };
  mockContactos = { data: [] };
  mockDisponibilidad = { data: null };
  useCalendarStore.setState({ view: 'month', anchorKey: '2026-09-07', filters: { dimensions: [], themeIds: [], onlyListItems: false }, overlayUserIds: [] });
});

const LISTA = { id: 'l1', name: 'Casa', color: '#4CAF50', icon: 'home', archived_at: null, recurrence_rule: null };
const item = (over = {}) => ({
  id: 'i1', list_id: 'l1', section_id: null, title: 'Arreglar la puerta', notes: null, sort_order: 1024,
  due_date: toDayKey(new Date()), due_time: '10:00', completed_at: null, created_at: 'x', updated_at: 'x', ...over,
});
const hoy = () => toDayKey(new Date());
const plataforma = Platform.OS;

// La primera hidratación del store pone la vista guardada; se hace antes para que no pise la de cada prueba.
beforeAll(async () => {
  await useCalendarStore.getState().hydrate();
});

beforeEach(() => {
  mockToggle.mockReset();
  mockReschedule.mockReset();
  mockPidioVencidos.mockReset();
  mockListasDatos = { lists: [LISTA], delDia: [], vencidos: [] };
  mockDims = { width: 390, height: 800, scale: 2, fontScale: 1 };
  useCalendarStore.setState({ view: 'day', anchorKey: hoy() });
});
afterEach(() => Object.defineProperty(Platform, 'OS', { value: plataforma, configurable: true }));

const franja = () => screen.queryByRole('button', { name: /^Listas, \d+ pendientes?$/ });

describe('franja de pendientes del día (RF-L12)', () => {
  it('sin pendientes del día no se dibuja', async () => {
    await render(<Pantalla />);
    expect(franja()).toBeNull();
    expect(screen.getByText('vista-dia')).toBeTruthy();
  });

  it('un pendiente con fecha y hora va en la franja y no en la rejilla', async () => {
    mockListasDatos.delDia = [item()];
    await render(<Pantalla />);
    expect(franja()).toBeTruthy();
    expect(screen.getByText('Arreglar la puerta')).toBeTruthy();
    // La rejilla (doble) solo pinta sus actividades: el pendiente no está entre ellas.
    expect(screen.queryByRole('button', { name: 'abrir Arreglar la puerta' })).toBeNull();
  });

  it('palomear desde la franja marca esa misma fila', async () => {
    mockListasDatos.delDia = [item()];
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Marcar Arreglar la puerta como hecho' }));
    expect(mockToggle).toHaveBeenCalledWith({ id: 'i1', done: true });
  });

  it('tocar el texto abre su lista y no lo palomea', async () => {
    mockListasDatos.delDia = [item()];
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: 'Abrir Casa: Arreglar la puerta' }));
    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/list/[id]', params: { id: 'l1' } });
    expect(mockToggle).not.toHaveBeenCalled();
  });
});

describe('vencidos (RF-L18)', () => {
  const vencido = () => item({ id: 'v1', title: 'Pagar luz', due_date: '2026-01-02', due_time: null });

  it('hoy se muestran arriba y "Reprogramar para hoy" los mueve todos', async () => {
    mockListasDatos.vencidos = [vencido(), item({ id: 'v2', title: 'Llamar', due_date: '2026-01-03' })];
    await render(<Pantalla />);
    expect(screen.getByText('Pagar luz')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Reprogramar/ }));
    expect(mockReschedule).toHaveBeenCalledWith({ ids: ['v1', 'v2'], dueDate: hoy() });
  });

  it('al abrir un día que no es hoy no se muestran (ni se piden)', async () => {
    mockListasDatos.vencidos = [vencido()];
    useCalendarStore.setState({ anchorKey: '2026-03-15' });
    await render(<Pantalla />);
    expect(screen.queryByText('Pagar luz')).toBeNull();
    expect(mockPidioVencidos).toHaveBeenLastCalledWith(false);
  });
});

describe('panel lateral en web (RF-L27)', () => {
  it.each([
    [900, true],
    [899, false],
  ])('a %i px: panel %s, franja al revés', async (ancho, conPanel) => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    mockDims = { width: ancho, height: 800, scale: 1, fontScale: 1 };
    mockListasDatos.delDia = [item()];
    await render(<Pantalla />);
    expect(!!screen.queryByText('Tus listas')).toBe(conPanel);
    expect(!!franja()).toBe(!conPanel);
  });

  it('en el teléfono nunca hay panel, aunque la pantalla sea ancha', async () => {
    mockDims = { width: 1200, height: 800, scale: 2, fontScale: 1 };
    mockListasDatos.delDia = [item()];
    await render(<Pantalla />);
    expect(screen.queryByText('Tus listas')).toBeNull();
    expect(franja()).toBeTruthy();
  });
});
