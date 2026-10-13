import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BookOpen, ChevronDown, ChevronLeft, ChevronUp, GalleryHorizontal, Rows3, Search, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReaderEngine, type ReaderEngineHandle } from '@/components/library/reader-engine';
import { ReaderProgress } from '@/components/library/reader-progress';
import { AppText, Button, IconButton, Segmented, Sheet } from '@/components/ui';
import { Fonts, IconSize, IconStroke, Radius, Spacing, Typography } from '@/constants/theme';
import { usePantallaCompleta } from '@/hooks/use-full-screen';
import { useLibraryFileUrl, useLibraryItem, useLibraryItems, useSaveReadingPosition, useSeries } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { cambioDePosicion, type CodigoDeError, type MensajeDelMotor, posicionGuardada } from '@/lib/library/reader-protocol';
import { FORMA_POR_OMISION, type FormaDeLeer } from '@/lib/library/reading-mode';
import { etiquetaDeSaga, siguienteDeSaga } from '@/lib/library/series';
import { usePreferencesStore } from '@/store/preferences-store';

/** Cuánto se espera sin moverse antes de guardar la posición: así no se escribe en cada página. */
const GUARDAR_MS = 1200;

type Posicion = Extract<MensajeDelMotor, { type: 'position' }>;

/**
 * El lector de KAVI Library (spec 13b, T279): PDF y EPUB, con su avance guardado, la barra para saltar y
 * la búsqueda dentro del libro. El libro lo pinta el motor web (`public/reader/`), en un WebView en el
 * teléfono y en un iframe en la web.
 *
 * Formas de leer (T283, T284; RF-BR5 – RF-BR8): scroll, páginas de lado o libro real, recordada por libro
 * en el dispositivo. Cambiarla no mueve el lugar. Fuera del scroll, el toque en el centro muestra u oculta
 * los controles (RF-BR7b). El libro real va a pantalla completa y arranca sin controles: solo el libro.
 */
export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Una pieza nueva arranca de cero (motor, posición, aviso del siguiente): al pasar al siguiente de
  // la saga se reemplaza la ruta y Expo Router puede reutilizar el componente.
  return <Lector key={id} id={id} />;
}

