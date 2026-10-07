/**
 * Aprobación del adulto en el demo (T264): las mismas reglas que `create_guardian_consent`.
 */
import type { ConsentApi } from '@/services/contracts';

jest.mock('@/services/demo/store', () => ({
  ...jest.requireActual('@/services/demo/store'),
  delay: () => Promise.resolve(),
}));

type Store = typeof import('@/services/demo/store');

/** Una cuenta nueva con sesión, de 17 años si no se dice otra cosa. */
async function fresh(nacimiento = '2009-06-01'): Promise<{ api: ConsentApi; store: Store }> {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports -- recarga deliberada del estado demo */
  const store = require('@/services/demo/store') as Store;
  const api = (require('@/services/demo/consent') as typeof import('@/services/demo/consent')).demoConsent;
  /* eslint-enable @typescript-eslint/no-require-imports */
  const user = { id: 'u-joven', email: 'joven@kavi.app' };
  store.demoState.accounts.push({ user, password: 'x', profile: { id: user.id, username: 'joven', display_name: 'Pau' } } as never);
  store.setCurrentUser(user as never);
  await api.accept(nacimiento, 'v1');
  return { api, store };
}

describe('pedir aprobación', () => {
  it('no se puede usar el correo propio', async () => {
    const { api } = await fresh();
    await expect(api.requestGuardianApproval(' JOVEN@kavi.app ')).rejects.toThrow();
  });

  it('solo se pide para 16 o 17 años', async () => {
    const { api } = await fresh('2000-01-01');
    await expect(api.requestGuardianApproval('mama@x.com')).rejects.toThrow();
  });

  it('una solicitud nueva reemplaza a la pendiente', async () => {
    const { api } = await fresh();
    const primera = await api.requestGuardianApproval('mama@x.com');
    await api.requestGuardianApproval('papa@x.com');
    const token = decodeURIComponent(primera.previewLink!.split('token=')[1]!.split('&')[0]!);
    expect((await api.guardianRequestInfo(token))?.status).toBe('replaced');
    expect((await api.getStatus()).guardian?.email).toBe('papa@x.com');
  });

  it('a la sexta del día se rechaza', async () => {
    const { api } = await fresh();
    for (let i = 0; i < 5; i++) await api.requestGuardianApproval(`tutor${i}@x.com`);
    await expect(api.requestGuardianApproval('otro@x.com')).rejects.toThrow();
  });

  it('el enlace de prueba lleva el idioma de la app (RF-I6)', async () => {
    const { api } = await fresh();
    expect((await api.requestGuardianApproval('mama@x.com')).previewLink).toMatch(/&lang=(es|en)$/);
  });
});

describe('decidir', () => {
  it('aprobar abre la app; decidir otra vez no cambia nada', async () => {
    const { api } = await fresh();
    const { previewLink } = await api.requestGuardianApproval('mama@x.com');
    const token = decodeURIComponent(previewLink!.split('token=')[1]!.split('&')[0]!);
    expect(await api.decideGuardianRequest(token, true)).toBe('approved');
    expect(await api.decideGuardianRequest(token, false)).toBe('approved');
    expect((await api.getStatus()).guardianApproved).toBe(true);
  });

  it('un enlace que no existe falla', async () => {
    const { api } = await fresh();
    await expect(api.decideGuardianRequest('inventado', true)).rejects.toThrow();
  });
});

describe('menor de 16 (RF-A13)', () => {
  it('"Es correcta: eliminar mi cuenta" borra la cuenta y cierra la sesión (vuelve a login)', async () => {
    const { api, store } = await fresh('2015-01-01');
    await api.deleteUnderageAccount();
    expect(store.demoState.currentUser).toBeNull();
    expect(store.demoState.accounts.some((a) => a.user.id === 'u-joven')).toBe(false);
  });
});
