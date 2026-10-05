import { useState } from 'react';

import { ThemePicker } from './theme-picker';

import { FieldButton, ThemeIcon } from '@/components/ui';
import { IconSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemes } from '@/hooks/use-themes';
import type { Theme } from '@/types/domain';
import { useLanguage, useT } from '@/i18n';
import { themeName } from '@/lib/theme-name';

/** Campo "Tema" del formulario: muestra icono+color y abre el picker. */
export function ThemeField({ value, onChange }: { value: string | null; onChange: (theme: Theme | null) => void }) {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const [open, setOpen] = useState(false);
  const themes = useThemes();
  const selected = themes.data?.find((t) => t.id === value) ?? null;

  return (
    <>
      <FieldButton
        label={tx.themes.picker.title}
        value={selected ? themeName(selected, lang) : null}
        placeholder={tx.themes.picker.fieldPlaceholder}
        onPress={() => setOpen(true)}
        leading={<ThemeIcon name={selected?.icon ?? 'tag'} color={selected?.color ?? theme.neutralActivity} size={IconSize.inline} />}
      />
      <ThemePicker
        visible={open}
        value={value}
        onClose={() => setOpen(false)}
        onSelect={(t) => {
          onChange(t);
          setOpen(false);
        }}
      />
    </>
  );
}
