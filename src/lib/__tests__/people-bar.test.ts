/**
 * Barra de personas con muchos contactos (spec 06, RF-S15b; T203).
 */
import { buscarPersonas, MAX_PEOPLE_IN_BAR, personasEnBarra } from '@/lib/people-bar';
import { usePreferencesStore } from '@/store/preferences-store';

const p = (id: string, nombre: string, usuario = id) => ({ id, nombre, usuario });

describe('personasEnBarra', () => {
  const ana = p('a', 'Ana');
  const beto = p('b', 'Beto');
  const ceci = p('c', 'Ceci');
  const ulises = p('u', 'Úrsula');

  it('primero los superpuestos más recientemente, luego A–Z', () => {
    const { visibles } = personasEnBarra([ceci, ana, beto, ulises], { b: '2026-10-01T00:00:00Z', c: '2026-10-05T00:00:00Z' }, []);
    expect(visibles.map((x) => x.id)).toEqual(['c', 'b', 'a', 'u']);
  });

  it('ordena sin acentos: Úrsula va con la U', () => {
    const { visibles } = personasEnBarra([ulises, p('z', 'Zoe'), ana], {}, []);
    expect(visibles.map((x) => x.nombre)).toEqual(['Ana', 'Úrsula', 'Zoe']);
  });

  it('se corta en el tope y avisa que hay más', () => {
    const muchas = Array.from({ length: 25 }, (_, i) => p(`p${i}`, `Persona ${String(i).padStart(2, '0')}`));
    const { visibles, hayMas } = personasEnBarra(muchas, {}, []);
    expect(visibles).toHaveLength(MAX_PEOPLE_IN_BAR);
    expect(hayMas).toBe(true);
  });

  it('quien está superpuesto ahora siempre se ve, aunque pase del tope', () => {
    const muchas = Array.from({ length: 25 }, (_, i) => p(`p${i}`, `Persona ${String(i).padStart(2, '0')}`));
    const { visibles } = personasEnBarra(muchas, {}, ['p24']);
    expect(visibles).toHaveLength(MAX_PEOPLE_IN_BAR + 1);
    expect(visibles.at(-1)?.id).toBe('p24');
  });
});

describe('buscarPersonas', () => {
  const gente = [p('1', 'José Pérez', 'jose'), p('2', 'Ana López', 'anita'), p('3', 'Mar', 'marisol')];

  it('sin acentos ni mayúsculas, por nombre', () => {
    expect(buscarPersonas(gente, 'JOSE PE').map((x) => x.id)).toEqual(['1']);
  });

  it('por usuario, con o sin arroba', () => {
    expect(buscarPersonas(gente, '@anit').map((x) => x.id)).toEqual(['2']);
    expect(buscarPersonas(gente, 'mari').map((x) => x.id)).toEqual(['3']);
  });

  it('vacío devuelve a todos de la A a la Z', () => {
    expect(buscarPersonas(gente, '  ').map((x) => x.nombre)).toEqual(['Ana López', 'José Pérez', 'Mar']);
  });
});

describe('marcarSuperpuesto', () => {
  beforeEach(() => usePreferencesStore.setState({ overlayRecientes: {} }));

  it('guarda la fecha de cuando se superpuso', () => {
    usePreferencesStore.getState().marcarSuperpuesto('u1');
    expect(Date.parse(usePreferencesStore.getState().overlayRecientes.u1)).not.toBeNaN();
  });

  it('conserva solo los 100 más recientes', () => {
    const viejos = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`v${i}`, `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`]));
    usePreferencesStore.setState({ overlayRecientes: viejos });
    usePreferencesStore.getState().marcarSuperpuesto('nuevo');
    const guardados = usePreferencesStore.getState().overlayRecientes;
    expect(Object.keys(guardados)).toHaveLength(100);
    expect(guardados.nuevo).toBeDefined();
  });
});
