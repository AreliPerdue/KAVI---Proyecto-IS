/**
 * Modo daltonismo en el calendario (spec 05, RF-T8 – RF-T10): los bloques de otra persona llevan su inicial, y
 * con el modo apagado todo se ve como siempre.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ActivityBlock } from '@/components/calendar/activity-block';
import { AgendaView } from '@/components/calendar/agenda-view';
import { MonthView } from '@/components/calendar/month-view';
import { ColorblindColors, Colors } from '@/constants/theme';
import { ThemeSchemeProvider, useTheme } from '@/hooks/use-theme';
import type { Activity } from '@/types/domain';

const actividad = (over: Partial<Activity> = {}): Activity =>
  ({
    id: 'a1', owner_id: 'u2', owner_name: 'Ana', title: 'Cena', description: null, theme_id: null,
    dimension: 'social', color: '#CCBB44', icon: 'users', all_day: false, is_gym: false, visibility: 'default',
    recurrence_rule: null, recurrence_parent_id: null, created_at: 'x', updated_at: 'x',
    start_at: new Date(2026, 8, 7, 20).toISOString(),
    end_at: new Date(2026, 8, 7, 21).toISOString(),
    ...over,
  }) as Activity;

/** La inicial no se lee en voz alta (el bloque ya dice de quién es), así que se busca entre lo oculto. */
const OCULTOS = { includeHiddenElements: true };

const con = (colorblind: boolean, hijo: React.ReactElement) => (
  <ThemeSchemeProvider scheme="dark" colorblind={colorblind}>
    {hijo}
  </ThemeSchemeProvider>
);

describe('bloque de la semana y el día', () => {
  it('el de otra persona lleva su inicial con el modo encendido', async () => {
    await render(con(true, <ActivityBlock activity={actividad()} onPress={jest.fn()} shared />));
    expect(screen.getByText('A', OCULTOS)).toBeTruthy();
  });

  it('también en el bloque angosto de la semana en el teléfono', async () => {
    await render(con(true, <ActivityBlock activity={actividad()} onPress={jest.fn()} shared compact />));
    expect(screen.getByText('A', OCULTOS)).toBeTruthy();
  });

  it('el mío no lleva inicial', async () => {
    await render(con(true, <ActivityBlock activity={actividad({ owner_name: undefined })} onPress={jest.fn()} />));
    expect(screen.queryByText('A', OCULTOS)).toBeNull();
  });

  it('con el modo apagado no cambia nada', async () => {
    await render(con(false, <ActivityBlock activity={actividad()} onPress={jest.fn()} shared />));
    expect(screen.queryByText('A', OCULTOS)).toBeNull();
  });
});

it('en la agenda, la fila compartida lleva la inicial', async () => {
  await render(
    con(true, <AgendaView from={new Date(2026, 8, 7)} to={new Date(2026, 8, 8)} activities={[actividad()]} onPressActivity={jest.fn()} isSharedActivity={() => true} />),
  );
  expect(screen.getByText('A', OCULTOS)).toBeTruthy();
});

it('en el mes, el chip de otra persona lleva la inicial', async () => {
  await render(con(true, <MonthView anchor={new Date(2026, 8, 15)} activities={[actividad()]} onSelectDay={jest.fn()} />));
  await fireEvent(screen.getAllByRole('button')[0] as never, 'layout', { nativeEvent: { layout: { width: 390, height: 600 } } });
  expect(screen.getByText(/^A/)).toBeTruthy();
});

function Exito() {
  return <Text testID="exito">{useTheme().success}</Text>;
}

it('el éxito pasa a azul con el modo y vuelve al apagarlo (RF-T9)', async () => {
  const { rerender } = await render(con(true, <Exito />));
  expect(screen.getByTestId('exito')).toHaveTextContent(ColorblindColors.dark.success);
  await rerender(con(false, <Exito />));
  expect(screen.getByTestId('exito')).toHaveTextContent(Colors.dark.success);
});
