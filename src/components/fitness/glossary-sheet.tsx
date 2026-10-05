import { useRouter } from 'expo-router';
import { BookOpen } from 'lucide-react-native';

import { GlossaryEntryBody } from '@/components/fitness/glossary-entry';
import { AppText, Button, Sheet } from '@/components/ui';
import { glossaryEntry } from '@/constants/glossary';
import { IconSize, IconStroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Explicación de un término al tocarlo (RF-F64): la columna RIR/RPE del logger, el máximo
 * estimado, la racha… Desde aquí se puede abrir el glosario completo.
 */
export function GlossarySheet({ termId, onClose }: { termId: string | null; onClose: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const entry = termId ? glossaryEntry(termId) : undefined;
  return (
    <Sheet visible={!!entry} onClose={onClose} title={entry?.term ?? 'Glosario'}>
      {entry ? (
        <>
          {entry.also ? (
            <AppText variant="caption" color="textTertiary">
              También: {entry.also}
            </AppText>
          ) : null}
          <GlossaryEntryBody entry={entry} />
          <Button
            title="Ver todo el glosario"
            variant="ghost"
            icon={<BookOpen size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
            onPress={() => {
              onClose();
              router.push('/(app)/glossary');
            }}
          />
        </>
      ) : null}
    </Sheet>
  );
}
