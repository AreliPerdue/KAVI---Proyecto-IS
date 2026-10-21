import { Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionRow, AppText, Button, IconButton, Segmented, Sheet, TextField } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { ESCALAS_DE_RATING, type EscalaDeRating, VARIANTES_DE_POLAROID, type VarianteDePolaroid } from '@/lib/library/canvas';

/**
 * Las hojas de los módulos del lienzo creativo (spec 13h, RF-CC14; T343): elegir la polaroid, escribir una cita y
 * poner una calificación. Cada una empieza con lo que ya tiene el módulo (al editarlo) y devuelve lo nuevo.
 */

/** Elegir la variante de una polaroid: al agregarla o al cambiarla. */
export function PolaroidSheet({ visible, valor, onClose, onElegir }: { visible: boolean; valor?: VarianteDePolaroid; onClose: () => void; onElegir: (v: VarianteDePolaroid) => void }) {
  const theme = useTheme();
  const c = useT().library.canvas;
  return (
    <Sheet visible={visible} onClose={onClose} title={c.polaroidTitle}>
      {VARIANTES_DE_POLAROID.map((v) => (
        <ActionRow key={v} icon={<View style={[styles.punto, { backgroundColor: v === valor ? theme.ink : theme.border }]} />} label={c.variants[v]} onPress={() => onElegir(v)} />
      ))}
    </Sheet>
  );
}

export type Cita = { text: string; who: string; chapter: string; note: string };

/** Escribir o editar una cita: el texto es obligatorio; quién, capítulo y comentario, no. */
export function QuoteSheet({ visible, valor, onClose, onGuardar }: { visible: boolean; valor: Cita | null; onClose: () => void; onGuardar: (c: Cita) => void }) {
  const c = useT().library.canvas;
  return (
    <Sheet visible={visible} onClose={onClose} title={c.quoteTitle}>
      <FormularioDeCita key={visible ? 'abierta' : 'cerrada'} valor={valor} onGuardar={onGuardar} />
    </Sheet>
  );
}

function FormularioDeCita({ valor, onGuardar }: { valor: Cita | null; onGuardar: (c: Cita) => void }) {
  const c = useT().library.canvas;
  const [cita, setCita] = useState<Cita>(valor ?? { text: '', who: '', chapter: '', note: '' });
  const [falta, setFalta] = useState(false);
  const poner = (campo: keyof Cita) => (v: string) => setCita((x) => ({ ...x, [campo]: v }));
  return (
    <View style={styles.cuerpo}>
      <TextField
        label={c.quoteText}
        value={cita.text}
        onChangeText={(v) => {
          poner('text')(v);
          if (v.trim()) setFalta(false);
        }}
        placeholder={c.quoteTextPlaceholder}
        multiline
        maxLength={600}
        error={falta ? c.quoteRequired : undefined}
      />
      <TextField label={c.quoteWho} value={cita.who} onChangeText={poner('who')} maxLength={80} />
      <TextField label={c.quoteChapter} value={cita.chapter} onChangeText={poner('chapter')} maxLength={40} />
      <TextField label={c.quoteNote} value={cita.note} onChangeText={poner('note')} multiline maxLength={300} />
      <Button
        title={c.save}
        onPress={() => {
          if (!cita.text.trim()) {
            setFalta(true);
            return;
          }
          onGuardar({ text: cita.text.trim(), who: cita.who.trim(), chapter: cita.chapter.trim(), note: cita.note.trim() });
        }}
      />
    </View>
  );
}

/** Poner una calificación: estrellas o corazones (0–5, de medio en medio) o un número (0–10). */
export function RatingSheet({
  visible,
  valor,
  onClose,
  onCambiar,
}: {
  visible: boolean;
  valor: { scale: EscalaDeRating; value: number } | null;
  onClose: () => void;
  onCambiar: (v: { scale: EscalaDeRating; value: number }) => void;
}) {
  const theme = useTheme();
  const c = useT().library.canvas;
  const actual = valor ?? { scale: 'stars' as EscalaDeRating, value: 0 };
  const max = actual.scale === 'number' ? 10 : 5;
  const paso = actual.scale === 'number' ? 1 : 0.5;
  const icono = (Icono: typeof Plus, activo: boolean) => <Icono size={IconSize.action} strokeWidth={IconStroke} color={activo ? theme.text : theme.textTertiary} />;
  return (
    <Sheet visible={visible} onClose={onClose} title={c.ratingTitle}>
      <View style={styles.cuerpo}>
        <Segmented
          label={c.ratingTitle}
          options={ESCALAS_DE_RATING.map((e) => ({ value: e, label: c.scales[e] }))}
          value={actual.scale}
          // Al cambiar de escala se conserva la calificación, llevada a la otra (5 estrellas = 10).
          onChange={(scale) => onCambiar({ scale, value: scale === 'number' ? Math.round(actual.value * (actual.scale === 'number' ? 1 : 2)) : (actual.scale === 'number' ? actual.value / 2 : actual.value) })}
          fullWidth
        />
        <View
          style={styles.valor}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={c.ratingTitle}
          accessibilityValue={{ text: c.ratingValue(actual.value, max) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => onCambiar({ ...actual, value: Math.min(max, Math.max(0, actual.value + (e.nativeEvent.actionName === 'increment' ? paso : -paso))) })}>
          <IconButton label={c.ratingLess} onPress={() => onCambiar({ ...actual, value: Math.max(0, actual.value - paso) })} disabled={actual.value <= 0}>
            {icono(Minus, actual.value > 0)}
          </IconButton>
          <AppText variant="title" tabular style={styles.numero}>
            {c.ratingValue(actual.value, max)}
          </AppText>
          <IconButton label={c.ratingMore} onPress={() => onCambiar({ ...actual, value: Math.min(max, actual.value + paso) })} disabled={actual.value >= max}>
            {icono(Plus, actual.value < max)}
          </IconButton>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.lg, paddingBottom: Spacing.md },
  punto: { width: 12, height: 12, borderRadius: 6 },
  valor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  numero: { minWidth: 140, textAlign: 'center' },
});
