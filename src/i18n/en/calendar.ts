import type { Dictionary } from '../types';

export const calendar: Dictionary['calendar'] = {
  changeDate: (titulo) => `${titulo}. Change date`,
  previous: 'Previous',
  next: 'Next',
  today: 'Today',
  goToToday: 'Go to today',
  lists: 'Lists',
  filters: 'Filters',
  filtersActive: (n) => `Filters, ${n} active`,
  goToDate: 'Go to a date',
  dayCell: (dia, n) => `${dia}, ${n === 0 ? 'no activities' : `${n} ${n === 1 ? 'activity' : 'activities'}`}`,
  createAt: (hora) => `Create activity at ${hora}`,
  now: (hora) => `Current time, ${hora}`,
  allDayRow: 'All day',
  sharedBy: (quien) => `shared by ${quien ?? 'a contact'}`,
  datePickerTitle: 'Date',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
};
