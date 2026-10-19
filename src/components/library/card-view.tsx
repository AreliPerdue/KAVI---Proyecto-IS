import { Image } from 'expo-image';
import { Check, Coffee, Droplet, Flame, Heart, Skull, Sparkles, Star, X, Zap } from 'lucide-react-native';
import { type ComponentType, memo, useId, useState } from 'react';
import { Platform, StyleSheet, Text, type TextStyle, View } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';

import type { StickerElegible } from '@/components/library/sticker-sheet';
import { Radius, Spacing } from '@/constants/theme';
import { useLanguage, useT } from '@/i18n';
import { mixHex } from '@/lib/color';
import { ANCHO_DE_STICKER, aspectoDe, type AspectoDeFicha, camposDe, type LetraDeFicha, type SimboloDeEscala } from '@/lib/library/cards';
import { formatDate } from '@/lib/dates';
import type { CardField, LibraryCardTemplate } from '@/types/domain';

type Icono = ComponentType<{ size: number; strokeWidth: number; color: string; fill?: string }>;
export const ICONO_DE_SIMBOLO: Record<SimboloDeEscala, Icono> = {
  star: Star,
  heart: Heart,
  flame: Flame,
  skull: Skull,
  droplet: Droplet,
  sparkles: Sparkles,
  coffee: Coffee,
  zap: Zap,
};

/** La letra de la tarjeta: las del sistema en cada plataforma y una manuscrita. */
export const FAMILIA_DE_LETRA: Record<LetraDeFicha, string | undefined> = {
  system: undefined,
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' }),
  hand: Platform.select({ ios: 'Noteworthy', android: 'casual', default: '"KAVI Manuscrita", "Patrick Hand", "Comic Sans MS", cursive' }),
};

/** La tinta de la tarjeta: es un papel claro aunque la app esté en oscuro, como una tarjeta de verdad. */
const TINTA = '#1F1F1F';
const TINTA_SUAVE = '#5C5A55';
const PAPEL = '#FBF7EE';
const BLANCO = '#FFFFFF';

/**
 * Una ficha de calificación como tarjeta (spec 13d, RF-BF3; T293): su color, su fondo (liso, papel, rayas,
 * cuadrícula o puntos), su letra y sus stickers en las esquinas, con cada campo. Sin valores, se ve el diseño
 * con los campos vacíos (vista previa). `compacta`: solo los primeros campos, para listas.
 */
