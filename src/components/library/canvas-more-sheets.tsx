import { Check, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText, Button, IconButton, Sheet, TextField } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { type Animo, ANIMOS, fechaValida, MAX_RENGLONES, type Renglon } from '@/lib/library/canvas';
import { CARA, CARITAS } from '@/lib/library/canvas-shapes';

/**
 * Las hojas de los módulos de T349b (spec 13h, RF-CC14): una lista con casillas o un timeline, un mood, una canción,
 * y fecha y lugar. Cada una empieza con lo que ya tiene el módulo (al editarlo) y devuelve lo nuevo.
 */

export type Lista = { text: string; items: Renglon[] };

/** Una lista (con casillas) o un timeline (sin ellas): su título (solo la lista) y sus renglones. */
export function ListSheet({
  visible,
  conCasillas,
  valor,
  onClose,
  onGuardar,
}: {
  visible: boolean;
  conCasillas: boolean;
  valor: Lista | null;
  onClose: () => void;
  onGuardar: (l: Lista) => void;
}) {
  const c = useT().library.canvas.more;
  return (
    <Sheet visible={visible} onClose={onClose} title={conCasillas ? c.checklist : c.timeline}>
      <FormularioDeLista key={visible ? 'abierta' : 'cerrada'} conCasillas={conCasillas} valor={valor} onGuardar={onGuardar} />
    </Sheet>
  );
}

function FormularioDeLista({ conCasillas, valor, onGuardar }: { conCasillas: boolean; valor: Lista | null; onGuardar: (l: Lista) => void }) {
  const theme = useTheme();
  const t = useT().library.canvas;
  const c = t.more;
  const [titulo, setTitulo] = useState(valor?.text ?? '');
  const [renglones, setRenglones] = useState<Renglon[]>(valor?.items.length ? valor.items : [{ text: '' }]);
  const cambiar = (i: number, cambio: Partial<Renglon>) => setRenglones((rs) => rs.map((r, j) => (j === i ? { ...r, ...cambio } : r)));
  return (
    <View style={styles.cuerpo}>
      {conCasillas ? <TextField label={c.listTitle} value={titulo} onChangeText={setTitulo} placeholder={c.listTitlePlaceholder} maxLength={80} /> : null}
      {renglones.map((r, i) => (
        <View key={i} style={styles.renglon}>
          {conCasillas ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={c.checkItem(i + 1)}
              accessibilityState={{ checked: !!r.done }}
              onPress={() => cambiar(i, { done: !r.done })}
              hitSlop={8}
              style={[styles.casilla, { borderColor: theme.text, backgroundColor: r.done ? theme.ink : 'transparent' }]}>
              {r.done ? <Check size={16} strokeWidth={3} color={theme.onInk} /> : null}
            </Pressable>
          ) : null}
          <View style={styles.flex}>
            <TextField label={c.item(i + 1)} value={r.text} onChangeText={(text) => cambiar(i, { text })} maxLength={120} />
          </View>
          <IconButton label={c.removeItem(i + 1)} onPress={() => setRenglones((rs) => rs.filter((_, j) => j !== i))} disabled={renglones.length <= 1}>
            <X size={IconSize.inline} strokeWidth={IconStroke} color={renglones.length > 1 ? theme.text : theme.textTertiary} />
          </IconButton>
        </View>
      ))}
      {renglones.length < MAX_RENGLONES ? (
        <Button title={c.addItem} variant="secondary" icon={<Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} onPress={() => setRenglones((rs) => [...rs, { text: '' }])} />
      ) : null}
      <Button
        title={t.save}
        onPress={() =>
          onGuardar({
            text: titulo.trim(),
            items: renglones.filter((r) => r.text.trim()).map((r) => (conCasillas ? { text: r.text.trim(), done: !!r.done } : { text: r.text.trim() })),
          })
        }
      />
    </View>
  );
}

/** Un mood: elegir la carita y, si se quiere, su palabra. */
export function MoodSheet({ visible, valor, onClose, onGuardar }: { visible: boolean; valor: { mood: Animo; text: string } | null; onClose: () => void; onGuardar: (m: { mood: Animo; text: string }) => void }) {
  const c = useT().library.canvas.more;
  return (
    <Sheet visible={visible} onClose={onClose} title={c.mood}>
      <FormularioDeMood key={visible ? 'abierta' : 'cerrada'} valor={valor} onGuardar={onGuardar} />
    </Sheet>
  );
}

