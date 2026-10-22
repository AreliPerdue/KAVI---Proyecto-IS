/** "Papeles y más" con la tienda (13h, RF-CC17; T343c): los packs de papeles se obtienen y sus piezas se pegan. */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AssetSheet } from '@/components/library/asset-sheet';
import { es } from '@/i18n/es';
import type { StickerPack } from '@/types/domain';

const papeleria: StickerPack = {
  id: 'papeleria',
  collection: 'lienzo',
  color: null,
  name_es: 'Papelería',
  name_en: 'Stationery',
  sort_order: 1,
  kind: 'assets',
  bytes: 821140,
  version: 1,
  stickers: [
    { name: 'papel-periodico', ar: 1.225, category: 'papel', mode: 'textura', label_es: 'Papel de periódico', label_en: 'Newspaper' },
    { name: 'flor', ar: 1.238, category: 'doodle', mode: 'trazo', label_es: 'Flor', label_en: 'Flower' },
  ],
};
const mockPacks = { data: { packs: [papeleria], sinRed: false } };
let mockMios: string[] = [];
const mockDescargar = jest.fn();
jest.mock('@/hooks/use-sticker-packs', () => ({
  useStickerPacks: () => mockPacks,
  useMyStickerPacks: () => ({ data: mockMios }),
  useStickerPackActions: () => ({ descargar: { mutate: mockDescargar, isPending: false }, quitar: { mutate: jest.fn(), isPending: false } }),
}));

const T = es.library.canvas.assets;

it('sin obtenerlo, el pack está en la tienda y sus piezas no; al obtenerlo, entran a su categoría', async () => {
  const onElegir = jest.fn();
  const { rerender } = await render(<AssetSheet visible onClose={jest.fn()} onElegir={onElegir} />);
  expect(screen.getByText(T.store)).toBeTruthy();
  expect(screen.getByText(T.packMeta(2, '802 KB'))).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Papel de periódico' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: es.library.stickers.downloadA11y('Papelería') }));
  expect(mockDescargar).toHaveBeenCalledWith(papeleria);

  mockMios = ['papeleria'];
  await rerender(<AssetSheet visible onClose={jest.fn()} onElegir={onElegir} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Papel de periódico' }));
  expect(onElegir).toHaveBeenCalledWith({ id: 'papeleria/papel-periodico', ar: 1.225, modo: 'textura', label: 'Papel de periódico' });
  await fireEvent.press(screen.getByRole('tab', { name: T.categories.doodle }));
  await fireEvent.press(screen.getByRole('button', { name: 'Flor' }));
  expect(onElegir).toHaveBeenLastCalledWith({ id: 'papeleria/flor', ar: 1.238, modo: 'trazo', label: 'Flor' });
});
