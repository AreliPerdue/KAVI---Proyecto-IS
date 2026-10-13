/** Formas de leer (RF-BR8, T283): qué se guarda en el dispositivo por libro. */
import { formasValidas, formaValida, MAX_FORMAS, recordarForma } from '@/lib/library/reading-mode';

it('lo que no es una forma vuelve a scroll', () => {
  expect(formaValida('paged')).toBe('paged');
  expect(formaValida('book')).toBe('scroll');
  expect(formaValida(undefined)).toBe('scroll');
});

it('al leer lo guardado se descarta lo que no sirve', () => {
  expect(formasValidas({ a: 'paged', b: 'x', c: 'scroll' })).toEqual({ a: 'paged', c: 'scroll' });
  expect(formasValidas(null)).toEqual({});
  expect(formasValidas('paged')).toEqual({});
});

it('recordar guarda lo distinto de scroll y lo de scroll lo borra', () => {
  const una = recordarForma({}, 'a', 'paged');
  expect(una).toEqual({ a: 'paged' });
  expect(recordarForma(una, 'a', 'scroll')).toEqual({});
});

it('pasado el tope se olvidan los más viejos', () => {
  let formas = {};
  for (let i = 0; i <= MAX_FORMAS; i++) formas = recordarForma(formas, `l${i}`, 'paged');
  expect(Object.keys(formas)).toHaveLength(MAX_FORMAS);
  expect(formas).not.toHaveProperty('l0');
  expect(formas).toHaveProperty(`l${MAX_FORMAS}`, 'paged');
  // Volver a elegir uno lo pasa al final (el más reciente).
  formas = recordarForma(formas, 'l1', 'paged');
  expect(Object.keys(formas).at(-1)).toBe('l1');
});
