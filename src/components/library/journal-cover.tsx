import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CanvasPreview, type FuentesDeMiniatura } from '@/components/library/canvas-preview';
import { TEXTURAS } from '@/constants/journal-materials';
import { Radius } from '@/constants/theme';
import { type DocumentoDeLienzo, RAIZ_DE_DOS } from '@/lib/library/canvas';
import { contraportada, type Material, type PortadaDeJournal } from '@/lib/library/journal';

export type CaraDeJournal = 'front' | 'spine' | 'back';

/**
 * Un Journal como objeto (spec 13i, RF-JC3 – RF-JC9; T345): su portada, su lomo o su contraportada, con la textura del
 * material teñida del color elegido (`soft-light`: conserva el relieve) y la encuadernación a la vista. Una sola lógica
 * para las cuatro (RF-JC4); lo que cambia es cómo se ve:
 * - **Tapa dura:** un poco más grande que las páginas (asoman los cantos), bisagra marcada y esquinas definidas.
 * - **Tapa blanda:** al ras de las páginas, con un pliegue suave.
 * - **Espiral:** perforaciones y el espiral del color del metal; su lomo es el espiral.
 * - **Cosida:** el hilo a la vista en el borde (y en el lomo), del color elegido.
 * El borde encuadernado va a la izquierda (RF-JC6); en la contraportada, a la derecha.
 */
export const JournalCover = memo(function JournalCover({
  portada,
  cara = 'front',
  ancho,
  alto,
  etiqueta,
  comoLibro = false,
  decoracion,
}: {
  portada: PortadaDeJournal;
  cara?: CaraDeJournal;
  /** Ancho de la portada (o grosor del lomo). */
  ancho: number;
  /** Alto del lomo (en la portada sale de la forma A5). */
  alto?: number;
  etiqueta?: string;
  /**
   * En la librería se ve como los demás libros: llena su caja (`ancho` × `alto`), con sus esquinas y sin el canto de
   * las páginas asomando. El espiral se recorta en el borde.
   */
  comoLibro?: boolean;
  /** Lo decorado en esta cara (13i, RF-JC10; T346): va sobre el material y debajo del espiral o el hilo. */
  decoracion?: { doc: DocumentoDeLienzo; fuentes: FuentesDeMiniatura } | null;
}) {
  // Una medida que aún no llega (0 o negativa) no debe dibujar nada al revés.
  ancho = Math.max(1, ancho);
  const vertical = portada.orientation === 'portrait';
  const altoTapa = cara === 'spine' ? (alto ?? ancho * 4) : comoLibro && alto ? Math.max(1, alto) : ancho * (vertical ? RAIZ_DE_DOS : 1 / RAIZ_DE_DOS);
  const { material, color } = cara === 'back' ? contraportada(portada) : portada;
  const dura = portada.binding === 'hardcover';
  const radio = comoLibro ? Radius.sm : dura ? 3 : 1.5;
  const atras = cara === 'back';

  return (
    <View
      accessible={!!etiqueta}
      accessibilityRole={etiqueta ? 'image' : undefined}
      accessibilityLabel={etiqueta}
      style={[{ width: ancho, height: altoTapa }, comoLibro ? [styles.comoLibro, { borderRadius: radio }] : null]}>
      {/* Tapa dura: el bloque de páginas asoma con su canto (no en la librería, donde se ve como un libro). */}
      {dura && cara !== 'spine' && !comoLibro ? (
        <View style={[styles.lleno, { top: 3, bottom: -3, [atras ? 'left' : 'right']: -3, [atras ? 'right' : 'left']: 3, backgroundColor: portada.edges, borderRadius: 1 }]}>
          <View style={[styles.lleno, styles.lineasDeCanto]} />
        </View>
      ) : null}
      <CapaDeMaterial material={material} color={color} radio={radio} />
      {decoracion?.doc.elements.length ? (
        // La cara mide A5; en la librería, la caja de un libro es un poco más alta: va al centro.
        <View pointerEvents="none" style={[styles.lleno, styles.centro]}>
          <CanvasPreview
            doc={decoracion.doc}
            orientacion={portada.orientation}
            ancho={ancho}
            fuentes={decoracion.fuentes}
            proporcion={cara === 'spine' ? altoTapa / ancho : vertical ? RAIZ_DE_DOS : 1 / RAIZ_DE_DOS}
            sinPapel
            papel={portada.edges}
          />
        </View>
      ) : null}
      {cara === 'spine' ? <Lomo portada={portada} alto={altoTapa} ancho={ancho} /> : <Borde portada={portada} ancho={ancho} alto={altoTapa} atras={atras} />}
    </View>
  );
});

/**
 * La textura del material, teñida de su color. Es `Image` de React Native y no `expo-image` (kavi-dev §3): la textura
 * se repite en mosaico (`resizeMode="repeat"`), que `expo-image` no hace.
 */
function CapaDeMaterial({ material, color, radio }: { material: Material; color: string; radio: number }) {
  return (
    <View style={[styles.lleno, { backgroundColor: color, borderRadius: radio, overflow: 'hidden' }]}>
      <Image source={TEXTURAS[material]} resizeMode="repeat" style={[styles.lleno, styles.textura]} />
      {/* Un poco de luz arriba y sombra abajo: el material se siente como objeto. */}
      <View style={[styles.lleno, styles.volumen]} />
    </View>
  );
}

