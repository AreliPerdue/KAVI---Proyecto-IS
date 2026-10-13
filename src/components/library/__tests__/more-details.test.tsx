/** "Más datos" del libro (RF-BL19, T310): plegado por omisión, y lo vacío se guarda como nada. */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { MAS_DATOS_VACIOS, type MasDatos, MoreDetails, masDatosDe, masDatosParaGuardar } from '@/components/library/more-details';
import { es } from '@/i18n/es';

const M = es.library.more;

it('lo vacío es nada y los capítulos solo si son un entero no negativo', () => {
  expect(masDatosParaGuardar({ publisher: ' Sudamericana ', publish_place: '', edition: '1.ª', chapter_count: '155', synopsis: '  ' })).toEqual({
    publisher: 'Sudamericana',
    publish_place: null,
    edition: '1.ª',
    chapter_count: 155,
    synopsis: null,
  });
  expect(masDatosParaGuardar({ ...MAS_DATOS_VACIOS, chapter_count: '-3' }).chapter_count).toBeNull();
  expect(masDatosParaGuardar({ ...MAS_DATOS_VACIOS, chapter_count: 'muchos' }).chapter_count).toBeNull();
});

it('de una pieza a texto editable, y de vuelta', () => {
  const pieza = { publisher: 'Alfaguara', publish_place: null, edition: null, chapter_count: 12, synopsis: null };
  expect(masDatosDe(pieza)).toEqual({ ...MAS_DATOS_VACIOS, publisher: 'Alfaguara', chapter_count: '12' });
  expect(masDatosParaGuardar(masDatosDe(pieza))).toEqual(pieza);
});

function Prueba({ inicial, onCambio }: { inicial: MasDatos; onCambio: (d: MasDatos) => void }) {
  const [d, setD] = useState(inicial);
  return (
    <MoreDetails
      value={d}
      onChange={(n) => {
        setD(n);
        onCambio(n);
      }}
    />
  );
}

it('plegado por omisión; se abre al tocarlo y se escribe', async () => {
  const onCambio = jest.fn();
  await render(<Prueba inicial={MAS_DATOS_VACIOS} onCambio={onCambio} />);
  expect(screen.queryByLabelText(M.publisher)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: M.title }));
  await fireEvent.changeText(screen.getByLabelText(M.publisher), 'Anagrama');
  expect(onCambio).toHaveBeenLastCalledWith(expect.objectContaining({ publisher: 'Anagrama' }));
});

it('si ya hay datos, empieza abierto', async () => {
  await render(<Prueba inicial={{ ...MAS_DATOS_VACIOS, synopsis: 'Una historia.' }} onCambio={jest.fn()} />);
  expect(screen.getByDisplayValue('Una historia.')).toBeTruthy();
});
