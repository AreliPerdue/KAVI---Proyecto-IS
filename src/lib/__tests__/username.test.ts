/**
 * Propuesta de username a partir del correo (RF-A8). El resultado se manda al
 * trigger `handle_new_user`, que valida el formato en la base: si aqui se cuela
 * un caracter invalido, el alta falla del lado del servidor.
 */
import { availableUsername, suggestUsername } from '@/lib/username';
import { USERNAME_PATTERN } from '@/lib/schemas/auth';

describe('suggestUsername', () => {
  it('toma la parte local del correo', () => {
    expect(suggestUsername('areli@kavi.app')).toBe('areli');
  });

  it('pasa todo a minusculas', () => {
    expect(suggestUsername('AreliPerdue@kavi.app')).toBe('areliperdue');
  });

  it('quita los acentos en vez de sustituirlos', () => {
    expect(suggestUsername('josé.muñoz@kavi.app')).toBe('jose_munoz');
  });

  it('sustituye los caracteres no permitidos por guion bajo', () => {
    expect(suggestUsername('areli.perdue+kavi@gmail.com')).toBe('areli_perdue_kavi');
  });

  it('colapsa los guiones bajos repetidos', () => {
    expect(suggestUsername('a...b@kavi.app')).toBe('a_b');
  });

  it('no deja guiones bajos en los extremos', () => {
    const result = suggestUsername('...areli...@kavi.app');
    expect(result.startsWith('_')).toBe(false);
    expect(result.endsWith('_')).toBe(false);
  });

  it('alarga los demasiado cortos', () => {
    expect(suggestUsername('ab@kavi.app').length).toBeGreaterThanOrEqual(3);
  });

  it('recorta a 30 caracteres', () => {
    expect(suggestUsername(`${'a'.repeat(60)}@kavi.app`)).toHaveLength(30);
  });

  it('cae al valor de reserva cuando no queda nada aprovechable', () => {
    expect(suggestUsername('...@kavi.app')).toBe('usuario');
  });

  it('siempre produce algo que la base aceptaria', () => {
    const correos = [
      'areli@kavi.app',
      'José.Muñoz@kavi.app',
      '...@kavi.app',
      'a@kavi.app',
      `${'z'.repeat(80)}@kavi.app`,
      'a+b+c@kavi.app',
      '___@kavi.app',
    ];
    for (const correo of correos) {
      const propuesta = suggestUsername(correo);
      expect(propuesta).toMatch(USERNAME_PATTERN);
      expect(propuesta.length).toBeGreaterThanOrEqual(3);
      expect(propuesta.length).toBeLessThanOrEqual(30);
    }
  });
});

describe('availableUsername', () => {
  it('devuelve la base cuando esta libre', async () => {
    const resultado = await availableUsername('areli@kavi.app', async () => true);
    expect(resultado).toBe('areli');
  });

  it('prueba sufijos numericos hasta encontrar uno libre', async () => {
    const tomados = new Set(['areli', 'areli2', 'areli3']);
    const resultado = await availableUsername('areli@kavi.app', async (u) => !tomados.has(u));
    expect(resultado).toBe('areli4');
  });

  it('consulta la base antes que cualquier sufijo', async () => {
    const consultados: string[] = [];
    await availableUsername('areli@kavi.app', async (u) => {
      consultados.push(u);
      return u === 'areli2';
    });
    expect(consultados[0]).toBe('areli');
  });

  it('respeta el tope de intentos y aun asi devuelve algo valido', async () => {
    const resultado = await availableUsername('areli@kavi.app', async () => false, 3);
    expect(resultado).toMatch(USERNAME_PATTERN);
    expect(resultado.length).toBeLessThanOrEqual(30);
  });

  it('el sufijo no hace crecer el username mas alla del maximo', async () => {
    const largo = `${'a'.repeat(40)}@kavi.app`;
    const resultado = await availableUsername(largo, async (u) => u.endsWith('7'));
    expect(resultado.length).toBeLessThanOrEqual(30);
    expect(resultado).toMatch(USERNAME_PATTERN);
  });
});