export const CardView = memo(function CardView({
  plantilla,
  valores,
  subtitulo,
  compacta = false,
  sticker,
}: {
  plantilla: Pick<LibraryCardTemplate, 'name' | 'fields' | 'look'>;
  valores?: Record<string, unknown>;
  subtitulo?: string;
  compacta?: boolean;
  /** De un id de sticker a su imagen (ver `useStickerElegible`). */
  sticker: (id: string) => StickerElegible | null;
}) {
  const aspecto = aspectoDe(plantilla.look);
  const campos = camposDe(plantilla.fields);
  const visibles = compacta ? campos.slice(0, 3) : campos;
  const [ancho, setAncho] = useState(0);
  const letra: TextStyle = { fontFamily: FAMILIA_DE_LETRA[aspecto.font], color: TINTA };
  const base = aspecto.background === 'plain' ? mixHex(BLANCO, aspecto.color, 0.18) : PAPEL;
  // Un sticker arriba no tapa el nombre: el nombre se recorre hacia el otro lado.
  const lugarDe = (esquina: 'tl' | 'tr') => {
    const s = aspecto.stickers.find((x) => x.corner === esquina);
    return s && ancho ? ancho * ANCHO_DE_STICKER[s.size] * 0.7 : 0;
  };
  const margenDelNombre = { marginLeft: lugarDe('tl'), marginRight: lugarDe('tr') };

  return (
    <View
      style={[styles.tarjeta, { backgroundColor: base, borderColor: mixHex(base, TINTA, 0.12) }]}
      onLayout={(e) => setAncho(Math.round(e.nativeEvent.layout.width))}
      accessible
      accessibilityLabel={plantilla.name}>
      {/* El fondo va recortado a las esquinas redondeadas; los stickers sí pueden salirse un poco. */}
      <View style={styles.recorte} pointerEvents="none">
        {ancho ? <Fondo aspecto={aspecto} ancho={ancho} /> : null}
        {aspecto.background === 'paper' ? <View style={[styles.banda, { backgroundColor: aspecto.color }]} /> : null}
      </View>
      <View style={[styles.cuerpo, compacta ? styles.cuerpoCompacto : null]}>
        <Text style={[styles.titulo, letra, compacta ? styles.tituloCompacto : null, margenDelNombre]} numberOfLines={2}>
          {plantilla.name}
        </Text>
        {subtitulo ? (
          <Text style={[styles.subtitulo, letra, { color: TINTA_SUAVE }]} numberOfLines={1}>
            {subtitulo}
          </Text>
        ) : null}
        {visibles.map((c) => (
          <Campo key={c.id} campo={c} valor={valores?.[c.id]} acento={aspecto.color} letra={letra} compacta={compacta} />
        ))}
        {compacta && campos.length > visibles.length ? <Text style={[styles.mas, letra, { color: TINTA_SUAVE }]}>{`+${campos.length - visibles.length}`}</Text> : null}
      </View>
      {ancho
        ? aspecto.stickers.map((s, i) => {
            const e = sticker(s.sticker);
            if (!e) return null;
            const w = ancho * ANCHO_DE_STICKER[s.size];
            const h = w * e.ar;
            const lado = { left: s.corner.endsWith('l') ? -w * 0.18 : undefined, right: s.corner.endsWith('r') ? -w * 0.18 : undefined };
            const alto = { top: s.corner.startsWith('t') ? -h * 0.2 : undefined, bottom: s.corner.startsWith('b') ? -h * 0.2 : undefined };
            return (
              <Image
                key={`${s.sticker}-${i}`}
                source={e.imagen}
                contentFit="contain"
                accessible={false}
                style={[styles.sticker, { width: w, height: h, transform: [{ rotate: `${s.rot}deg` }] }, lado, alto]}
              />
            );
          })
        : null}
    </View>
  );
});

