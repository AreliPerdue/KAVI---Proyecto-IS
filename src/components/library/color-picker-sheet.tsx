import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { AppText, Button, ColorSwatch, Sheet, TextField } from '@/components/ui';
import { COLORES_BASICOS, COLORES_DE_OFFICE, coloresDePortadas } from '@/constants/color-palettes';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useLibraryItems } from '@/hooks/use-library';
import { useSaveColors, useSavedColors } from '@/hooks/use-saved-colors';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { type Hsv, hexAHsv, hsvAHex, luminance, normalizarHex } from '@/lib/color';
import { colorDePortada } from '@/lib/library/shelf';
import { usePreferencesStore } from '@/store/preferences-store';

const MAX_MIS_COLORES = 30;
/** Los puntos del arcoíris de la barra de tono y los extremos del cuadro: matemática del color, no tokens de la app. */
const TONOS = ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'];
const BLANCO = '#FFFFFF';
const NEGRO = '#000000';
/** Donde empieza el cuadro si lo elegido aún no tiene color: el gris neutro de las piezas (RF-CC11). */
const GRIS_INICIAL = '#BDBDBD';

/**
 * Elegir un color en el lienzo creativo (spec 13h, RF-CC12; T342). KAVI no trae paletas (RF-CC11): el color se
 * busca en el cuadro (saturación y brillo) y la barra de tono, o se escribe en HEX. Abajo, los recientes de este
 * dispositivo y "Mis colores", la paleta de la cuenta: "+" guarda el de ahora y mantener presionado uno lo quita.
 * Después, colores con nombre (T365, pedido de Areli): los básicos, el set de Office y los de las portadas de tu
 * biblioteca; su nombre (o el título del libro) se ve al pasar el cursor o al elegirlo.
 * `ninguno`: la opción de no poner color (papel blanco, sin borde), con su nombre.
 */
export function ColorPickerSheet({
  visible,
  titulo,
  valor,
  ninguno,
  onClose,
  onElegir,
}: {
  visible: boolean;
  titulo: string;
  valor: string | null;
  ninguno?: string;
  onClose: () => void;
  onElegir: (hex: string | null) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={titulo}>
      {/* Cada vez que se abre empieza en el color que ya tiene lo elegido. */}
      <Selector key={visible ? `abierto-${valor ?? ''}` : 'cerrado'} valor={valor} ninguno={ninguno} onElegir={onElegir} />
    </Sheet>
  );
}

