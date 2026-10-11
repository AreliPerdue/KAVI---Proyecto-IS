/**
 * Aplicar un protocolo en dos pasos (RF-F46, T303): elegir por objetivo con su vista previa, ver
 * las series que se van a crear, ajustar con − / + y aplicar. Tocar un protocolo ya no lo aplica.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ProtocolSheet } from '@/components/fitness/protocol-sheet';
import { es } from '@/i18n/es';

const P = es.fitness.protocol;
const T = es.training.protocols;

const montar = async (over: Partial<Parameters<typeof ProtocolSheet>[0]> = {}) => {
  const onApply = jest.fn();
  const onClose = jest.fn();
  await render(<ProtocolSheet visible baseKg={100} unit="kg" pendingCount={2} onApply={onApply} onClose={onClose} {...over} />);
  return { onApply, onClose };
};
const elegir = (key: keyof typeof T, vista: string) => fireEvent.press(screen.getByRole('button', { name: P.choose(T[key].label, vista) }));

it('agrupa por objetivo: "Por tiempo" solo muestra los de timer', async () => {
  await montar();
  expect(screen.getByText(T.ramp_to_max.label)).toBeTruthy();
  await fireEvent.press(screen.getByText(P.goals.timed));
  expect(screen.queryByText(T.ramp_to_max.label)).toBeNull();
  expect(screen.getByText(T.tabata.label)).toBeTruthy();
  expect(screen.getByText('8 × 20 s / 10 s')).toBeTruthy();
});

it('tocar un protocolo no lo aplica: muestra sus series y deja ajustarlas', async () => {
  const { onApply } = await montar();
  await elegir('pyramid', '12 · 10 · 8 · 6');
  expect(onApply).not.toHaveBeenCalled();
  expect(screen.getByText(P.preview)).toBeTruthy();
  expect(screen.getByText('80 kg × 12')).toBeTruthy();
  expect(screen.getByText('100 kg × 6')).toBeTruthy();
  expect(screen.getByText(P.replaces(2))).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: P.more(P.params.steps) }));
  expect(screen.getByText(P.setRow(5))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: P.apply }));
  expect(onApply).toHaveBeenCalledWith('pyramid', { steps: 5 }, 100);
});

it('el peso base se ajusta en pasos que se pueden cargar', async () => {
  const { onApply } = await montar();
  await elegir('five_by_five', '5 × 5');
  await fireEvent.press(screen.getByRole('button', { name: P.more(P.base) }));
  expect(screen.getByLabelText(`${P.base}: 102.5 kg`)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: P.apply }));
  expect(onApply).toHaveBeenCalledWith('five_by_five', {}, 102.5);
});

it('los límites del rango apagan el botón', async () => {
  await montar();
  await elegir('five_three_one', '3 × 5');
  const menos = screen.getByRole('button', { name: P.less(P.params.week) });
  expect(menos.props.accessibilityState?.disabled).toBe(true);
  // 5/3/1 nombra el peso base como máximo de entrenamiento.
  expect(screen.getByText(P.baseTrainingMax)).toBeTruthy();
});

it('sin peso de partida lo dice, y "Cambiar protocolo" vuelve a la lista', async () => {
  await montar({ baseKg: null, pendingCount: 0 });
  await elegir('gvt', '10 × 10');
  expect(screen.getByText(P.noBase)).toBeTruthy();
  expect(screen.getByText(P.replaces(0))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: P.change }));
  expect(screen.getByText(P.goals.all)).toBeTruthy();
});
