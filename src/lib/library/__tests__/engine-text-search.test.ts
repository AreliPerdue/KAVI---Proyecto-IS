/** La búsqueda del motor de lectura (RF-BR4) y sus zonas de toque (RF-BR7b), sin DOM. */
import { buscarEnPedazos, plegarTexto, zonaDeToque } from '../../../../public/reader/text-search.js';

it('pliega mayúsculas y acentos sin mover posiciones', () => {
  expect(plegarTexto('Canción ÑANDÚ')).toBe('cancion nandu');
  expect(plegarTexto('Canción').length).toBe('Canción'.length);
});

it('encuentra sin importar acentos ni mayúsculas, con el tramo exacto', () => {
  expect(buscarEnPedazos(['Otra vez el dragón aparece aquí'], 'DRAGON aparece')).toEqual([{ tramos: [{ item: 0, inicio: 12, fin: 26 }] }]);
});

it('una frase partida entre dos pedazos sale en dos tramos', () => {
  expect(buscarEnPedazos(['al fin de', 'la línea'], 'de la')).toEqual([
    {
      tramos: [
        { item: 0, inicio: 7, fin: 9 },
        { item: 1, inicio: 0, fin: 2 },
      ],
    },
  ]);
});

it('cuenta cada aparición y no encuentra lo que cruza sin espacio', () => {
  expect(buscarEnPedazos(['dragon y dragon', 'dragon'], 'dragon')).toHaveLength(3);
  expect(buscarEnPedazos(['fin de', 'linea'], 'delinea')).toEqual([]);
  expect(buscarEnPedazos(['algo'], '   ')).toEqual([]);
});

it('zonas de toque: 20 % de cada borde y el centro', () => {
  expect(zonaDeToque(10, 400)).toBe('izquierda');
  expect(zonaDeToque(200, 400)).toBe('centro');
  expect(zonaDeToque(390, 400)).toBe('derecha');
  expect(zonaDeToque(5, 0)).toBe('centro');
});
