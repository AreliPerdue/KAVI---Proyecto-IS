import { Image } from 'expo-image';
import { memo } from 'react';
import { type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type DocumentoDeLienzo, type OrientacionDeLienzo, RAIZ_DE_DOS } from '@/lib/library/canvas';
import { FORMA_GRIS, PAPEL_DE_LIENZO, TINTA_DE_TEXTO, TRAZOS_DE_FORMA } from '@/lib/library/canvas-shapes';

/** De dónde sale la imagen de cada pieza: ruta de una imagen → dirección; id de un sticker → imagen. */
export type FuentesDeMiniatura = { imagenes: ReadonlyMap<string, string>; stickers: ReadonlyMap<string, string | ImageSourcePropType> };

/**
 * La miniatura de un recorte (spec 13h, RF-CC23; T342): la primera página dibujada en la app a escala, con su fondo y
 * cada pieza en su lugar, tamaño, giro, opacidad y borde. No es la página real (esa la pinta el motor), pero se ve
 * igual a ese tamaño y no hace falta guardar una imagen aparte. El texto que hay dentro es parte del dibujo: no lo lee
 * el lector de pantalla (la tarjeta dice el nombre del recorte) y por eso puede quedar por debajo de 12 px.
 */
export const CanvasPreview = memo(function CanvasPreview({
  doc,
  orientacion,
  ancho,
  fuentes,
}: {
  doc: DocumentoDeLienzo;
  orientacion: OrientacionDeLienzo;
  ancho: number;
  fuentes: FuentesDeMiniatura;
}) {
  const theme = useTheme();
  const alto = ancho * (orientacion === 'landscape' ? 1 / RAIZ_DE_DOS : RAIZ_DE_DOS);
  const W = ancho;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.pagina, { width: ancho, height: alto, backgroundColor: doc.background ?? PAPEL_DE_LIENZO, borderColor: theme.border }]}>
      {doc.elements
        .filter((e) => e.page === 1)
        .map((e) => {
          const w = e.w * W;
          const h = w * e.ar;
          const borde = e.style.border ? { width: e.style.border.width * W, color: e.style.border.color } : null;
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
                    fill={e.style.color ?? FORMA_GRIS}
                    stroke={borde?.color}
                    strokeWidth={borde ? borde.width : 0}
                    vectorEffect="non-scaling-stroke"
                  />
                </Svg>
              </View>
            );
          }
          if (e.type === 'textbox') {
            const tamano = 0.021 * W * (e.style.size ?? 1);
            return (
              <View key={e.id} style={[caja, styles.texto, borde ? { borderWidth: borde.width, borderColor: borde.color } : null]}>
                <Text style={{ fontSize: tamano, lineHeight: tamano * 1.35, color: e.style.color ?? TINTA_DE_TEXTO, paddingHorizontal: tamano * 0.35, paddingVertical: tamano * 0.25 }}>
                  {e.content.text}
                </Text>
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
  texto: { overflow: 'hidden' },
  lleno: { width: '100%', height: '100%' },
});
