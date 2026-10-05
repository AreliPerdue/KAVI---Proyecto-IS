import type { Href } from 'expo-router';
import { CircleCheck, Dumbbell, type LucideIcon, UserRound, Users } from 'lucide-react-native';

/**
 * Módulos de KAVI que pueden ir en la barra o en Más (spec 01, RF-N1–N6).
 *
 * El Calendario no está aquí: es fijo en el primer lugar (P1). Los módulos futuros
 * (Lectura, Sueño, Diario…) se agregan a esta lista y aparecen solos en Más y entre los
 * candidatos de la barra.
 */
export type ModuleId = 'shared' | 'lists' | 'fitness' | 'profile';

export type ModuleInfo = {
  id: ModuleId;
  label: string;
  Icon: LucideIcon;
  /** Iconos de la barra nativa: SF Symbol en iOS, Material en Android. */
  sf: { default: string; selected: string };
  md: string;
  /**
   * Ruta propia fuera de las pestañas, para los módulos que nacieron así (Listas). Los que
   * tienen pestaña en `(tabs)/` se abren apilados en `(app)/modulo/[id]`.
   */
  route?: Href;
};

export const MODULES: readonly ModuleInfo[] = [
  { id: 'shared', label: 'Compartido', Icon: Users, sf: { default: 'person.2', selected: 'person.2.fill' }, md: 'group' },
  {
    id: 'lists',
    label: 'Listas',
    Icon: CircleCheck,
    sf: { default: 'checkmark.circle', selected: 'checkmark.circle.fill' },
    md: 'task_alt',
    route: '/(app)/lists',
  },
  { id: 'fitness', label: 'Fitness', Icon: Dumbbell, sf: { default: 'dumbbell', selected: 'dumbbell.fill' }, md: 'fitness_center' },
  {
    id: 'profile',
    label: 'Perfil',
    Icon: UserRound,
    sf: { default: 'person.crop.circle', selected: 'person.crop.circle.fill' },
    md: 'person',
  },
];

export function moduleInfo(id: ModuleId): ModuleInfo {
  return MODULES.find((m) => m.id === id) as ModuleInfo;
}

/** Los dos lugares a elección de la barra: segundo y tercero (el primero es el Calendario). */
export type Accesos = readonly [ModuleId, ModuleId];

/** Por omisión, Perfil vive en Más (RF-N2). */
export const DEFAULT_ACCESOS: Accesos = ['shared', 'fitness'];

/** Lo guardado, si sigue siendo válido; si no (un módulo que ya no existe, repetidos), lo de omisión. */
export function accesosValidos(valor: unknown): Accesos {
  if (!Array.isArray(valor) || valor.length !== 2) return DEFAULT_ACCESOS;
  const [a, b] = valor as unknown[];
  const ids = MODULES.map((m) => m.id) as unknown[];
  if (!ids.includes(a) || !ids.includes(b) || a === b) return DEFAULT_ACCESOS;
  return [a, b] as Accesos;
}

/**
 * Pone `id` en el `lugar` (0 = segundo de la barra, 1 = tercero). Si ya estaba en el otro
 * lugar, los dos se intercambian: nunca se repite un módulo ni queda un lugar vacío (RF-N3).
 */
export function elegirAcceso(accesos: Accesos, lugar: 0 | 1, id: ModuleId): Accesos {
  const otro = lugar === 0 ? 1 : 0;
  const siguiente: [ModuleId, ModuleId] = [accesos[0], accesos[1]];
  if (siguiente[otro] === id) siguiente[otro] = siguiente[lugar];
  siguiente[lugar] = id;
  return siguiente;
}

/** Ruta de la pestaña que corresponde a cada lugar de la barra nativa. */
export const ACCESO_ROUTES = ['/(app)/(tabs)/acceso-1', '/(app)/(tabs)/acceso-2'] as const;

/**
 * A dónde lleva abrir un módulo (RF-N3, RF-N5).
 *
 * En el teléfono, el que está en la barra se abre en su lugar (`acceso-1`/`acceso-2`). Fuera
 * de la barra —y siempre en web—, los que tienen ruta propia (Listas) van a ella; los demás,
 * en web a su pestaña y en el teléfono apilados en `(app)/modulo/[id]`. Ninguna navegación
 * debe apuntar directo a `(tabs)/shared`, `(tabs)/fitness` ni `(tabs)/profile` en el teléfono:
 * ahí esas rutas están ocultas y `NativeTabs` no deja abrir una pestaña oculta.
 */
export function moduleHref(id: ModuleId, accesos: Accesos, web: boolean): Href {
  const { route } = moduleInfo(id);
  if (!web) {
    const lugar = accesos.indexOf(id);
    if (lugar >= 0) return ACCESO_ROUTES[lugar] as Href;
  }
  if (route) return route;
  return web ? (`/(app)/(tabs)/${id}` as Href) : { pathname: '/(app)/modulo/[id]', params: { id } };
}
