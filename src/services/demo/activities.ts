import { addDays } from 'date-fns';

import { AuthUiError } from '@/lib/auth-errors';
import { durationMinutes, fromIso, toIso } from '@/lib/dates';
import {
  expandOccurrences,
  horizonEnd,
  parseRRule,
  RECURRENCE_EXTEND_THRESHOLD_DAYS,
  type RecurrenceRule,
  toRRule,
} from '@/lib/recurrence';
import type { ActivitiesApi, CreateActivityInput } from '@/services/contracts';
import { removeRemindersForActivities, syncRecipients } from '@/services/demo/reminders';
import { detachWorkoutsFromActivities } from '@/services/demo/workouts';
import { delay, demoState, emitDataChange, nextId } from '@/services/demo/store';
import type { Activity } from '@/types/domain';

function find(id: string): Activity {
  const found = demoState.activities.find((a) => a.id === id);
  if (!found) throw new AuthUiError('Esta actividad ya no existe.');
  return found;
}

/** Añade el nombre del dueño cuando la actividad no es mía (RF-S5, RF-S13). */
function withOwner(activity: Activity, viewerId: string): Activity {
  if (activity.owner_id === viewerId) return { ...activity };
  const owner = demoState.accounts.find((acc) => acc.user.id === activity.owner_id);
  return { ...activity, owner_name: owner?.profile.display_name ?? owner?.profile.username ?? 'Contacto' };
}

function seriesRoot(activity: Activity): Activity {
  return activity.recurrence_parent_id ? find(activity.recurrence_parent_id) : activity;
}

/** Crea instancias de una serie desde `after` hasta el horizonte. */
function materialize(parent: Activity, rule: RecurrenceRule, after: Date) {
  const duration = durationMinutes(parent.start_at, parent.end_at);
  const existing = new Set(
    demoState.activities.filter((a) => a.recurrence_parent_id === parent.id).map((a) => a.start_at),
  );
  for (const start of expandOccurrences(rule, parent.start_at, after, horizonEnd())) {
    const startIso = toIso(start);
    if (existing.has(startIso)) continue;
    demoState.activities.push({
      ...parent,
      id: nextId('act'),
      recurrence_rule: null,
      recurrence_parent_id: parent.id,
      start_at: startIso,
      end_at: toIso(new Date(start.getTime() + duration * 60_000)),
    });
  }
}

function applyPatch(activity: Activity, patch: Partial<CreateActivityInput>): Activity {
  const { recurrence: _recurrence, ...fields } = patch;
  return {
    ...activity,
    ...fields,
    description: fields.description === undefined ? activity.description : fields.description,
    updated_at: new Date().toISOString(),
  };
}

