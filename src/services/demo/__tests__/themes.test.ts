/**
 * CRUD de temas (spec 05). Lo delicado no es crear o borrar, sino los efectos
 * laterales sobre las actividades: al editar un tema su estilo se propaga
 * (copia de estilo) y al borrarlo las actividades conservan color e icono
 * pero pierden el vinculo (RF-T6).
 */
import { toIso } from '@/lib/dates';
import type { ActivitiesApi, ThemesApi } from '@/services/contracts';
import type { ThemeInput } from '@/types/domain';

const USER = 'demo-user';
const OTHER = 'otra-persona';

type Store = typeof import('@/services/demo/store');

function fresh(): { themes: ThemesApi; activities: ActivitiesApi; state: Store['demoState'] } {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports -- recarga deliberada del estado demo */
  const store = require('@/services/demo/store') as Store;
  const themesMod = require('@/services/demo/themes') as typeof import('@/services/demo/themes');
  const actsMod = require('@/services/demo/activities') as typeof import('@/services/demo/activities');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return { themes: themesMod.demoThemes, activities: actsMod.demoActivities, state: store.demoState };
}

const input = (over: Partial<ThemeInput> = {}): ThemeInput => ({
  name: 'Repaso',
  dimension: 'intelectual',
  color: '#2196F3',
  icon: 'book-open',
  ...over,
});

const base = new Date(2026, 8, 7, 9, 0, 0, 0);

describe('crear', () => {
  it('marca el tema como propio y no del sistema', async () => {
    const { themes } = fresh();
    const created = await themes.create(USER, input());

    expect(created.is_system).toBe(false);
    expect(created.owner_id).toBe(USER);
    expect(created.id).toEqual(expect.any(String));
  });

  it('recorta los espacios del nombre', async () => {
    const { themes } = fresh();
    expect((await themes.create(USER, input({ name: '  Repaso  ' }))).name).toBe('Repaso');
  });

  it('aparece en la lista del dueno', async () => {
    const { themes } = fresh();
    const created = await themes.create(USER, input());

    expect((await themes.list(USER)).map((t) => t.id)).toContain(created.id);
  });
});

describe('leer', () => {
  it('la lista incluye los temas del sistema', async () => {
    const { themes } = fresh();
    const list = await themes.list(USER);

    expect(list.length).toBeGreaterThan(0);
    expect(list.some((t) => t.is_system)).toBe(true);
  });

  it('no muestra los temas propios de otra persona', async () => {
    const { themes } = fresh();
    const ajeno = await themes.create(OTHER, input({ name: 'Privado' }));

    expect((await themes.list(USER)).map((t) => t.id)).not.toContain(ajeno.id);
  });
});

describe('actualizar', () => {
  it('cambia los campos enviados', async () => {
    const { themes } = fresh();
    const created = await themes.create(USER, input());

    const updated = await themes.update(created.id, { name: 'Repaso nocturno', color: '#9C27B0' });

    expect(updated.name).toBe('Repaso nocturno');
    expect(updated.color).toBe('#9C27B0');
    expect(updated.dimension).toBe('intelectual');
  });

  it('propaga el nuevo estilo a las actividades que lo usan (copia de estilo)', async () => {
    const { themes, activities } = fresh();
    const theme = await themes.create(USER, input());
    const act = await activities.create(USER, {
      title: 'Leer',
      start_at: toIso(base),
      end_at: toIso(new Date(base.getTime() + 3_600_000)),
      theme_id: theme.id,
      color: theme.color,
      icon: theme.icon,
      dimension: theme.dimension,
    });

    await themes.update(theme.id, { color: '#FF9800', dimension: 'social' });

    const after = await activities.getById(act.id);
    expect(after.color).toBe('#FF9800');
    expect(after.dimension).toBe('social');
  });

  it('rechaza modificar un tema del sistema', async () => {
    const { themes, state } = fresh();
    const system = state.themes.find((t) => t.is_system);

    await expect(themes.update(system!.id, { name: 'Secuestrado' })).rejects.toThrow(/sistema/i);
  });

  it('falla con un tema inexistente', async () => {
    const { themes } = fresh();
    await expect(themes.update('no-existe', { name: 'X' })).rejects.toThrow(/ya no existe/i);
  });
});

describe('eliminar', () => {
  it('lo saca de la lista', async () => {
    const { themes } = fresh();
    const created = await themes.create(USER, input());

    await themes.remove(created.id);

    expect((await themes.list(USER)).map((t) => t.id)).not.toContain(created.id);
  });

  it('desvincula las actividades pero les conserva el estilo copiado (RF-T6)', async () => {
    const { themes, activities } = fresh();
    const theme = await themes.create(USER, input({ color: '#009688' }));
    const act = await activities.create(USER, {
      title: 'Con tema',
      start_at: toIso(base),
      end_at: toIso(new Date(base.getTime() + 3_600_000)),
      theme_id: theme.id,
      color: theme.color,
      icon: theme.icon,
    });

    await themes.remove(theme.id);

    const after = await activities.getById(act.id);
    expect(after.theme_id).toBeNull();
    expect(after.color).toBe('#009688');
    expect(after.icon).toBe('book-open');
  });

  it('rechaza borrar un tema del sistema', async () => {
    const { themes, state } = fresh();
    const system = state.themes.find((t) => t.is_system);

    await expect(themes.remove(system!.id)).rejects.toThrow(/sistema/i);
  });
});
