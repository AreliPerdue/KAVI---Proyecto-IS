import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, ChevronLeft, GripVertical, List, Plus, SlidersHorizontal, ToggleLeft, Trash2, Type } from 'lucide-react-native';
import { type ComponentType, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { CardFieldSheet } from '@/components/library/card-field-sheet';
import { CardView, FAMILIA_DE_LETRA } from '@/components/library/card-view';
import { StickerSheet } from '@/components/library/sticker-sheet';
import { AppText, Banner, Button, Chip, ColorSwatch, ErrorState, IconButton, LoadingState, ReorderableColumn, Screen, Sheet, TextField } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useCards, useCardTemplates, useSaveCardTemplate } from '@/hooks/use-cards';
import { useStickerElegible } from '@/hooks/use-sticker-elegible';
import { useTheme } from '@/hooks/use-theme';
import { useUserStickerImages, useUserStickers } from '@/hooks/use-user-stickers';
import { useT } from '@/i18n';
import { uuidv4 } from '@/lib/gym/ids';
import { COLORES_DE_ANOTACION } from '@/lib/library/annotations';
import {
  ASPECTO_POR_OMISION,
  type AspectoDeFicha,
  aspectoDe,
  cambioDeDiseno,
  campoNuevo,
  camposDe,
  ESQUINAS,
  FONDOS,
  fichasPorPlantilla,
  LETRAS_DE_FICHA,
  ladeoNuevo,
  MAX_CAMPOS,
  MAX_NOMBRE,
  MAX_STICKERS,
  moverCampo,
  problemaDeDiseno,
  type SimboloDeEscala,
  TAMANOS_DE_STICKER,
  TIPOS_DE_CAMPO,
} from '@/lib/library/cards';
import { hexValido } from '@/lib/library/cover/parts';
import { useConfirm, useSnackbar } from '@/providers';
import type { CardField, CardFieldType, LibraryCardTemplate } from '@/types/domain';

const ICONO_DE_TIPO: Record<CardFieldType, ComponentType<{ size: number; strokeWidth: number; color: string }>> = {
  scale: SlidersHorizontal,
  choice: List,
  text: Type,
  date: Calendar,
  boolean: ToggleLeft,
};

/** El diseño de una ficha (spec 13d, RF-BF2 – RF-BF5; T293). `nueva` empieza una en blanco. */
export default function CardTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plantillas = useCardTemplates();
  const nueva = id === 'nueva';
  if (!nueva && plantillas.isPending) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (plantillas.isError) {
    return (
      <Screen>
        <ErrorState message={plantillas.error.message} onRetry={() => plantillas.refetch()} />
      </Screen>
    );
  }
  const previa = nueva ? null : (plantillas.data?.find((p) => p.id === id) ?? null);
  return <Editor key={id} previa={previa} />;
}

