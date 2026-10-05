import FitnessScreen from '@/app/(app)/(tabs)/fitness';
import ProfileScreen from '@/app/(app)/(tabs)/profile';
import SharedScreen from '@/app/(app)/(tabs)/shared';
import type { ModuleId } from '@/constants/modules';

const PANTALLAS: Record<ModuleId, () => React.JSX.Element> = {
  shared: SharedScreen,
  fitness: FitnessScreen,
  profile: ProfileScreen,
};

/**
 * La pantalla de un módulo, para pintarla en un lugar de la barra (`acceso-1`/`acceso-2`) o
 * apilada desde Más (spec 01, RF-N1, RF-N3). Las pantallas siguen viviendo en `(tabs)/`, que
 * es lo que usa la web.
 */
export function ModuleScreen({ id }: { id: ModuleId }) {
  const Pantalla = PANTALLAS[id];
  return <Pantalla />;
}
