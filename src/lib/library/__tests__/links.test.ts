/** Libros enlazados (RF-BL27, T316): se guardan una vez y se leen desde los dos lados. */
import { enlaceParaGuardar, enlacesDe, yaEnlazados } from '@/lib/library/links';
import type { LibraryLink } from '@/types/domain';

const enlace = (id: string, from_item: string, to_item: string, kind: LibraryLink['kind']) => ({ id, from_item, to_item, kind, owner_id: 'u', created_at: '' }) as LibraryLink;

describe('cómo se guarda cada opción', () => {
  it.each([
    ['isPrequelOf', { from: 'A', to: 'B', kind: 'prequel' }],
    ['isSequelOf', { from: 'B', to: 'A', kind: 'prequel' }],
    ['isSpinoffOf', { from: 'A', to: 'B', kind: 'spinoff' }],
    ['hasSpinoff', { from: 'B', to: 'A', kind: 'spinoff' }],
    ['sameUniverse', { from: 'A', to: 'B', kind: 'universe' }],
    ['related', { from: 'A', to: 'B', kind: 'related' }],
  ] as const)('A %s B', (opcion, esperado) => {
    expect(enlaceParaGuardar('A', 'B', opcion)).toEqual(esperado);
  });
});

it('se lee desde los dos lados con el papel de la otra pieza', () => {
  const enlaces = [enlace('1', 'A', 'B', 'prequel'), enlace('2', 'C', 'B', 'spinoff'), enlace('3', 'B', 'D', 'universe')];
  // B: A es su precuela, C es su spin-off y D es del mismo universo.
  expect(enlacesDe('B', enlaces)).toEqual([
    { id: '1', otro: 'A', papel: 'prequel' },
    { id: '2', otro: 'C', papel: 'spinoff' },
    { id: '3', otro: 'D', papel: 'universe' },
  ]);
  // A: B es su secuela. C: B es su historia original.
  expect(enlacesDe('A', enlaces)).toEqual([{ id: '1', otro: 'B', papel: 'sequel' }]);
  expect(enlacesDe('C', enlaces)).toEqual([{ id: '2', otro: 'B', papel: 'origin' }]);
  expect(enlacesDe('Z', enlaces)).toEqual([]);
});

it('las notas de una creación se leen en los dos sentidos', () => {
  const enlaces = [enlace('1', 'cuaderno', 'libro', 'notes')];
  expect(enlacesDe('libro', enlaces)[0].papel).toBe('notes');
  expect(enlacesDe('cuaderno', enlaces)[0].papel).toBe('notesOf');
});

it('ya enlazados, en cualquier sentido', () => {
  const enlaces = [enlace('1', 'A', 'B', 'related')];
  expect(yaEnlazados('B', 'A', enlaces)).toBe(true);
  expect(yaEnlazados('A', 'C', enlaces)).toBe(false);
});
