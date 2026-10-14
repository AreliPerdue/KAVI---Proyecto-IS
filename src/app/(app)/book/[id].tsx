import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BookOpen, ChevronDown, ChevronLeft, ChevronUp, GalleryHorizontal, NotebookText, Rows3, Search, Shrink, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnnotationToolbar } from '@/components/library/annotation-toolbar';
import { AnnotationsSheet } from '@/components/library/annotations-sheet';
import { DefineSheet } from '@/components/library/define-sheet';
import { HighlightSheet, type CambioDeSubrayado } from '@/components/library/highlight-sheet';
import { PostitSheet } from '@/components/library/postit-sheet';
import { ReaderEngine, type ReaderEngineHandle } from '@/components/library/reader-engine';
import { ReaderProgress } from '@/components/library/reader-progress';
import { useDuracion } from '@/components/library/reading-summary';
import { ReaderTextPicker } from '@/components/library/reader-text-picker';
import { ReaderThemePicker } from '@/components/library/reader-theme-picker';
import { SelectionBar } from '@/components/library/selection-bar';
import { AppText, Button, IconButton, Segmented, Sheet } from '@/components/ui';
import { Fonts, IconSize, IconStroke, Radius, Spacing, Typography } from '@/constants/theme';
import { useAnnotationEditor, useAnnotations } from '@/hooks/use-annotations';
import { useReadingSessions, useReadingTimer } from '@/hooks/use-reading-sessions';
import { usePantallaCompleta } from '@/hooks/use-full-screen';
import { useLibrarySync } from '@/hooks/use-library-sync';
import { useAbrirCopiaLocal } from '@/hooks/use-local-book';
import { useLibraryFileUrl, useLibraryItem, useLibraryItems, useSaveReadingPosition, useSeries } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { uuidv4 } from '@/lib/gym/ids';
import { colorDeParte } from '@/lib/library/cover/parts';
import {
  ANCHO_DE_POSTIT,
  colorDe,
  coloresRapidos,
  COLOR_DE_POSTIT,
  destinoDe,
  esPegado,
  type EstiloDeSubrayado,
  estiloDe,
  palabraParaDefinir,
  SE_PINTAN,
  textoDe,
  zAlFondo,
  zAlFrente,
  zNueva,
} from '@/lib/library/annotations';
import {
  type AnotacionEnMotor,
  cambioDePosicion,
  type CodigoDeError,
  type Herramienta,
  type MensajeDelMotor,
  posicionGuardada,
} from '@/lib/library/reader-protocol';
import { FORMA_POR_OMISION, type FormaDeLeer } from '@/lib/library/reading-mode';
import { coloresDe } from '@/lib/library/reader-theme';
import { etiquetaDeSaga, siguienteDeSaga } from '@/lib/library/series';
import { useSnackbar } from '@/providers';
import { usePreferencesStore } from '@/store/preferences-store';
import type { LibraryAnnotation, LibraryLocator } from '@/types/domain';

/** Cuánto se espera sin moverse antes de guardar la posición: así no se escribe en cada página. */
const GUARDAR_MS = 1200;

type Posicion = Extract<MensajeDelMotor, { type: 'position' }>;

