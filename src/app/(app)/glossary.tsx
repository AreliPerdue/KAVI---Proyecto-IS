import { useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, type TextStyle, View } from 'react-native';

import { GlossaryEntryBody } from '@/components/fitness/glossary-entry';
import { ModalHeader } from '@/components/modal-header';
import { AppText, IconButton, Screen } from '@/components/ui';
import { GLOSSARY, GLOSSARY_TOPICS } from '@/constants/glossary';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { normalizar } from '@/lib/gym/search';

const MAX_WIDTH = 640;
const SIN_ANILLO: TextStyle = Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle) : {};

/**
 * Glosario de fitness (RF-F64): todos los términos, por temas, con búsqueda sin acentos.
 * Cada término se abre en el sitio con su significado, un ejemplo y la idea en pocas
 * palabras. `?term=rir` lo abre ya desplegado.
 */
export default function GlossaryScreen() {
  const theme = useTheme();
  const { term } = useLocalSearchParams<{ term?: string }>();
  const [busqueda, setBusqueda] = useState('');
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set(term ? [term] : []));

  const q = normalizar(busqueda.trim());
  const secciones = useMemo(() => {
    const entradas = q
      ? GLOSSARY.filter((e) => [e.term, e.also ?? '', e.meaning, e.short].some((t) => normalizar(t).includes(q)))
      : GLOSSARY;
    return GLOSSARY_TOPICS.map((t) => ({ ...t, entradas: entradas.filter((e) => e.topic === t.id) })).filter((t) => t.entradas.length > 0);
  }, [q]);

  const alternar = (id: string) =>
    setAbiertos((prev) => {
      const sig = new Set(prev);
      if (sig.has(id)) sig.delete(id);
      else sig.add(id);
      return sig;
    });

  return (
    <Screen modal scroll maxWidth={MAX_WIDTH}>
      <ModalHeader back title="Glosario" />
      <AppText color="textSecondary">
        Lo que significa cada término del gimnasio, con un ejemplo. No necesitas saberlos para entrenar: aquí están por si te topas con
        uno.
      </AppText>

      <View style={[styles.buscador, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
        <Search size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="RIR, drop set, superserie…"
          placeholderTextColor={theme.textTertiary}
          accessibilityLabel="Buscar en el glosario"
          autoCorrect={false}
          style={[styles.input, SIN_ANILLO, { color: theme.text }]}
        />
        {busqueda ? (
          <IconButton label="Limpiar búsqueda" onPress={() => setBusqueda('')}>
            <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
          </IconButton>
        ) : null}
      </View>

      {secciones.length === 0 ? (
        <AppText color="textSecondary" style={styles.vacio}>
          Ningún término dice eso.
        </AppText>
      ) : null}

      {secciones.map((s) => (
        <View key={s.id} style={styles.seccion}>
          <AppText variant="label" color="textSecondary" accessibilityRole="header">
            {s.label}
          </AppText>
          <View style={[styles.tarjeta, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            {s.entradas.map((e, i) => {
              // Al buscar se despliega todo lo que coincide: es lo que se quería leer.
              const abierto = !!q || abiertos.has(e.id);
              return (
                <View key={e.id} style={i > 0 ? [styles.separada, { borderTopColor: theme.border }] : null}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: abierto }}
                    accessibilityLabel={`${e.term}. ${e.short}`}
                    onPress={() => alternar(e.id)}
                    style={({ pressed }) => [styles.fila, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
                    <View style={styles.flex}>
                      <AppText variant="bodyStrong">{e.term}</AppText>
                      {e.also ? (
                        <AppText variant="caption" color="textTertiary">
                          {e.also}
                        </AppText>
                      ) : null}
                      {abierto ? null : (
                        <AppText variant="caption" color="textSecondary">
                          {e.short}
                        </AppText>
                      )}
                    </View>
                    {abierto ? (
                      <ChevronUp size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
                    ) : (
                      <ChevronDown size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
                    )}
                  </Pressable>
                  {abierto ? (
                    <View style={styles.detalle}>
                      <GlossaryEntryBody entry={e} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  buscador: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48, paddingLeft: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  input: { flex: 1, fontSize: 16, paddingVertical: Spacing.sm },
  vacio: { textAlign: 'center', padding: Spacing.lg },
  seccion: { gap: Spacing.sm },
  tarjeta: { borderWidth: 1, borderRadius: Radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
  separada: { borderTopWidth: StyleSheet.hairlineWidth },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 56, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  flex: { flex: 1, gap: 2 },
  detalle: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
});
