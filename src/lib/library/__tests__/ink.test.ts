/** El lápiz (spec 13c, RF-BH11; T291): preferencia guardada, lo que va al motor y la revisión de los trazos. */
import { LAPIZ_POR_OMISION, lapizParaMotor, lapizValido, trazosDe, trazosValidos } from '@/lib/library/ink';

const trazo = { t: 'pen', c: '#1a1a1a', s: 0.01, p: [0.1, 0.2, 1, 0.3, 0.4, 1.2] };

it('la preferencia guardada se revisa: lo que no tiene forma toma el valor de omisión', () => {
  expect(lapizValido(undefined)).toEqual(LAPIZ_POR_OMISION);
  expect(lapizValido({ tool: 'eraser', colors: { pen: '#e24947', marker: 'rojo', pencil: null }, sizes: { pen: 2, marker: 7 }, penOnly: true })).toEqual({
    tool: 'eraser',
    colors: { pen: '#E24947', marker: LAPIZ_POR_OMISION.colors.marker, pencil: null },
    sizes: { ...LAPIZ_POR_OMISION.sizes, pen: 2 },
    penOnly: true,
  });
  expect(lapizValido({ tool: 'brocha' }).tool).toBe('pen');
});

it('al motor va el color ya resuelto (la tinta del tema si no se eligió) y el grosor en px', () => {
  expect(lapizParaMotor(LAPIZ_POR_OMISION, '#5B4636')).toEqual({ tool: 'pen', color: '#5B4636', size: 3, penOnly: false });
  expect(lapizParaMotor({ ...LAPIZ_POR_OMISION, tool: 'marker' }, '#5B4636')).toEqual({ tool: 'marker', color: '#F1D35D', size: 16, penOnly: false });
  expect(lapizParaMotor({ ...LAPIZ_POR_OMISION, tool: 'eraser', sizes: { ...LAPIZ_POR_OMISION.sizes, eraser: 2 } }, '#000000').size).toBe(36);
});

it('los trazos del motor se revisan: herramienta, color, grosor y puntos de tres en tres', () => {
  expect(trazosValidos([trazo])).toEqual([{ ...trazo, c: '#1A1A1A' }]);
  for (const malo of [
    { ...trazo, t: 'brocha' },
    { ...trazo, c: 'red' },
    { ...trazo, s: 0 },
    { ...trazo, s: 2 },
    { ...trazo, p: [0.1, 0.2] },
    { ...trazo, p: [0.1, 0.2, 'x'] },
    { ...trazo, p: [0.1, 0.2, Infinity] },
  ]) {
    expect(trazosValidos([malo])).toBeNull();
  }
  expect(trazosValidos('nada')).toBeNull();
  expect(trazosValidos(Array.from({ length: 401 }, () => trazo))).toBeNull();
  expect(trazosValidos([{ ...trazo, p: Array.from({ length: 40_002 }, () => 0.5) }])).toBeNull();
});

it('un dibujo guardado sin trazos válidos no pinta nada', () => {
  expect(trazosDe({ content: { strokes: [trazo] } })).toHaveLength(1);
  expect(trazosDe({ content: { strokes: 'x' } })).toEqual([]);
});
