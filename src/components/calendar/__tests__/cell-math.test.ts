/**
 * Cuánto cabe en una celda del mes (T204) y en un bloque compacto de la semana (T190b).
 */
import { cellLayout } from '@/components/calendar/month-view';
import { compactTitleLines } from '@/components/calendar/timeline';

/** Chips de 18 px con 2 de separación; la fila "+N" mide 14. */
const metricas = (slots: number, free: number) => ({ slots, free, chipHeight: 18, moreRowHeight: 14 });

describe('cellLayout (T204)', () => {
  it('si todo cabe, todo y sin "+N"', () => {
    expect(cellLayout(3, metricas(3, 60))).toEqual({ chips: 3, more: null });
  });

  it('con desborde y sitio, chips más la fila "+N" debajo', () => {
    // 60 px libres: quitando la fila de 14 quedan 46 → caben 2 chips de 20.
    expect(cellLayout(5, metricas(3, 60))).toEqual({ chips: 2, more: 'row' });
  });

  it('sin sitio para chip y fila, un chip y el "+N" sube al encabezado', () => {
    expect(cellLayout(4, metricas(1, 20))).toEqual({ chips: 1, more: 'header' });
  });

  it('el "+N" nunca dice +0: siempre hay menos chips que actividades cuando aparece', () => {
    for (let free = 20; free <= 120; free += 7) {
      for (let count = 1; count <= 8; count += 1) {
        const slots = Math.floor(free / 20);
        const r = cellLayout(count, metricas(slots, free));
        if (r.more) expect(r.chips).toBeLessThan(count);
        if (slots > 0) expect(r.chips).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('una celda sin huecos no pinta chips', () => {
    expect(cellLayout(3, metricas(0, 10))).toEqual({ chips: 0, more: null });
  });
});

describe('compactTitleLines (T190b)', () => {
  it('al menos una línea, aunque el bloque sea bajito', () => {
    expect(compactTitleLines(10)).toBe(1);
  });

  it('un bloque de 2 h a 48 px por hora da varias líneas', () => {
    expect(compactTitleLines(96)).toBe(6);
  });
});
