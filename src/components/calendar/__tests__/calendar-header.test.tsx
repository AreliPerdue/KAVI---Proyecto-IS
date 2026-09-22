/**
 * Cabecera del calendario (RF-C4). Concentra la navegacion entre periodos, el
 * cambio de vista y los filtros, y cada control se anuncia con su estado actual:
 * el icono de filtros dice cuantos hay activos, no solo que existe.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { CalendarHeader } from '@/components/calendar/calendar-header';

const ANCLA = new Date(2026, 8, 7);

const montar = (props: Partial<Parameters<typeof CalendarHeader>[0]> = {}) =>
  render(
    <CalendarHeader
      view="month"
      anchor={ANCLA}
      onChangeView={jest.fn()}
      onChangeAnchor={jest.fn()}
      onPrev={jest.fn()}
      onNext={jest.fn()}
      onToday={jest.fn()}
      onOpenFilters={jest.fn()}
      activeFilterCount={0}
      {...props}
    />,
  );

describe('titulo del periodo', () => {
  it('en mensual muestra mes y ano', async () => {
    await montar();
    expect(screen.getByText('Septiembre 2026')).toBeTruthy();
  });

  it('en semanal muestra el rango', async () => {
    await montar({ view: 'week' });
    expect(screen.getByText('7 – 13 sep 2026')).toBeTruthy();
  });

  it('en diaria muestra el dia completo', async () => {
    await montar({ view: 'day' });
    expect(screen.getByText('Lunes 7 de septiembre')).toBeTruthy();
  });

  it('el titulo abre el selector de fecha', async () => {
    await montar();

    await fireEvent.press(screen.getByLabelText(/cambiar de fecha/i));

    await waitFor(() => expect(screen.getByText('Ir a una fecha')).toBeTruthy());
  });
});

describe('navegacion', () => {
  it('ofrece anterior y siguiente', async () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    await montar({ onPrev, onNext });

    await fireEvent.press(screen.getByLabelText('Anterior'));
    await fireEvent.press(screen.getByLabelText('Siguiente'));

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('ofrece volver a hoy', async () => {
    const onToday = jest.fn();
    await montar({ onToday });

    await fireEvent.press(screen.getByLabelText('Ir a hoy'));

    expect(onToday).toHaveBeenCalledTimes(1);
  });
});

describe('cambio de vista', () => {
  it('el control dice cual esta activa', async () => {
    await montar({ view: 'week' });
    expect(screen.getByLabelText(/vista: semana/i)).toBeTruthy();
  });

  it('abre el menu de vistas', async () => {
    await montar();

    await fireEvent.press(screen.getByLabelText(/cambiar vista/i));

    await waitFor(() => expect(screen.getByText('Vista')).toBeTruthy());
  });
});

describe('filtros', () => {
  it('sin filtros activos solo dice "Filtros"', async () => {
    await montar();
    expect(screen.getByLabelText('Filtros')).toBeTruthy();
  });

  it('con filtros activos dice cuantos', async () => {
    await montar({ activeFilterCount: 3 });
    expect(screen.getByLabelText('Filtros, 3 activos')).toBeTruthy();
  });

  it('abre la hoja de filtros', async () => {
    const onOpenFilters = jest.fn();
    await montar({ onOpenFilters });

    await fireEvent.press(screen.getByLabelText('Filtros'));

    expect(onOpenFilters).toHaveBeenCalledTimes(1);
  });
});
