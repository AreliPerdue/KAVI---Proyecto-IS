import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { AppText } from '@/components/ui';
import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { luminance } from '@/lib/color';

type Props = {
  /** 0–1: dónde va la lectura. */
  fraction: number;
  /** Cómo se dice un punto del libro: "p. 120 de 340" o "35 %". */
  etiqueta: (fraction: number) => string;
  /** Al soltar: ir a ese punto. */
  onJump: (fraction: number) => void;
  /** Para el lector de pantalla. */
  a11yLabel: string;
  /** Un paso de las acciones de accesibilidad (una página, o 2 % en EPUB). */
  paso: number;
  /** Algo más junto a la etiqueta, discreto: el tiempo leído (RF-BR11). */
  nota?: string;
  /** Por dónde van los demás del club (13f, RF-BC9; T308): su inicial en su color, sobre la barra. */
  marcas?: readonly { id: string; fraction: number; color: string; inicial: string; nombre: string }[];
};

/**
 * La barra delgada de abajo del lector (RF-BR10): dice dónde va la lectura y deja saltar tocando o
 * arrastrando. Mientras se arrastra, el texto muestra a dónde se va a ir; al soltar, se va.
 */
export function ReaderProgress({ fraction, etiqueta, onJump, a11yLabel, paso, nota, marcas }: Props) {
  const theme = useTheme();
  const [ancho, setAncho] = useState(0);
  const [arrastre, setArrastre] = useState<number | null>(null);
  const visible = arrastre ?? fraction;

  const aFraccion = (x: number) => (ancho > 0 ? Math.min(Math.max(x / ancho, 0), 1) : 0);
  const gesto = Gesture.Exclusive(
    Gesture.Pan()
      .runOnJS(true)
      .minDistance(2)
      .onUpdate((e) => setArrastre(aFraccion(e.x)))
      .onEnd((e) => {
        setArrastre(null);
        onJump(aFraccion(e.x));
      })
      .onFinalize(() => setArrastre(null)),
    Gesture.Tap()
      .runOnJS(true)
      .onEnd((e) => onJump(aFraccion(e.x))),
  );

  return (
    <View style={styles.contenedor}>
      <AppText variant="caption" color={arrastre === null ? 'textSecondary' : 'text'} tabular style={styles.texto}>
        {arrastre === null && nota ? `${etiqueta(visible)} · ${nota}` : etiqueta(visible)}
      </AppText>
      <GestureDetector gesture={gesto}>
        <View
          style={styles.zona}
          onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={a11yLabel}
          accessibilityValue={{ text: etiqueta(fraction) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => onJump(Math.min(Math.max(fraction + (e.nativeEvent.actionName === 'increment' ? paso : -paso), 0), 1))}>
          <View style={[styles.riel, { backgroundColor: theme.surfaceAlt }]}>
            <View style={[styles.relleno, { width: `${visible * 100}%`, backgroundColor: theme.ink }]} />
          </View>
          {(marcas ?? []).map((m) => (
            <View
              key={m.id}
              pointerEvents="none"
              accessible
              accessibilityLabel={m.nombre}
              style={[styles.marca, { left: `${Math.min(1, Math.max(0, m.fraction)) * 100}%`, backgroundColor: m.color, borderColor: theme.background }]}>
              <AppText variant="caption" style={[styles.inicial, { color: letraSobre(m.color) }]}>
                {m.inicial}
              </AppText>
            </View>
          ))}
          <View style={[styles.perilla, { left: `${visible * 100}%`, backgroundColor: theme.ink, borderColor: theme.background }]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const PERILLA = 14;
const MARCA = 22;

/** Letra clara u oscura según el color de la persona. */
const letraSobre = (hex: string) => (luminance(hex) > 0.18 ? '#131313' : '#F2F2F2');

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  texto: { textAlign: 'center' },
  // La zona tocable es alta aunque el riel sea delgado (kavi-design: mínimo 44/48).
  zona: { height: MinTouchTarget, justifyContent: 'center' },
  riel: { height: 4, borderRadius: Radius.full, overflow: 'hidden' },
  relleno: { height: '100%' },
  // Arriba del riel, para no taparse con la perilla.
  marca: {
    position: 'absolute',
    top: -3,
    width: MARCA,
    height: MARCA,
    marginLeft: -MARCA / 2,
    borderRadius: MARCA / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicial: { fontWeight: '700' },
  perilla: {
    position: 'absolute',
    width: PERILLA,
    height: PERILLA,
    marginLeft: -PERILLA / 2,
    borderRadius: PERILLA / 2,
    borderWidth: 2,
  },
});
