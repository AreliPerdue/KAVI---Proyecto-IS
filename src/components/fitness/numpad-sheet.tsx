import { Delete, Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Sheet } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tap } from '@/lib/haptics';
import { useT } from '@/i18n';

export type NumpadField = {
  /** "Serie 2 · Peso" */
  title: string;
  value: number | null;
  /** Lo que suma o resta cada toque de ±. */
  step: number;
  /** Se permiten decimales (peso, RPE); las reps son enteras. */
  decimals: boolean;
  /** Unidad que se muestra junto al número. */
  suffix?: string;
  /** Ofrece el modo contador (reps). */
  counter?: boolean;
  min?: number;
  max?: number;
};

export type NumpadSheetProps = {
  visible: boolean;
  field: NumpadField | null;
  onChange: (value: number | null) => void;
  onClose: () => void;
  /** Pasa al siguiente campo de la serie (peso → reps → RIR). Sin él, solo "Listo". */
  onNext?: () => void;
};

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'borrar'] as const;

function aTexto(v: number | null): string {
  return v === null ? '' : String(v);
}

/**
 * Teclado numérico propio (RF-F28).
 *
 * El del sistema tapa media pantalla y cambia de forma según la plataforma; este es igual
 * en todas, tiene ± para ajustar sin escribir y un **modo contador** —un botón enorme que
 * suma una rep por toque— para contar en vivo sin mirar la pantalla.
 *
 * Cada tecla aplica el valor al momento: no hay "guardar", porque la serie se guarda en la
 * cola local (RF-F17) y equivocarse se corrige con la misma tecla.
 */
export function NumpadSheet({ visible, field, onChange, onClose, onNext }: NumpadSheetProps) {
  if (!field) return null;
  /*
   * El teclado vive en un componente con `key` por campo: al pasar con "Siguiente" de peso
   * a reps se monta uno nuevo con su propio estado, en vez de reiniciar el estado con un
   * efecto. Al cerrarse, el `Modal` de la hoja desmonta el contenido y al reabrir arranca
   * limpio.
   */
  return (
    <Sheet visible={visible} onClose={onClose} title={field.title}>
      <Teclado key={field.title} field={field} onChange={onChange} onClose={onClose} onNext={onNext} />
    </Sheet>
  );
}

function Teclado({ field, onChange, onClose, onNext }: Omit<NumpadSheetProps, 'visible' | 'field'> & { field: NumpadField }) {
  const theme = useTheme();
  const h = useT().fitness.sheets;
  const [texto, setTexto] = useState(() => aTexto(field.value));
  const [contando, setContando] = useState(false);
  /**
   * La primera tecla reemplaza el valor sugerido, como en cualquier calculadora; las
   * siguientes agregan dígitos. Es una bandera y no una comparación con el valor actual:
   * el valor cambia con cada tecla, y compararlo hacía que cada tecla volviera a reemplazar
   * (escribir 1-0-0 dejaba 0).
   */
  const [reemplazar, setReemplazar] = useState(true);

  const acotar = (n: number) => Math.min(field.max ?? Infinity, Math.max(field.min ?? 0, n));

  const aplicar = (nuevo: string) => {
    setTexto(nuevo);
    if (nuevo === '' || nuevo === '.') return onChange(null);
    const n = Number(nuevo);
    if (Number.isFinite(n)) onChange(acotar(n));
  };

  const pulsar = (tecla: (typeof TECLAS)[number]) => {
    tap();
    const base = reemplazar ? '' : texto;
    setReemplazar(false);
    if (tecla === 'borrar') return aplicar(reemplazar ? '' : texto.slice(0, -1));
    if (tecla === '.') {
      if (!field.decimals || base.includes('.')) return;
      return aplicar(base === '' ? '0.' : `${base}.`);
    }
    if (base.replace('.', '').length >= 6) return;
    aplicar(base === '0' ? tecla : base + tecla);
  };

  const sumar = (delta: number) => {
    tap();
    // Ajustar con ± cuenta como empezar a editar: la siguiente tecla agrega, no reemplaza.
    setReemplazar(false);
    const actual = Number(texto) || 0;
    const n = acotar(Math.round((actual + delta) * 100) / 100);
    setTexto(String(n));
    onChange(n);
  };

  return (
    <>
      <View style={[styles.pantalla, { backgroundColor: theme.surfaceAlt }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Restar ${field.step}`} onPress={() => sumar(-field.step)} style={styles.paso} hitSlop={8}>
          <Minus size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </Pressable>
        <View style={styles.valor} accessibilityLiveRegion="polite">
          <AppText variant="display" tabular>
            {texto || '–'}
          </AppText>
          {field.suffix ? (
            <AppText variant="label" color="textSecondary">
              {field.suffix}
            </AppText>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Sumar ${field.step}`} onPress={() => sumar(field.step)} style={styles.paso} hitSlop={8}>
          <Plus size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </Pressable>
      </View>

      {field.counter ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: contando }}
          accessibilityLabel={contando ? h.stopCounting : h.countReps}
          onPress={() => setContando((v) => !v)}
          style={styles.toggleContador}>
          <AppText variant="label" color="textSecondary">
            {contando ? h.backToKeypad : h.counterMode}
          </AppText>
        </Pressable>
      ) : null}

      {contando ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={h.oneMoreRep}
          onPress={() => sumar(1)}
          style={({ pressed }) => [styles.contador, { backgroundColor: pressed ? theme.surfaceAlt : theme.ink }]}>
          {({ pressed }) => (
            <AppText variant="display" color={pressed ? 'text' : 'onInk'}>
              +1
            </AppText>
          )}
        </Pressable>
      ) : (
        <View style={styles.teclado}>
          {TECLAS.map((t) => {
            const deshabilitada = t === '.' && !field.decimals;
            return (
              <Pressable
                key={t}
                accessibilityRole="button"
                accessibilityLabel={t === 'borrar' ? h.backspace : t === '.' ? h.decimalPoint : t}
                disabled={deshabilitada}
                onPress={() => pulsar(t)}
                style={({ pressed }) => [
                  styles.tecla,
                  { backgroundColor: pressed ? theme.border : theme.surfaceAlt, opacity: deshabilitada ? 0.3 : 1 },
                ]}>
                {t === 'borrar' ? (
                  <Delete size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
                ) : (
                  <AppText variant="heading">{t}</AppText>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.acciones}>
        {onNext ? (
          <View style={styles.flex}>
            <Button title={h.next} variant="secondary" onPress={onNext} />
          </View>
        ) : null}
        <View style={styles.flex}>
          <Button title={h.done} onPress={onClose} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  paso: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  valor: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs },
  toggleContador: { alignSelf: 'center', minHeight: 36, justifyContent: 'center', paddingHorizontal: Spacing.md },
  contador: { height: 220, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.xl, borderCurve: 'continuous' },
  teclado: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tecla: {
    width: '31.5%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  acciones: { flexDirection: 'row', gap: Spacing.sm },
  flex: { flex: 1 },
});
