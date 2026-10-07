/**
 * Repetición de una lista (RF-L19, RF-L19b, T232b, T237): los días sueltos, el inicio y el fin.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { ListRepeatSheet } from '@/components/lists/list-repeat-sheet';
import { es } from '@/i18n/es';

const L = es.lists;
const D = es.dates.weekdayShort; // lun, mar, mié…
let mockFecha: ((d: Date) => void) | null = null;

/** El selector de fecha real es un modal aparte; el doble deja elegir directo. */
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  DatePickerSheet: (p: { onSelect: (d: Date) => void }) => {
    mockFecha = p.onSelect;
    return null;
  },
}));

/** Como en la pantalla: la regla vive arriba y la hoja recibe la guardada. */
function Arnes({ inicial = null, inicio = null, onChange }: { inicial?: string | null; inicio?: string | null; onChange: jest.Mock }) {
  const [rule, setRule] = useState<string | null>(inicial);
  const [start, setStart] = useState<string | null>(inicio);
  const [visible, setVisible] = useState(true);
  return (
    <>
      <ListRepeatSheet
        visible={visible}
        rule={rule}
        start={start}
        onClose={() => setVisible(false)}
        onChange={(r, s) => {
          onChange(r, s);
          setRule(r);
          setStart(s);
        }}
      />
      {/* Para cerrar y reabrir la hoja desde la prueba. */}
      <Abrir onPress={() => setVisible((v) => !v)} />
    </>
  );
}
function Abrir({ onPress }: { onPress: () => void }) {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- solo para el arnés */
  const { Pressable, Text } = require('react-native');
  return <Pressable accessibilityRole="button" accessibilityLabel="alternar hoja" onPress={onPress}><Text>x</Text></Pressable>;
}

const dia = (i: number) => screen.getByRole('button', { name: D[i] });
const prendido = (i: number) => dia(i).props.accessibilityState?.selected === true;

beforeEach(() => {
  mockFecha = null;
});

it('tocar L, M y J deja BYDAY=MO,WE,TH y los muestra prendidos al reabrir', async () => {
  const onChange = jest.fn();
  await render(<Arnes onChange={onChange} />);
  await fireEvent.press(dia(0));
  await fireEvent.press(dia(2));
  await fireEvent.press(dia(3));
  expect(onChange.mock.calls.at(-1)?.[0]).toBe('FREQ=WEEKLY;BYDAY=MO,WE,TH');

  await fireEvent.press(screen.getByLabelText('alternar hoja'));
  await fireEvent.press(screen.getByLabelText('alternar hoja'));
  expect([0, 1, 2, 3, 4, 5, 6].map(prendido)).toEqual([true, false, true, true, false, false, false]);
});

it('al reabrir lee los días de la regla guardada, no de lo que quedó en pantalla', async () => {
  await render(<Arnes inicial="FREQ=WEEKLY;BYDAY=TU,FR" onChange={jest.fn()} />);
  expect([0, 1, 2, 3, 4, 5, 6].map(prendido)).toEqual([false, true, false, false, true, false, false]);
});

it('apagar el último día quita la repetición en vez de dejar una regla sin días', async () => {
  const onChange = jest.fn();
  await render(<Arnes inicial="FREQ=WEEKLY;BYDAY=MO" inicio="2026-10-05" onChange={onChange} />);
  await fireEvent.press(dia(0));
  expect(onChange).toHaveBeenLastCalledWith(null, null);
});

it('cambiar de "todos los días" a días sueltos conserva el inicio y el fin', async () => {
  const onChange = jest.fn();
  await render(<Arnes inicial="FREQ=DAILY;UNTIL=20261220" inicio="2026-09-01" onChange={onChange} />);
  await fireEvent.press(dia(1));
  const [regla, inicio] = onChange.mock.calls.at(-1) as [string, string];
  expect(regla).toContain('FREQ=WEEKLY');
  expect(regla).toContain('BYDAY=TU');
  expect(regla).toContain('UNTIL=20261220');
  expect(inicio).toBe('2026-09-01');
});

it('un fin anterior al inicio se empuja al inicio', async () => {
  const onChange = jest.fn();
  await render(<Arnes inicial="FREQ=DAILY;UNTIL=20261220" inicio="2026-10-10" onChange={onChange} />);
  await fireEvent.press(screen.getByLabelText(new RegExp(`^${L.until}`)));
  mockFecha?.(new Date(2026, 9, 1));
  const [regla, inicio] = onChange.mock.calls.at(-1) as [string, string];
  expect(inicio).toBe('2026-10-10');
  expect(regla).toContain('UNTIL=20261010');
});

it('"No se repite" quita la regla y cierra', async () => {
  const onChange = jest.fn();
  await render(<Arnes inicial="FREQ=DAILY" onChange={onChange} />);
  await fireEvent.press(screen.getByRole('button', { name: L.repeatOptions.none }));
  expect(onChange).toHaveBeenLastCalledWith(null, null);
});