export const demoActivities: ActivitiesApi = {
  async listByRange(userId, fromIso, toIso) {
    await delay();
    const sharedIds = new Set(
      demoState.activityShares.filter((s) => s.shared_with_id === userId && s.status === 'accepted').map((s) => s.activity_id),
    );
    return demoState.activities
      .filter((a) => (a.owner_id === userId || sharedIds.has(a.id)) && a.start_at < toIso && a.end_at > fromIso)
      .map((a) => withOwner(a, userId))
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  },

  async getById(id) {
    await delay(120);
    const found = find(id);
    return withOwner(found, demoState.currentUser?.id ?? found.owner_id);
  },

  async create(userId, input) {
    await delay();
    const now = new Date().toISOString();
    const { recurrence, viewerIds, ...fields } = input;
    const created: Activity = {
      id: nextId('act'),
      owner_id: userId,
      title: fields.title,
      description: fields.description ?? null,
      visibility: fields.visibility ?? 'default',
      theme_id: fields.theme_id ?? null,
      dimension: fields.dimension ?? null,
      color: fields.color ?? null,
      icon: fields.icon ?? null,
      start_at: fields.start_at,
      end_at: fields.end_at,
      all_day: fields.all_day ?? false,
      recurrence_rule: recurrence ? toRRule(recurrence) : null,
      recurrence_parent_id: null,
      is_gym: fields.is_gym ?? false,
      created_at: now,
      updated_at: now,
    };
    demoState.activities.push(created);
    // Mismo criterio que en Supabase: la lista solo aplica con 'selected', y cambiar
    // de opción la vacía para no dejar permisos olvidados.
    demoState.activityViewers = demoState.activityViewers.filter((v) => v.activity_id !== created.id);
    if (created.visibility === 'selected' && viewerIds?.length) {
      demoState.activityViewers.push(...viewerIds.map((user_id) => ({ activity_id: created.id, user_id })));
    }
    if (recurrence) materialize(created, recurrence, fromIso(created.start_at));
    emitDataChange();
    return { ...created };
  },

  async update(id, patch, scope = 'this') {
    await delay();
    const current = find(id);
    if (scope === 'this' || (!current.recurrence_rule && !current.recurrence_parent_id)) {
      const updated = applyPatch(current, patch);
      demoState.activities = demoState.activities.map((a) => (a.id === id ? updated : a));
      syncRecipients(id);
      emitDataChange();
      return { ...updated };
    }

    // Toda la serie: se edita la madre y se regeneran las instancias desde esta ocurrencia.
    const root = seriesRoot(current);
    const rule = patch.recurrence === undefined ? parseRRule(root.recurrence_rule) : patch.recurrence;
    const shiftMs = patch.start_at ? fromIso(patch.start_at).getTime() - fromIso(current.start_at).getTime() : 0;
    const duration = patch.start_at && patch.end_at ? durationMinutes(patch.start_at, patch.end_at) : durationMinutes(root.start_at, root.end_at);
    const rootStart = new Date(fromIso(root.start_at).getTime() + shiftMs);
    const updatedRoot: Activity = {
      ...applyPatch(root, patch),
      start_at: toIso(rootStart),
      end_at: toIso(new Date(rootStart.getTime() + duration * 60_000)),
      recurrence_rule: rule ? toRRule(rule) : null,
    };
    const fromDate = fromIso(current.start_at);
    demoState.activities = demoState.activities
      .filter((a) => !(a.recurrence_parent_id === root.id && fromIso(a.start_at) >= fromDate))
      .map((a) => (a.id === root.id ? updatedRoot : a));
    if (rule) materialize(updatedRoot, rule, new Date(Math.max(fromDate.getTime() - 1, rootStart.getTime())));
    emitDataChange();
    return { ...(demoState.activities.find((a) => a.id === id) ?? updatedRoot) };
  },

  async remove(id, scope = 'this') {
    await delay(150);
    const current = find(id);
    const before = demoState.activities.map((a) => a.id);
    const finish = () => {
      const remaining = new Set(demoState.activities.map((a) => a.id));
      const removed = before.filter((x) => !remaining.has(x));
      removeRemindersForActivities(removed);
      detachWorkoutsFromActivities(removed);
      emitDataChange();
    };
    if (scope === 'series') {
      const root = seriesRoot(current);
      const fromDate = fromIso(current.start_at);
      demoState.activities = demoState.activities.filter(
        (a) => a.id !== root.id && !(a.recurrence_parent_id === root.id && fromIso(a.start_at) >= fromDate),
      );
      finish();
      return;
    }
    if (current.recurrence_rule) {
      // Eliminar solo la madre: la primera instancia hereda la serie.
      const children = demoState.activities
        .filter((a) => a.recurrence_parent_id === current.id)
        .sort((a, b) => a.start_at.localeCompare(b.start_at));
      const heir = children[0];
      demoState.activities = demoState.activities.filter((a) => a.id !== current.id);
      if (heir) {
        demoState.activities = demoState.activities.map((a) => {
          if (a.id === heir.id) return { ...a, recurrence_rule: current.recurrence_rule, recurrence_parent_id: null };
          if (a.recurrence_parent_id === current.id) return { ...a, recurrence_parent_id: heir.id };
          return a;
        });
      }
      finish();
      return;
    }
    demoState.activities = demoState.activities.filter((a) => a.id !== id);
    finish();
  },

  async extendRecurrenceHorizon(userId) {
    const threshold = addDays(new Date(), RECURRENCE_EXTEND_THRESHOLD_DAYS);
    for (const root of demoState.activities.filter((a) => a.owner_id === userId && a.recurrence_rule)) {
      const rule = parseRRule(root.recurrence_rule);
      if (!rule) continue;
      const last = demoState.activities
        .filter((a) => a.recurrence_parent_id === root.id)
        .reduce((max, a) => (a.start_at > max ? a.start_at : max), root.start_at);
      if (fromIso(last) < threshold) materialize(root, rule, fromIso(last));
    }
  },
};