/**
 * El lector de KAVI Library (spec 13b, T279): PDF y EPUB, con su avance guardado, la barra para saltar y
 * la búsqueda dentro del libro. El libro lo pinta el motor web (`public/reader/`), en un WebView en el
 * teléfono y en un iframe en la web.
 *
 * Sin conexión (T285, RF-BR3): en el teléfono el libro se baja una vez y luego se lee de su copia, con
 * o sin red; el avance leído sin red sube al volver.
 *
 * Formas de leer (T283, T284; RF-BR5 – RF-BR8): scroll, páginas de lado o libro real, recordada por libro
 * en el dispositivo. Cambiarla no mueve el lugar. Fuera del scroll, el toque en el centro muestra u oculta
 * los controles (RF-BR7b). El libro real va a pantalla completa y arranca sin controles: solo el libro.
 *
 * Anotaciones (spec 13c, T286): lo pegado se pinta en la capa del motor; aquí se guarda (primero en la
 * cola del dispositivo), se deshace y se rehace, y abajo están las herramientas: pegar un post-it y, con
 * algo elegido, escribir, traer al frente, mandar atrás, bloquear y quitar. Arriba, el panel de lo anotado.
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
  // En el teléfono el libro sale de su copia local; la dirección firmada solo la usa la web.
  const nativo = Platform.OS !== 'web';
  const url = useLibraryFileUrl(nativo ? null : ruta);
  const abrirCopia = useAbrirCopiaLocal();
  useLibrarySync();
  const guardar = useSaveReadingPosition();
  const todas = useLibraryItems();
  const sagas = useSeries();
  // Al terminar un libro de una saga, una vez por apertura, se ofrece el siguiente (RF-BL26).
  const [ofrecerSiguiente, setOfrecerSiguiente] = useState<'pendiente' | 'visible' | 'cerrado'>('pendiente');

  const motor = useRef<ReaderEngineHandle>(null);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<CodigoDeError | 'offline' | null>(null);
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [resultado, setResultado] = useState<{ count: number; index: number; searching: boolean } | null>(null);

  const forma = usePreferencesStore((s) => s.readingModes[id] ?? FORMA_POR_OMISION);
  const setForma = usePreferencesStore((s) => s.setReadingMode);
  const [eligiendoForma, setEligiendoForma] = useState(false);
  // El libro real arranca solo con el libro; las otras, con los controles a la vista.
  // Reintentar en el teléfono vuelve a intentar bajar la copia (el efecto de abrir corre de nuevo).
  const [intento, setIntento] = useState(0);
  const [ocultos, setOcultos] = useState(forma === 'book');

  // Tiempo de lectura (RF-BR11): una sesión desde que abre el libro; el total suma las guardadas.
  const tiempo = useReadingTimer(id, abierto);
  const sesiones = useReadingSessions();
  const duracion = useDuracion();
  const segundosLeidos =
    (sesiones.data ?? []).filter((x) => x.item_id === id && x.id !== tiempo.sesionId).reduce((suma, x) => suma + x.seconds, 0) + tiempo.segundos;

  const anotaciones = useAnnotations(id);
  const editor = useAnnotationEditor(id);
  const [herramienta, setHerramienta] = useState<Herramienta>(null);
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [verPanel, setVerPanel] = useState(false);
  // El color del último post-it guardado: el siguiente sale de ese color.
  const ultimoColor = useRef(COLOR_DE_POSTIT);
  const lista = anotaciones.data;
  // La barra de lo elegido es para lo pegado; un subrayado tocado abre su hoja.
  const elegida = lista?.find((a) => a.id === seleccionId) ?? null;
  const seleccionada = elegida && esPegado(elegida) ? elegida : null;
  const subrayado = elegida?.kind === 'highlight' ? elegida : null;
  const editando = lista?.find((a) => a.id === editandoId) ?? null;

  // Texto seleccionado (RF-BH7 – RF-BH9): qué dice y dónde está, para subrayar, definir o copiar.
  const [seleccionTexto, setSeleccionTexto] = useState<{ text: string; locator: LibraryLocator } | null>(null);
  const [copiable, setCopiable] = useState(true);
  const [idiomaLibro, setIdiomaLibro] = useState<string | null>(null);
  const [estiloSubrayado, setEstiloSubrayado] = useState<EstiloDeSubrayado>('highlight');
  const [ultimoSubrayado, setUltimoSubrayado] = useState<string | null>(null);
  const [definiendo, setDefiniendo] = useState<string | null>(null);
  const avisar = useSnackbar();

  // Abrir una sola vez por dirección firmada, en el lugar donde se quedó (RF-BL17).
  const abiertoCon = useRef<string | null>(null);
  useEffect(() => {
    const pieza = item.data;
    if (!pieza || !ruta) return;
    if (nativo) {
      // Una vez por libro (y otra si se reintenta): de la copia, o bajándola si aún no está.
      if (abiertoCon.current === ruta) return;
      abiertoCon.current = ruta;
      abrirCopia(pieza, ruta, forma, (m) => motor.current?.send(m)).catch(() => setError('offline'));
      return;
    }
    if (!url.data || abiertoCon.current === url.data) return;
    abiertoCon.current = url.data;
    motor.current?.send({ type: 'open', format: pieza.kind === 'epub' ? 'epub' : 'pdf', url: url.data, position: posicionGuardada(pieza), mode: forma });
    // La forma con que se abre es la de ese momento; los cambios después van por `mode` (abajo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.data, url.data, ruta, intento]);

  // El tema del lector (RF-BH5): al abrir y cada vez que cambia. Si el motor aún no está listo, espera en
  // su cola.
  const temaLectura = usePreferencesStore((s) => s.readerTheme);
  const { pagina: colorPagina, letra: colorLetra } = coloresDe(temaLectura);
  useEffect(() => {
    motor.current?.send({ type: 'theme', page: colorPagina, text: colorLetra });
  }, [colorPagina, colorLetra]);

  // Lo pegado, cada vez que cambia (guardar, deshacer, lo que llegó del servidor). El motor pinta lo que ya
  // sabe pintar; lo demás llega con su tarea (T287 – T291).
  useEffect(() => {
    if (!lista) return;
    const items: AnotacionEnMotor[] = lista
      .filter((a) => !a.removed && SE_PINTAN.includes(a.kind))
      .map((a) => ({
        id: a.id,
        kind: a.kind,
        locator: a.locator,
        z: a.z,
        locked: a.locked,
        content: { color: colorDe(a) ?? undefined, text: textoDe(a), ...(a.kind === 'highlight' ? { style: estiloDe(a) } : {}) },
      }));
    motor.current?.send({ type: 'annotations', items });
  }, [lista]);

  useEffect(() => {
    motor.current?.send({ type: 'tool', tool: herramienta });
  }, [herramienta]);

  // Letra y tamaño de un EPUB (RF-BH2, RF-BH3): al abrir y cada vez que cambian.
  const textoLectura = usePreferencesStore((s) => s.readerText);
  const setTextoLectura = usePreferencesStore((s) => s.setReaderText);
  useEffect(() => {
    motor.current?.send({ type: 'text', size: textoLectura.tamano, font: textoLectura.letra });
  }, [textoLectura.tamano, textoLectura.letra]);
  // Cuánto está acercado el PDF o el libro real (RF-BH1): con más de 100 %, la pastilla para ajustar.
  const [zoom, setZoom] = useState(1);

  // Lo que miden las barras que van encima del libro. Hasta medirlas, lo que suelen medir: así el libro
  // real (que arranca sin controles) ya deja su lugar.
  const [barras, setBarras] = useState({ arriba: 52, abajo: 116 });
  const medirBarra = (lado: 'arriba' | 'abajo', alto: number) =>
    setBarras((b) => (Math.abs(b[lado] - alto) < 6 ? b : { ...b, [lado]: Math.round(alto) }));
  // La página se acomoda entre las barras (con o sin ellas a la vista), así nunca quedan encima del texto.
  // Antes que la forma: así el motor acomoda una sola vez, ya con el lugar de las barras.
  const reservaArriba = forma !== 'scroll' ? barras.arriba : 0;
  const reservaAbajo = forma !== 'scroll' ? barras.abajo : 0;
  useEffect(() => {
    motor.current?.send({ type: 'insets', top: reservaArriba, bottom: reservaAbajo });
  }, [reservaArriba, reservaAbajo]);

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
    // En el libro real lo pegado solo se ve.
    if (nueva === 'book') {
      setHerramienta(null);
      setSeleccionId(null);
    }
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
    // Todo lo que llega del motor mientras se lee es señal de que se está leyendo (RF-BR11).
    if (m.type !== 'ready' && m.type !== 'error') tiempo.actividad();
    switch (m.type) {
      case 'opened':
        setAbierto(true);
        setError(null);
        setCopiable(m.copiable !== false);
        setIdiomaLibro(m.lang ?? null);
        return;
      case 'position': {
        setPosicion(m);
        const lugar = cambioDePosicion(m);
        tiempo.alMoverse({ locator: lugar.last_position, progress: lugar.progress });
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
      case 'place':
        pegarPostit(m.locator);
        return;
      case 'select':
        setSeleccionId(m.id);
        return;
      case 'selection':
        setSeleccionTexto(m.text && m.locator ? { text: m.text, locator: m.locator } : null);
        return;
      case 'zoom':
        setZoom(m.level);
        return;
      case 'textSize':
        setTextoLectura({ ...textoLectura, tamano: m.size });
        return;
      case 'move': {
        const a = lista?.find((x) => x.id === m.id);
        if (a && !a.locked) cambiar(a, { locator: m.locator });
        return;
      }
      case 'edit':
        setSeleccionId(m.id);
        setEditandoId(m.id);
        return;
      case 'error':
        setError(m.code);
        return;
    }
  };

  const ahora = () => new Date().toISOString();
  const cambiar = (a: LibraryAnnotation, cambio: Partial<LibraryAnnotation>) => editor.cambiar(a, { ...a, ...cambio, updated_at: ahora() });
  const elegir = (idElegido: string | null) => {
    setSeleccionId(idElegido);
    motor.current?.send({ type: 'select', id: idElegido });
  };

  /** Un post-it nuevo donde se tocó, elegido y abierto para escribir. La herramienta se apaga. */
  const pegarPostit = (locator: LibraryAnnotation['locator']) => {
    const t = ahora();
    const nuevo: LibraryAnnotation = {
      id: uuidv4(),
      item_id: id,
      owner_id: '',
      kind: 'postit',
      locator: { ...locator, w: locator.w ?? ANCHO_DE_POSTIT },
      content: { color: ultimoColor.current, text: '' },
      z: zNueva(lista ?? []),
      removed: false,
      locked: false,
      created_at: t,
      updated_at: t,
    };
    editor.crear(nuevo);
    setHerramienta(null);
    elegir(nuevo.id);
    setEditandoId(nuevo.id);
  };

  const guardarPostit = (texto: string, color: string) => {
    const a = editando;
    setEditandoId(null);
    if (!a) return;
    ultimoColor.current = color;
    if (texto !== textoDe(a) || color !== colorDe(a)) cambiar(a, { content: { ...a.content, text: texto, color } });
  };

  const alFrente = () => {
    const z = seleccionada && zAlFrente(lista ?? [], seleccionada.id);
    if (seleccionada && z != null) cambiar(seleccionada, { z });
  };
  const alFondo = () => {
    const z = seleccionada && zAlFondo(lista ?? [], seleccionada.id);
    if (seleccionada && z != null) cambiar(seleccionada, { z });
  };
  const quitar = () => {
    if (!seleccionada) return;
    editor.borrar(seleccionada);
    elegir(null);
  };

  /** Subrayar lo seleccionado con un color, en el estilo elegido (RF-BH7). */
  const subrayar = (color: string) => {
    if (!seleccionTexto) return;
    const t = ahora();
    editor.crear({
      id: uuidv4(),
      item_id: id,
      owner_id: '',
      kind: 'highlight',
      locator: seleccionTexto.locator,
      content: { color, style: estiloSubrayado, text: seleccionTexto.text },
      z: zNueva(lista ?? []),
      removed: false,
      locked: false,
      created_at: t,
      updated_at: t,
    });
    setUltimoSubrayado(color);
    soltarSeleccion();
  };

  const soltarSeleccion = () => {
    setSeleccionTexto(null);
    motor.current?.send({ type: 'clearSelection' });
  };

  const copiar = async () => {
    if (!seleccionTexto || !copiable) return;
    await Clipboard.setStringAsync(seleccionTexto.text);
    avisar({ message: tx.library.annotations.copied });
    soltarSeleccion();
  };

  const guardarSubrayado = (cambio: CambioDeSubrayado) => {
    const a = subrayado;
    elegir(null);
    if (!a) return;
    if (cambio.color !== colorDe(a) || cambio.style !== estiloDe(a) || cambio.note !== (typeof a.content.note === 'string' ? a.content.note : '')) {
      cambiar(a, { content: { ...a.content, color: cambio.color, style: cambio.style, note: cambio.note } });
      setUltimoSubrayado(cambio.color);
    }
  };

  const quitarSubrayado = () => {
    if (!subrayado) return;
    editor.borrar(subrayado);
    elegir(null);
  };

  /** Desde el panel: ir a donde está y dejarlo elegido. */
  const irAAnotacion = (a: LibraryAnnotation) => {
    const destino = destinoDe(a.locator);
    setVerPanel(false);
    if (destino) motor.current?.send({ type: 'goTo', ...destino });
    if (forma !== 'book' && SE_PINTAN.includes(a.kind) && esPegado(a)) elegir(a.id);
  };

  const reintentar = () => {
    setError(null);
    setAbierto(false);
    abiertoCon.current = null;
    if (nativo) setIntento((n) => n + 1);
    else void url.refetch();
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
    : error === 'offline'
      ? r.errorOffline
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
  // Con algo elegido o pegando, también: las herramientas tienen que estar a la mano.
  const controles = forma === 'scroll' || !ocultos || buscando || !abierto || !!mensajeError || !!seleccionada || !!herramienta || !!seleccionTexto;
  const pantallaCompleta = forma === 'book' && abierto && !mensajeError;
  usePantallaCompleta(pantallaCompleta);
  // Fuera del scroll, los controles van encima del libro y no lo empujan: mostrarlos u ocultarlos (o que
  // aparezca un aviso de las herramientas) no cambia el tamaño de la página, así el EPUB no se vuelve a
  // acomodar ni el PDF se vuelve a pintar (T286).
  const superpuestos = forma !== 'scroll';
  const [altoAbajo, setAltoAbajo] = useState(0);

  const barraArriba = !controles ? null : buscando ? (
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
          <IconButton label={tx.library.annotations.panelA11y} onPress={() => setVerPanel(true)} disabled={!abierto}>
            <NotebookText size={IconSize.action} strokeWidth={IconStroke} color={abierto ? theme.text : theme.textTertiary} />
          </IconButton>
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
      );

  const pastillaZoom =
    zoom > 1.001 ? (
      <View style={[styles.zoomCaja, { bottom: (superpuestos && controles && abierto ? altoAbajo : 0) + Spacing.sm }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${r.zoomLevel(Math.round(zoom * 100))}. ${r.zoomFit}`}
          onPress={() => motor.current?.send({ type: 'zoom', level: 1 })}
          style={({ pressed }) => [styles.zoom, { backgroundColor: theme.surface, borderColor: theme.border }, pressed ? styles.presionado : null]}>
          <AppText variant="label" tabular>
            {r.zoomLevel(Math.round(zoom * 100))}
          </AppText>
          <Shrink size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
          <AppText variant="label">{r.zoomFit}</AppText>
        </Pressable>
      </View>
    ) : null;

  const barraAbajo = abierto && controles ? (
        <View style={[styles.abajo, superpuestos ? { backgroundColor: theme.background } : null, { paddingBottom: (superpuestos ? 0 : insets.bottom) + Spacing.xs }]}>
          {!mensajeError && seleccionTexto ? (
            <SelectionBar
              colores={coloresRapidos(ultimoSubrayado)}
              estilo={estiloSubrayado}
              onEstilo={setEstiloSubrayado}
              onColor={subrayar}
              puedeDefinir={!!palabraParaDefinir(seleccionTexto.text)}
              onDefinir={() => {
                setDefiniendo(palabraParaDefinir(seleccionTexto.text));
                soltarSeleccion();
              }}
              copiable={copiable}
              onCopiar={() => void copiar()}
              onCerrar={soltarSeleccion}
            />
          ) : !mensajeError ? (
            <AnnotationToolbar
              seleccionada={seleccionada}
              herramienta={herramienta}
              enLibro={forma === 'book'}
              puedeDeshacer={editor.puedeDeshacer}
              puedeRehacer={editor.puedeRehacer}
              onHerramienta={(h) => {
                if (h && seleccionada) elegir(null);
                setHerramienta(h);
              }}
              onDeshacer={editor.deshacer}
              onRehacer={editor.rehacer}
              onEscribir={() => setEditandoId(seleccionada?.id ?? null)}
              onFrente={alFrente}
              onAtras={alFondo}
              onBloquear={() => seleccionada && cambiar(seleccionada, { locked: !seleccionada.locked })}
              onQuitar={quitar}
              onListo={() => elegir(null)}
            />
          ) : null}
          <ReaderProgress
            fraction={fraccion}
            etiqueta={etiqueta}
            onJump={saltar}
            a11yLabel={r.progressA11y(etiqueta(fraccion))}
            paso={porPagina ? 1 / (total - 1) : 0.02}
            nota={segundosLeidos >= 60 ? l.time.read(duracion(segundosLeidos)) : undefined}
          />
        </View>
      ) : null;

  return (
    <View style={[styles.pantalla, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <StatusBar hidden={pantallaCompleta} />
      {superpuestos ? null : barraArriba}
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
        {siguiente && nombreSaga ? (
          <View style={[styles.siguiente, { bottom: (superpuestos && barraAbajo ? altoAbajo : 0) + Spacing.sm, backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityRole="alert">
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
        {pastillaZoom}
        {superpuestos && barraArriba ? (
          <View style={[styles.arriba, { backgroundColor: theme.background }]} onLayout={(e) => medirBarra('arriba', e.nativeEvent.layout.height)}>
            {barraArriba}
          </View>
        ) : null}
        {superpuestos ? (
          <View
            style={styles.abajoEncima}
            onLayout={(e) => {
              setAltoAbajo(e.nativeEvent.layout.height);
              if (e.nativeEvent.layout.height > 0) medirBarra('abajo', e.nativeEvent.layout.height);
            }}>
            {barraAbajo}
          </View>
        ) : null}
      </View>
      {superpuestos ? <View style={{ height: abierto ? insets.bottom : 0 }} /> : barraAbajo}



      <Sheet visible={eligiendoForma} onClose={() => setEligiendoForma(false)} title={r.readingSettings}>
        <View style={styles.formas}>
          <AppText variant="label">{r.mode}</AppText>
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
          <ReaderTextPicker esPdf={!esEpub} />
          <ReaderThemePicker />
        </View>
      </Sheet>

      <AnnotationsSheet
        visible={verPanel}
        onClose={() => setVerPanel(false)}
        anotaciones={lista}
        cargando={anotaciones.isLoading}
        error={anotaciones.isError}
        onReintentar={() => void anotaciones.refetch()}
        onIr={irAAnotacion}
      />
      <PostitSheet anotacion={editando} colorPortada={item.data ? colorDeParte(item.data, 'front') : null} onClose={() => setEditandoId(null)} onGuardar={guardarPostit} />
      <HighlightSheet anotacion={subrayado} onClose={() => elegir(null)} onGuardar={guardarSubrayado} onQuitar={quitarSubrayado} />
      <DefineSheet palabra={definiendo} idioma={idiomaLibro} onClose={() => setDefiniendo(null)} />
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
  arriba: { position: 'absolute', top: 0, left: 0, right: 0 },
  abajoEncima: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  siguiente: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    boxShadow: '0 4px 16px rgba(22,23,26,0.08)',
  },
  formas: { gap: Spacing.md },
  abajo: { gap: Spacing.xs },
  zoomCaja: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  zoom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.full,
    borderCurve: 'continuous',
    boxShadow: '0 4px 16px rgba(22,23,26,0.08)',
  },
  presionado: { opacity: 0.85 },
  siguienteBotones: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.sm },
});
