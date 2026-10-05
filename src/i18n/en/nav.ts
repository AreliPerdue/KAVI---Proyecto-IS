import type { Dictionary } from '../types';

export const nav: Dictionary['nav'] = {
  calendar: 'Calendar',
  modules: { shared: 'Shared', lists: 'Lists', fitness: 'Fitness', profile: 'Profile' },
  more: 'More',
  modulesSection: 'Modules',
  inBar: 'In the tab bar',
  barSection: 'Tab bar',
  barFooter: 'Calendar always comes first and More always last. If you pick a module that’s already in the other spot, they swap.',
  secondPlace: 'Second spot',
  thirdPlace: 'Third spot',
  swaps: 'It’s in the other spot: they’ll swap',
  swapsA11y: (modulo) => `${modulo}, it’s in the other spot; they’ll swap`,
};
