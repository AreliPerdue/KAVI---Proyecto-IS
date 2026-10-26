/** Dibujar una pieza sin que una rota deje la hoja en blanco (T373), sin DOM. */
import { conRespaldo } from '../../../../public/reader/safe.js';

it('si sale bien, da lo que se hizo y no avisa', () => {
  const avisar = jest.fn();
  expect(conRespaldo(() => 'pieza', () => 'hueco', avisar)).toBe('pieza');
  expect(avisar).not.toHaveBeenCalled();
});

it('si truena, avisa con el error y da el respaldo: las demás piezas siguen', () => {
  const avisar = jest.fn();
  const piezas = ['a', 'rota', 'c'].map((p) =>
    conRespaldo(
      () => {
        if (p === 'rota') throw new Error('dato raro');
        return p;
      },
      () => 'hueco',
      avisar,
    ),
  );
  expect(piezas).toEqual(['a', 'hueco', 'c']);
  expect(avisar).toHaveBeenCalledWith(expect.objectContaining({ message: 'dato raro' }));
});