function FormularioDeMood({ valor, onGuardar }: { valor: { mood: Animo; text: string } | null; onGuardar: (m: { mood: Animo; text: string }) => void }) {
  const theme = useTheme();
  const t = useT().library.canvas;
  const c = t.more;
  const [mood, setMood] = useState<Animo>(valor?.mood ?? 'happy');
  const [palabra, setPalabra] = useState(valor?.text ?? '');
  return (
    <View style={styles.cuerpo}>
      <View style={styles.caritas}>
        {ANIMOS.map((m) => {
          const elegido = m === mood;
          return (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityLabel={c.moods[m]}
              accessibilityState={{ selected: elegido }}
              onPress={() => setMood(m)}
              style={[styles.carita, { borderColor: elegido ? theme.ink : theme.border, borderWidth: elegido ? 2 : 1 }]}>
              <Svg width={40} height={40} viewBox="0 0 100 100">
                <Path d={CARA} stroke={theme.text} strokeWidth={5} fill="none" />
                <Path d={CARITAS[m].trazo} stroke={theme.text} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                {CARITAS[m].relleno ? <Path d={CARITAS[m].relleno} fill={theme.text} /> : null}
              </Svg>
              <AppText variant="caption" numberOfLines={1}>
                {c.moods[m]}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <TextField label={c.moodWord} value={palabra} onChangeText={setPalabra} placeholder={c.moodWordPlaceholder} maxLength={40} />
      <Button title={t.save} onPress={() => onGuardar({ mood, text: palabra.trim() })} />
    </View>
  );
}

/** Una canción: su título y su artista. */
export function SongSheet({ visible, valor, onClose, onGuardar }: { visible: boolean; valor: { text: string; who: string } | null; onClose: () => void; onGuardar: (s: { text: string; who: string }) => void }) {
  const c = useT().library.canvas.more;
  return (
    <Sheet visible={visible} onClose={onClose} title={c.song}>
      <FormularioDeCancion key={visible ? 'abierta' : 'cerrada'} valor={valor} onGuardar={onGuardar} />
    </Sheet>
  );
}

function FormularioDeCancion({ valor, onGuardar }: { valor: { text: string; who: string } | null; onGuardar: (s: { text: string; who: string }) => void }) {
  const t = useT().library.canvas;
  const c = t.more;
  const [titulo, setTitulo] = useState(valor?.text ?? '');
  const [artista, setArtista] = useState(valor?.who ?? '');
  const [falta, setFalta] = useState(false);
  return (
    <View style={styles.cuerpo}>
      <TextField
        label={c.songTitle}
        value={titulo}
        onChangeText={(v) => {
          setTitulo(v);
          if (v.trim()) setFalta(false);
        }}
        maxLength={80}
        error={falta ? c.songRequired : undefined}
      />
      <TextField label={c.songArtist} value={artista} onChangeText={setArtista} maxLength={80} />
      <Button
        title={t.save}
        onPress={() => {
          if (!titulo.trim()) {
            setFalta(true);
            return;
          }
          onGuardar({ text: titulo.trim(), who: artista.trim() });
        }}
      />
    </View>
  );
}

/** Fecha y lugar: la fecha (empieza en la de hoy) y, si se quiere, dónde. */
export function DateSheet({ visible, valor, onClose, onGuardar }: { visible: boolean; valor: { date: string; place: string } | null; onClose: () => void; onGuardar: (d: { date: string; place: string }) => void }) {
  const c = useT().library.canvas.more;
  return (
    <Sheet visible={visible} onClose={onClose} title={c.date}>
      <FormularioDeFecha key={visible ? 'abierta' : 'cerrada'} valor={valor} onGuardar={onGuardar} />
    </Sheet>
  );
}

/** La fecha de hoy, `YYYY-MM-DD`, en la zona del dispositivo. */
function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function FormularioDeFecha({ valor, onGuardar }: { valor: { date: string; place: string } | null; onGuardar: (d: { date: string; place: string }) => void }) {
  const t = useT().library.canvas;
  const c = t.more;
  const [fecha, setFecha] = useState(valor?.date || hoy());
  const [lugar, setLugar] = useState(valor?.place ?? '');
  const [mal, setMal] = useState(false);
  return (
    <View style={styles.cuerpo}>
      <View style={styles.renglon}>
        <View style={styles.flex}>
          <TextField
            label={c.dateLabel}
            value={fecha}
            onChangeText={(v) => {
              setFecha(v);
              if (fechaValida(v)) setMal(false);
            }}
            placeholder={c.datePlaceholder}
            maxLength={10}
            keyboardType="numbers-and-punctuation"
            error={mal ? c.dateInvalid : undefined}
          />
        </View>
        <Button title={c.today} variant="secondary" onPress={() => setFecha(hoy())} />
      </View>
      <TextField label={c.place} value={lugar} onChangeText={setLugar} placeholder={c.placePlaceholder} maxLength={60} />
      <Button
        title={t.save}
        onPress={() => {
          const valida = fechaValida(fecha.trim());
          if (!valida) {
            setMal(true);
            return;
          }
          onGuardar({ date: valida, place: lugar.trim() });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.lg, paddingBottom: Spacing.md },
  renglon: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  flex: { flex: 1 },
  casilla: { width: 28, height: 28, borderWidth: 2, borderRadius: Radius.sm / 2, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  caritas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  carita: { width: 76, alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderCurve: 'continuous' },
});
