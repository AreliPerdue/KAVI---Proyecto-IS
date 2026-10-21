import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Segmented, Sheet } from '@/components/ui';
import { PAPER, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { type OrientacionDeLienzo, RAIZ_DE_DOS } from '@/lib/library/canvas';
import type { LibraryItem } from '@/types/domain';

/**
 * Crear un recorte de un libro (spec 13h, RF-CC4, RF-CC19; T351): una página en blanco 1 : √2, vertical u
 * horizontal. La forma se elige aquí y no cambia después; la muestra la dibuja a escala.
 */
export function NewCanvasSheet({ item, onClose, onCrear }: { item: LibraryItem | null; onClose: () => void; onCrear: (item: LibraryItem, orientacion: OrientacionDeLienzo) => void }) {
  const theme = useTheme();
  const c = useT().library.canvas;
  const [orientacion, setOrientacion] = useState<OrientacionDeLienzo>('portrait');
  const vertical = orientacion === 'portrait';
  const lado = 120;
  return (
    <Sheet visible={item !== null} onClose={onClose} title={c.newCanvas}>
      <View style={styles.cuerpo}>
        <AppText variant="body" color="textSecondary">
          {c.newHint}
        </AppText>
        <Segmented
          options={[
            { value: 'portrait', label: c.portrait },
            { value: 'landscape', label: c.landscape },
          ]}
          value={orientacion}
          onChange={setOrientacion}
          fullWidth
        />
        <View style={styles.muestra} accessible={false}>
          <View
            style={[
              styles.pagina,
              // La página del recorte es papel en los dos temas, como la de un libro.
              { borderColor: theme.border, backgroundColor: PAPER },
              vertical ? { width: lado / RAIZ_DE_DOS, height: lado } : { width: lado, height: lado / RAIZ_DE_DOS },
            ]}
          />
        </View>
        <Button
          title={c.create}
          onPress={() => {
            if (!item) return;
            onCrear(item, orientacion);
          }}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.lg, paddingBottom: Spacing.md },
  muestra: { alignItems: 'center', justifyContent: 'center', height: 136 },
  pagina: { borderWidth: 1, borderRadius: Radius.sm / 2, borderCurve: 'continuous', boxShadow: '0 4px 16px rgba(22,23,26,0.08)' },
});
