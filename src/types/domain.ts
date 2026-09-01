/**
 * Tipos de dominio usados por UI, hooks y services. Cuando exista
 * types/database.ts (T029), los services mapean filas de BD a estos tipos.
 */
import type { Dimension } from '@/constants/dimensions';

export type AuthUser = {
  id: string;
  email: string;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Theme = {
  id: string;
  name: string;
  dimension: Dimension;
  color: string;
  icon: string;
  is_system: boolean;
  owner_id: string | null;
};

export type Activity = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  theme_id: string | null;
  dimension: Dimension | null;
  color: string | null;
  icon: string | null;
  /** ISO UTC */
  start_at: string;
  /** ISO UTC */
  end_at: string;
  all_day: boolean;
  recurrence_rule: string | null;
  recurrence_parent_id: string | null;
  is_gym: boolean;
  created_at: string;
  updated_at: string;
};

export type ActivityInput = {
  title: string;
  description?: string | null;
  theme_id?: string | null;
  dimension?: Dimension | null;
  color?: string | null;
  icon?: string | null;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  is_gym?: boolean;
};