function Selector({ valor, ninguno, onElegir }: { valor: string | null; ninguno?: string; onElegir: (hex: string | null) => void }) {
  const theme = useTheme();
  const t = useT().library.canvas.color;
  const [hsv, setHsv] = useState<Hsv>(() => hexAHsv(valor ?? GRIS_INICIAL));
  const [texto, setTexto] = useState(valor ?? GRIS_INICIAL);
  const [errorHex, setErrorHex] = useState(false);
  const recientes = usePreferencesStore((s) => s.recentColors);
  const agregarReciente = usePreferencesStore((s) => s.addRecentColor);
  const mios = useSavedColors();
  const guardar = useSaveColors();
  const misColores = mios.data ?? [];
  const actual = hsvAHex(hsv);
  const nombres = t.names;
  const basicos = COLORES_BASICOS.map((c) => ({ hex: c.hex, nombre: nombres[c.clave] ?? c.clave }));
  const deOffice = COLORES_DE_OFFICE.map((c) => ({ hex: c.hex, nombre: nombres[c.clave] ?? c.clave }));
  const piezas = useLibraryItems();
  const dePortadas = coloresDePortadas((piezas.data ?? []).filter((p) => p.kind !== 'journal').map((p) => ({ title: p.title, color: colorDePortada(p) })));

  const poner = (nuevo: Hsv) => {
    setHsv(nuevo);
    setTexto(hsvAHex(nuevo));
    setErrorHex(false);
  };
  const ponerHex = (hex: string) => poner(hexAHsv(hex));

  const leerHex = () => {
    const hex = normalizarHex(texto);
    if (hex) ponerHex(hex);
    else setErrorHex(true);
  };

  const usar = (hex: string) => {
    agregarReciente(hex);
    onElegir(hex);
  };

  const guardarActual = () => {
    if (misColores.includes(actual) || misColores.length >= MAX_MIS_COLORES) return;
    guardar.mutate([...misColores, actual]);
  };

  return (
    <View style={styles.cuerpo}>
      <View style={styles.fila}>
        <View style={[styles.muestra, { backgroundColor: actual, borderColor: theme.border }]} accessible accessibilityLabel={t.preview(actual)} />
        <View style={styles.flex}>
          <TextField
            label={t.hex}
            value={texto}
            onChangeText={(v) => {
              setTexto(v);
              const hex = normalizarHex(v);
              if (hex) {
                setHsv(hexAHsv(hex));
                setErrorHex(false);
              }
            }}
            onBlur={leerHex}
            onSubmitEditing={leerHex}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            error={errorHex ? t.hexInvalid : undefined}
          />
        </View>
      </View>

      <CuadroDeColor hsv={hsv} onCambiar={poner} etiqueta={t.square} />
      <BarraDeTono hsv={hsv} onCambiar={poner} etiqueta={t.hue} />

      {recientes.length ? (
        <View style={styles.seccion}>
          <AppText variant="label" color="textSecondary">
            {t.recent}
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.muestras}>
            {recientes.map((c) => (
              <ColorSwatch key={c} hex={c} label={c} selected={c === actual} onPress={() => ponerHex(c)} size={36} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.seccion}>
        <AppText variant="label" color="textSecondary">
          {t.mine}
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.muestras}>
          {misColores.map((c) => {
            const quitar = () => guardar.mutate(misColores.filter((x) => x !== c));
            return (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={c}
                accessibilityHint={t.removeHint}
                accessibilityState={{ selected: c === actual }}
                accessibilityActions={[{ name: 'activate' }, { name: 'longpress', label: t.removeSaved(c) }]}
                onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'longpress' ? quitar() : ponerHex(c))}
                onPress={() => ponerHex(c)}
                onLongPress={quitar}
                hitSlop={4}
                style={[styles.mio, { backgroundColor: c, borderColor: c === actual ? theme.ink : theme.border, borderWidth: c === actual ? 3 : 1 }]}
              />
            );
          })}
          {misColores.length < MAX_MIS_COLORES && !misColores.includes(actual) ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.save(actual)}
              onPress={guardarActual}
              hitSlop={4}
              style={({ pressed }) => [styles.mas, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : 'transparent' }]}>
              <Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
            </Pressable>
          ) : null}
        </ScrollView>
        {!misColores.length ? (
          <AppText variant="caption" color="textSecondary">
            {t.mineEmpty}
          </AppText>
        ) : null}
      </View>

      <PaletaConNombres titulo={t.basics} colores={basicos} actual={actual} onElegir={ponerHex} />
      <PaletaConNombres titulo={t.office} colores={deOffice} actual={actual} onElegir={ponerHex} />
      {dePortadas.length ? <PaletaConNombres titulo={t.covers} colores={dePortadas} actual={actual} onElegir={ponerHex} /> : null}

      <Button title={t.use} onPress={() => usar(actual)} />
      {ninguno ? <Button title={ninguno} variant="secondary" onPress={() => onElegir(null)} /> : null}
    </View>
  );
}

/**
 * Unos colores con nombre (T365): cada muestra dice el suyo al pasar el cursor (en la computadora) o al elegirla, en
 * el renglón de abajo; el lector de pantalla lo lee siempre.
 */
function PaletaConNombres({ titulo, colores, actual, onElegir }: { titulo: string; colores: readonly { hex: string; nombre: string }[]; actual: string; onElegir: (hex: string) => void }) {
  const theme = useTheme();
  const t = useT().library.canvas.color;
  const [encima, setEncima] = useState<number | null>(null);
  const elegido = colores.find((c) => c.hex === actual);
  const visto = encima !== null ? colores[encima] : elegido;
  return (
    <View style={styles.seccion}>
      <AppText variant="label" color="textSecondary">
        {titulo}
      </AppText>
      <View style={styles.rejilla}>
        {colores.map((c, i) => {
          const esElegido = c.hex === actual;
          return (
            <Pressable
              key={`${c.hex}-${i}`}
              accessibilityRole="button"
              accessibilityLabel={t.named(c.nombre, c.hex)}
              accessibilityState={{ selected: esElegido }}
              onPress={() => onElegir(c.hex)}
              onHoverIn={() => setEncima(i)}
              onHoverOut={() => setEncima((x) => (x === i ? null : x))}
              hitSlop={6}
              style={[styles.conNombre, { backgroundColor: c.hex, borderColor: esElegido ? theme.ink : theme.border, borderWidth: esElegido ? 3 : 1 }]}
            />
          );
        })}
      </View>
      <AppText variant="caption" color="textSecondary" numberOfLines={1} style={styles.nombre}>
        {visto ? t.named(visto.nombre, visto.hex) : ' '}
      </AppText>
    </View>
  );
}

