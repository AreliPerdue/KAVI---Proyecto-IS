/**
 * Barra configurable y "Más" (spec 01, RF-N1 – RF-N6; T188, T189, T189b).
 */
import { ACCESO_ROUTES, accesosValidos, DEFAULT_ACCESOS, elegirAcceso, moduleHref } from '@/constants/modules';

describe('accesosValidos', () => {
  it('lo guardado válido se respeta', () => {
    expect(accesosValidos(['lists', 'profile'])).toEqual(['lists', 'profile']);
  });

  it.each([
    ['repetidos', ['fitness', 'fitness']],
    ['un módulo que no existe', ['fitness', 'lectura']],
    ['largo distinto de 2', ['fitness']],
    ['nada', undefined],
  ])('%s → lo de omisión', (_n, valor) => {
    expect(accesosValidos(valor)).toEqual(DEFAULT_ACCESOS);
  });

  it('por omisión, Compartido y Fitness; Perfil vive en Más (RF-N2)', () => {
    expect(DEFAULT_ACCESOS).toEqual(['shared', 'fitness']);
  });
});

describe('elegirAcceso', () => {
  it('pone el módulo en el lugar', () => {
    expect(elegirAcceso(['shared', 'fitness'], 1, 'lists')).toEqual(['shared', 'lists']);
  });

  it('elegir el del otro lugar los intercambia: nunca repite (RF-N3)', () => {
    expect(elegirAcceso(['shared', 'fitness'], 0, 'fitness')).toEqual(['fitness', 'shared']);
  });

  it('elegir el que ya está ahí no cambia nada', () => {
    expect(elegirAcceso(['shared', 'fitness'], 0, 'shared')).toEqual(['shared', 'fitness']);
  });
});

describe('moduleHref', () => {
  const accesos = ['shared', 'lists'] as const;

  it('en el teléfono, el que está en la barra abre su lugar', () => {
    expect(moduleHref('shared', accesos, false)).toBe(ACCESO_ROUTES[0]);
    expect(moduleHref('lists', accesos, false)).toBe(ACCESO_ROUTES[1]);
  });

  it('en el teléfono, fuera de la barra se apila en modulo/[id]', () => {
    expect(moduleHref('profile', accesos, false)).toEqual({ pathname: '/(app)/modulo/[id]', params: { id: 'profile' } });
  });

  it('Listas fuera de la barra va a su ruta propia', () => {
    expect(moduleHref('lists', ['shared', 'fitness'], false)).toBe('/(app)/lists');
  });

  it('en web, siempre su pestaña (o la ruta propia de Listas), nunca acceso-N (RF-N5)', () => {
    expect(moduleHref('shared', accesos, true)).toBe('/(app)/(tabs)/shared');
    expect(moduleHref('profile', accesos, true)).toBe('/(app)/(tabs)/profile');
    expect(moduleHref('lists', accesos, true)).toBe('/(app)/lists');
  });
});
