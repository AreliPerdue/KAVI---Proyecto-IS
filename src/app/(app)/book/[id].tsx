import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, ChevronLeft, ChevronUp, Search, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReaderEngine, type ReaderEngineHandle } from '@/components/library/reader-engine';
import { ReaderProgress } from '@/components/library/reader-progress';
import { AppText, Button, IconButton } from '@/components/ui';
import { Fonts, IconSize, IconStroke, Radius, Spacing, Typography } from '@/constants/theme';
import { useLibraryFileUrl, useLibraryItem, useSaveReadingPosition } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { cambioDePosicion, type CodigoDeError, type MensajeDelMotor, posicionGuardada } from '@/lib/library/reader-protocol';

/** Cuánto se espera sin moverse antes de guardar la posición: así no se escribe en cada página. */
const GUARDAR_MS = 1200;

type Posicion = Extract<MensajeDelMotor, { type: 'position' }>;

/**
 * El lector de KAVI Library (spec 13b, T279): PDF y EPUB en scroll, con su avance guardado, la barra
 * para saltar y la búsqueda dentro del libro. El libro lo pinta el motor web (`public/reader/`), en
 * un WebView en el teléfono y en un iframe en la web.
 */
export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tx = useT();
  const l = tx.library;
  const r = l.reader;

  const item = useLibraryItem(id);
  const ruta = item.data ? (item.data.pdf_path ?? item.data.file_path) : null;
  const url = useLibraryFileUrl(ruta);
  const guardar = useSaveReadingPosition();

  const motor = useRef<ReaderEngineHandle>(null);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<CodigoDeError | null>(null);
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [resultado, setResultado] = useState<{ count: number; index: number; searching: boolean } | null>(null);

  // Abrir una sola vez por dirección firmada, en el lugar donde se quedó (RF-BL17).
  const abiertoCon = useRef<string | null>(null);
  useEffect(() => {
    const pieza = item.data;
    if (!pieza || !url.data || abiertoCon.current === url.data) return;
    abiertoCon.current = url.data;
    motor.current?.send({ type: 'open', format: pieza.kind === 'epub' ? 'epub' : 'pdf', url: url.data, position: posicionGuardada(pieza) });
  }, [item.data, url.data]);

  // Guardar la posición cuando la lectura se detiene, y al salir lo que haya quedado pendiente.
  const pendiente = useRef<{ timer: ReturnType<typeof setTimeout>; guardar: () => void } | null>(null);
  useEffect(
    () => () => {
      if (!pendiente.current) return;
      clearTimeout(pendiente.current.timer);
      pendiente.current.guardar();
    },
    [],
  );

  const alMensaje = (m: MensajeDelMotor) => {
    switch (m.type) {
      case 'opened':
        setAbierto(true);
        setError(null);
        return;
      case 'position': {
        setPosicion(m);
        if (pendiente.current) clearTimeout(pendiente.current.timer);
        const hacer = () => {
          pendiente.current = null;
          guardar.mutate({ id, patch: cambioDePosicion(m) });
        };
        pendiente.current = { timer: setTimeout(hacer, GUARDAR_MS), guardar: hacer };
        return;
      }
      case 'search':
        setResultado({ count: m.count, index: m.index, searching: !!m.searching });
        return;
      case 'error':
        setError(m.code);
        return;
    }
  };

  const reintentar = () => {
    setError(null);
    setAbierto(false);
    abiertoCon.current = null;
    void url.refetch();
  };

  const esEpub = item.data?.kind === 'epub';
  const total = posicion?.total ?? 0;
  const porPagina = !esEpub && total > 1;
  // En PDF la barra va de la primera a la última página: su punto y su etiqueta salen de la misma
  // cuenta, para que "p. 4" en el texto sea la página 4 de verdad. En EPUB, la fracción del motor.
  const paginaEn = (f: number) => Math.min(total, Math.max(1, Math.round(f * (total - 1)) + 1));
  const fraccion = porPagina ? ((posicion?.page ?? 1) - 1) / (total - 1) : (posicion?.fraction ?? item.data?.progress ?? 0);
  const etiqueta = (f: number) => (porPagina ? l.progressPage(paginaEn(f), total) : l.progressPercent(Math.round(f * 100)));
  const saltar = (f: number) => motor.current?.send(porPagina ? { type: 'goTo', page: paginaEn(f) } : { type: 'goTo', fraction: f });

  const cerrarBusqueda = () => {
    setBuscando(false);
    setConsulta('');
    setResultado(null);
    motor.current?.send({ type: 'searchClear' });
  };

  const sinArchivo = item.isSuccess && !ruta;
  const mensajeError = sinArchivo
    ? r.noFile
    : error === 'password'
      ? r.errorPassword
      : error === 'damaged'
        ? r.errorDamaged
        : error === 'network' || url.isError
          ? r.errorNetwork
          : error
            ? r.errorUnknown
            : null;

  return (
    <View style={[styles.pantalla, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {buscando ? (
        <View style={styles.barra}>
          <View style={[styles.campo, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Search size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
            <TextInput
              autoFocus
              value={consulta}
              onChangeText={setConsulta}
              onSubmitEditing={() => motor.current?.send({ type: 'search', query: consulta })}
              placeholder={r.searchPlaceholder}
              placeholderTextColor={theme.textTertiary}
              returnKeyType="search"
              accessibilityLabel={r.search}
              style={[styles.entrada, { color: theme.text }]}
            />
            {resultado ? (
              <AppText variant="caption" color="textSecondary" tabular numberOfLines={1} style={styles.contador}>
                {resultado.searching ? r.searching : resultado.count === 0 ? r.searchNone : r.searchCount(resultado.index + 1, resultado.count)}
              </AppText>
            ) : null}
          </View>
          <IconButton label={r.previous} onPress={() => motor.current?.send({ type: 'searchStep', step: -1 })} disabled={!resultado?.count}>
            <ChevronUp size={IconSize.action} strokeWidth={IconStroke} color={resultado?.count ? theme.text : theme.textTertiary} />
          </IconButton>
          <IconButton label={r.next} onPress={() => motor.current?.send({ type: 'searchStep', step: 1 })} disabled={!resultado?.count}>
            <ChevronDown size={IconSize.action} strokeWidth={IconStroke} color={resultado?.count ? theme.text : theme.textTertiary} />
          </IconButton>
          <IconButton label={r.closeSearch} onPress={cerrarBusqueda}>
            <X size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
        </View>
      ) : (
        <View style={styles.barra}>
          <IconButton label={tx.common.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/library'))}>
            <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.titulo}>
            {item.data?.title ?? ''}
          </AppText>
          <IconButton label={r.search} onPress={() => setBuscando(true)} disabled={!abierto}>
            <Search size={IconSize.action} strokeWidth={IconStroke} color={abierto ? theme.text : theme.textTertiary} />
          </IconButton>
        </View>
      )}

      <View style={styles.libro}>
        {!sinArchivo ? <ReaderEngine ref={motor} onMessage={alMensaje} /> : null}
        {!abierto && !mensajeError ? (
          <View style={[styles.capa, { backgroundColor: theme.background }]}>
            <ActivityIndicator color={theme.textSecondary} />
            <AppText variant="label" color="textSecondary">
              {r.opening}
            </AppText>
          </View>
        ) : null}
        {mensajeError ? (
          <View style={[styles.capa, { backgroundColor: theme.background }]} accessibilityRole="alert">
            <AppText variant="body" style={styles.centrado}>
              {mensajeError}
            </AppText>
            {!sinArchivo && error !== 'password' && error !== 'damaged' ? <Button title={r.retry} variant="secondary" onPress={reintentar} /> : null}
          </View>
        ) : null}
      </View>

      {abierto ? (
        <View style={{ paddingBottom: insets.bottom + Spacing.xs }}>
          <ReaderProgress
            fraction={fraccion}
            etiqueta={etiqueta}
            onJump={saltar}
            a11yLabel={r.progressA11y(etiqueta(fraccion))}
            paso={porPagina ? 1 / (total - 1) : 0.02}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  barra: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xs },
  titulo: { flex: 1, textAlign: 'center' },
  campo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  entrada: { flex: 1, minWidth: 0, ...Typography.body, fontFamily: Fonts?.sans, paddingVertical: Spacing.sm },
  contador: { flexShrink: 0 },
  libro: { flex: 1 },
  capa: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  centrado: { textAlign: 'center' },
});
