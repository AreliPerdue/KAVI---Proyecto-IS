import { ModuleScreen } from '@/components/navigation/module-screen';
import { usePreferencesStore } from '@/store/preferences-store';

/** Lugar 2 de la barra del teléfono: pinta el módulo elegido para él (spec 01, RF-N1). */
export default function Acceso1Screen() {
  const id = usePreferencesStore((s) => s.accesos[0]);
  return <ModuleScreen id={id} />;
}
