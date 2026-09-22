/**
 * Perfil en el backend demo (RF-A9). Reproduce lo que en Supabase hacen el
 * trigger `normalize_username` y el indice unico sobre `lower(username)`: por eso
 * `Pedro` y `pedro` son el mismo usuario.
 */
import { AUTH_MESSAGES } from '@/lib/auth-errors';
import type { ProfilesApi } from '@/services/contracts';

type Store = typeof import('@/services/demo/store');

function fresh(): { perfiles: ProfilesApi; state: Store['demoState'] } {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports -- recarga deliberada del estado demo */
  const store = require('@/services/demo/store') as Store;
  const mod = require('@/services/demo/profiles') as typeof import('@/services/demo/profiles');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return { perfiles: mod.demoProfiles, state: store.demoState };
}

describe('getMyProfile', () => {
  it('devuelve el perfil de la cuenta', async () => {
    const { perfiles } = fresh();
    expect((await perfiles.getMyProfile('demo-user')).username).toBe('demo');
  });

  it('falla con un usuario desconocido', async () => {
    const { perfiles } = fresh();
    await expect(perfiles.getMyProfile('nadie')).rejects.toThrow(AUTH_MESSAGES.generic);
  });

  it('devuelve una copia: mutarla no toca el estado', async () => {
    const { perfiles, state } = fresh();
    const copia = await perfiles.getMyProfile('demo-user');
    copia.username = 'cambiado';

    expect(state.accounts.find((a) => a.user.id === 'demo-user')?.profile.username).toBe('demo');
  });
});

describe('updateMyProfile', () => {
  it('cambia el nombre visible', async () => {
    const { perfiles } = fresh();
    const r = await perfiles.updateMyProfile('demo-user', { display_name: 'Areli' });
    expect(r.display_name).toBe('Areli');
  });

  it('permite dejar el nombre en blanco', async () => {
    const { perfiles } = fresh();
    expect((await perfiles.updateMyProfile('demo-user', { display_name: null })).display_name).toBeNull();
  });

  it('normaliza el username a minusculas y sin espacios', async () => {
    const { perfiles } = fresh();
    expect((await perfiles.updateMyProfile('demo-user', { username: '  Areli  ' })).username).toBe('areli');
  });

  it('rechaza un username que ya tiene otra persona', async () => {
    const { perfiles } = fresh();
    await expect(perfiles.updateMyProfile('demo-user', { username: 'ana' })).rejects.toThrow(
      AUTH_MESSAGES.usernameTaken,
    );
  });

  it('la comprobacion ignora mayusculas: Pedro y pedro son el mismo', async () => {
    const { perfiles } = fresh();
    await expect(perfiles.updateMyProfile('demo-user', { username: 'ANA' })).rejects.toThrow(
      AUTH_MESSAGES.usernameTaken,
    );
  });

  it('guardar el propio username sin cambiarlo no se reporta como ocupado', async () => {
    const { perfiles } = fresh();
    await expect(perfiles.updateMyProfile('demo-user', { username: 'demo' })).resolves.toMatchObject({
      username: 'demo',
    });
  });

  it('un parche vacio no rompe nada', async () => {
    const { perfiles } = fresh();
    expect((await perfiles.updateMyProfile('demo-user', {})).username).toBe('demo');
  });

  it('falla con un usuario desconocido', async () => {
    const { perfiles } = fresh();
    await expect(perfiles.updateMyProfile('nadie', { display_name: 'X' })).rejects.toThrow(AUTH_MESSAGES.generic);
  });

  it('cambiar el username no borra el nombre visible', async () => {
    const { perfiles } = fresh();
    await perfiles.updateMyProfile('demo-user', { display_name: 'Areli' });

    const r = await perfiles.updateMyProfile('demo-user', { username: 'nueva' });

    expect(r.display_name).toBe('Areli');
  });
});
