/**
 * Nobi, la mascota, en sus dos juegos de imagenes.
 *
 * El fondo va pintado dentro del PNG y no es transparente, asi que hay una version
 * por esquema (NFR-18). Lo que hay que fijar es que los dos juegos esten completos y
 * que la eleccion se resuelva por el esquema de quien mira, no por el de quien eligio:
 * el perfil solo guarda el id del color.
 */
import { NOBIS, NOBI_PREFIX, nobiIdDesde, nobiSource, nobiUrl } from '@/constants/nobi';

describe('catalogo', () => {
  it('no repite ids', () => {
    expect(new Set(NOBIS.map((n) => n.id)).size).toBe(NOBIS.length);
  });

  it('cada color trae las dos versiones', () => {
    for (const nobi of NOBIS) {
      expect(nobi.sources.dark).toBeTruthy();
      expect(nobi.sources.light).toBeTruthy();
    }
  });

  /** Si se repitieran, uno de los dos juegos estaria apuntando al otro. */
  it('las dos versiones de un color son imagenes distintas', () => {
    for (const nobi of NOBIS) {
      expect(nobi.sources.light).not.toEqual(nobi.sources.dark);
    }
  });

  it('todos tienen etiqueta en espanol', () => {
    for (const nobi of NOBIS) expect(nobi.label.trim()).not.toBe('');
  });
});

describe('lo que se guarda en el perfil', () => {
  it('es el id con prefijo, no la imagen', () => {
    expect(nobiUrl('pink')).toBe(`${NOBI_PREFIX}pink`);
  });

  it('se lee de vuelta', () => {
    expect(nobiIdDesde(nobiUrl('indigo'))).toBe('indigo');
  });

  it('sin Nobi elegido no hay id', () => {
    expect(nobiIdDesde(null)).toBeNull();
    expect(nobiIdDesde(undefined)).toBeNull();
  });

  /** Un avatar de otra procedencia (una URL, por ejemplo) no es un Nobi. */
  it('un valor que no lleva el prefijo no es un Nobi', () => {
    expect(nobiIdDesde('https://ejemplo.mx/foto.png')).toBeNull();
  });

  /** Si se retirara un color, los perfiles que lo tuvieran caen a sus iniciales. */
  it('un color que ya no existe no es un Nobi', () => {
    expect(nobiIdDesde(nobiUrl('turquesa_de_2019'))).toBeNull();
  });
});

describe('que imagen se pinta (NFR-18)', () => {
  const nobi = NOBIS.find((n) => n.id === 'black')!;

  it('en oscuro, la de fondo oscuro', () => {
    expect(nobiSource(nobiUrl('black'), 'dark')).toBe(nobi.sources.dark);
  });

  it('en claro, la de fondo claro', () => {
    expect(nobiSource(nobiUrl('black'), 'light')).toBe(nobi.sources.light);
  });

  it('sin Nobi elegido no hay imagen en ningun esquema', () => {
    expect(nobiSource(null, 'light')).toBeNull();
    expect(nobiSource(null, 'dark')).toBeNull();
  });
});
