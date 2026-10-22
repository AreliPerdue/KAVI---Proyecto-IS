/** El Journal dibujado (spec 13i, RF-JC4; T345): portada, lomo y contraportada, en las cuatro encuadernaciones. */
import { render, screen } from '@testing-library/react-native';

import { JournalCover } from '@/components/library/journal-cover';
import { ENCUADERNACIONES, PORTADA_POR_OMISION } from '@/lib/library/journal';

it('cada encuadernación se dibuja en sus tres caras con su etiqueta', async () => {
  for (const binding of ENCUADERNACIONES) {
    for (const cara of ['front', 'spine', 'back'] as const) {
      await render(<JournalCover portada={{ ...PORTADA_POR_OMISION, binding }} cara={cara} ancho={cara === 'spine' ? 40 : 160} alto={220} etiqueta={`${binding} ${cara}`} />);
      expect(screen.getByLabelText(`${binding} ${cara}`)).toBeTruthy();
    }
  }
});

it('la portada tiene la proporción A5: vertical o acostada', async () => {
  await render(<JournalCover portada={PORTADA_POR_OMISION} ancho={100} etiqueta="vertical" />);
  expect(screen.getByLabelText('vertical')).toHaveStyle({ width: 100, height: 100 * Math.SQRT2 });
  await render(<JournalCover portada={{ ...PORTADA_POR_OMISION, orientation: 'landscape' }} ancho={100} etiqueta="horizontal" />);
  expect(screen.getByLabelText('horizontal')).toHaveStyle({ width: 100, height: 100 / Math.SQRT2 });
});

it('en la librería se ve como un libro: llena su caja y no asoma el canto de las páginas', async () => {
  const portada = { ...PORTADA_POR_OMISION, edges: '#ABCDEF' };
  await render(<JournalCover portada={portada} ancho={120} etiqueta="objeto" />);
  expect(JSON.stringify(screen.toJSON())).toContain('#ABCDEF');
  await render(<JournalCover portada={{ ...portada, orientation: 'landscape' }} ancho={120} alto={180} comoLibro etiqueta="libro" />);
  expect(screen.getByLabelText('libro')).toHaveStyle({ width: 120, height: 180 });
  expect(JSON.stringify(screen.toJSON())).not.toContain('#ABCDEF');
});
