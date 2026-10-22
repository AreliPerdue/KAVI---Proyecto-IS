import { Image } from 'expo-image';
import { memo, useId } from 'react';
import { type ImageSourcePropType, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';

import { assetPorId } from '@/constants/canvas-assets';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { colorDeTratamiento, type DatoEscrito, type DocumentoDeLienzo, fechaLegible, MUESTRA_SIN_COLOR, type ElementoDeLienzo, type LibroEnLienzo, type OrientacionDeLienzo, RAIZ_DE_DOS } from '@/lib/library/canvas';
import { useLanguage } from '@/i18n';
import { CARA, CARITAS, FORMA_GRIS, MARCO_POLAROID, PAPEL_DE_LIENZO, PELICULA, SIMBOLOS_DE_RATING, SIN_FOTO, TINTA_DE_TEXTO, TRAZOS_DE_FORMA } from '@/lib/library/canvas-shapes';
import { luminance } from '@/lib/color';
import { claveDeDato } from '@/lib/library/journal-stats';

/** De dónde sale la imagen de cada pieza: ruta de una imagen → dirección; id de un sticker → imagen. */
export type FuentesDeMiniatura = {
  imagenes: ReadonlyMap<string, string>;
  stickers: ReadonlyMap<string, string | ImageSourcePropType>;
  libros?: ReadonlyMap<string, LibroEnLienzo>;
  /** Los datos de la biblioteca ya contados y escritos (T349). */
  datos?: ReadonlyMap<string, DatoEscrito>;
};

/**
 * La miniatura de un recorte (spec 13h, RF-CC23; T342): la primera página dibujada en la app a escala, con su fondo y
 * cada pieza en su lugar, tamaño, giro, opacidad y borde. No es la página real (esa la pinta el motor), pero se ve
 * igual a ese tamaño y no hace falta guardar una imagen aparte. El texto que hay dentro es parte del dibujo: no lo lee
 * el lector de pantalla (la tarjeta dice el nombre del recorte) y por eso puede quedar por debajo de 12 px.
 */
/** Lo que se dibuja como módulo (con su contenido) en la miniatura. */
const MODULOS_DE_MINIATURA: readonly string[] = ['polaroid', 'quote', 'rating', 'book', 'stat', 'swatch', 'checklist', 'mood', 'song', 'date', 'timeline'];

export const CanvasPreview = memo(function CanvasPreview({
  doc,
  orientacion,
  ancho,
  fuentes,
  proporcion,
  sinPapel = false,
  papel = '#F7F5EF',
}: {
  doc: DocumentoDeLienzo;
  orientacion: OrientacionDeLienzo;
  ancho: number;
  fuentes: FuentesDeMiniatura;
  /** Alto ÷ ancho de una página de otra forma: el lomo de un Journal (T346). */
  proporcion?: number;
  /** Solo lo pegado, sin el papel ni su borde: la decoración encima del material de una tapa (T346). */
  sinPapel?: boolean;
  /** El color de las páginas del Journal, que se ve por lo recortado de una tapa (T348). */
  papel?: string;
}) {
  const theme = useTheme();
  const alto = ancho * (proporcion ?? (orientacion === 'landscape' ? 1 / RAIZ_DE_DOS : RAIZ_DE_DOS));
  const W = ancho;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        sinPapel ? styles.sinPapel : styles.pagina,
        { width: ancho, height: alto },
        sinPapel ? null : { backgroundColor: doc.background ?? PAPEL_DE_LIENZO, borderColor: theme.border },
      ]}>
      {doc.elements
        .filter((e) => e.page === 1)
        .map((e) => {
          const w = e.w * W;
          const h = w * e.ar;
          const borde = e.style.border ? { width: e.style.border.width * W, color: e.style.border.color } : null;
          // Un acabado de una tapa (T348) pinta con su color; su luz y su sombra son del motor (aquí, solo en el texto).
          const color = e.style.treatment ? colorDeTratamiento(e.style.treatment, papel, e.style.color) : e.style.color;
          const caja = {
            position: 'absolute' as const,
            left: e.x * W,
            top: e.y * alto,
            width: w,
            height: h,
            opacity: e.style.opacity ?? 1,
            transform: e.rot ? [{ rotate: `${e.rot}deg` }] : undefined,
          };
          if (e.type === 'shape') {
            return (
              <View key={e.id} style={caja}>
                <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <Path
                    d={TRAZOS_DE_FORMA[e.content.shape ?? 'rect']}
                    fill={color ?? FORMA_GRIS}
                    stroke={borde?.color}
                    strokeWidth={borde ? borde.width : 0}
                    vectorEffect="non-scaling-stroke"
                  />
                </Svg>
              </View>
            );
          }
          if (MODULOS_DE_MINIATURA.includes(e.type)) {
            return (
              <View key={e.id} style={caja}>
                <Modulo e={e} w={w} h={h} fuentes={fuentes} />
              </View>
            );
          }
          if (e.type === 'asset') {
            // Con color, el asset entero toma ese tono (en la página real, la textura se conserva).
            const asset = assetPorId(e.content.asset);
            return (
              <View key={e.id} style={caja}>
                {asset ? <Image source={asset.imagen} style={styles.lleno} contentFit="fill" tintColor={color ?? undefined} /> : null}
              </View>
            );
          }
          if (e.type === 'textbox') {
            // Como en el motor (T363): contra lo mayor entre el ancho y el alto de una A5, así el lomo no la achica.
            const tamano = 0.021 * Math.max(W, alto * 0.7071) * (e.style.size ?? 1);
            const sentido = e.style.direction;
            const estiloDeTexto = [
              { fontSize: tamano, lineHeight: tamano * 1.35, color: color ?? TINTA_DE_TEXTO, paddingHorizontal: tamano * 0.35, paddingVertical: tamano * 0.25 },
              e.style.treatment === 'debossed' ? styles.hundido : e.style.treatment === 'embossed' ? styles.relieve : null,
            ];
            return (
              <View key={e.id} style={[caja, styles.texto, borde ? { borderWidth: borde.width, borderColor: borde.color } : null]}>
                {sentido === 'down' || sentido === 'up' ? (
                  // Vertical: el texto acostado en una caja del largo de la suya, girado un cuarto de vuelta.
                  <View style={{ position: 'absolute', width: h, height: w, left: (w - h) / 2, top: (h - w) / 2, transform: [{ rotate: sentido === 'down' ? '90deg' : '-90deg' }] }}>
                    <Text style={estiloDeTexto}>{e.content.text}</Text>
                  </View>
                ) : (
                  <Text style={[estiloDeTexto, sentido === 'stacked' ? styles.apilado : null]}>
                    {sentido === 'stacked' ? [...(e.content.text ?? '')].join('\n') : e.content.text}
                  </Text>
                )}
              </View>
            );
          }
          const fuente = e.type === 'image' ? (e.content.path ? fuentes.imagenes.get(e.content.path) : undefined) : e.content.sticker ? fuentes.stickers.get(e.content.sticker) : undefined;
          return (
            <View key={e.id} style={[caja, borde ? { borderWidth: borde.width, borderColor: borde.color } : null]}>
              {fuente ? <Image source={typeof fuente === 'string' ? { uri: fuente } : fuente} style={styles.lleno} contentFit={e.type === 'sticker' ? 'fill' : 'contain'} /> : null}
            </View>
          );
        })}
    </View>
  );
});

