import { AUTH_MESSAGES, AuthUiError } from '@/lib/auth-errors';
import type { ActivitiesApi } from '@/services/contracts';
import { delay, demoState, nextId } from '@/services/demo/store';
import type { Activity } from '@/types/domain';

export const demoActivities: ActivitiesApi = {
  async listByRange(userId, fromIso, toIso) {
    await delay();
    return demoState.activities
      .filter((a) => a.owner_id === userId && a.start_at < toIso && a.end_at > fromIso)
      .map((a) => ({ ...a }))
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  },

  async getById(id) {
    await delay(120);
    const found = demoState.activities.find((a) => a.id === id);
    if (!found) throw new AuthUiError('Esta actividad ya no existe.');
    return { ...found };
  },

  async create(userId, input) {
    await delay();
    const now = new Date().toISOString();
    const created: Activity = {
      id: nextId('act'),
      owner_id: userId,
      title: input.title,
      description: input.description ?? null,
      theme_id: input.theme_id ?? null,
      dimension: input.dimension ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
      start_at: input.start_at,
      end_at: input.end_at,
      all_day: input.all_day ?? false,
      recurrence_rule: null,
      recurrence_parent_id: null,
      is_gym: input.is_gym ?? false,
      created_at: now,
      updated_at: now,
    };
    demoState.activities.push(created);
    return { ...created };
  },

  async update(id, patch) {
    await delay();
    const index = demoState.activities.findIndex((a) => a.id === id);
    if (index < 0) throw new AuthUiError(AUTH_MESSAGES.generic);
    const current = demoState.activities[index] as Activity;
    const updated: Activity = {
      ...current,
      ...patch,
      description: patch.description === undefined ? current.description : patch.description,
      updated_at: new Date().toISOString(),
    };
    demoState.activities[index] = updated;
    return { ...updated };
  },

  async remove(id) {
    await delay(150);
    demoState.activities = demoState.activities.filter((a) => a.id !== id);
  },
};
