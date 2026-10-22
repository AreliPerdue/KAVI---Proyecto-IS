import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReaderEngine, type ReaderEngineHandle } from '@/components/library/reader-engine';
import { AppText, ErrorState, IconButton, LoadingState } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useFuentesDeLienzos } from '@/hooks/use-canvas-sources';
import { useCanvases } from '@/hooks/use-canvases';
import { useLibraryItem } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { aMotor } from '@/lib/library/canvas';
import { paginasEnOrden, paraHojear, portadaValida, tapasDe } from '@/lib/library/journal';
import type { FondoDePagina, MensajeDelMotor } from '@/lib/library/reader-protocol';

/**
 * Hojear un Journal (13h, RF-CC4; 13i; T347): todas sus páginas en libro real, como un libro de la biblioteca. El motor
 * arma tantas páginas en blanco como lienzos tenga y pinta cada uno en la suya, bloqueado: aquí se ve, no se edita
 * (en libro real lo pegado no se mueve). Para cambiar una página se abre desde el Journal. Abre con la portada y
 * cierra con la contraportada, con su material y lo decorado (T346).
 */
export default function JournalFlipScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const tx = useT();
  const j = tx.library.journal;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pieza = useLibraryItem(id);
  const lienzos = useCanvases(id);
  const motor = useRef<ReaderEngineHandle>(null);
  const [abierto, setAbierto] = useState(false);

  const paginas = paginasEnOrden(lienzos.data ?? []);
  // Abre y cierra con sus tapas, con su material y lo decorado (T346).
  const tapas = tapasDe(lienzos.data ?? []);
  const portada = pieza.data ? portadaValida(pieza.data.journal) : null;
  const { doc, fondos } = paraHojear(paginas, portada ? { portada, front: tapas.front, back: tapas.back } : undefined);
  const fuentes = useFuentesDeLienzos(doc.elements).motor;
  // Lo recortado de las tapas deja ver las hojas, de su color (T348).
  const enMotor = aMotor(doc, fuentes, portada?.edges);

  // Abrir el Journal una vez que se sabe su forma y cuántas páginas tiene.
  const orientacion = portada?.orientation ?? null;
  const cuantas = lienzos.data && portada ? doc.pages : null;
  useEffect(() => {
    if (!orientacion || !cuantas) return;
    motor.current?.send({ type: 'openCanvas', orientation: orientacion, pages: cuantas, mode: 'book' });
  }, [orientacion, cuantas]);

  useEffect(() => {
    if (abierto) motor.current?.send({ type: 'annotations', items: enMotor });
  }, [abierto, enMotor]);
  const claveFondos = JSON.stringify(fondos);
  useEffect(() => {
    if (abierto) motor.current?.send({ type: 'canvasBackground', color: null, pages: JSON.parse(claveFondos) as Record<string, FondoDePagina> });
  }, [abierto, claveFondos]);

  const alMensaje = (m: MensajeDelMotor) => {
    if (m.type === 'opened') setAbierto(true);
  };
  const volver = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/(app)/journal/[id]', params: { id } }));
  const icono = (Icono: typeof ChevronLeft) => <Icono size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />;
  const error = (pieza.isError && !pieza.data) || (lienzos.isError && !lienzos.data);

  return (
    <View style={[styles.pantalla, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={[styles.barra, { borderBottomColor: theme.border }]}>
        <IconButton label={tx.common.back} onPress={volver}>
          {icono(ChevronLeft)}
        </IconButton>
        <AppText variant="bodyStrong" numberOfLines={1} style={styles.titulo} accessibilityRole="header">
          {pieza.data?.title ?? ''}
        </AppText>
      </View>
      {error ? (
        <ErrorState message={j.pagesError} onRetry={() => void Promise.all([pieza.refetch(), lienzos.refetch()])} />
      ) : (
        <View style={styles.libro}>
          <ReaderEngine ref={motor} onMessage={alMensaje} />
          {!abierto ? (
            <View style={[styles.cubre, { backgroundColor: theme.background }]}>
              <LoadingState label={j.flipLoading} />
            </View>
          ) : null}
        </View>
      )}
      <View style={[styles.abajo, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: insets.bottom + Spacing.sm }]}>
        <IconButton label={j.previous} onPress={() => motor.current?.send({ type: 'turn', step: -1 })} disabled={!abierto}>
          {icono(ChevronLeft)}
        </IconButton>
        <IconButton label={j.next} onPress={() => motor.current?.send({ type: 'turn', step: 1 })} disabled={!abierto}>
          {icono(ChevronRight)}
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  barra: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  titulo: { flex: 1, paddingRight: 44, textAlign: 'center' },
  libro: { flex: 1 },
  cubre: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center' },
  abajo: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.xs },
});
