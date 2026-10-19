import { IdCard } from 'lucide-react-native';
import { View } from 'react-native';

import { ActionRow, AppText, Sheet } from '@/components/ui';
import { IconSize, IconStroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { LibraryCardTemplate } from '@/types/domain';

/** Qué ficha llenar en un libro (spec 13d, RF-BF7; T294): los diseños que aún no tiene. */
export function CardChooserSheet({
  visible,
  plantillas,
  onClose,
  onElegir,
}: {
  visible: boolean;
  plantillas: readonly LibraryCardTemplate[];
  onClose: () => void;
  onElegir: (p: LibraryCardTemplate) => void;
}) {
  const theme = useTheme();
  const b = useT().library.cards.book;
  return (
    <Sheet visible={visible} onClose={onClose} title={b.choose}>
      {plantillas.length ? (
        plantillas.map((p) => (
          <ActionRow key={p.id} icon={<IdCard size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />} label={p.name} onPress={() => onElegir(p)} />
        ))
      ) : (
        <View>
          <AppText variant="body" color="textSecondary">
            {b.allUsed}
          </AppText>
        </View>
      )}
    </Sheet>
  );
}
