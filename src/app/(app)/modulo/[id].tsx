import { Redirect, useLocalSearchParams } from 'expo-router';

import { ModuleScreen } from '@/components/navigation/module-screen';
import { StackedModuleContext } from '@/components/navigation/stacked-module';
import { MODULES, type ModuleId } from '@/constants/modules';

/** Un módulo que no está en la barra, abierto desde Más con "Atrás" (spec 01, RF-N3). */
export default function StackedModuleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const modulo = MODULES.find((m) => m.id === id);
  if (!modulo) return <Redirect href="/(app)/(tabs)/calendar" />;
  // Los módulos con ruta propia (Listas) se abren en ella, no aquí.
  if (modulo.route) return <Redirect href={modulo.route} />;
  return (
    <StackedModuleContext value>
      <ModuleScreen id={modulo.id as ModuleId} />
    </StackedModuleContext>
  );
}
