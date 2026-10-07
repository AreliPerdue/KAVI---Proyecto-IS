/**
 * Un ejercicio en el logger (spec 07 v2, RF-F27 – RF-F33): columnas por tipo de registro,
 * etiquetas de las series y avisos que no se ven en el código de cada pieza.
 */
import { render, screen } from '@testing-library/react-native';

import { ExerciseBlock, type ExerciseBlockProps } from '@/components/fitness/exercise-block';
import { delCatalogo, ejercicio, seg, serie } from '@/lib/gym/__tests__/fixtures';
import { columnsFor } from '@/lib/gym/sets';

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

describe('ExerciseBlock', () => {
  it('en un ejercicio unilateral las columnas son I y D, y avisa el desbalance', async () => {
    const unilateral = serie(12, null, {}, []);
    unilateral.segments = [seg({ weight_kg: 12, reps_left: 10, reps_right: 7, set_id: unilateral.id })];
    await render(<ExerciseBlock {...props({ exercise: ejercicio('curl', [unilateral]), columns: columnsFor('weight_reps', true) })} />);
    expect(screen.getByText('I')).toBeTruthy();
    expect(screen.getByText('D')).toBeTruthy();
    expect(screen.getByText('Desbalance I/D')).toBeTruthy();
  });

  it('el calentamiento lleva C y no cuenta: la "serie 1" es la primera efectiva', async () => {
    const sets = [serie(40, 10, { set_type: 'warmup' }), serie(60, 8), serie(60, 8, { set_type: 'top_set' })];
    await render(<ExerciseBlock {...props({ exercise: ejercicio('banca', sets) })} />);
    expect(screen.getByLabelText('Opciones de la serie C')).toBeTruthy();
    expect(screen.getByLabelText('Opciones de la serie 1')).toBeTruthy();
    expect(screen.getByLabelText('Opciones de la serie T')).toBeTruthy();
  });

  it('el nombre del catálogo sale en el idioma activo y sus músculos debajo', async () => {
    const cat = delCatalogo('banca', { name_es: 'Press de banca', name_en: 'Bench press', primary_muscles: ['chest_mid'] });
    await render(<ExerciseBlock {...props({ exercise: ejercicio('banca', [], { name: 'Press de banca' }), catalog: cat })} />);
    expect(screen.getByText('Press de banca')).toBeTruthy();
    expect(screen.getByText(/Pecho/)).toBeTruthy();
  });

  it('una nota fija se ve arriba del ejercicio (RF-F52)', async () => {
    await render(<ExerciseBlock {...props({ stickyNote: 'Asiento en 4' })} />);
    expect(screen.getByLabelText('Nota fija: Asiento en 4')).toBeTruthy();
  });

  it('en lectura no hay "+ Serie" ni se puede marcar', async () => {
    await render(<ExerciseBlock {...props({ exercise: ejercicio('banca', [serie(60, 8)]), editable: false })} />);
    expect(screen.queryByText('Serie')).toBeNull();
    expect(screen.getByRole('checkbox').props.accessibilityState.disabled).toBe(true);
  });
});
