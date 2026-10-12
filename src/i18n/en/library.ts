import type { Dictionary } from '../types';

export const library: Dictionary['library'] = {
  title: 'Library',
  inDevelopment: 'In development',
  devHint: 'Library is being built in stages. What you see here changes often and isn’t in More or the tab bar yet.',
  emptyTitle: 'Your library is empty',
  emptyDescription: 'Soon you’ll bring your PDFs and EPUBs, read them like a real book and annotate them.',
  usage: (usado, tope) => `${usado} of ${tope}`,
  usageA11y: (usado, tope, porcentaje) => `Space used: ${usado} of ${tope}, ${porcentaje}%`,
  usageAlmostFull: 'Your library is almost full.',
  profileSection: 'In development',
  profileRow: 'Library',
  profileHint: 'What’s new in KAVI while it’s being built. Just for you and your testers.',
  pieces: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
  viewLabel: 'Library view',
  viewCovers: 'Covers',
  viewList: 'List',
  progressPage: (pagina, total) => `p. ${pagina} of ${total}`,
  progressPercent: (porcentaje) => `${porcentaje}% read`,
  unread: 'Not opened',
  finished: 'Finished',
};