function Lector({ id }: { id: string }) {
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
  const todas = useLibraryItems();
  const sagas = useSeries();
  // Al terminar un libro de una saga, una vez por apertura, se ofrece el siguiente (RF-BL26).
  const [ofrecerSiguiente, setOfrecerSiguiente] = useState<'pendiente' | 'visible' | 'cerrado'>('pendiente');

  const motor = useRef<ReaderEngineHandle>(null);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<CodigoDeError | null>(null);
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [resultado, setResultado] = useState<{ count: number; index: number; searching: boolean } | null>(null);

  const forma = usePreferencesStore((s) => s.readingModes[id] ?? FORMA_POR_OMISION);
  const setForma = usePreferencesStore((s) => s.setReadingMode);
  const [eligiendoForma, setEligiendoForma] = useState(false);
  // El libro real arranca solo con el libro; las otras, con los controles a la vista.
  const [ocultos, setOcultos] = useState(forma === 'book');

  // Abrir una sola vez por dirección firmada, en el lugar donde se quedó (RF-BL17).
  const abiertoCon = useRef<string | null>(null);
  useEffect(() => {
    const pieza = item.data;
    if (!pieza || !url.data || abiertoCon.current === url.data) return;
    abiertoCon.current = url.data;
    motor.current?.send({ type: 'open', format: pieza.kind === 'epub' ? 'epub' : 'pdf', url: url.data, position: posicionGuardada(pieza), mode: forma });
    // La forma con que se abre es la de ese momento; los cambios después van por `mode` (abajo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.data, url.data]);

  // Cambiar de forma con el libro abierto: el motor se queda en el mismo lugar (RF-BR8).
  const formaEnMotor = useRef(forma);
  useEffect(() => {
    if (!abierto || formaEnMotor.current === forma) return;
    formaEnMotor.current = forma;
    motor.current?.send({ type: 'mode', mode: forma });
  }, [abierto, forma]);

  // En la web, las flechas también pasan de página cuando el foco está fuera del libro (RF-BR7b); con el
  // foco dentro, las atiende el motor.
  useEffect(() => {
    if (Platform.OS !== 'web' || forma === 'scroll') return;
    const alTeclear = (e: KeyboardEvent) => {
      const destino = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || destino?.closest?.('input, textarea, [contenteditable="true"]')) return;
      const adelante = e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey);
      const atras = e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey);
      if (!adelante && !atras) return;
      e.preventDefault();
      motor.current?.send({ type: 'turn', step: adelante ? 1 : -1 });
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [forma]);

  const elegirForma = (nueva: FormaDeLeer) => {
    setForma(id, nueva);
    setOcultos(nueva === 'book');
    if (nueva === 'book') setEligiendoForma(false);
  };

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
        if (cambioDePosicion(m).progress >= 1 && ofrecerSiguiente === 'pendiente') setOfrecerSiguiente('visible');
        return;
      }
      case 'search':
        setResultado({ count: m.count, index: m.index, searching: !!m.searching });
        return;
      case 'tap':
        setOcultos((o) => !o);
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
  // Con dos páginas a la vista (libro real), "pp. 2–3 de 340" mientras no se arrastre la barra.
  const etiqueta = (f: number) =>
    porPagina && forma === 'book' && f === fraccion && posicion?.pageEnd
      ? l.progressPages(posicion.page ?? 1, posicion.pageEnd, total)
      : porPagina
        ? l.progressPage(paginaEn(f), total)
        : l.progressPercent(Math.round(f * 100));
  const saltar = (f: number) => motor.current?.send(porPagina ? { type: 'goTo', page: paginaEn(f) } : { type: 'goTo', fraction: f });

  const cerrarBusqueda = () => {
    setBuscando(false);
    setConsulta('');
    setResultado(null);
    motor.current?.send({ type: 'searchClear' });
  };

  const siguiente = item.data && ofrecerSiguiente === 'visible' ? siguienteDeSaga(item.data, todas.data ?? []) : null;
  const nombreSaga = siguiente?.series_id ? (sagas.data ?? []).find((x) => x.id === siguiente.series_id)?.name : undefined;

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

  // En scroll los controles siempre se ven: no hay centro que tocar para traerlos. Mientras abre o si
  // falla, tampoco se esconden: tiene que quedar cómo salir.
  const controles = forma === 'scroll' || !ocultos || buscando || !abierto || !!mensajeError;
  const pantallaCompleta = forma === 'book' && abierto && !mensajeError;
  usePantallaCompleta(pantallaCompleta);

  return (
    <View style={[styles.pantalla, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <StatusBar hidden={pantallaCompleta} />
      {!controles ? null : buscando ? (
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
          <IconButton label={r.mode} onPress={() => setEligiendoForma(true)} disabled={!abierto}>
            {forma === 'book' ? (
              <BookOpen size={IconSize.action} strokeWidth={IconStroke} color={abierto ? theme.text : theme.textTertiary} />
            ) : forma === 'paged' ? (
              <GalleryHorizontal size={IconSize.action} strokeWidth={IconStroke} color={abierto ? theme.text : theme.textTertiary} />
            ) : (
              <Rows3 size={IconSize.action} strokeWidth={IconStroke} color={abierto ? theme.text : theme.textTertiary} />
            )}
          </IconButton>
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

      {siguiente && nombreSaga ? (
        <View style={[styles.siguiente, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityRole="alert">
          <AppText variant="bodyStrong">{l.series.nextTitle}</AppText>
          <AppText variant="body" color="textSecondary" numberOfLines={2}>
            {l.series.nextBody(etiquetaDeSaga(nombreSaga, siguiente.series_index), siguiente.title)}
          </AppText>
          <View style={styles.siguienteBotones}>
            <Button title={l.series.nextLater} variant="ghost" onPress={() => setOfrecerSiguiente('cerrado')} />
            <Button title={l.series.nextOpen} onPress={() => router.replace({ pathname: '/(app)/book/[id]', params: { id: siguiente.id } })} />
          </View>
        </View>
      ) : null}

      {abierto && controles ? (
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
      {abierto && !controles ? <View style={{ height: insets.bottom }} /> : null}

      <Sheet visible={eligiendoForma} onClose={() => setEligiendoForma(false)} title={r.mode}>
        <View style={styles.formas}>
          <Segmented<FormaDeLeer>
            fullWidth
            label={r.mode}
            options={[
              { value: 'scroll', label: r.modeScroll },
              { value: 'paged', label: r.modePaged },
              { value: 'book', label: r.modeBook },
            ]}
            value={forma}
            onChange={elegirForma}
          />
          <AppText variant="caption" color="textSecondary">
            {forma === 'scroll' ? r.modeScrollHint : forma === 'book' ? r.modeBookHint : Platform.OS === 'web' ? r.modePagedHintWeb : r.modePagedHint}
          </AppText>
        </View>
      </Sheet>
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
  siguiente: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.lg,
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    boxShadow: '0 4px 16px rgba(22,23,26,0.08)',
  },
  formas: { gap: Spacing.md },
  siguienteBotones: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.sm },
});
