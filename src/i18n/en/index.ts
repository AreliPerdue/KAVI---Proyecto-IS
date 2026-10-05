import type { Dictionary } from '../types';
import { auth } from './auth';
import { calendar } from './calendar';
import { common } from './common';
import { dates } from './dates';
import { errors } from './errors';
import { nav } from './nav';
import { profile } from './profile';

export const en: Dictionary = { auth, calendar, common, dates, errors, nav, profile };
