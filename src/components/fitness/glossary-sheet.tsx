import { useRouter } from 'expo-router';
import { BookOpen } from 'lucide-react-native';

import { GlossaryEntryBody } from '@/components/fitness/glossary-entry';
import { AppText, Button, Sheet } from '@/components/ui';
import { IconSize, IconStroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { localizedGlossaryEntry } from '@/lib/glossary';
import { useLanguage, useT } from '@/i18n';

/**
 * Explicación de un término al tocarlo (RF-F64): la columna RIR/RPE del logger, el máximo
 * estimado, la racha… Desde aquí se puede abrir el glosario completo.
 */
export function GlossarySheet({ termId, onClose }: { termId: string | null; onClose: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const lang = useLanguage();
  const g = useT().glossary;
  const entry = termId ? localizedGlossaryEntry(termId, lang) : undefined;
  return (
    <Sheet visible={!!entry} onClose={onClose} title={entry?.term ?? g.title}>
      {entry ? (
        <>
          {entry.also ? (
            <AppText variant="caption" color="textTertiary">
              {g.alsoKnownAs(entry.also)}
            </AppText>
          ) : null}
          <GlossaryEntryBody entry={entry} />
          <Button
            title={g.seeAll}
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
