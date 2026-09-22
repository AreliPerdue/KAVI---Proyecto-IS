/**
 * Posicionamiento de bloques en la rejilla del dia (RF-C3, RF-C6).
 *
 * La decision no evidente y que esta prueba fija: los traslapes se calculan con
 * el espacio que el bloque OCUPA EN PANTALLA, no con su duracion real. Dos
 * actividades de un minuto separadas por dos minutos no se solapan en el tiempo,
 * pero sus cajas —infladas al alto minimo legible— si se pisarian.
 */
import { layoutDay } from '@/components/calendar/layout-blocks';
import type { Activity } from '@/types/domain';

const DIA = new Date(2026, 8, 7);

const actividad = (id: string, horaInicio: number, duracionMin: number, over: Partial<Activity> = {}): Activity => {
  const inicio = new Date(2026, 8, 7, Math.floor(horaInicio), Math.round((horaInicio % 1) * 60));
  return {
    id, owner_id: 'u1', title: id, description: null, theme_id: null, dimension: null,
    color: null, icon: null, all_day: false, is_gym: false,
    recurrence_rule: null, recurrence_parent_id: null, created_at: 'x', updated_at: 'x',
    start_at: inicio.toISOString(),
    end_at: new Date(inicio.getTime() + duracionMin * 60_000).toISOString(),
    ...over,
  } as Activity;
};

describe('posicionamiento basico', () => {
  it('sin actividades devuelve vacio', () => {
    expect(layoutDay([], DIA)).toEqual([]);
  });

  it('coloca una actividad en minutos desde medianoche', () => {
    const [b] = layoutDay([actividad('a', 9, 60)], DIA);
    expect(b?.start).toBe(540);
    expect(b?.end).toBe(600);
  });

  it('una sola actividad ocupa toda la anchura', () => {
    const [b] = layoutDay([actividad('a', 9, 60)], DIA);
    expect(b?.column).toBe(0);
    expect(b?.columns).toBe(1);
  });

  it('descarta las de todo el dia: van en su propia franja', () => {
    expect(layoutDay([actividad('a', 9, 60, { all_day: true })], DIA)).toEqual([]);
  });

  it('descarta las de otro dia', () => {
    const otroDia = actividad('a', 9, 60);
    expect(layoutDay([otroDia], new Date(2026, 8, 10))).toEqual([]);
  });

  it('devuelve los bloques ordenados por hora de inicio', () => {
    const bloques = layoutDay([actividad('tarde', 15, 60), actividad('manana', 9, 60)], DIA);
    expect(bloques.map((b) => b.activity.id)).toEqual(['manana', 'tarde']);
  });
});

describe('traslapes', () => {
  it('dos que se solapan se reparten en dos columnas', () => {
    const bloques = layoutDay([actividad('a', 9, 120), actividad('b', 10, 60)], DIA);

    expect(bloques).toHaveLength(2);
    expect(new Set(bloques.map((b) => b.column))).toEqual(new Set([0, 1]));
    expect(bloques.every((b) => b.columns === 2)).toBe(true);
  });

  it('tres simultaneas se reparten en tres columnas', () => {
    const bloques = layoutDay([actividad('a', 9, 60), actividad('b', 9, 60), actividad('c', 9, 60)], DIA);

    expect(new Set(bloques.map((b) => b.column))).toEqual(new Set([0, 1, 2]));
    expect(bloques.every((b) => b.columns === 3)).toBe(true);
  });

  it('dos consecutivas sin solaparse ocupan cada una toda la anchura', () => {
    const bloques = layoutDay([actividad('a', 9, 60), actividad('b', 10, 60)], DIA);

    expect(bloques.every((b) => b.columns === 1)).toBe(true);
  });

  it('la columna se reutiliza cuando el bloque anterior ya termino', () => {
    // a: 9-11, b: 9:30-10, c: 10:30-11 → c puede volver a la columna de b.
    const bloques = layoutDay([actividad('a', 9, 120), actividad('b', 9.5, 30), actividad('c', 10.5, 30)], DIA);

    const porId = new Map(bloques.map((b) => [b.activity.id, b]));
    expect(porId.get('b')?.column).toBe(1);
    expect(porId.get('c')?.column).toBe(1);
  });

  it('grupos separados no comparten el reparto de columnas', () => {
    const bloques = layoutDay(
      [actividad('a', 9, 60), actividad('b', 9, 60), actividad('solitaria', 15, 60)],
      DIA,
    );

    const solitaria = bloques.find((b) => b.activity.id === 'solitaria');
    expect(solitaria?.columns).toBe(1);
  });
});

describe('alto minimo legible', () => {
  it('sin minimo, visualEnd es el fin real', () => {
    const [b] = layoutDay([actividad('a', 9, 5)], DIA);
    expect(b?.visualEnd).toBe(b?.end);
  });

  /**
   * Hay dos pisos encadenados: `clampToDay` ya garantiza 15 minutos para que el
   * bloque sea visible, y `minMinutes` los amplia a lo que pida la vista.
   */
  it('con minimo, una actividad corta se infla para poder leerse', () => {
    const [b] = layoutDay([actividad('a', 9, 5)], DIA, 30);
    expect(b?.visualEnd).toBe(570); // 540 + 30
    expect(b?.end).toBe(555);       // 540 + el piso de 15 de clampToDay
  });

  it('una actividad larga no se encoge al minimo', () => {
    const [b] = layoutDay([actividad('a', 9, 120)], DIA, 30);
    expect(b?.visualEnd).toBe(660);
  });

  it('dos cortas separadas 20 min se solapan por su alto en pantalla', () => {
    // 9:00-9:01 y 9:20-9:21: no se solapan en el tiempo ni con el piso de 15,
    // pero sus cajas de 45 minutos si. Sin esta regla se pintarian encima.
    const bloques = layoutDay([actividad('a', 9, 1), actividad('b', 9.33, 1)], DIA, 45);

    expect(bloques.every((b) => b.columns === 2)).toBe(true);
  });

  it('esas mismas dos, sin minimo extra, van cada una a su anchura', () => {
    const bloques = layoutDay([actividad('a', 9, 1), actividad('b', 9.33, 1)], DIA, 0);

    expect(bloques.every((b) => b.columns === 1)).toBe(true);
  });
});

describe('actividades que cruzan la medianoche', () => {
  it('la que viene del dia anterior empieza a medianoche', () => {
    const anoche = actividad('a', 22, 300); // 22:00 + 5 h → 03:00 del dia siguiente
    const bloques = layoutDay([anoche], new Date(2026, 8, 8));

    expect(bloques[0]?.start).toBe(0);
    expect(bloques[0]?.end).toBe(180);
  });

  it('la que sigue al dia siguiente termina a medianoche', () => {
    const bloques = layoutDay([actividad('a', 22, 300)], DIA);

    expect(bloques[0]?.start).toBe(1320);
    expect(bloques[0]?.end).toBe(1440);
  });
});