function Editor({ previa }: { previa: LibraryCardTemplate | null }) {
  const theme = useTheme();
  const router = useRouter();
  const tx = useT();
  const c = tx.library.cards;
  const e = c.editor;
  const guardar = useSaveCardTemplate();
  const fichas = useCards();
  const confirmar = useConfirm();
  const avisar = useSnackbar();
  const sticker = useStickerElegible();
  const mios = useUserStickers();
  const imagenesPropias = useUserStickerImages(mios.data);
  const { width } = useWindowDimensions();
  const ancho = width >= 960;

  const inicial = {
    name: previa?.name ?? e.newTitle,
    fields: previa ? camposDe(previa.fields) : [campoNuevo('scale', uuidv4(), c.included.stars)],
    look: previa ? aspectoDe(previa.look) : ASPECTO_POR_OMISION,
  };
  const [nombre, setNombre] = useState(inicial.name);
  const [campos, setCampos] = useState<CardField[]>(inicial.fields);
  const [aspecto, setAspecto] = useState<AspectoDeFicha>(inicial.look);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [eligiendoTipo, setEligiendoTipo] = useState(false);
  const [eligiendoSticker, setEligiendoSticker] = useState(false);
  const [preguntando, setPreguntando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [problema, setProblema] = useState<string | null>(null);
  const [hex, setHex] = useState('');

  const diseno = { name: nombre.trim(), fields: campos, look: aspecto };
  const cambiado = !previa || cambioDeDiseno(inicial, diseno);
  const llenas = previa ? (fichasPorPlantilla(fichas.data ?? []).get(previa.id) ?? 0) : 0;
  const indiceAbierto = campos.findIndex((x) => x.id === abiertoId);
  const abierto = indiceAbierto >= 0 ? campos[indiceAbierto] : null;

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/(app)/card-templates'));
  const salir = async () => {
    if (previa && !cambiado) return volver();
    const ok = await confirmar({ title: e.discardTitle, message: e.discardMessage, confirmLabel: e.discard, destructive: true });
    if (ok) volver();
  };

  const enviar = (aplicar: 'todas' | 'nuevas') => {
    setPreguntando(false);
    guardar.mutate(
      { id: previa?.id, diseno, aplicar },
      {
        onSuccess: () => {
          avisar({ message: e.saved });
          volver();
        },
        onError: (err) => setProblema(err.message),
      },
    );
  };
  const alGuardar = () => {
    const p = problemaDeDiseno(nombre, campos);
    if (p) {
      setProblema(e.problems[p]);
      return;
    }
    setProblema(null);
    // Si ya hay fichas llenas, se pregunta si el cambio vale para ellas (RF-BF5).
    if (previa && llenas > 0) setPreguntando(true);
    else enviar('todas');
  };

  const cambiarCampo = (nuevo: CardField) => setCampos((xs) => xs.map((x) => (x.id === nuevo.id ? nuevo : x)));
  const agregarCampo = (tipo: CardFieldType) => {
    setEligiendoTipo(false);
    if (campos.length >= MAX_CAMPOS) return;
    const nuevo = campoNuevo(tipo, uuidv4(), c.types[tipo]);
    setCampos((xs) => [...xs, nuevo]);
    setAbiertoId(nuevo.id);
  };
  const resumen = (x: CardField) =>
    x.type === 'scale'
      ? c.scaleSummary(x.max === 10 ? 10 : 5, c.symbols[(x.symbol as SimboloDeEscala) ?? 'star'] ?? '')
      : x.type === 'choice'
        ? c.choiceSummary((x.options ?? []).length, x.multiple === true)
        : x.type === 'text'
          ? x.long
            ? c.field.long
            : c.field.short
          : c.types[x.type];

  const libres = ESQUINAS.filter((q) => !aspecto.stickers.some((s) => s.corner === q));

  const vista = (
    <View style={styles.seccion}>
      <AppText variant="label" color="textSecondary">
        {e.preview}
      </AppText>
      <CardView plantilla={{ name: nombre || e.unnamed, fields: campos, look: aspecto }} sticker={sticker} />
    </View>
  );

  const controles = (
    <>
      <TextField label={e.name} value={nombre} maxLength={MAX_NOMBRE} onChangeText={setNombre} />

      <View style={styles.seccion}>
        <AppText variant="heading">{e.fields}</AppText>
        <AppText variant="caption" color="textSecondary">
          {e.fieldsHint}
        </AppText>
        <ReorderableColumn
          items={campos}
          keyOf={(x) => x.id}
          gap={Spacing.xs}
          longPressMs={150}
          onDragStateChange={setArrastrando}
          onMove={(de, a) => setCampos((xs) => moverCampo(xs, de, a))}
          renderItem={(x, _i, drag) => {
            const Icono = ICONO_DE_TIPO[x.type];
            return (
              <View style={[styles.campo, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                {drag.handle(
                  <View style={styles.asa} accessible accessibilityLabel={e.dragField(x.label || e.unnamed)}>
                    <GripVertical size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
                  </View>,
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={e.fieldA11y(x.label || e.unnamed, c.types[x.type])}
                  onPress={() => !drag.justDragged() && setAbiertoId(x.id)}
                  style={({ pressed }) => [styles.campoToque, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
                  <Icono size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {x.label || e.unnamed}
                    </AppText>
                    <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                      {resumen(x)}
                    </AppText>
                  </View>
                </Pressable>
              </View>
            );
          }}
        />
        {campos.length < MAX_CAMPOS ? (
          <Button title={e.addField} variant="secondary" icon={<Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} onPress={() => setEligiendoTipo(true)} />
        ) : (
          <AppText variant="caption" color="textSecondary">
            {e.maxFields}
          </AppText>
        )}
      </View>

      <View style={styles.seccion}>
        <AppText variant="heading">{e.look}</AppText>
        <AppText variant="label" color="textSecondary">
          {e.color}
        </AppText>
        <View style={styles.paleta}>
          {COLORES_DE_ANOTACION.map((x) => (
            <ColorSwatch
              key={x.id}
              hex={x.hex}
              size={32}
              label={tx.colors[x.id] ?? x.label}
              selected={aspecto.color.toUpperCase() === x.hex.toUpperCase()}
              onPress={() => setAspecto((a) => ({ ...a, color: x.hex.toUpperCase() }))}
            />
          ))}
        </View>
        <TextField
          label={e.ownColor}
          placeholder={aspecto.color}
          value={hex}
          autoCapitalize="characters"
          autoCorrect={false}
          onChangeText={(t) => {
            setHex(t);
            const h = hexValido(t);
            if (h) setAspecto((a) => ({ ...a, color: h }));
          }}
        />
        <AppText variant="label" color="textSecondary">
          {e.background}
        </AppText>
        <View style={styles.chips}>
          {FONDOS.map((f) => (
            <Chip key={f} label={c.backgrounds[f]} selected={aspecto.background === f} onPress={() => setAspecto((a) => ({ ...a, background: f }))} compact />
          ))}
        </View>
        <AppText variant="label" color="textSecondary">
          {e.font}
        </AppText>
        <View style={styles.chips}>
          {LETRAS_DE_FICHA.map((f) => (
            <Pressable
              key={f}
              accessibilityRole="button"
              accessibilityLabel={c.fonts[f]}
              accessibilityState={{ selected: aspecto.font === f }}
              onPress={() => setAspecto((a) => ({ ...a, font: f }))}
              style={[styles.letra, { borderColor: aspecto.font === f ? theme.ink : theme.border, backgroundColor: aspecto.font === f ? theme.ink : theme.surface }]}>
              <AppText variant="label" style={{ fontFamily: FAMILIA_DE_LETRA[f], color: aspecto.font === f ? theme.onInk : theme.text }}>
                {c.fonts[f]}
              </AppText>
            </Pressable>
          ))}
        </View>
        <AppText variant="label" color="textSecondary">
          {e.stickers}
        </AppText>
        {aspecto.stickers.map((s, i) => {
          const elegible = sticker(s.sticker);
          const cambiar = (cambio: Partial<typeof s>) => setAspecto((a) => ({ ...a, stickers: a.stickers.map((x, j) => (j === i ? { ...x, ...cambio } : x)) }));
          return (
            <View key={`${s.sticker}-${i}`} style={[styles.sticker, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={styles.stickerArriba}>
                {elegible ? <Image source={elegible.imagen} contentFit="contain" style={styles.miniatura} accessible={false} /> : <View style={styles.miniatura} />}
                <View style={[styles.chips, styles.flex]} accessibilityLabel={c.stickerCorner}>
                  {ESQUINAS.map((q) => (
                    <Chip
                      key={q}
                      label={c.corners[q]}
                      selected={s.corner === q}
                      onPress={() => (s.corner === q || libres.includes(q) ? cambiar({ corner: q }) : undefined)}
                      compact
                    />
                  ))}
                </View>
                <IconButton label={c.removeSticker} onPress={() => setAspecto((a) => ({ ...a, stickers: a.stickers.filter((_, j) => j !== i) }))}>
                  <Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />
                </IconButton>
              </View>
              <View style={styles.chips} accessibilityLabel={c.stickerSize}>
                {TAMANOS_DE_STICKER.map((t) => (
                  <Chip key={t} label={c.sizes[t]} selected={s.size === t} onPress={() => cambiar({ size: t })} compact />
                ))}
              </View>
            </View>
          );
        })}
        {aspecto.stickers.length < MAX_STICKERS ? (
          <Button title={e.addSticker} variant="secondary" icon={<Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} onPress={() => setEligiendoSticker(true)} />
        ) : (
          <AppText variant="caption" color="textSecondary">
            {e.stickerLimit}
          </AppText>
        )}
      </View>

      {problema ? <Banner tone="error" message={problema} /> : null}
      <Button title={e.save} onPress={alGuardar} loading={guardar.isPending} disabled={!cambiado} />
    </>
  );

  return (
    <Screen scroll scrollEnabled={!arrastrando}>
      <View style={styles.titulo}>
        <IconButton label={tx.common.back} onPress={() => void salir()}>
          <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        <AppText variant="title" accessibilityRole="header" style={styles.flex} numberOfLines={1}>
          {previa ? e.title : e.newTitle}
        </AppText>
      </View>
      {ancho ? (
        <View style={styles.dos}>
          <View style={styles.izquierda}>{vista}</View>
          <View style={[styles.derecha, styles.seccion]}>{controles}</View>
        </View>
      ) : (
        <>
          {vista}
          {controles}
        </>
      )}

      <CardFieldSheet
        campo={abierto}
        primero={indiceAbierto <= 0}
        ultimo={indiceAbierto === campos.length - 1}
        onCambiar={cambiarCampo}
        onSubir={() => setCampos((xs) => moverCampo(xs, indiceAbierto, indiceAbierto - 1))}
        onBajar={() => setCampos((xs) => moverCampo(xs, indiceAbierto, indiceAbierto + 1))}
        onQuitar={() => {
          setCampos((xs) => xs.filter((x) => x.id !== abiertoId));
          setAbiertoId(null);
        }}
        onClose={() => setAbiertoId(null)}
      />

      <Sheet visible={eligiendoTipo} onClose={() => setEligiendoTipo(false)} title={e.chooseType}>
        <View style={styles.tipos}>
          {TIPOS_DE_CAMPO.map((tipo) => {
            const Icono = ICONO_DE_TIPO[tipo];
            return (
              <Pressable
                key={tipo}
                accessibilityRole="button"
                accessibilityLabel={`${c.types[tipo]}. ${c.typeHints[tipo]}`}
                onPress={() => agregarCampo(tipo)}
                style={({ pressed }) => [styles.tipo, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : theme.surface }]}>
                <Icono size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{c.types[tipo]}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {c.typeHints[tipo]}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      <StickerSheet
        visible={eligiendoSticker}
        propios={{ stickers: mios.data ?? [], imagenes: imagenesPropias }}
        onClose={() => setEligiendoSticker(false)}
        onElegir={(s) => {
          setEligiendoSticker(false);
          setAspecto((a) =>
            a.stickers.length >= MAX_STICKERS || !libres.length
              ? a
              : { ...a, stickers: [...a.stickers, { sticker: s.id, corner: libres[0], size: 'm', rot: ladeoNuevo(a.stickers.length) }] },
          );
        }}
      />

      <Sheet visible={preguntando} onClose={() => setPreguntando(false)} title={e.applyTitle}>
        <View style={styles.tipos}>
          <AppText variant="body" color="textSecondary">
            {e.applyMessage(llenas)}
          </AppText>
          <Button title={e.applyAll} onPress={() => enviar('todas')} />
          <Button title={e.applyNew} variant="secondary" onPress={() => enviar('nuevas')} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: -Spacing.sm },
  seccion: { gap: Spacing.sm },
  dos: { flexDirection: 'row', gap: Spacing.xl, alignItems: 'flex-start' },
  izquierda: { width: 380 },
  derecha: { flex: 1, gap: Spacing.lg },
  campo: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', overflow: 'hidden' },
  asa: { width: 40, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  campoToque: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingRight: Spacing.md, minHeight: 56 },
  paleta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  letra: { borderWidth: 1, borderRadius: Radius.full, borderCurve: 'continuous', paddingHorizontal: Spacing.md, minHeight: 36, justifyContent: 'center' },
  sticker: { borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', padding: Spacing.sm, gap: Spacing.sm },
  stickerArriba: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  miniatura: { width: 44, height: 44 },
  tipos: { gap: Spacing.sm },
  tipo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', padding: Spacing.md, minHeight: 56 },
});
