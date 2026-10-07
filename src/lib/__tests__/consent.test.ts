/**
 * Edad mínima y consentimiento (spec 03, RF-A13; T264). Lo que decide si la app se abre.
 */
import { consentGate, edadEn, type ConsentStatus } from '@/lib/consent';

const VIGENTE = 'v1-2026-10-05';
const estado = (over: Partial<ConsentStatus> = {}): ConsentStatus => ({
  birthDate: '2000-01-01',
  privacyVersion: VIGENTE,
  guardian: null,
  guardianApproved: false,
  ...over,
});

describe('edadEn', () => {
  it('el día del cumpleaños ya los cumplió', () => {
    expect(edadEn('2010-10-07', '2026-10-07')).toBe(16);
  });

  it('un día antes todavía no', () => {
    expect(edadEn('2010-10-08', '2026-10-07')).toBe(15);
  });

  it('un día después, sí', () => {
    expect(edadEn('2010-10-06', '2026-10-07')).toBe(16);
  });

  it('29 de febrero: en año no bisiesto los cumple el 1 de marzo', () => {
    expect(edadEn('2008-02-29', '2026-02-28')).toBe(17);
    expect(edadEn('2008-02-29', '2026-03-01')).toBe(18);
  });
});

describe('consentGate', () => {
  const HOY = '2026-10-07';

  it('sin fecha de nacimiento pide aceptar', () => {
    expect(consentGate(estado({ birthDate: null }), VIGENTE, HOY)).toEqual({ kind: 'aceptar' });
  });

  it('con otra versión del aviso vuelve a pedir aceptar', () => {
    expect(consentGate(estado({ privacyVersion: 'v0' }), VIGENTE, HOY)).toEqual({ kind: 'aceptar' });
  });

  it('menos de 16 años: no se puede usar', () => {
    expect(consentGate(estado({ birthDate: '2011-01-01' }), VIGENTE, HOY)).toEqual({ kind: 'menor-de-16' });
  });

  it('16 o 17 sin aprobación espera al adulto, con su solicitud', () => {
    const request = { email: 'mama@x.com', status: 'pending' as const, expiresAt: '2026-10-14T00:00:00Z' };
    expect(consentGate(estado({ birthDate: '2009-06-01', guardian: request }), VIGENTE, HOY)).toEqual({
      kind: 'adulto-responsable',
      request,
    });
  });

  it('16 o 17 con una aprobación (aunque luego se pidiera otra) abre la app', () => {
    expect(consentGate(estado({ birthDate: '2009-06-01', guardianApproved: true }), VIGENTE, HOY)).toEqual({ kind: 'listo' });
  });

  it('18 o más abre la app sin adulto', () => {
    expect(consentGate(estado({ birthDate: '2008-10-07' }), VIGENTE, HOY)).toEqual({ kind: 'listo' });
  });
});
