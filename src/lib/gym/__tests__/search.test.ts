/**
 * Búsqueda de ejercicios (RF-F22) contra el catálogo real: tolerante a acentos, alias y
 * slang, con recientes y favoritos primero. Y el ligado de nombres de v1 (RF-F63).
 */
import { systemExercises } from '@/lib/gym/catalog';
import { buildSearchIndex, isExactExercise, matchCatalog, normalizar, searchExercises } from '@/lib/gym/search';

const catalogo = systemExercises();
const indice = buildSearchIndex(catalogo);
const primero = (q: string) => searchExercises(catalogo, q, indice)[0]?.name_es;
const nombres = (q: string, n = 5) => searchExercises(catalogo, q, indice, { limit: n }).map((e) => e.name_es);

describe('normalizar', () => {
  it('quita acentos, mayúsculas y signos', () => {
    expect(normalizar('  Jalón al PECHO (agarre) ')).toBe('jalon al pecho agarre');
  });
});

describe('slang y alias del spec', () => {
  it.each([
    ['rdl', 'Peso muerto rumano con barra (RDL)'],
    ['RDL', 'Peso muerto rumano con barra (RDL)'],
    ['hack', 'Sentadilla hack'],
    ['jalon', 'Jalón al pecho agarre ancho'],
    ['jalón', 'Jalón al pecho agarre ancho'],
    ['lat pulldown', 'Jalón al pecho agarre ancho'],
    ['banca', 'Press de banca plano con barra'],
    ['vuelos posteriores', 'Pájaros con mancuernas (vuelos posteriores)'],
    ['bench press', 'Press de banca plano con barra'],
    ['eliptica', 'Elíptica'],
    ['búlgara', 'Sentadilla búlgara con mancuernas'],
  ])('"%s" → %s', (q, esperado) => {
    expect(primero(q)).toBe(esperado);
  });

  it('todas las palabras en cualquier orden', () => {
    expect(nombres('martillo polea cuerda')).toContain('Curl martillo en polea con cuerda');
  });

  it('no busca a media palabra: "rdl" no encuentra "hurdle hops"', () => {
    expect(nombres('rdl', 50)).not.toContain('Saltos con vallas');
    expect(nombres('rdl', 50).every((n) => /rumano|rdl/i.test(n))).toBe(true);
  });

  it('una palabra a medias sí, si empieza la palabra', () => {
    expect(nombres('muert', 50)).toContain('Peso muerto convencional');
  });

  it('lo que no existe no devuelve nada', () => {
    expect(searchExercises(catalogo, 'xyzzy', indice)).toEqual([]);
  });
});

describe('orden', () => {
  const rdl = catalogo.find((e) => e.slug === 'peso-muerto-rumano-con-mancuernas')!;
  const sentadilla = catalogo.find((e) => e.slug === 'sentadilla-trasera-barra-alta')!;

  it('lo reciente va primero aunque coincida peor', () => {
    const r = searchExercises(catalogo, 'peso muerto', indice, { recentIds: [rdl.id] });
    expect(r[0].id).toBe(rdl.id);
  });

  it('después los favoritos', () => {
    const r = searchExercises(catalogo, 'peso muerto', indice, { favoriteIds: new Set([rdl.id]) });
    expect(r[0].id).toBe(rdl.id);
  });

  it('sin búsqueda: recientes, favoritos y luego alfabético', () => {
    const r = searchExercises(catalogo, '', indice, { recentIds: [sentadilla.id], favoriteIds: new Set([rdl.id]) });
    expect(r[0].id).toBe(sentadilla.id);
    expect(r[1].id).toBe(rdl.id);
    expect(r).toHaveLength(catalogo.length);
  });
});

describe('ligar nombres de v1 (RF-F63)', () => {
  it.each([
    ['Sentadilla', 'sentadilla-trasera-barra-alta'],
    ['Prensa', 'prensa-de-pierna-45'],
    ['Peso muerto rumano', 'peso-muerto-rumano-con-barra-rdl'],
    ['Plancha', 'plancha-frontal'],
    ['press banca', 'press-de-banca-plano-con-barra'],
  ])('"%s" se liga a %s', (nombre, slug) => {
    expect(matchCatalog(nombre, catalogo, indice)?.slug).toBe(slug);
  });

  it('lo ambiguo o desconocido no se liga', () => {
    expect(matchCatalog('Press', catalogo, indice)).toBeNull();
    expect(matchCatalog('Mi rutina rara', catalogo, indice)).toBeNull();
    expect(matchCatalog('   ', catalogo, indice)).toBeNull();
  });
});

describe('aliases sin duplicados entre ejercicios', () => {
  it('un alias no apunta a dos ejercicios (si no, ligar sería imposible)', () => {
    const vistos = new Map<string, string>();
    const repetidos: string[] = [];
    for (const e of catalogo) {
      for (const a of new Set(e.aliases.map(normalizar))) {
        if (vistos.has(a) && vistos.get(a) !== e.slug) repetidos.push(`${a}: ${vistos.get(a)} / ${e.slug}`);
        vistos.set(a, e.slug);
      }
    }
    expect(repetidos).toEqual([]);
  });
});

describe('crear personalizado solo si no existe', () => {
  it('un alias exacto cuenta como existente', () => {
    expect(isExactExercise('rdl', indice)).toBe(true);
    expect(isExactExercise('Elíptica', indice)).toBe(true);
    expect(isExactExercise('bench press', indice)).toBe(true);
  });
  it('un nombre nuevo no existe', () => {
    expect(isExactExercise('Mi press raro', indice)).toBe(false);
  });
  it('vacío no ofrece crear', () => {
    expect(isExactExercise('  ', indice)).toBe(true);
  });
});
