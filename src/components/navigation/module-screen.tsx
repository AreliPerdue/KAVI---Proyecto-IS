import FitnessScreen from '@/app/(app)/(tabs)/fitness';
import ListsScreen from '@/app/(app)/lists';
import ProfileScreen from '@/app/(app)/(tabs)/profile';
import SharedScreen from '@/app/(app)/(tabs)/shared';
import { ModuleInBarContext } from '@/components/navigation/stacked-module';
import type { ModuleId } from '@/constants/modules';

const PANTALLAS: Record<ModuleId, () => React.JSX.Element> = {
  shared: SharedScreen,
  lists: ListsScreen,
  fitness: FitnessScreen,
  profile: ProfileScreen,
};

/**
 * La pantalla de un módulo, para pintarla en un lugar de la barra (`acceso-1`/`acceso-2`) o
 * apilada desde Más (spec 01, RF-N1, RF-N3). Las pantallas siguen viviendo en `(tabs)/`, que
 * es lo que usa la web.
 */
export function ModuleScreen({ id, enBarra = false }: { id: ModuleId; enBarra?: boolean }) {
  const Pantalla = PANTALLAS[id];
  return (
    <ModuleInBarContext value={enBarra}>
      <Pantalla />
    </ModuleInBarContext>
  );
}
