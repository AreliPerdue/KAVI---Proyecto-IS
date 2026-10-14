/** Tiempo de lectura (spec 13b, RF-BR11 – RF-BR13; T318): el cronómetro y los resúmenes. */
import { CRONOMETRO_EN_CERO, franjaDe, horasYMinutos, INACTIVIDAD_MS, marcar, pausar, resumir, segundosEn } from '@/lib/library/reading-time';

const MIN = 60_000;

describe('cronómetro (RF-BR11)', () => {
  it('suma el tiempo entre señales', () => {
    let c = marcar(CRONOMETRO_EN_CERO, 0);
    c = marcar(c, 2 * MIN);
    c = marcar(c, 4 * MIN);
    expect(c.segundos).toBe(240);
  });

  it('un hueco de 5 min o más sin tocar nada no cuenta', () => {
    let c = marcar(CRONOMETRO_EN_CERO, 0);
    c = marcar(c, 3 * MIN);
    c = marcar(c, 3 * MIN + INACTIVIDAD_MS);
    c = marcar(c, 3 * MIN + INACTIVIDAD_MS + MIN);
    expect(c.segundos).toBe(240);
  });

  it('en pausa no corre; al seguir, el tiempo en pausa no se suma', () => {
    let c = marcar(CRONOMETRO_EN_CERO, 0);
    c = pausar(c, 2 * MIN);
    expect(segundosEn(c, 60 * MIN)).toBe(120);
    c = marcar(c, 60 * MIN);
    c = marcar(c, 61 * MIN);
    expect(c.segundos).toBe(180);
  });

  it('en vivo cuenta lo que va desde la última señal, salvo que ya sea un hueco largo', () => {
    const c = marcar(CRONOMETRO_EN_CERO, 0);
    expect(segundosEn(c, MIN)).toBe(60);
    expect(segundosEn(c, 10 * MIN)).toBe(0);
  });
});

describe('resumen (RF-BR13)', () => {
  const sesion = (iso: string, seconds: number) => ({ started_at: iso, seconds });
  it('totales, promedio, días distintos, por día de la semana y franja favorita', () => {
    const r = resumir([
      sesion('2026-10-12T21:00:00', 1200), // lunes noche
      sesion('2026-10-12T22:00:00', 600), // lunes noche, mismo día
      sesion('2026-10-14T09:00:00', 300), // miércoles mañana
    ]);
    expect(r.sesiones).toBe(3);
    expect(r.segundos).toBe(2100);
    expect(r.promedio).toBe(700);
    expect(r.dias).toBe(2);
    expect(r.porDia).toEqual([1800, 0, 300, 0, 0, 0, 0]);
    expect(r.franjaFavorita).toBe('noche');
  });

  it('sin sesiones, ceros y sin franja', () => {
    expect(resumir([])).toMatchObject({ sesiones: 0, segundos: 0, promedio: 0, dias: 0, franjaFavorita: null });
  });

  it('franjas del día y horas con minutos', () => {
    expect([2, 8, 15, 21].map(franjaDe)).toEqual(['madrugada', 'manana', 'tarde', 'noche']);
    expect(horasYMinutos(3900)).toEqual({ h: 1, min: 5 });
    expect(horasYMinutos(2700)).toEqual({ h: 0, min: 45 });
  });
});