/** El borde encuadernado de la portada (izquierda) o de la contraportada (derecha). */
function Borde({ portada, ancho, alto, atras }: { portada: PortadaDeJournal; ancho: number; alto: number; atras: boolean }) {
  const lado = atras ? 'right' : 'left';
  if (portada.binding === 'hardcover') {
    return (
      <>
        <View style={[styles.bisagra, { [lado]: ancho * 0.07 }]} />
        <View style={[styles.brillo, { [lado]: ancho * 0.07 + 2 }]} />
      </>
    );
  }
  if (portada.binding === 'paperback') return <View style={[styles.pliegue, { [lado]: ancho * 0.045 }]} />;
  if (portada.binding === 'sewn') return <Puntadas color={portada.accent} alto={alto} x={ancho * 0.05} lado={lado} />;
  // Espiral: perforaciones y la vuelta de metal que sale por el borde.
  const vueltas = Math.max(6, Math.round(alto / 14));
  const paso = alto / vueltas;
  const r = Math.max(1.5, ancho * 0.012);
  const x = atras ? ancho - ancho * 0.06 : ancho * 0.06;
  const afuera = atras ? ancho + ancho * 0.03 : -ancho * 0.03;
  const d = Array.from({ length: vueltas }, (_, i) => {
    const y = paso * (i + 0.5);
    return `M${x} ${y} C${(x + afuera) / 2} ${y - paso * 0.45} ${afuera} ${y - paso * 0.2} ${afuera} ${y + paso * 0.15}`;
  }).join(' ');
  return (
    <>
      {Array.from({ length: vueltas }, (_, i) => (
        <View key={i} style={[styles.perforacion, { width: r * 2, height: r * 2, borderRadius: r, top: paso * (i + 0.5) - r, left: x - r }]} />
      ))}
      {/* El espiral sale un poco por el borde: va en una caja más ancha que la tapa, con su medida exacta. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: atras ? 0 : -ancho * 0.05, width: ancho * 1.05, height: Math.max(1, alto) }}>
        <Svg width={ancho * 1.05} height={Math.max(1, alto)}>
          <Path d={d} stroke={portada.accent} strokeWidth={Math.max(1.2, ancho * 0.012)} fill="none" strokeLinecap="round" transform={atras ? undefined : `translate(${ancho * 0.05} 0)`} />
        </Svg>
      </View>
    </>
  );
}

/** El lomo: bisagras (tapa dura), el hilo (cosida) o el espiral sobre los cantos (espiral, sin lomo de tela). */
function Lomo({ portada, ancho, alto }: { portada: PortadaDeJournal; ancho: number; alto: number }) {
  if (portada.binding === 'spiral') {
    const vueltas = Math.max(6, Math.round(alto / 14));
    const paso = alto / vueltas;
    return (
      <View style={[styles.lleno, { backgroundColor: portada.edges, borderRadius: 1.5, overflow: 'hidden' }]}>
        <View style={[styles.lleno, styles.lineasDeCanto]} />
        <Svg width={Math.max(1, ancho)} height={Math.max(1, alto)}>
          <Path
            d={Array.from({ length: vueltas }, (_, i) => `M${ancho * 0.1} ${paso * (i + 0.2)} Q${ancho * 0.5} ${paso * (i + 0.85)} ${ancho * 0.9} ${paso * (i + 0.2)}`).join(' ')}
            stroke={portada.accent}
            strokeWidth={Math.max(1.5, ancho * 0.08)}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </View>
    );
  }
  if (portada.binding === 'sewn') return <Puntadas color={portada.accent} alto={alto} x={ancho / 2} lado="left" />;
  if (portada.binding === 'hardcover') {
    return (
      <>
        <View style={[styles.bisagra, { left: ancho * 0.12 }]} />
        <View style={[styles.bisagra, { right: ancho * 0.12 }]} />
      </>
    );
  }
  return null;
}

/** Puntadas de hilo a lo largo, a `x` del borde. */
function Puntadas({ color, alto, x, lado }: { color: string; alto: number; x: number; lado: 'left' | 'right' }) {
  const largo = 7;
  const n = Math.max(4, Math.floor((alto - 10) / (largo + 5)));
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={[styles.puntada, { backgroundColor: color, height: largo, top: 5 + i * (largo + 5), [lado]: x - 1 }]} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  comoLibro: { overflow: 'hidden', borderCurve: 'continuous' },
  centro: { justifyContent: 'center', alignItems: 'center' },
  lleno: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  textura: { width: '100%', height: '100%', mixBlendMode: 'soft-light' },
  volumen: { experimental_backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(0,0,0,0.12))' },
  lineasDeCanto: { experimental_backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.08), rgba(0,0,0,0) 40%, rgba(0,0,0,0.06))' },
  bisagra: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(0,0,0,0.28)' },
  brillo: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  pliegue: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.14)' },
  perforacion: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.5)' },
  puntada: { position: 'absolute', width: 2, borderRadius: 1 },
});
