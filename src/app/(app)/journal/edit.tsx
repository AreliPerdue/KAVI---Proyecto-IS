import { useLocalSearchParams, useRouter } from 'expo-router';
import { Minus, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ColorPickerSheet } from '@/components/library/color-picker-sheet';
import { type CaraDeJournal, InteriorDeTapa, JournalCover } from '@/components/library/journal-cover';
import { ActionRow, AppText, Button, ErrorState, IconButton, Segmented, TextField } from '@/components/ui';
import { IconSize, IconStroke, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCreateJournal, useLibraryItem, useUpdateLibraryItem } from '@/hooks/use-library';
import { useMyProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { useDecoracionDeJournal } from '@/hooks/use-journal-covers';
import { proporcionDeCara, ENCUADERNACIONES, nombreDeAutora, MATERIALES, PAGINAS, paginasValidas, PORTADA_POR_OMISION, type PortadaDeJournal, portadaValida } from '@/lib/library/journal';
import { useSnackbar } from '@/providers';

type ColorDe = 'material' | 'accent' | 'edges' | 'back' | 'endpaper';

/**
 * Crear o editar un Journal (spec 13i, RF-JC1 – RF-JC9; T345): "primero eliges el cuaderno; luego lo decoras". Paso a
 * paso —forma, encuadernación, material y color, nombre y páginas— con la vista previa del cuaderno de verdad, que se
 * gira para ver la portada, el lomo o la contraportada. Cambiar cualquier paso después no pierde nada (la decoración
 * llega en J2). Con `?id=` edita uno que ya existe.
 */
export default function JournalEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = useTheme();
  const tx = useT();
  const j = tx.library.journal;
  const c = tx.library.canvas;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const avisar = useSnackbar();
  const existente = useLibraryItem(id ?? '');
  const crear = useCreateJournal();
  // Lo decorado se queda al cambiar forma, encuadernación o material (RF-JC1): se ve en la vista previa (T346).
  const decoracion = useDecoracionDeJournal(id ?? null);
  const autora = nombreDeAutora(useMyProfile().data);
  const actualizar = useUpdateLibraryItem();

  const editando = !!id;
  const inicial = editando ? existente.data : undefined;
  const [portada, setPortada] = useState<PortadaDeJournal>(() => (inicial?.journal ? portadaValida(inicial.journal) : PORTADA_POR_OMISION));
  const [titulo, setTitulo] = useState(inicial?.title ?? '');
  const [paginas, setPaginas] = useState(paginasValidas(inicial?.page_count ?? PAGINAS.porOmision));
  const [cara, setCara] = useState<CaraDeJournal>('front');
  const [colorDe, setColorDe] = useState<ColorDe | null>(null);
  // Si al abrir para editar aún no llegaba el Journal, se toma en cuanto llega (una sola vez).
  const [cargado, setCargado] = useState(!editando || !!inicial);
  if (!cargado && existente.data) {
    setCargado(true);
    setPortada(portadaValida(existente.data.journal));
    setTitulo(existente.data.title);
    setPaginas(paginasValidas(existente.data.page_count));
  }

  const poner = (cambio: Partial<PortadaDeJournal>) => setPortada((p) => ({ ...p, ...cambio }));
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/(app)/library'));

  const guardar = () => {
    const nombre = titulo.trim() || j.defaultTitle;
    if (editando && id) {
      actualizar.mutate({ id, patch: { title: nombre, page_count: paginas, journal: portada } }, { onSuccess: () => avisar({ message: j.saved }) });
      volver();
      return;
    }
    crear.mutate(
      { title: nombre, pages: paginas, journal: portada, author: autora },
      {
        onSuccess: (nuevo) => {
          avisar({ message: j.created });
          router.replace({ pathname: '/(app)/journal/[id]', params: { id: nuevo.id } });
        },
        onError: (e) => avisar({ message: e.message }),
      },
    );
  };

  if (editando && existente.isError && !existente.data) {
    return (
      <View style={[styles.pantalla, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <ErrorState message={j.notFound} onRetry={() => void existente.refetch()} />
      </View>
    );
  }

  // Al primer render la ventana puede medir 0: nunca menos de 120.
  const anchoVista = Math.max(120, Math.min(220, (Math.min(width, MaxContentWidth) - Spacing.lg * 2) * 0.55));
  const anchoPortada = portada.orientation === 'portrait' ? anchoVista : anchoVista * 1.25;
  const altoPortada = anchoPortada * (portada.orientation === 'portrait' ? Math.SQRT2 : 1 / Math.SQRT2);
  const muestra = (hex: string) => <View style={[styles.muestra, { backgroundColor: hex, borderColor: theme.border }]} />;
  const colorActual = colorDe === 'material' ? portada.color : colorDe === 'accent' ? portada.accent : colorDe === 'edges' ? portada.edges : colorDe === 'back' ? (portada.back?.color ?? portada.color) : colorDe === 'endpaper' ? portada.endpaper.color : null;

  return (
    <View style={[styles.pantalla, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.barra}>
        <IconButton label={tx.common.close} onPress={volver}>
          <X size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        <AppText variant="bodyStrong" accessibilityRole="header" style={styles.titulo}>
          {editando ? j.edit : j.new}
        </AppText>
        <View style={styles.hueco} />
      </View>
      <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + Spacing.xl }]} keyboardShouldPersistTaps="handled">
        {/* La vista previa: el cuaderno, que se gira para ver su portada, su lomo o su contraportada. */}
        <View style={[styles.vista, { height: altoPortada + Spacing.xl }]}>
          {cara === 'spine' ? (
            <JournalCover
              portada={portada}
              cara="spine"
              ancho={altoPortada / proporcionDeCara(portada.orientation, 'spine', paginas)}
              alto={altoPortada}
              etiqueta={j.faces.spine}
              decoracion={decoracion.spine}
            />
          ) : (
            <JournalCover
              portada={portada}
              cara={cara}
              ancho={anchoPortada}
              etiqueta={j.a11y(titulo || j.defaultTitle, j.bindings[portada.binding], j.materials[portada.material])}
              decoracion={decoracion[cara]}
            />
          )}
        </View>
        <Segmented
          label={j.view}
          options={(['front', 'spine', 'back'] as const).map((v) => ({ value: v, label: j.faces[v] }))}
          value={cara}
          onChange={setCara}
          fullWidth
        />
        <AppText variant="body" color="textSecondary">
          {j.hint}
        </AppText>

        <Seccion titulo={j.steps.shape}>
          <Segmented
            label={j.steps.shape}
            options={[
              { value: 'portrait', label: c.portrait },
              { value: 'landscape', label: c.landscape },
            ]}
            value={portada.orientation}
            onChange={(orientation) => poner({ orientation })}
            fullWidth
          />
        </Seccion>

        <Seccion titulo={j.steps.binding}>
          <View style={styles.opciones}>
            {ENCUADERNACIONES.map((b) => (
              <Opcion key={b} etiqueta={j.bindings[b]} elegida={portada.binding === b} onPress={() => poner({ binding: b })}>
                <JournalCover portada={{ ...portada, binding: b }} ancho={44} />
              </Opcion>
            ))}
          </View>
          {portada.binding === 'spiral' || portada.binding === 'sewn' ? (
            <ActionRow icon={muestra(portada.accent)} label={portada.binding === 'spiral' ? j.accentMetal : j.accentThread} onPress={() => setColorDe('accent')} />
          ) : null}
        </Seccion>

        <Seccion titulo={j.steps.material}>
          <View style={styles.opciones}>
            {MATERIALES.map((m) => (
              <Opcion key={m} etiqueta={j.materials[m]} elegida={portada.material === m} onPress={() => poner({ material: m })}>
                <JournalCover portada={{ ...portada, material: m, binding: 'paperback' }} ancho={44} />
              </Opcion>
            ))}
          </View>
          <ActionRow icon={muestra(portada.color)} label={j.color} onPress={() => setColorDe('material')} />
          <ActionRow icon={muestra(portada.edges)} label={j.edges} onPress={() => setColorDe('edges')} />
          <AppText variant="label" color="textSecondary">
            {j.back}
          </AppText>
          <Segmented
            label={j.back}
            options={[
              { value: 'same', label: j.backSame },
              { value: 'own', label: j.backOwn },
            ]}
            value={portada.back ? 'own' : 'same'}
            onChange={(v) => poner({ back: v === 'own' ? { material: portada.material, color: portada.color } : null })}
            fullWidth
          />
          {portada.back ? (
            <>
              <View style={styles.opciones}>
                {MATERIALES.map((m) => (
                  <Opcion
                    key={m}
                    etiqueta={j.materials[m]}
                    nombre={`${j.back}: ${j.materials[m]}`}
                    elegida={portada.back?.material === m}
                    onPress={() => poner({ back: { material: m, color: portada.back?.color ?? portada.color } })}>
                    <JournalCover portada={{ ...portada, material: m, color: portada.back?.color ?? portada.color, binding: 'paperback' }} ancho={44} />
                  </Opcion>
                ))}
              </View>
              <ActionRow icon={muestra(portada.back.color)} label={j.backColor} onPress={() => setColorDe('back')} />
            </>
          ) : null}
        </Seccion>

        {/* Las guardas (T367): el interior de las tapas, que se ve al abrirlo. */}
        <Seccion titulo={j.steps.endpaper}>
          <AppText variant="body" color="textSecondary">
            {j.endpaperHint}
          </AppText>
          {/* Cómo se ve al abrirlo: la tapa por dentro con la guarda pegada (T370). */}
          <View style={styles.guarda} accessible accessibilityRole="image" accessibilityLabel={j.endpaperPreview}>
            <InteriorDeTapa portada={portada} ancho={120} />
          </View>
          <View style={styles.opciones}>
            {MATERIALES.map((m) => (
              <Opcion
                key={m}
                etiqueta={j.materials[m]}
                nombre={`${j.endpaperFace}: ${j.materials[m]}`}
                elegida={portada.endpaper.material === m}
                onPress={() => poner({ endpaper: { material: m, color: portada.endpaper.color } })}>
                <InteriorDeTapa portada={portada} guarda={{ material: m, color: portada.endpaper.color }} ancho={44} />
              </Opcion>
            ))}
          </View>
          <ActionRow icon={muestra(portada.endpaper.color)} label={j.endpaperColor} onPress={() => setColorDe('endpaper')} />
        </Seccion>

        <Seccion titulo={j.steps.details}>
          <TextField label={j.name} value={titulo} onChangeText={setTitulo} placeholder={j.namePlaceholder} maxLength={120} />
          <View
            style={styles.paginas}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={j.pages}
            accessibilityValue={{ text: j.pagesValue(paginas) }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => setPaginas((n) => paginasValidas(n + (e.nativeEvent.actionName === 'increment' ? PAGINAS.paso : -PAGINAS.paso)))}>
            <IconButton label={j.fewer} onPress={() => setPaginas((n) => paginasValidas(n - PAGINAS.paso))} disabled={paginas <= PAGINAS.min}>
              <Minus size={IconSize.action} strokeWidth={IconStroke} color={paginas > PAGINAS.min ? theme.text : theme.textTertiary} />
            </IconButton>
            <AppText variant="heading" tabular style={styles.numero}>
              {j.pagesValue(paginas)}
            </AppText>
            <IconButton label={j.more} onPress={() => setPaginas((n) => paginasValidas(n + PAGINAS.paso))} disabled={paginas >= PAGINAS.max}>
              <Plus size={IconSize.action} strokeWidth={IconStroke} color={paginas < PAGINAS.max ? theme.text : theme.textTertiary} />
            </IconButton>
          </View>
        </Seccion>

        <Button title={editando ? j.save : j.create} onPress={guardar} loading={crear.isPending} disabled={crear.isPending || (editando && !cargado)} />
      </ScrollView>

      <ColorPickerSheet
        visible={colorDe !== null}
        titulo={colorDe === 'accent' ? (portada.binding === 'spiral' ? j.accentMetal : j.accentThread) : colorDe === 'edges' ? j.edges : colorDe === 'back' ? j.backColor : colorDe === 'endpaper' ? j.endpaperColor : j.color}
        valor={colorActual}
        onClose={() => setColorDe(null)}
        onElegir={(hex) => {
          const de = colorDe;
          setColorDe(null);
          if (!hex) return;
          if (de === 'material') poner({ color: hex });
          else if (de === 'accent') poner({ accent: hex });
          else if (de === 'edges') poner({ edges: hex });
          else if (de === 'back') poner({ back: { material: portada.back?.material ?? portada.material, color: hex } });
          else if (de === 'endpaper') poner({ endpaper: { material: portada.endpaper.material, color: hex } });
        }}
      />
    </View>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.seccion}>
      <AppText variant="heading">{titulo}</AppText>
      {children}
    </View>
  );
}

