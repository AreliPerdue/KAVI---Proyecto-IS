/** La miniatura de un recorte (13h, RF-CC23; T342, T343): se dibuja con lo que tiene, sin leerse aparte. */
import { render, screen } from '@testing-library/react-native';

import { CanvasPreview } from '@/components/library/canvas-preview';
import { documentoValido } from '@/lib/library/canvas';

const doc = documentoValido({
  pages: 1,
  background: '#F6E7D8',
  elements: [
    { id: 't', type: 'textbox', z: 1, content: { text: 'La Maga' } },
    { id: 's', type: 'shape', z: 2, content: { shape: 'heart' }, style: { color: '#7A1E3A' } },
    { id: 'p', type: 'polaroid', z: 3, content: { variant: 'caption', paths: [''], text: 'París' } },
    { id: 'q', type: 'quote', z: 4, content: { text: 'Andábamos sin buscarnos', who: 'Horacio' } },
    { id: 'r', type: 'rating', z: 5, content: { scale: 'number', value: 9 } },
    { id: 'l', type: 'book', z: 6, content: { itemId: 'l1' } },
  ],
});
const fuentes = { imagenes: new Map(), stickers: new Map(), libros: new Map([['l1', { title: 'Rayuela', color: '#2E7D32' }]]) };

it('dibuja el texto, la polaroid con su pie, la cita, la calificación y el libro', async () => {
  await render(<CanvasPreview doc={doc} orientacion="portrait" ancho={200} fuentes={fuentes} />);
  const oculto = { includeHiddenElements: true };
  for (const texto of ['La Maga', 'París', 'Andábamos sin buscarnos', '— Horacio', '9', '/10', 'Rayuela']) expect(screen.getByText(texto, oculto)).toBeTruthy();
});

it('es parte del dibujo: el lector de pantalla no lo lee (la tarjeta dice el nombre)', async () => {
  await render(<CanvasPreview doc={doc} orientacion="landscape" ancho={200} fuentes={fuentes} />);
  expect(screen.queryByText('La Maga')).toBeNull();
});