/** Saturación (a lo ancho) y brillo (a lo alto) del tono elegido; se toca o se arrastra. */
function CuadroDeColor({ hsv, onCambiar, etiqueta }: { hsv: Hsv; onCambiar: (h: Hsv) => void; etiqueta: string }) {
  const theme = useTheme();
  const [caja, setCaja] = useState({ w: 0, h: 0 });
  const tomar = (x: number, y: number) => {
    if (!caja.w || !caja.h) return;
    onCambiar({ ...hsv, s: Math.min(1, Math.max(0, x / caja.w)), v: Math.min(1, Math.max(0, 1 - y / caja.h)) });
  };
  const gesto = Gesture.Exclusive(
    Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin((e) => tomar(e.x, e.y))
      .onUpdate((e) => tomar(e.x, e.y)),
    Gesture.Tap()
      .runOnJS(true)
      .onEnd((e) => tomar(e.x, e.y)),
  );
  const tono = hsvAHex({ h: hsv.h, s: 1, v: 1 });
  const marca = hsvAHex(hsv);
  return (
    <GestureDetector gesture={gesto}>
      <View
        style={[styles.cuadro, { borderColor: theme.border }]}
        onLayout={(e: LayoutChangeEvent) => setCaja({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={etiqueta}
        accessibilityValue={{ text: `${Math.round(hsv.v * 100)} %` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onCambiar({ ...hsv, v: Math.min(1, Math.max(0, hsv.v + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))) })}>
        <Svg width="100%" height="100%" pointerEvents="none">
          <Defs>
            <LinearGradient id="kavi-sat" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={BLANCO} stopOpacity="1" />
              <Stop offset="1" stopColor={tono} stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="kavi-brillo" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={NEGRO} stopOpacity="0" />
              <Stop offset="1" stopColor={NEGRO} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#kavi-sat)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#kavi-brillo)" />
        </Svg>
        <View
          pointerEvents="none"
          style={[
            styles.punto,
            { left: hsv.s * caja.w - 12, top: (1 - hsv.v) * caja.h - 12, backgroundColor: marca, borderColor: luminance(marca) > 0.4 ? theme.text : theme.background },
          ]}
        />
      </View>
    </GestureDetector>
  );
}

/** El tono, de rojo a rojo; se toca o se arrastra. */
function BarraDeTono({ hsv, onCambiar, etiqueta }: { hsv: Hsv; onCambiar: (h: Hsv) => void; etiqueta: string }) {
  const theme = useTheme();
  const [ancho, setAncho] = useState(0);
  const tomar = (x: number) => {
    if (ancho) onCambiar({ ...hsv, h: Math.min(359.9, Math.max(0, (x / ancho) * 360)), s: hsv.s || 1, v: hsv.v || 1 });
  };
  const gesto = Gesture.Exclusive(
    Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin((e) => tomar(e.x))
      .onUpdate((e) => tomar(e.x)),
    Gesture.Tap()
      .runOnJS(true)
      .onEnd((e) => tomar(e.x)),
  );
  return (
    <GestureDetector gesture={gesto}>
      <View
        style={styles.tono}
        onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={etiqueta}
        accessibilityValue={{ text: `${Math.round(hsv.h)}°` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onCambiar({ ...hsv, h: (hsv.h + (e.nativeEvent.actionName === 'increment' ? 15 : 345)) % 360 })}>
        <Svg width="100%" height="100%" pointerEvents="none">
          <Defs>
            <LinearGradient id="kavi-tono" x1="0" y1="0" x2="1" y2="0">
              {TONOS.map((c, i) => (
                <Stop key={i} offset={String(i / (TONOS.length - 1))} stopColor={c} stopOpacity="1" />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" rx="12" fill="url(#kavi-tono)" />
        </Svg>
        <View pointerEvents="none" style={[styles.cursor, { left: (hsv.h / 360) * ancho - 6, borderColor: theme.text, backgroundColor: theme.background }]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  conNombre: { width: 32, height: 32, borderRadius: 16, borderCurve: 'continuous' },
  nombre: { minHeight: 16 },
  cuerpo: { gap: Spacing.lg, paddingBottom: Spacing.md },
  fila: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md },
  flex: { flex: 1 },
  muestra: { width: 56, height: 56, borderRadius: Radius.md, borderCurve: 'continuous', borderWidth: 1 },
  cuadro: { height: 180, borderRadius: Radius.md, borderCurve: 'continuous', overflow: 'hidden', borderWidth: 1 },
  punto: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 3 },
  tono: { height: 28, justifyContent: 'center' },
  cursor: { position: 'absolute', top: -4, width: 12, height: 36, borderRadius: 6, borderWidth: 2 },
  seccion: { gap: Spacing.sm },
  muestras: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  mio: { width: 36, height: 36, borderRadius: 18 },
  mas: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
});
