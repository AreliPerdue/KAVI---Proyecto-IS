import type { Dictionary } from '../types';

export const notifications: Dictionary['notifications'] = {
  today: 'Today',
  startsAt: (hora) => `Starts at ${hora}`,
  sharedBy: (nombre) => ` · Shared by ${nombre}`,
  aContact: 'a contact',
  listItemFallback: 'To-do',
  contactRequestTitle: 'New contact request',
  contactRequestBody: (nombre) => `${nombre} wants to connect with you.`,
  invitedTitle: (nombre) => `${nombre} invited you to an activity`,
  invitedBody: (titulo, cuando) => `${titulo} — ${cuando}`,
};