/** Una opción con su muestra: el cuaderno tal como quedaría. */
function Opcion({
  etiqueta,
  nombre,
  elegida,
  onPress,
  children,
}: {
  etiqueta: string;
  /** El nombre para el lector de pantalla si se repite la etiqueta (la contraportada, las guardas). */
  nombre?: string;
  elegida: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={nombre ?? etiqueta}
      accessibilityState={{ selected: elegida }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.opcion,
        { borderColor: elegida ? theme.ink : theme.border, borderWidth: elegida ? 2 : 1, backgroundColor: pressed ? theme.surfaceAlt : theme.surface },
      ]}>
      <View style={styles.miniatura}>{children}</View>
      <AppText variant="caption" numberOfLines={1}>
        {etiqueta}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  guarda: { alignItems: 'center', paddingVertical: Spacing.sm },
  pantalla: { flex: 1 },
  barra: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  titulo: { flex: 1, textAlign: 'center' },
  hueco: { width: 44 },
  contenido: { paddingHorizontal: Spacing.lg, gap: Spacing.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  vista: { alignItems: 'center', justifyContent: 'center' },
  seccion: { gap: Spacing.md },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  opcion: { width: 92, alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderCurve: 'continuous' },
  miniatura: { height: 70, justifyContent: 'center' },
  muestra: { width: 24, height: 24, borderRadius: 12, borderWidth: 1 },
  paginas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  numero: { minWidth: 140, textAlign: 'center' },
});
