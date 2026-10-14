import { AArrowDown, AArrowUp } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, ColorSwatch, IconButton, Sheet } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { COLORES_DE_ANOTACION, colorDe, COLOR_DE_POSTIT, ESCALA_DE_TEXTO, escalaDe } from '@/lib/library/annotations';
import type { LibraryAnnotation } from '@/types/domain';

/** Para la letra de un cuadro de texto, además de la paleta: tinta oscura y clara (sobre páginas oscuras). */
const TINTAS = [
  { id: 'ink', hex: '#1A1A1A' },
  { id: 'paper', hex: '#F2F2F2' },
];

export type CambioDeEstilo = { color: string; size?: number };

/**
 * El color de algo pegado (spec 13c; T286, T289): un post-it o la letra de un cuadro de texto, de la paleta
 * de los Nobi, con el color de la portada primero (T329). En los dos, también el tamaño de la letra (en el
 * post-it, T336: si no cabe, el motor la reduce lo justo). Lo que se escribe va directo sobre la página.
 */
export function PegadoStyleSheet({
  anotacion,
  colorPortada,
  onClose,
  onGuardar,
}: {
  anotacion: LibraryAnnotation | null;
  colorPortada?: string | null;
  onClose: () => void;
  onGuardar: (cambio: CambioDeEstilo) => void;
}) {
  const a = useT().library.annotations;
  return (
    <Sheet visible={!!anotacion} onClose={onClose} title={anotacion?.kind === 'textbox' ? a.kindOne.textbox : a.editTitle}>
      {anotacion ? <Editor key={anotacion.id} anotacion={anotacion} colorPortada={colorPortada ?? null} onGuardar={onGuardar} /> : null}
    </Sheet>
  );
}

function Editor({ anotacion, colorPortada, onGuardar }: { anotacion: LibraryAnnotation; colorPortada: string | null; onGuardar: (c: CambioDeEstilo) => void }) {
  const theme = useTheme();
  const tx = useT();
  const a = tx.library.annotations;
  const esTexto = anotacion.kind === 'textbox';
  const [color, setColor] = useState(colorDe(anotacion) ?? (esTexto ? TINTAS[0].hex : COLOR_DE_POSTIT));
  const [escala, setEscala] = useState(escalaDe(anotacion));
  const paso = (d: 1 | -1) => setEscala((e) => Math.min(ESCALA_DE_TEXTO.max, Math.max(ESCALA_DE_TEXTO.min, e + d * ESCALA_DE_TEXTO.paso)));
  const igual = (x: string) => color.toUpperCase() === x.toUpperCase();

  return (
    <View style={styles.editor}>
      {/* El tamaño de la letra: en el cuadro de texto y en el post-it (T336, pedido de Areli). */}
      {esTexto || anotacion.kind === 'postit' ? (
        <>
          <AppText variant="label" color="textSecondary">
            {a.textSize}
          </AppText>
          <View style={styles.tamano}>
            <IconButton label={a.textSmaller} onPress={() => paso(-1)} disabled={escala <= ESCALA_DE_TEXTO.min}>
              <AArrowDown size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
            </IconButton>
            <AppText variant="bodyStrong" tabular style={styles.valor}>
              {`${Math.round(escala * 100)} %`}
            </AppText>
            <IconButton label={a.textBigger} onPress={() => paso(1)} disabled={escala >= ESCALA_DE_TEXTO.max}>
              <AArrowUp size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
            </IconButton>
          </View>
        </>
      ) : null}
      <AppText variant="label" color="textSecondary">
        {a.color}
      </AppText>
      <View style={styles.paleta}>
        {colorPortada ? <ColorSwatch hex={colorPortada} label={a.coverColor(colorPortada.toUpperCase())} selected={igual(colorPortada)} onPress={() => setColor(colorPortada)} size={32} /> : null}
        {esTexto
          ? TINTAS.map((t) => <ColorSwatch key={t.id} hex={t.hex} label={a.inks[t.id as 'ink' | 'paper']} selected={igual(t.hex)} onPress={() => setColor(t.hex)} size={32} />)
          : null}
        {COLORES_DE_ANOTACION.map((c) => (
          <ColorSwatch key={c.id} hex={c.hex} label={tx.colors[c.id] ?? c.label} selected={igual(c.hex)} onPress={() => setColor(c.hex)} size={32} />
        ))}
      </View>
      <Button title={a.save} onPress={() => onGuardar({ color: color.toUpperCase(), size: escala })} />
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: Spacing.md },
  tamano: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  valor: { minWidth: 56, textAlign: 'center' },
  paleta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
});
