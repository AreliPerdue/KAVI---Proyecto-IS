import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ICONO_DE_SIMBOLO } from '@/components/library/card-view';
import { AppText, Button, IconButton, Segmented, Sheet, TextField, Toggle } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { MAX_ETIQUETA, MAX_OPCION, MAX_OPCIONES, SIMBOLOS, type SimboloDeEscala } from '@/lib/library/cards';
import type { CardField } from '@/types/domain';

/**
 * Un campo de la ficha (spec 13d, RF-BF2; T293): su nombre y lo de su tipo —en una escala, hasta 5 o 10 y su
 * símbolo; en opciones, la lista y si se eligen varias; en texto, corto o largo—. Cada cambio se ve al
 * momento en la vista previa. También se sube, se baja o se quita.
 */
export function CardFieldSheet({
  campo,
  primero,
  ultimo,
  onCambiar,
  onSubir,
  onBajar,
  onQuitar,
  onClose,
}: {
  campo: CardField | null;
  primero: boolean;
  ultimo: boolean;
  onCambiar: (c: CardField) => void;
  onSubir: () => void;
  onBajar: () => void;
  onQuitar: () => void;
  onClose: () => void;
}) {
  const t = useT().library.cards;
  return (
    <Sheet visible={!!campo} onClose={onClose} title={campo ? t.types[campo.type] : t.field.title}>
      {campo ? (
        <Editor key={campo.id} campo={campo} primero={primero} ultimo={ultimo} onCambiar={onCambiar} onSubir={onSubir} onBajar={onBajar} onQuitar={onQuitar} onListo={onClose} />
      ) : null}
    </Sheet>
  );
}

function Editor({
  campo,
  primero,
  ultimo,
  onCambiar,
  onSubir,
  onBajar,
  onQuitar,
  onListo,
}: {
  campo: CardField;
  primero: boolean;
  ultimo: boolean;
  onCambiar: (c: CardField) => void;
  onSubir: () => void;
  onBajar: () => void;
  onQuitar: () => void;
  onListo: () => void;
}) {
  const theme = useTheme();
  const t = useT().library.cards;
  const f = t.field;
  const [opcion, setOpcion] = useState('');
  const opciones = campo.options ?? [];
  const agregar = () => {
    const o = opcion.trim().slice(0, MAX_OPCION);
    if (!o || opciones.includes(o) || opciones.length >= MAX_OPCIONES) return;
    onCambiar({ ...campo, options: [...opciones, o] });
    setOpcion('');
  };
  const icono = (activo: boolean) => ({ size: IconSize.action, strokeWidth: IconStroke, color: activo ? theme.text : theme.textTertiary });

  return (
    <View style={styles.cuerpo}>
      <TextField label={f.label} value={campo.label} maxLength={MAX_ETIQUETA} onChangeText={(label) => onCambiar({ ...campo, label })} />

      {campo.type === 'scale' ? (
        <>
          <AppText variant="label" color="textSecondary">
            {f.max}
          </AppText>
          <Segmented<'5' | '10'>
            fullWidth
            label={f.max}
            options={[
              { value: '5', label: '5' },
              { value: '10', label: '10' },
            ]}
            value={campo.max === 10 ? '10' : '5'}
            onChange={(v) => onCambiar({ ...campo, max: Number(v) })}
          />
          <AppText variant="label" color="textSecondary">
            {f.symbol}
          </AppText>
          <View style={styles.simbolos} accessibilityRole="radiogroup" accessibilityLabel={f.symbol}>
            {SIMBOLOS.map((s) => {
              const Icono = ICONO_DE_SIMBOLO[s];
              const elegido = (campo.symbol ?? 'star') === s;
              return (
                <Pressable
                  key={s}
                  accessibilityRole="radio"
                  accessibilityLabel={t.symbols[s as SimboloDeEscala]}
                  accessibilityState={{ selected: elegido }}
                  onPress={() => onCambiar({ ...campo, symbol: s })}
                  style={({ pressed }) => [
                    styles.simbolo,
                    { borderColor: elegido ? theme.ink : theme.border, backgroundColor: elegido ? theme.ink : pressed ? theme.surfaceAlt : theme.surface },
                  ]}>
                  <Icono size={IconSize.action} strokeWidth={IconStroke} color={elegido ? theme.onInk : theme.text} />
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {campo.type === 'choice' ? (
        <>
          <AppText variant="label" color="textSecondary">
            {f.options}
          </AppText>
          <View style={styles.opciones}>
            {opciones.map((o) => (
              <View key={o} style={[styles.opcion, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
                <AppText variant="label" numberOfLines={1} style={styles.opcionTexto}>
                  {o}
                </AppText>
                <IconButton label={f.removeOption(o)} onPress={() => onCambiar({ ...campo, options: opciones.filter((x) => x !== o) })}>
                  <X size={16} strokeWidth={IconStroke} color={theme.textSecondary} />
                </IconButton>
              </View>
            ))}
          </View>
          <View style={styles.agregar}>
            <View style={styles.flex}>
              <TextField label={f.optionPlaceholder} value={opcion} maxLength={MAX_OPCION} onChangeText={setOpcion} onSubmitEditing={agregar} returnKeyType="done" />
            </View>
            <IconButton label={f.addOption} onPress={agregar} disabled={!opcion.trim() || opciones.length >= MAX_OPCIONES}>
              <Plus {...icono(!!opcion.trim())} />
            </IconButton>
          </View>
          <View style={styles.fila}>
            <AppText variant="body" style={styles.flex}>
              {f.multiple}
            </AppText>
            <Toggle label={f.multiple} value={campo.multiple === true} onValueChange={(multiple) => onCambiar({ ...campo, multiple })} />
          </View>
        </>
      ) : null}

      {campo.type === 'text' ? (
        <>
          <AppText variant="label" color="textSecondary">
            {f.length}
          </AppText>
          <Segmented<'short' | 'long'>
            fullWidth
            label={f.length}
            options={[
              { value: 'short', label: f.short },
              { value: 'long', label: f.long },
            ]}
            value={campo.long ? 'long' : 'short'}
            onChange={(v) => onCambiar({ ...campo, long: v === 'long' })}
          />
        </>
      ) : null}

      <View style={styles.fila}>
        <IconButton label={f.moveUp} onPress={onSubir} disabled={primero}>
          <ArrowUp {...icono(!primero)} />
        </IconButton>
        <IconButton label={f.moveDown} onPress={onBajar} disabled={ultimo}>
          <ArrowDown {...icono(!ultimo)} />
        </IconButton>
        <View style={styles.flex} />
        <Button title={f.remove} variant="danger" onPress={onQuitar} />
      </View>
      <Button title={f.done} onPress={onListo} />
    </View>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md },
  flex: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  simbolos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  simbolo: { width: 48, height: 48, borderRadius: Radius.md, borderCurve: 'continuous', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  opcion: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.full, borderCurve: 'continuous', paddingLeft: Spacing.md, maxWidth: '100%' },
  opcionTexto: { flexShrink: 1 },
  agregar: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
});
