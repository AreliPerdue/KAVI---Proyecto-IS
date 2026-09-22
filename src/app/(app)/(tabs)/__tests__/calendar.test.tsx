/**
 * Pantalla del calendario (spec 04). Es la pantalla central del producto.
 *
 * Las vistas mes/semana/dia se prueban aparte; aqui se comprueba la
 * orquestacion: que vista se pinta, los estados de carga y error, a donde
 * navega cada gesto, y la regla de RF-S15 — con calendarios superpuestos el
 * color pasa a ser el de la persona, porque es lo unico que permite ver de
 * quien es cada bloque.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockSnackbar = jest.fn();
const mockExtend = jest.fn().mockResolvedValue(undefined);
let mockActividades: Record<string, unknown>;
let mockContactos: Record<string, unknown>;
let mockDisponibilidad: Record<string, unknown>;

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
jest.mock('@/services/activities', () => ({ extendRecurrenceHorizon: () => mockExtend() }));

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

  const vista = (nombre: string) => (props: {
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

const actividad = (over = {}) => ({
  id: 'a1', title: 'Junta', owner_id: 'u1', color: '#4CAF50',
  start_at: new Date(2026, 8, 7, 9).toISOString(), end_at: new Date(2026, 8, 7, 10).toISOString(),
  all_day: false, ...over,
});

beforeEach(() => {
  mockSnackbar.mockReset();
  mockExtend.mockClear();
  mockActividades = { data: [], isPending: false, isError: false, isSuccess: true, error: null, refetch: jest.fn() };
  mockContactos = { data: [] };
  mockDisponibilidad = { data: null };
  useCalendarStore.setState({ view: 'month', anchorKey: '2026-09-07', filters: { dimensions: [], themeIds: [] }, overlayUserIds: [] });
});

describe('vista activa', () => {
  it('abre en mensual', async () => {
    await render(<Pantalla />);
    expect(screen.getByText('vista-mes')).toBeTruthy();
  });

  it('cambia a semanal segun el estado', async () => {
    useCalendarStore.setState({ view: 'week' });
    await render(<Pantalla />);
    expect(screen.getByText('vista-semana')).toBeTruthy();
  });

  it('cambia a diaria segun el estado', async () => {
    useCalendarStore.setState({ view: 'day' });
    await render(<Pantalla />);
    expect(screen.getByText('vista-dia')).toBeTruthy();
  });
});

describe('estados', () => {
  it('mientras carga no pinta ninguna vista', async () => {
    mockActividades = { ...mockActividades, isPending: true, isSuccess: false };
    await render(<Pantalla />);
    expect(screen.queryByText('vista-mes')).toBeNull();
  });

  it('si falla muestra el error con reintentar', async () => {
    const refetch = jest.fn();
    mockActividades = { data: undefined, isPending: false, isError: true, isSuccess: false, error: new Error('Sin conexión.'), refetch };
    await render(<Pantalla />);

    expect(screen.getByText('Sin conexión.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('en vista diaria el aviso de vacio no tapa la rejilla', async () => {
    useCalendarStore.setState({ view: 'day' });
    await render(<Pantalla />);

    expect(screen.getByText(/toca una hora para agendar/i)).toBeTruthy();
    expect(screen.getByText('vista-dia')).toBeTruthy();
  });

  it('con actividades no muestra el aviso de vacio', async () => {
    useCalendarStore.setState({ view: 'day' });
    mockActividades = { ...mockActividades, data: [actividad()] };
    await render(<Pantalla />);

    expect(screen.queryByText(/toca una hora para agendar/i)).toBeNull();
  });
});

describe('navegacion', () => {
  it('tocar una actividad propia abre su detalle', async () => {
    mockActividades = { ...mockActividades, data: [actividad()] };
    useCalendarStore.setState({ view: 'week' });
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('abrir Junta'));

    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(app)/activity/[id]', params: { id: 'a1' },
    });
  });

  it('tocar un hueco abre el alta con dia y hora', async () => {
    useCalendarStore.setState({ view: 'week' });
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('tocar hueco'));

    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(app)/activity/new', params: { date: '2026-09-07', start: '540' },
    });
  });

  it('tocar un dia en mensual abre la vista diaria sin cambiar la preferida', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('tocar hueco'));

    expect(useCalendarStore.getState().view).toBe('day');
    expect(useCalendarStore.getState().anchorKey).toBe('2026-09-07');
  });
});

describe('calendarios superpuestos (RF-S15)', () => {
  beforeEach(() => {
    mockContactos = { data: [{ kind: 'accepted', theirCalendarVisibility: 'busy', profile: { id: 'u2', display_name: 'Ana' } }] };
    mockDisponibilidad = { data: [{ start_at: 'x', end_at: 'y', owner_id: 'u2' }] };
    useCalendarStore.setState({ view: 'week', overlayUserIds: ['u2'] });
  });

  it('una actividad ajena no abre el detalle: avisa que es de solo lectura', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('abrir Ocupado'));

    await waitFor(() => expect(mockSnackbar).toHaveBeenCalled());
    expect(String(mockSnackbar.mock.calls[0][0].message)).toMatch(/solo lectura/i);
    expect(globalThis.mockRouter.push).not.toHaveBeenCalled();
  });

  it('con personas superpuestas el color pasa a ser el de cada persona', async () => {
    mockActividades = { ...mockActividades, data: [actividad()] };
    await render(<Pantalla />);

    expect(screen.getByText('Junta|#4C8DFF')).toBeTruthy();
  });

  it('sin superponer a nadie vuelve el color del tema', async () => {
    useCalendarStore.setState({ overlayUserIds: [] });
    mockActividades = { ...mockActividades, data: [actividad()] };
    await render(<Pantalla />);

    expect(screen.getByText('Junta|#4CAF50')).toBeTruthy();
  });

  it('se ignora a quien dejo de compartir, sin tener que limpiar la seleccion', async () => {
    mockContactos = { data: [{ kind: 'accepted', theirCalendarVisibility: null, profile: { id: 'u2' } }] };
    mockActividades = { ...mockActividades, data: [actividad()] };
    await render(<Pantalla />);

    expect(screen.getByText('Junta|#4CAF50')).toBeTruthy();
  });
});

describe('filtros', () => {
  it('informa cuantos hay activos', async () => {
    useCalendarStore.setState({ filters: { dimensions: ['fisica'], themeIds: ['t1'] } });
    await render(<Pantalla />);

    expect(screen.getByText('filtros:2')).toBeTruthy();
  });

  it('la hoja de filtros empieza cerrada y se abre', async () => {
    await render(<Pantalla />);
    expect(screen.queryByText('hoja de filtros')).toBeNull();

    await fireEvent.press(screen.getByLabelText('abrir filtros'));

    await waitFor(() => expect(screen.getByText('hoja de filtros')).toBeTruthy());
  });
});

describe('horizonte de recurrencia (plan §4)', () => {
  it('se extiende al abrir el calendario', async () => {
    await render(<Pantalla />);
    await waitFor(() => expect(mockExtend).toHaveBeenCalled());
  });
});
