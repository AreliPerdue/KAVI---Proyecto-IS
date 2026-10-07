/**
 * Hojas del logger: detalles de la serie (RF-F47) y notas (RF-F49 – RF-F52).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { NoteSheet } from '@/components/fitness/note-sheet';
import { SetDetailsSheet } from '@/components/fitness/set-details-sheet';
import { SET_TAGS } from '@/constants/gym-notes';
import { serie } from '@/lib/gym/__tests__/fixtures';

describe('SetDetailsSheet', () => {
  it('en lb, el lastre se escribe en lb y se guarda en kg', async () => {
    const onSave = jest.fn();
    await render(<SetDetailsSheet visible set={serie(50, 8)} unit="lb" onClose={jest.fn()} onSave={onSave} />);
    await fireEvent.changeText(screen.getByLabelText('Lastre (lb)'), '22.05');
    await fireEvent.press(screen.getByText('Guardar'));
    expect(onSave.mock.calls[0][0].load_mods.added_kg).toBeCloseTo(10, 1);
  });

  it('lo guardado en kg se muestra en lb al abrir', async () => {
    await render(<SetDetailsSheet visible set={serie(50, 8, { load_mods: { added_kg: 10 } })} unit="lb" onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText('Lastre (lb)').props.value).toBe('22');
  });

  it('sin nada escrito no guarda load_mods vacío', async () => {
    const onSave = jest.fn();
    await render(<SetDetailsSheet visible set={serie(50, 8)} unit="kg" onClose={jest.fn()} onSave={onSave} />);
    await fireEvent.press(screen.getByText('Guardar'));
    expect(onSave.mock.calls[0][0].load_mods).toBeNull();
  });

  it('avisa una combinación rara sin bloquear (RF-F48)', async () => {
    const onSave = jest.fn();
    await render(<SetDetailsSheet visible set={serie(50, 8, { rir: 2 })} unit="kg" onClose={jest.fn()} onSave={onSave} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Muscular' }));
    expect(screen.getByText('Marcaste fallo y RIR mayor que 0.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Guardar'));
    expect(onSave).toHaveBeenCalled();
  });
});

describe('NoteSheet', () => {
  const montar = (props: Partial<Parameters<typeof NoteSheet>[0]> = {}) => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    return render(<NoteSheet visible title="Nota de la serie" initialText={null} onClose={onClose} onSave={onSave} {...props} />).then(() => ({ onSave, onClose }));
  };

  it('guarda el texto recortado', async () => {
    const { onSave } = await montar();
    await fireEvent.changeText(screen.getByLabelText('Nota'), '  técnica rota  ');
    await fireEvent.press(screen.getByText('Guardar'));
    expect(onSave).toHaveBeenCalledWith('técnica rota', []);
  });

  it('vacío se guarda como null, no como cadena vacía', async () => {
    const { onSave } = await montar({ initialText: 'algo' });
    await fireEvent.changeText(screen.getByLabelText('Nota'), '   ');
    await fireEvent.press(screen.getByText('Guardar'));
    expect(onSave).toHaveBeenCalledWith(null, []);
  });

  it('las etiquetas se marcan y desmarcan junto con la nota', async () => {
    const { onSave } = await montar({ tagOptions: SET_TAGS, initialTags: ['pain'] });
    await fireEvent.press(screen.getByRole('button', { name: 'Dolor' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Con spotter' }));
    await fireEvent.press(screen.getByText('Guardar'));
    expect(onSave).toHaveBeenCalledWith(null, ['spotted']);
  });

  it('cerrar sin guardar descarta lo escrito', async () => {
    const { onSave, onClose } = await montar();
    await fireEvent.changeText(screen.getByLabelText('Nota'), 'no lo guardo');
    await fireEvent.press(screen.getAllByLabelText('Cerrar')[0]!);
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
