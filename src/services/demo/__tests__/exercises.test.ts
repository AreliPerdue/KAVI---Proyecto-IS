/**
 * Catálogo en el modo demo (spec 07 v2, §4): el mismo catálogo y los mismos ids que la
 * migración de Supabase, personalizados por dueño y preferencias que no se pisan.
 */
import { systemExerciseId } from '@/lib/gym/catalog';
import type { ExercisesApi } from '@/services/contracts';

const A = 'demo-user';
const B = 'otra-persona';

function fresh(): ExercisesApi {
  jest.resetModules();
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- recarga deliberada del estado demo */
  return (require('@/services/demo/exercises') as typeof import('@/services/demo/exercises')).demoExercises;
}

describe('catálogo', () => {
  it('trae los 530 del sistema con el id derivado del slug, igual que la migración', async () => {
    const lista = await fresh().list(A);
    expect(lista.length).toBeGreaterThanOrEqual(530);
    const banca = lista.find((e) => e.slug === 'press-de-banca-plano-con-barra');
    expect(banca?.id).toBe(systemExerciseId('press-de-banca-plano-con-barra'));
    expect(banca?.created_by).toBeNull();
  });

  it('devuelve copias: modificar lo leído no cambia el catálogo', async () => {
    const api = fresh();
    const lista = await api.list(A);
    lista[0].aliases.push('alterado');
    expect((await api.list(A))[0].aliases).not.toContain('alterado');
  });
});

describe('personalizados (RF-F24)', () => {
  it('se crean con dueño y solo los ve su dueño', async () => {
    const api = fresh();
    const mio = await api.createCustom(A, { name_es: '  Mi press raro  ' });
    expect(mio.name_es).toBe('Mi press raro');
    expect(mio.slug).toBe(`custom-${mio.id}`);
    expect((await api.list(A)).some((e) => e.id === mio.id)).toBe(true);
    expect((await api.list(B)).some((e) => e.id === mio.id)).toBe(false);
  });

  it('sin nombre no se crea', async () => {
    await expect(fresh().createCustom(A, { name_es: '   ' })).rejects.toThrow(/nombre/i);
  });

  it('archivar marca la fecha y no lo borra (puede tener historial)', async () => {
    const api = fresh();
    const mio = await api.createCustom(A, { name_es: 'Curl raro' });
    const archivado = await api.updateCustom(mio.id, { archived: true });
    expect(archivado.archived_at).toEqual(expect.any(String));
    expect((await api.list(A)).some((e) => e.id === mio.id)).toBe(true);
  });

  it('los del sistema no se pueden editar', async () => {
    await expect(fresh().updateCustom(systemExerciseId('spoto-press'), { name_es: 'x' })).rejects.toThrow();
  });
});

describe('preferencias (RF-F25, RF-F52)', () => {
  it('marcar favorito no borra la nota fija', async () => {
    const api = fresh();
    const id = systemExerciseId('pec-deck');
    await api.savePrefs(A, id, { sticky_note: 'asiento en 4' });
    await api.savePrefs(A, id, { is_favorite: true });
    expect(await api.listPrefs(A)).toEqual([{ exercise_id: id, is_favorite: true, sticky_note: 'asiento en 4', last_used_at: null }]);
  });

  it('son de cada persona', async () => {
    const api = fresh();
    await api.savePrefs(A, systemExerciseId('pec-deck'), { is_favorite: true });
    expect(await api.listPrefs(B)).toEqual([]);
  });
});
