/**
 * Deslizar una serie (RF-F33): a la derecha destapa "Duplicar" y duplica; a la izquierda destapa
 * "Borrar" y borra. Estaban cruzados: la librería avisa hacia dónde se movió la fila
 * ("right" al deslizar a la derecha), y el código lo leía como el panel que se abría
 * (reporte del 11 oct 2026).
 */
import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ExerciseBlock, type ExerciseBlockProps } from '@/components/fitness/exercise-block';
import { es } from '@/i18n/es';
import { ejercicio, serie } from '@/lib/gym/__tests__/fixtures';
import { columnsFor } from '@/lib/gym/sets';

type PropsSwipe = { renderLeftActions: () => ReactNode; renderRightActions: () => ReactNode; onSwipeableOpen: (d: string) => void; children: ReactNode };
const mockSwipe: { ultimo?: PropsSwipe } = {};
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- fábrica elevada */
  const React = require('react');
  const Swipeable = React.forwardRef((p: PropsSwipe, _ref: unknown) => {
    mockSwipe.ultimo = p;
    return React.createElement(React.Fragment, null, p.children);
  });
  Swipeable.displayName = 'ReanimatedSwipeable';
  return { __esModule: true, default: Swipeable };
});

const nada = () => undefined;
const props = (over: Partial<ExerciseBlockProps>): ExerciseBlockProps => ({
  exercise: ejercicio('curl', []),
  catalog: null,
  columns: columnsFor('weight_reps', false),
  previous: [],
  prs: new Map(),
  pendientes: new Set(),
  unit: 'kg',
  effortScale: 'rir',
  editable: true,
  legacyNote: null,
  groupLabel: null,
  protocolLabel: null,
  stickyNote: null,
  celebrate: false,
  onAddSet: nada,
  onEdit: nada,
  onToggle: nada,
  onCopyPrevious: nada,
  onSetMenu: nada,
  onDuplicate: nada,
  onDelete: nada,
  onRemoveSegment: nada,
  onMoveSet: nada,
  onExerciseMenu: nada,
  onOpenDetail: nada,
  ...over,
});


const B = es.fitness.block;

it('el panel de la izquierda dice Duplicar y el de la derecha Borrar', async () => {
  await render(<ExerciseBlock {...props({ exercise: ejercicio('curl', [serie(20, 10)]) })} />);
  const izquierda = await render(<>{mockSwipe.ultimo!.renderLeftActions()}</>);
  expect(izquierda.getByText(B.duplicate)).toBeTruthy();
  const derecha = await render(<>{mockSwipe.ultimo!.renderRightActions()}</>);
  expect(derecha.getByText(B.delete)).toBeTruthy();
});

it('deslizar a la derecha (se destapa Duplicar) duplica la serie', async () => {
  const onDuplicate = jest.fn();
  const onDelete = jest.fn();
  const s = serie(20, 10);
  await render(<ExerciseBlock {...props({ exercise: ejercicio('curl', [s]), onDuplicate, onDelete })} />);
  mockSwipe.ultimo!.onSwipeableOpen('right');
  expect(onDuplicate).toHaveBeenCalledWith(expect.anything(), s);
  expect(onDelete).not.toHaveBeenCalled();
});

it('deslizar a la izquierda (se destapa Borrar) borra la serie', async () => {
  const onDuplicate = jest.fn();
  const onDelete = jest.fn();
  const s = serie(20, 10);
  await render(<ExerciseBlock {...props({ exercise: ejercicio('curl', [s]), onDuplicate, onDelete })} />);
  mockSwipe.ultimo!.onSwipeableOpen('left');
  expect(onDelete).toHaveBeenCalledWith(expect.anything(), s);
  expect(onDuplicate).not.toHaveBeenCalled();
});
