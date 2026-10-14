import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, ColorSwatch, Segmented, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { hexValido } from '@/lib/library/cover/parts';
import { coloresDe, LETRAS_SUGERIDAS, PAGINAS_SUGERIDAS, pocoContraste, type PreferenciaDeTema, type TemaDeLectura } from '@/lib/library/reader-theme';
import { usePreferencesStore } from '@/store/preferences-store';

/**
 * El tema del lector (spec 13c, RF-BH5): claro, oscuro, sepia o propio, con una muestra de cómo se lee.
 * En el propio se eligen la página y la letra por separado, de la paleta o escribiendo el hex. Si juntos
 * cuestan leerse, se avisa (pero se deja).
 */
export function ReaderThemePicker() {
  const theme = useTheme();
  const r = useT().library.reader;
  const preferencia = usePreferencesStore((s) => s.readerTheme);
  const setPreferencia = usePreferencesStore((s) => s.setReaderTheme);
  const colores = coloresDe(preferencia);
  const cambiar = (cambio: Partial<PreferenciaDeTema>) => setPreferencia({ ...preferencia, ...cambio });

  return (
    <View style={styles.seccion}>
      <AppText variant="label">{r.theme}</AppText>
      <Segmented<TemaDeLectura>
        fullWidth
        label={r.theme}
        options={[
          { value: 'light', label: r.themeLight },
          { value: 'dark', label: r.themeDark },
          { value: 'sepia', label: r.themeSepia },
          { value: 'custom', label: r.themeCustom },
        ]}
        value={preferencia.tema}
        onChange={(tema) => cambiar({ tema })}
      />
      {/* Cómo se ve: un renglón con los colores del tema. */}
      <View style={[styles.muestra, { backgroundColor: colores.pagina, borderColor: theme.border }]} accessible={false} importantForAccessibility="no-hide-descendants">
        <AppText variant="body" style={{ color: colores.letra }} numberOfLines={2}>
          {r.themeSample}
        </AppText>
      </View>
      {preferencia.tema === 'custom' ? (
        <>
          <Paleta
            parte={r.themePage}
            actual={preferencia.propio.pagina}
            sugeridos={PAGINAS_SUGERIDAS}
            onElegir={(pagina) => cambiar({ propio: { ...preferencia.propio, pagina } })}
          />
          <Paleta
            parte={r.themeText}
            actual={preferencia.propio.letra}
            sugeridos={LETRAS_SUGERIDAS}
            onElegir={(letra) => cambiar({ propio: { ...preferencia.propio, letra } })}
          />
          {pocoContraste(colores) ? (
            <AppText variant="caption" color="today" accessibilityRole="alert">
              {r.themeLowContrast}
            </AppText>
          ) : null}
        </>
      ) : null}
      <AppText variant="caption" color="textSecondary">
        {r.themeHint}
      </AppText>
    </View>
  );
}

function Paleta({ parte, actual, sugeridos, onElegir }: { parte: string; actual: string; sugeridos: readonly string[]; onElegir: (hex: string) => void }) {
  const r = useT().library.reader;
  const [texto, setTexto] = useState('');
  return (
    <View style={styles.paleta}>
      <AppText variant="caption" color="textSecondary">
        {r.themeColor(parte, actual)}
      </AppText>
      <View style={styles.colores}>
        {sugeridos.map((hex) => (
          <ColorSwatch key={hex} hex={hex} size={36} label={r.themeColor(parte, hex)} selected={actual.toUpperCase() === hex} onPress={() => onElegir(hex)} />
        ))}
      </View>
      <TextField
        label={r.themeHex(parte)}
        placeholder={actual}
        value={texto}
        autoCapitalize="characters"
        autoCorrect={false}
        onChangeText={(t) => {
          setTexto(t);
          // En cuanto es un color de 6 cifras, se aplica.
          const hex = hexValido(t);
          if (hex) onElegir(hex);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: Spacing.md },
  muestra: { padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth },
  paleta: { gap: Spacing.sm },
  colores: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
