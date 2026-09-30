import { Plus } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, type TextStyle, View } from 'react-native';

import { AppText } from '@/components/ui';
import { Fonts, IconSize, IconStroke, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/*
 * En web el navegador dibuja su propio anillo de foco y quedaba encimado sobre el borde de
 * acento de la fila. Se suprime, no se pierde: el borde que se tiñe al enfocar **es** el
 * indicador de foco, así que sigue habiendo uno visible para quien navega con teclado.
 *
 * Va fuera de `StyleSheet.create` porque ahí un estilo que solo existe en web ensancha el
 * tipo de toda la hoja, y el resto de los estilos dejan de encajar donde se usan.
 */
const SIN_ANILLO: TextStyle = Platform.OS === 'web' ? { outlineWidth: 0, outlineColor: 'transparent' } : {};

export type ItemComposerProps = {
  /** Texto del botón en reposo, que nombra dónde va a caer lo que se escriba. */
  label: string;
  onSubmit: (title: string) => void;
  accent: string;
};

/**
 * Campo para agregar elementos de corrido (RF-L5).
 *
 * En reposo es solo una fila "+ …" para no llenar la pantalla de campos vacíos; al tocarla
 * se convierte en input. Al confirmar **no se cierra ni pierde el foco**: las listas se
 * llenan en ráfaga —leche, huevos, pan— y volver a tocar el botón entre uno y otro
 * convertiría una captura de diez segundos en una de un minuto.
 */
export function ItemComposer({ label, onSubmit, accent }: ItemComposerProps) {
  const theme = useTheme();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const inputRef = useRef<TextInput>(null);

  const confirmar = () => {
    const limpio = texto.trim();
    if (!limpio) {
      setAbierto(false);
      return;
    }
    onSubmit(limpio);
    setTexto('');
    // El foco se conserva a propósito: el siguiente elemento se escribe sin tocar nada.
    inputRef.current?.focus();
  };

  if (!abierto) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          setAbierto(true);
          // El input todavía no existe en este tick; se enfoca en cuanto se monta.
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        style={({ pressed }) => [styles.fila, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
        <Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
        <AppText variant="body" color="textTertiary">
          {label}
        </AppText>
      </Pressable>
    );
  }

  return (
    <View style={[styles.fila, styles.filaAbierta, { borderColor: accent }]}>
      <View style={[styles.casilla, { borderColor: theme.border }]} />
      <TextInput
        ref={inputRef}
        value={texto}
        onChangeText={setTexto}
        onSubmitEditing={confirmar}
        onBlur={confirmar}
        placeholder="¿Qué no quieres olvidar?"
        placeholderTextColor={theme.textTertiary}
        returnKeyType="done"
        // Sin esto, el teclado se cierra en cada confirmación y el foco que conservamos
        // no serviría de nada en el teléfono.
        blurOnSubmit={false}
        submitBehavior="submit"
        style={[styles.input, SIN_ANILLO, { color: theme.text }]}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  filaAbierta: { borderWidth: 1 },
  casilla: { width: 20, height: 20, borderRadius: Radius.full, borderWidth: 1.5 },
  input: {
    flex: 1,
    fontFamily: Fonts?.sans,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    padding: 0,
  },
});