const styles = StyleSheet.create({
  pagina: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.sm / 2, borderCurve: 'continuous' },
  sinPapel: { overflow: 'hidden' },
  apilado: { textAlign: 'center' },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  hundido: { textShadowColor: 'rgba(255,255,255,0.3)', textShadowOffset: { width: 0, height: 0.5 }, textShadowRadius: 0 },
  relieve: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 0.8 }, textShadowRadius: 0.6 },
  texto: { overflow: 'hidden' },
  lleno: { width: '100%', height: '100%' },
  pie: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  numero: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

const SERIFA = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });
const sobre = (fondo: string) => (luminance(fondo) < 0.3 ? PAPEL_DE_LIENZO : TINTA_DE_TEXTO);

/** Un hueco de foto: la imagen recortada para llenarlo, o el gris de "sin foto". */
function Foto({ src, ancho, alto }: { src?: string; ancho: number; alto: number }) {
  return (
    <View style={{ width: ancho, height: alto, backgroundColor: SIN_FOTO, overflow: 'hidden' }}>
      {src ? <Image source={{ uri: src }} style={styles.lleno} contentFit="cover" /> : null}
    </View>
  );
}

/** Los módulos del lienzo (T343) a escala, con las medidas de `public/reader/modules.js`. */
function Modulo({ e, w, h, fuentes }: { e: ElementoDeLienzo; w: number; h: number; fuentes: FuentesDeMiniatura }) {
  const u = w / 100;
  const id = useId();
  const c = e.content;
  const idioma = useLanguage();
  const tinta = e.style.color ?? TINTA_DE_TEXTO;
  // T349b: checklist, mood, canción, fecha y lugar, y timeline, como los pinta el motor.
  if (e.type === 'checklist') {
    return (
      <View style={[styles.lleno, { padding: 5 * u, gap: 3 * u, overflow: 'hidden' }]}>
        {c.text ? <Text style={{ color: tinta, fontSize: 8.5 * u, fontWeight: '700' }}>{c.text}</Text> : null}
        {(c.items ?? []).map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 3 * u, alignItems: 'flex-start' }}>
            <View style={{ width: 6.5 * u, height: 6.5 * u, marginTop: u, borderWidth: Math.max(0.5, 0.6 * u), borderColor: tinta, borderRadius: 1.2 * u, backgroundColor: r.done ? tinta : 'transparent' }} />
            <Text style={{ flex: 1, color: tinta, fontSize: 7 * u, textDecorationLine: r.done ? 'line-through' : 'none', opacity: r.done ? 0.6 : 1 }}>{r.text}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (e.type === 'timeline') {
    return (
      <View style={[styles.lleno, { paddingVertical: 4 * u, paddingLeft: 12 * u, paddingRight: 4 * u, justifyContent: 'space-around', overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', left: 6 * u, top: 4 * u, bottom: 4 * u, width: 0.8 * u, backgroundColor: tinta, opacity: 0.5 }} />
        {(c.items ?? []).map((r, i) => (
          <View key={i}>
            <View style={{ position: 'absolute', left: -8.4 * u, top: 1.4 * u, width: 5 * u, height: 5 * u, borderRadius: 2.5 * u, backgroundColor: tinta }} />
            <Text style={{ color: tinta, fontSize: 6.5 * u }}>{r.text}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (e.type === 'mood') {
    const carita = CARITAS[c.mood ?? 'happy'];
    return (
      <View style={[styles.lleno, { alignItems: 'center', gap: 3 * u }]}>
        <Svg width={w} height={w} viewBox="0 0 100 100">
          <Path d={CARA} stroke={tinta} strokeWidth={4} fill="none" />
          <Path d={carita.trazo} stroke={tinta} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {carita.relleno ? <Path d={carita.relleno} fill={tinta} /> : null}
        </Svg>
        {c.text ? <Text style={{ color: tinta, fontSize: 11 * u, fontWeight: '600', textAlign: 'center' }}>{c.text}</Text> : null}
      </View>
    );
  }
  if (e.type === 'song') {
    return (
      <View style={[styles.lleno, { backgroundColor: MARCO_POLAROID, borderRadius: 4 * u, padding: 5 * u, justifyContent: 'center', gap: 2 * u }]}>
        <View style={{ flexDirection: 'row', gap: 4 * u, alignItems: 'center' }}>
          <View style={{ width: 14 * u, height: 14 * u, borderRadius: 2 * u, backgroundColor: SIN_FOTO }} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: tinta, fontSize: 6.5 * u, fontWeight: '700' }}>{c.text}</Text>
            <Text numberOfLines={1} style={{ color: tinta, fontSize: 5 * u, opacity: 0.7 }}>{c.who}</Text>
          </View>
        </View>
        <View style={{ height: 1.2 * u, backgroundColor: tinta, opacity: 0.4, width: '38%' }} />
      </View>
    );
  }
  if (e.type === 'date') {
    return (
      <View style={[styles.lleno, styles.centrado, { borderWidth: Math.max(0.5, 0.6 * u), borderStyle: 'dashed', borderColor: tinta, borderRadius: 2 * u, gap: u }]}>
        <Text numberOfLines={1} style={{ color: tinta, fontSize: 9 * u, fontWeight: '700' }}>{fechaLegible(c.date ?? '', idioma).toUpperCase()}</Text>
        {c.place ? <Text numberOfLines={1} style={{ color: tinta, fontSize: 6 * u, opacity: 0.8 }}>{c.place}</Text> : null}
      </View>
    );
  }
  if (e.type === 'stat') {
    const d = fuentes.datos?.get(claveDeDato(c.stat ?? 'booksFinished', c.year ?? null));
    const tinta = e.style.color ?? TINTA_DE_TEXTO;
    return (
      <View style={[styles.lleno, styles.centrado, { gap: 1.5 * u }]}>
        <Text style={{ color: tinta, fontSize: 26 * u, lineHeight: 28 * u, fontWeight: '700' }}>{d?.valor ?? '—'}</Text>
        <Text style={{ color: tinta, fontSize: 8 * u, fontWeight: '600', textAlign: 'center' }}>{d?.etiqueta}</Text>
        {d?.periodo ? <Text style={{ color: tinta, fontSize: 6 * u, opacity: 0.7 }}>{d.periodo}</Text> : null}
      </View>
    );
  }
  if (e.type === 'swatch') {
    const color = (e.style.color ?? MUESTRA_SIN_COLOR).slice(0, 7);
    return (
      <View style={[styles.lleno, { backgroundColor: MARCO_POLAROID, padding: 5 * u, gap: 4 * u }]}>
        <View style={{ flex: 1, backgroundColor: color }} />
        {c.text ? (
          <Text numberOfLines={1} style={{ color: TINTA_DE_TEXTO, fontSize: 9 * u, fontWeight: '700' }}>
            {c.text}
          </Text>
        ) : null}
        <Text style={{ color: TINTA_DE_TEXTO, fontSize: 7 * u, fontWeight: '600', opacity: 0.7 }}>{color.toUpperCase()}</Text>
      </View>
    );
  }
  if (e.type === 'polaroid') {
    const fotos = (c.paths ?? []).map((r) => (r ? fuentes.imagenes.get(r) : undefined));
    if (c.variant === 'film') {
      const ancho = w - 28 * u;
      const alto = ancho * 0.78;
      return (
        <View style={[styles.lleno, { backgroundColor: e.style.color ?? PELICULA, paddingVertical: 7 * u, alignItems: 'center', justifyContent: 'space-between' }]}>
          {[0, 1, 2].map((i) => (
            <Foto key={i} src={fotos[i]} ancho={ancho} alto={alto} />
          ))}
        </View>
      );
    }
    const doble = c.variant === 'double';
    const m = (doble ? 3.5 : 6) * u;
    const cuantas = doble ? 2 : 1;
    const ancho = (w - 2 * m - (cuantas - 1) * m) / cuantas;
    const alto = ancho * (c.variant === 'mini' ? 1.33 : 1);
    const papel = e.style.color ?? MARCO_POLAROID;
    const pie = (doble ? 4.2 : c.variant === 'caption' ? 9 : 7) * u;
    return (
      <View style={styles.lleno}>
        {c.variant === 'stack'
          ? [-6, 4].map((g) => <View key={g} style={[StyleSheet.absoluteFill, { backgroundColor: papel, transform: [{ rotate: `${g}deg` }] }]} />)
          : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: papel, padding: m, paddingBottom: 0 }]}>
          <View style={{ flexDirection: 'row', gap: m }}>
            {Array.from({ length: cuantas }, (_, i) => (
              <Foto key={i} src={fotos[i]} ancho={ancho} alto={alto} />
            ))}
          </View>
          <View style={styles.pie}>
            <Text numberOfLines={2} style={{ fontSize: pie, lineHeight: pie * 1.2, fontStyle: 'italic', color: sobre(papel), textAlign: 'center' }}>
              {c.text}
            </Text>
          </View>
        </View>
        {c.variant === 'tape' ? (
          <View style={{ position: 'absolute', top: -5 * u, left: 30 * u, width: 40 * u, height: 12 * u, backgroundColor: 'rgba(214,210,200,0.7)', transform: [{ rotate: '-4deg' }] }} />
        ) : null}
      </View>
    );
  }
  if (e.type === 'quote') {
    const s = e.style.size ?? 1;
    const color = e.style.color ?? TINTA_DE_TEXTO;
    const quien = [c.who, c.chapter].filter(Boolean).join(', ');
    return (
      <View style={[styles.lleno, { paddingHorizontal: 6 * u, paddingVertical: 5 * u, gap: 2.5 * u, overflow: 'hidden' }]}>
        <Text style={{ fontFamily: SERIFA, fontWeight: '700', fontSize: 22 * s * u, lineHeight: 13 * s * u, height: 11 * s * u, color }}>“</Text>
        <Text style={{ fontFamily: SERIFA, fontStyle: 'italic', fontSize: 7.5 * s * u, lineHeight: 7.5 * s * u * 1.35, color }}>{c.text}</Text>
        {quien ? <Text style={{ fontWeight: '600', fontSize: 5 * s * u, color, opacity: 0.85 }}>{`— ${quien}`}</Text> : null}
        {c.note ? <Text style={{ fontSize: 4.5 * s * u, color, opacity: 0.7 }}>{c.note}</Text> : null}
      </View>
    );
  }
  if (e.type === 'rating') {
    const color = e.style.color ?? TINTA_DE_TEXTO;
    const valor = c.value ?? 0;
    if (c.scale === 'number') {
      return (
        <View style={[styles.lleno, styles.numero]}>
          <Text style={{ fontWeight: '700', fontSize: 34 * u, color }}>{String(valor)}</Text>
          <Text style={{ fontWeight: '600', fontSize: 14 * u, color, opacity: 0.7 }}>/10</Text>
        </View>
      );
    }
    const trazo = SIMBOLOS_DE_RATING[c.scale === 'hearts' ? 'hearts' : 'stars'];
    return (
      <View style={[styles.lleno, styles.fila]}>
        {[0, 1, 2, 3, 4].map((i) => {
          const lleno = Math.min(1, Math.max(0, valor - i));
          const clip = `${id}-${i}`.replace(/:/g, '');
          return (
            <Svg key={i} width={18 * u} height={18 * u} viewBox="0 0 100 100">
              <Defs>
                <ClipPath id={clip}>
                  <Rect x="0" y="0" width={100 * lleno} height="100" />
                </ClipPath>
              </Defs>
              <Path d={trazo} fill="none" stroke={color} strokeWidth={5} />
              <Path d={trazo} fill={color} clipPath={`url(#${clip})`} />
            </Svg>
          );
        })}
      </View>
    );
  }
  const libro = c.itemId ? fuentes.libros?.get(c.itemId) : undefined;
  const color = libro?.color ?? '#8C8C8C';
  return (
    <View style={[styles.lleno, { backgroundColor: color, borderRadius: 1.5 * u, overflow: 'hidden', padding: libro?.src ? 0 : 8 * u }]}>
      {libro?.src ? (
        <Image source={{ uri: libro.src }} style={styles.lleno} contentFit="cover" />
      ) : (
        <Text style={{ fontWeight: '700', fontSize: 11 * u, color: sobre(color) }} numberOfLines={6}>
          {libro?.title}
        </Text>
      )}
    </View>
  );
}
