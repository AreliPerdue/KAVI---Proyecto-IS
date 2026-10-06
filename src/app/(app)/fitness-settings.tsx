import { ModalHeader } from '@/components/modal-header';
import { FitnessSettings } from '@/components/fitness/fitness-settings';
import { Screen } from '@/components/ui';
import { useT } from '@/i18n';

/** Ajustes de Fitness (spec 07, RF-F67): se abren con el ⚙ de la pestaña Fitness. */
export default function FitnessSettingsScreen() {
  const tx = useT();
  return (
    <Screen modal scroll maxWidth={640}>
      <ModalHeader back title={tx.fitness.settings.screenTitle} />
      <FitnessSettings />
    </Screen>
  );
}