/** El dibujo del fondo: rayas, cuadrícula o puntos en el color de la ficha, suaves. */
function Fondo({ aspecto, ancho }: { aspecto: AspectoDeFicha; ancho: number }) {
  // Cada tarjeta con su propio patrón: en la web los ids de SVG son de toda la página.
  const id = `fondo-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  if (aspecto.background === 'plain' || aspecto.background === 'paper') return null;
  const trazo = mixHex(PAPEL, aspecto.color, 0.55);
  const paso = 22;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <Pattern id={id} width={paso} height={paso} patternUnits="userSpaceOnUse">
          {aspecto.background === 'dots' ? <Circle cx={paso / 2} cy={paso / 2} r={1.4} fill={trazo} /> : null}
          {aspecto.background === 'lines' || aspecto.background === 'grid' ? <Line x1={0} y1={paso - 0.5} x2={paso} y2={paso - 0.5} stroke={trazo} strokeWidth={1} /> : null}
          {aspecto.background === 'grid' ? <Line x1={paso - 0.5} y1={0} x2={paso - 0.5} y2={paso} stroke={trazo} strokeWidth={1} /> : null}
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={ancho} height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

function Campo({ campo, valor, acento, letra, compacta }: { campo: CardField; valor: unknown; acento: string; letra: TextStyle; compacta: boolean }) {
  const t = useT().library.cards;
  const lang = useLanguage();
  const etiqueta = (
    <Text style={[styles.etiqueta, letra, { color: TINTA_SUAVE }]} numberOfLines={1}>
      {campo.label}
    </Text>
  );
  if (campo.type === 'scale') {
    const Simbolo = ICONO_DE_SIMBOLO[(campo.symbol as SimboloDeEscala) ?? 'star'] ?? Star;
    const max = campo.max === 10 ? 10 : 5;
    const n = typeof valor === 'number' ? Math.max(0, Math.min(max, Math.round(valor))) : 0;
    const tam = max === 10 ? 15 : 20;
    const borde = mixHex(acento, TINTA, 0.45);
    return (
      <View style={styles.campo} accessible accessibilityLabel={`${campo.label}: ${t.scaleValue(n, max)}`}>
        {etiqueta}
        <View style={styles.simbolos}>
          {Array.from({ length: max }, (_, i) => (
            <Simbolo key={i} size={tam} strokeWidth={1.8} color={i < n ? borde : mixHex(PAPEL, TINTA, 0.28)} fill={i < n ? acento : 'transparent'} />
          ))}
        </View>
      </View>
    );
  }
  if (campo.type === 'choice') {
    const elegidas = Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : typeof valor === 'string' ? [valor] : [];
    const muestra = elegidas.length ? elegidas : (campo.options ?? []).slice(0, compacta ? 2 : 4);
    return (
      <View style={styles.campo}>
        {etiqueta}
        <View style={styles.opciones}>
          {muestra.map((o) => (
            <Text
              key={o}
              style={[styles.opcion, letra, elegidas.length ? { backgroundColor: mixHex(PAPEL, acento, 0.5) } : { borderColor: mixHex(PAPEL, TINTA, 0.25), borderWidth: 1, color: TINTA_SUAVE }]}
              numberOfLines={1}>
              {o}
            </Text>
          ))}
          {!elegidas.length && (campo.options ?? []).length > muestra.length ? (
            <Text style={[styles.opcion, letra, { color: TINTA_SUAVE }]}>{`+${(campo.options ?? []).length - muestra.length}`}</Text>
          ) : null}
        </View>
      </View>
    );
  }
  if (campo.type === 'text') {
    const texto = typeof valor === 'string' ? valor.trim() : '';
    return (
      <View style={styles.campo}>
        {etiqueta}
        {texto ? (
          <Text style={[styles.texto, letra]} numberOfLines={compacta ? 2 : undefined}>
            {texto}
          </Text>
        ) : (
          <View style={styles.renglones}>
            {Array.from({ length: campo.long && !compacta ? 2 : 1 }, (_, i) => (
              <View key={i} style={[styles.renglon, { backgroundColor: mixHex(PAPEL, TINTA, 0.18) }]} />
            ))}
          </View>
        )}
      </View>
    );
  }
  if (campo.type === 'date') {
    const fecha = typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null;
    const [y, m, d] = fecha ? fecha.split('-').map(Number) : [];
    return (
      <View style={[styles.campo, styles.enLinea]}>
        {etiqueta}
        <Text style={[styles.texto, letra, fecha ? null : { color: TINTA_SUAVE }]}>{fecha ? formatDate(new Date(y, m - 1, d), lang) : '—'}</Text>
      </View>
    );
  }
  const si = valor === true;
  const no = valor === false;
  return (
    <View style={[styles.campo, styles.enLinea]}>
      {etiqueta}
      <View style={styles.siNo}>
        {si ? <Check size={16} strokeWidth={2.4} color={TINTA} /> : no ? <X size={16} strokeWidth={2.4} color={TINTA} /> : null}
        <Text style={[styles.texto, letra, si || no ? null : { color: TINTA_SUAVE }]}>{si ? t.yes : no ? t.no : t.yesNo}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    overflow: 'visible',
  },
  recorte: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: Radius.md, borderCurve: 'continuous', overflow: 'hidden' },
  banda: { position: 'absolute', top: 0, left: 0, right: 0, height: 10 },
  cuerpo: { padding: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.md },
  cuerpoCompacto: { padding: Spacing.md, paddingTop: Spacing.lg, gap: Spacing.sm },
  titulo: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  tituloCompacto: { fontSize: 16, lineHeight: 21 },
  subtitulo: { fontSize: 14, lineHeight: 19, marginTop: -Spacing.sm },
  campo: { gap: 4 },
  enLinea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  etiqueta: { fontSize: 12, lineHeight: 16, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  simbolos: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  opcion: { fontSize: 13, lineHeight: 18, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, overflow: 'hidden', color: TINTA },
  texto: { fontSize: 15, lineHeight: 21 },
  renglones: { gap: 10, paddingTop: 8 },
  renglon: { height: 1 },
  siNo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mas: { fontSize: 13 },
  sticker: { position: 'absolute' },
});
