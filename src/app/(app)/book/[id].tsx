import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BookOpen, ChevronDown, ChevronLeft, ChevronUp, GalleryHorizontal, NotebookText, Rows3, Search, Shrink, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnnotationToolbar } from '@/components/library/annotation-toolbar';
import { AnnotationsSheet } from '@/components/library/annotations-sheet';
import { BookmarkRail } from '@/components/library/bookmark-rail';
import { BookmarkSheet, type CambioDeSeparador } from '@/components/library/bookmark-sheet';
import { DefineSheet } from '@/components/library/define-sheet';
import { HighlightSheet, type CambioDeSubrayado } from '@/components/library/highlight-sheet';
import { type CambioDeEstilo, PegadoStyleSheet } from '@/components/library/pegado-style-sheet';
import { ReaderEngine, type ReaderEngineHandle } from '@/components/library/reader-engine';
import { ReaderProgress } from '@/components/library/reader-progress';
import { useDuracion } from '@/components/library/reading-summary';
import { ReaderTextPicker } from '@/components/library/reader-text-picker';
import { ReaderThemePicker } from '@/components/library/reader-theme-picker';
import { SelectionBar } from '@/components/library/selection-bar';
import { PenSheet } from '@/components/library/pen-sheet';
import { CardChooserSheet } from '@/components/library/card-chooser-sheet';
import { CardPeek } from '@/components/library/card-peek';
import { PenToolbar } from '@/components/library/pen-toolbar';
import { CreateStickerSheet, type StickerHecho } from '@/components/library/create-sticker-sheet';
import { type StickerElegible, StickerSheet } from '@/components/library/sticker-sheet';
import { AppText, Button, IconButton, Segmented, Sheet } from '@/components/ui';
import { type NombreDeSticker } from '@/constants/stickers';
import { Fonts, IconSize, IconStroke, Radius, Spacing, Typography } from '@/constants/theme';
import { useAnnotationEditor, useAnnotationImageUrls, useAnnotations, useUploadAnnotationImage } from '@/hooks/use-annotations';
import { useReadingSessions, useReadingTimer } from '@/hooks/use-reading-sessions';
import { useStickerPacks, useStickerSources } from '@/hooks/use-sticker-packs';
import { idPropio, PREFIJO_PROPIO, useCreateUserSticker, useRemoveUserSticker, useUserStickerImages, useUserStickers, useUserStickerSources } from '@/hooks/use-user-stickers';
import { usePantallaCompleta } from '@/hooks/use-full-screen';
import { useLibrarySync } from '@/hooks/use-library-sync';
import { useAbrirCopiaLocal } from '@/hooks/use-local-book';
import { useCreateClip } from '@/hooks/use-clips';
import { useCards, useCardTemplates } from '@/hooks/use-cards';
import { useLibraryFileUrl, useLibraryItem, useLibraryItems, useSaveReadingPosition, useSeries } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { uuidv4 } from '@/lib/gym/ids';
import { colorDeParte } from '@/lib/library/cover/parts';
import { prepararImagenPegada } from '@/lib/library/cover/prepare';
import { desdeCamara, desdeGaleria, PUEDE_TOMAR_FOTO } from '@/lib/library/cover/sources';
import {
  ANCHO_DE_POSTIT,
  colorDe,
  coloresRapidos,
  COLOR_DE_POSTIT,
  destinoDe,
  escalaDe,
  esPegado,
  type EstiloDeSubrayado,
  estiloDe,
  giroDe,
  lugarEnElLibro,
  palabraParaDefinir,
  quitados,
  separadorDe,
  separadorNuevo,
  rutaDeImagen,
  SE_PINTAN,
  stickerDe,
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
  type Posicion as LugarDeApertura,
  posicionGuardada,
} from '@/lib/library/reader-protocol';
import { lugarDeImagen, lugarDeSeleccion, posicionDeRuta } from '@/lib/library/clips';
import { lapizParaMotor, trazosDe } from '@/lib/library/ink';
import { alFinal, alInicio, plantillasVigentes } from '@/lib/library/cards';
import { FORMA_POR_OMISION, type FormaDeLeer } from '@/lib/library/reading-mode';
import { coloresDe } from '@/lib/library/reader-theme';
import { partesDeSticker, urlDeSticker } from '@/lib/library/sticker-packs';
import { etiquetaDeSaga, siguienteDeSaga } from '@/lib/library/series';
import { useAuth, useConfirm, useSnackbar } from '@/providers';
import { usePreferencesStore } from '@/store/preferences-store';
import type { LibraryAnnotation, LibraryLocator, StickerPack, UserSticker } from '@/types/domain';

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
/**
 * La imagen de un sticker de la tienda para el lector: la copia del teléfono si ya se leyó; si no (o en la web),
 * su dirección en la nube. Los incluidos no llevan: el lector los tiene.
 */
function fuenteDeSticker(
  id: string | null,
  fuentes: ReadonlyMap<string, string>,
  packs: readonly StickerPack[] | undefined,
  propias: ReadonlyMap<string, string>,
): string | undefined {
  if (!id || id.startsWith('nobi-pink/')) return undefined;
  if (id.startsWith(PREFIJO_PROPIO)) return propias.get(id);
  const lista = fuentes.get(id);
  if (lista) return lista;
  const partes = partesDeSticker(id);
  const pack = partes && packs?.find((p) => p.id === partes.pack);
  return pack && partes ? urlDeSticker(pack, partes.nombre) : undefined;
}

/** El nombre de un sticker pegado, para leerlo en voz alta en la página (la cara: igual en todos los packs). */
function nombreDeSticker(a: LibraryAnnotation, nombres: Record<NombreDeSticker, string>): string | undefined {
  const cara = partesDeSticker(stickerDe(a) ?? '')?.nombre;
  return cara ? (nombres as Record<string, string>)[cara] : undefined;
}

/** El color de un separador nuevo: rojo, como un listón (después, el último que se usó). */
const COLORES_RAPIDOS_SEPARADOR = '#E24947';

export default function ReaderScreen() {
  const { id, ir } = useLocalSearchParams<{ id: string; ir?: string }>();
  // Una pieza nueva arranca de cero (motor, posición, aviso del siguiente): al pasar al siguiente de
  // la saga se reemplaza la ruta y Expo Router puede reutilizar el componente.
  // `ir`: abrir en un lugar y no donde se quedó (desde Mis fragmentos, RF-BH21).
  return <Lector key={id} id={id} irA={posicionDeRuta(ir)} />;
}

function Lector({ id, irA }: { id: string; irA?: LugarDeApertura }) {
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
  // Al terminarlo, una vez por apertura, se ofrece llenar su ficha si aún no tiene (13d, RF-BF6; T294).
  const [ofrecerFicha, setOfrecerFicha] = useState<'pendiente' | 'visible' | 'cerrado'>('pendiente');
  const [eligiendoFicha, setEligiendoFicha] = useState(false);
  const plantillasDeFicha = useCardTemplates();
  const fichas = useCards();

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
  // De qué pegado se elige el color (T289); y la imagen lista para pegar, que espera el toque en la página.
  const [estiloDeId, setEstiloDeId] = useState<string | null>(null);
  const [imagenPorPegar, setImagenPorPegar] = useState<{ jpeg: Uint8Array; ar: number; vistaPrevia: string } | null>(null);
  const [eligiendoImagen, setEligiendoImagen] = useState(false);
  // El sticker que espera el toque en la página (T290): uno nuevo de la colección o uno que vuelve de la charola.
  const [eligiendoSticker, setEligiendoSticker] = useState(false);
  const [stickerPorPegar, setStickerPorPegar] = useState<{ sticker: StickerElegible; devolver?: LibraryAnnotation } | null>(null);
  // Mientras una imagen recién pegada sube, se ve con su copia local.
  const [vistasPrevias, setVistasPrevias] = useState<ReadonlyMap<string, string>>(new Map());
  const subirImagen = useUploadAnnotationImage();
  const { userId } = useAuth();
  const avisarError = useSnackbar();
  const [verPanel, setVerPanel] = useState(false);
  // El color del último post-it guardado: el siguiente sale de ese color.
  const ultimoColor = useRef(COLOR_DE_POSTIT);
  const ultimoColorDeSeparador = useRef(COLORES_RAPIDOS_SEPARADOR);
  const lista = anotaciones.data;
  // La barra de lo elegido es para lo pegado; un subrayado tocado abre su hoja.
  const elegida = lista?.find((a) => a.id === seleccionId) ?? null;
  const seleccionada = elegida && esPegado(elegida) ? elegida : null;
  const subrayado = elegida?.kind === 'highlight' ? elegida : null;
  const separador = elegida?.kind === 'bookmark' ? elegida : null;
  const deEstilo = lista?.find((a) => a.id === estiloDeId) ?? null;
  const urlsDeImagenes = useAnnotationImageUrls(lista);
  const nombresDeStickers = tx.library.stickers.names;
  // Los stickers de la tienda pegados en este libro (T338): cómo los ve el lector (sin red, de su copia).
  const packsDeStickers = useStickerPacks();
  // Los stickers propios (T335): su imagen para la hoja y para el lector.
  const misStickers = useUserStickers();
  const imagenesPropias = useUserStickerImages(misStickers.data);
  const fuentesPropias = useUserStickerSources(
    (lista ?? []).filter((a) => a.kind === 'sticker' && !a.removed).map((a) => stickerDe(a) ?? ''),
    imagenesPropias,
  );
  const crearSticker = useCreateUserSticker();
  const borrarSticker = useRemoveUserSticker();
  const confirmar = useConfirm();
  const [creandoSticker, setCreandoSticker] = useState(false);
  // Lo que se le pidió al motor para hacer un sticker: se cumple cuando contesta `outline`.
  const pedidosDeContorno = useRef(new Map<string, { resolver: (h: StickerHecho) => void; fallar: () => void }>());
  const fuentesDeStickers = useStickerSources(
    (lista ?? []).filter((a) => a.kind === 'sticker' && !a.removed && !stickerDe(a)?.startsWith('nobi-pink/')).map((a) => stickerDe(a) ?? ''),
    packsDeStickers.data?.packs,
  );

  // Texto seleccionado (RF-BH7 – RF-BH9): qué dice y dónde está, para subrayar, definir o copiar.
  const [seleccionTexto, setSeleccionTexto] = useState<{ text: string; locator: LibraryLocator } | null>(null);
  const [copiable, setCopiable] = useState(true);
  const [idiomaLibro, setIdiomaLibro] = useState<string | null>(null);
  const [estiloSubrayado, setEstiloSubrayado] = useState<EstiloDeSubrayado>('highlight');
  const [ultimoSubrayado, setUltimoSubrayado] = useState<string | null>(null);
  const [definiendo, setDefiniendo] = useState<string | null>(null);
  const avisar = useSnackbar();
  // Fragmentos (RF-BH19 – RF-BH21; T317): con la herramienta de imagen puesta, la página espera el rectángulo.
  const [recortando, setRecortando] = useState(false);
  const crearFragmento = useCreateClip();
  // El lápiz (RF-BH11; T291): mientras se dibuja, su barra reemplaza a la de pegar. Lo elegido se recuerda.
  const [dibujando, setDibujando] = useState(false);
  const [ajustandoLapiz, setAjustandoLapiz] = useState(false);
  const lapiz = usePreferencesStore((s) => s.readerPen);
  const setLapiz = usePreferencesStore((s) => s.setReaderPen);

  // Abrir una sola vez por dirección firmada, en el lugar donde se quedó (RF-BL17).
  const abiertoCon = useRef<string | null>(null);
  useEffect(() => {
    const pieza = item.data;
    if (!pieza || !ruta) return;
    if (nativo) {
      // Una vez por libro (y otra si se reintenta): de la copia, o bajándola si aún no está.
      if (abiertoCon.current === ruta) return;
      abiertoCon.current = ruta;
      abrirCopia(pieza, ruta, forma, (m) => motor.current?.send(m), irA).catch(() => setError('offline'));
      return;
    }
    if (!url.data || abiertoCon.current === url.data) return;
    abiertoCon.current = url.data;
    motor.current?.send({ type: 'open', format: pieza.kind === 'epub' ? 'epub' : 'pdf', url: url.data, position: irA ?? posicionGuardada(pieza), mode: forma });
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
        content: {
          color: colorDe(a) ?? undefined,
          text: textoDe(a),
          ...(a.kind === 'highlight' ? { style: estiloDe(a) } : {}),
          ...(a.kind === 'textbox' || a.kind === 'postit' ? { size: escalaDe(a) } : {}),
          ...(a.kind === 'postit'
            ? { rot: giroDe(a), ...(a.content.folded === true ? { folded: true } : {}), ...(trazosDe(a).length ? { strokes: trazosDe(a) } : {}) }
            : {}),
          ...(a.kind === 'bookmark' ? { ...separadorDe(a) } : {}),
          ...(a.kind === 'ink' ? { strokes: trazosDe(a) } : {}),
          ...(a.kind === 'image' ? { src: vistasPrevias.get(a.id) ?? urlsDeImagenes.get(rutaDeImagen(a) ?? '') ?? undefined, rot: giroDe(a) } : {}),
          ...(a.kind === 'sticker'
            ? { sticker: stickerDe(a) ?? undefined, rot: giroDe(a), label: nombreDeSticker(a, nombresDeStickers), src: fuenteDeSticker(stickerDe(a), fuentesDeStickers, packsDeStickers.data?.packs, fuentesPropias) }
            : {}),
        },
      }));
    motor.current?.send({ type: 'annotations', items });
  }, [lista, vistasPrevias, urlsDeImagenes, nombresDeStickers, fuentesDeStickers, fuentesPropias]);

  useEffect(() => {
    const medida =
      herramienta === 'image' && imagenPorPegar
        ? { ar: imagenPorPegar.ar }
        : herramienta === 'sticker' && stickerPorPegar
          ? stickerPorPegar.devolver
            ? { ar: stickerPorPegar.devolver.locator.ar ?? stickerPorPegar.sticker.ar, w: stickerPorPegar.devolver.locator.w }
            : { ar: stickerPorPegar.sticker.ar }
          : {};
    motor.current?.send({ type: 'tool', tool: herramienta, ...medida });
  }, [herramienta, imagenPorPegar, stickerPorPegar]);

  useEffect(() => {
    motor.current?.send({ type: 'clipTool', on: recortando });
  }, [recortando]);

  // El lápiz en el motor: puesto con la herramienta, el color (la tinta del tema si no se eligió) y el grosor.
  const lapizPuesto = dibujando && forma !== 'book';
  const tinta = colorLetra.toUpperCase();
  const lapizEnMotor = useRef(false);
  useEffect(() => {
    if (lapizPuesto) motor.current?.send({ type: 'pen', on: true, ...lapizParaMotor(lapiz, tinta) });
    else if (lapizEnMotor.current) motor.current?.send({ type: 'pen', on: false });
    lapizEnMotor.current = lapizPuesto;
  }, [lapizPuesto, lapiz, tinta]);

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
        if (cambioDePosicion(m).progress >= 1 && ofrecerFicha === 'pendiente') setOfrecerFicha('visible');
        return;
      }
      case 'search':
        setResultado({ count: m.count, index: m.index, searching: !!m.searching });
        return;
      case 'tap':
        setOcultos((o) => !o);
        return;
      case 'place':
        pegar(m.locator);
        return;
      case 'text': {
        // Lo escrito ahí mismo (T289): un cuadro de texto que se queda vacío se quita.
        const a = lista?.find((x) => x.id === m.id);
        if (!a) return;
        if (a.kind === 'textbox' && !m.text.trim()) editor.borrar(a);
        else if (m.text !== textoDe(a)) cambiar(a, { content: { ...a.content, text: m.text } });
        return;
      }
      case 'rotate': {
        const a = lista?.find((x) => x.id === m.id);
        if (a && !a.locked) cambiar(a, { content: { ...a.content, rot: m.rot } });
        return;
      }
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
        if (a && !a.locked) cambiar(a, { locator: m.locator, ...(m.rot !== undefined ? { content: { ...a.content, rot: m.rot } } : {}) });
        return;
      }
      case 'fold': {
        const a = lista?.find((x) => x.id === m.id);
        if (a && a.kind === 'postit') cambiar(a, { content: { ...a.content, folded: m.folded } });
        return;
      }
      case 'outline': {
        const pedido = pedidosDeContorno.current.get(m.id);
        pedidosDeContorno.current.delete(m.id);
        if (!pedido) return;
        if (m.dataUrl && m.width && m.height) pedido.resolver({ dataUrl: m.dataUrl, ancho: m.width, alto: m.height });
        else pedido.fallar();
        return;
      }
      case 'edit':
        setSeleccionId(m.id);
        motor.current?.send({ type: 'write', id: m.id });
        return;
      case 'clip':
        if ('error' in m) avisar({ message: m.error === 'empty' ? tx.library.clips.emptyImage : tx.library.clips.failed });
        else guardarFragmentoDeImagen(m);
        return;
      case 'remove': {
        const a = lista?.find((x) => x.id === m.id);
        if (a?.kind === 'ink') editor.borrar(a);
        else if (a && esPegado(a)) quitar(a);
        return;
      }
      case 'ink': {
        // Un dibujo nuevo del lápiz (T291), hasta arriba de la capa.
        const t = ahora();
        editor.crear({ id: uuidv4(), item_id: id, owner_id: '', kind: 'ink', locator: m.locator, content: { strokes: m.strokes }, z: zNueva(lista ?? []), removed: false, locked: false, created_at: t, updated_at: t });
        return;
      }
      case 'inkChange': {
        // Un dibujo con menos trazos (sin ninguno, se quita) o lo dibujado dentro de un post-it (T291b).
        const a = lista?.find((x) => x.id === m.id);
        if (a?.kind === 'ink' && !m.strokes.length) editor.borrar(a);
        else if (a?.kind === 'ink' || (a?.kind === 'postit' && !a.locked)) cambiar(a, { content: { ...a.content, strokes: m.strokes } });
        return;
      }
      case 'undo':
        editor.deshacer();
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

  /**
   * Pegar donde se tocó, según la herramienta (T286, T289): un post-it o un cuadro de texto quedan elegidos y
   * listos para escribir ahí mismo; una imagen se ve al instante con su copia local mientras sube. La
   * herramienta se apaga.
   */
  const pegar = (locator: LibraryAnnotation['locator']) => {
    const t = ahora();
    const nuevoId = uuidv4();
    const tipo = herramienta ?? 'postit';
    const base = { id: nuevoId, item_id: id, owner_id: '', z: zNueva(lista ?? []), removed: false, locked: false, created_at: t, updated_at: t };
    setHerramienta(null);
    if (tipo === 'sticker') {
      const elegido = stickerPorPegar;
      setStickerPorPegar(null);
      if (!elegido) return;
      // De la charola vuelve el mismo, con su tamaño y su giro, donde se tocó y hasta arriba.
      if (elegido.devolver) cambiar(elegido.devolver, { removed: false, locator, z: base.z });
      else editor.crear({ ...base, kind: 'sticker', locator, content: { sticker: elegido.sticker.id, rot: 0 } });
      elegir(elegido.devolver?.id ?? nuevoId);
      return;
    }
    if (tipo === 'image') {
      const imagen = imagenPorPegar;
      setImagenPorPegar(null);
      if (!imagen || !userId) return;
      const nueva: LibraryAnnotation = { ...base, kind: 'image', locator, content: { path: `${userId}/${id}/anotaciones/${nuevoId}.jpg`, rot: 0 } };
      setVistasPrevias((v) => new Map(v).set(nuevoId, imagen.vistaPrevia));
      editor.crear(nueva);
      elegir(nuevoId);
      subirImagen(id, nuevoId, imagen.jpeg).catch(() => {
        // Sin subir no hay imagen: se quita (sin paso de deshacer) y se dice por qué.
        editor.descartar(nueva);
        avisarError({ message: tx.library.annotations.imageFailed });
      });
      return;
    }
    const nuevo: LibraryAnnotation =
      tipo === 'textbox'
        ? { ...base, kind: 'textbox', locator, content: { text: '', color: colorLetra.toUpperCase(), size: 1 } }
        : { ...base, kind: 'postit', locator: { ...locator, w: locator.w ?? ANCHO_DE_POSTIT }, content: { color: ultimoColor.current, text: '' } };
    editor.crear(nuevo);
    elegir(nuevoId);
    motor.current?.send({ type: 'write', id: nuevoId });
  };

  /** Elegir la imagen para pegar (RF-BH12): en el teléfono, de la galería o la cámara; en la web, un archivo. */
  const elegirImagen = async (origen: 'galeria' | 'camara') => {
    setEligiendoImagen(false);
    try {
      const uri = origen === 'camara' ? await desdeCamara() : await desdeGaleria();
      if (!uri) return;
      const lista_ = await prepararImagenPegada(uri);
      setImagenPorPegar({ jpeg: lista_.jpeg, ar: lista_.alto / lista_.ancho, vistaPrevia: lista_.vistaPrevia });
      if (seleccionada) elegir(null);
      setHerramienta('image');
    } catch (e) {
      avisarError({ message: e instanceof Error ? e.message : tx.library.annotations.imageFailed });
    }
  };

  /** Color (y tamaño de letra en un cuadro de texto) de lo elegido. El color de un post-it se recuerda. */
  const guardarEstilo = ({ color, size }: CambioDeEstilo) => {
    const a = deEstilo;
    setEstiloDeId(null);
    if (!a) return;
    if (a.kind === 'postit') ultimoColor.current = color;
    if (color !== colorDe(a) || (size !== undefined && size !== escalaDe(a))) cambiar(a, { content: { ...a.content, color, ...(size !== undefined ? { size } : {}) } });
  };

  const alFrente = () => {
    const z = seleccionada && zAlFrente(lista ?? [], seleccionada.id);
    if (seleccionada && z != null) cambiar(seleccionada, { z });
  };
  const alFondo = () => {
    const z = seleccionada && zAlFondo(lista ?? [], seleccionada.id);
    if (seleccionada && z != null) cambiar(seleccionada, { z });
  };
  /**
   * Quitar lo elegido (el botón, o Supr y Retroceso). Un sticker no se tira: se va a la charola "Quitados"
   * (RF-BH13).
   */
  const quitar = (a: LibraryAnnotation | null = seleccionada) => {
    if (!a) return;
    if (a.kind === 'sticker') {
      cambiar(a, { removed: true });
      avisar({ message: tx.library.stickers.savedToRemoved });
    } else editor.borrar(a);
    elegir(null);
  };

  /** Que el motor haga el sticker (T335): recorta y pone el margen; contesta con `outline`. */
  const procesarSticker = (src: string, margen: number) =>
    new Promise<StickerHecho>((resolver, fallar) => {
      const pedido = uuidv4();
      pedidosDeContorno.current.set(pedido, { resolver, fallar: () => fallar(new Error('outline')) });
      motor.current?.send({ type: 'outline', id: pedido, src, margin: margen });
    });

  /** Guardar el sticker hecho en "Mis stickers" y dejarlo listo para pegar. */
  const guardarStickerPropio = (hecho: StickerHecho, margen: number) => {
    const nuevo = uuidv4();
    const ar = Math.min(4, Math.max(0.25, Math.round((hecho.alto / hecho.ancho) * 1000) / 1000));
    crearSticker.mutate(
      { id: nuevo, dataUrl: hecho.dataUrl, ar, margin: margen },
      {
        onSuccess: () => {
          setCreandoSticker(false);
          pegarSticker({ id: idPropio(nuevo), nombre: 'mine', ar, imagen: { uri: hecho.dataUrl } });
        },
        onError: () => avisar({ message: tx.library.stickers.createSaveFailed }),
      },
    );
  };

  const borrarStickerPropio = async (s: UserSticker) => {
    const ok = await confirmar({ title: tx.library.stickers.removeMine, message: tx.library.stickers.removeMineMessage, confirmLabel: tx.library.stickers.removeMineConfirm, destructive: true });
    if (ok) borrarSticker.mutate(s.id);
  };

  /** Elegir un sticker para pegar (T290): nuevo o de vuelta de la charola; luego se toca dónde va. */
  const pegarSticker = (sticker: StickerElegible, devolver?: LibraryAnnotation) => {
    setEligiendoSticker(false);
    setStickerPorPegar({ sticker, devolver });
    if (seleccionada) elegir(null);
    setHerramienta('sticker');
  };


  // Supr o Retroceso quitan lo pegado elegido (pedido de Areli, 14 oct). Con el foco en el libro lo atiende el
  // motor (`remove`); aquí, con el foco en la página de la app (después de tocar la barra) y sin hojas abiertas.
  const quitarConTecla = useRef<() => void>(() => undefined);
  useEffect(() => {
    quitarConTecla.current = () => {
      if (seleccionada && forma !== 'book') quitar(seleccionada);
    };
  });
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Solo con el foco en ningún lado en particular: dentro de una hoja o un campo, la tecla es de ellos.
      const destino = e.target as HTMLElement | null;
      if (destino && destino !== document.body && destino.tagName !== 'IFRAME' && !destino.closest?.('[role="toolbar"]')) return;
      e.preventDefault();
      quitarConTecla.current();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

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

  /** Al terminar de guardar un fragmento: avisa, con un atajo a Mis fragmentos. */
  const fragmentoGuardado = {
    onSuccess: () =>
      avisar({ message: tx.library.clips.saved, actionLabel: tx.library.clips.see, onAction: () => router.push('/(app)/fragments') }),
    onError: (e: Error) => avisar({ message: e.message || tx.library.clips.failed }),
  };

  /** Guardar lo seleccionado como fragmento (RF-BH19). Si el libro no deja copiar, solo su lugar. */
  const guardarFragmentoDeTexto = () => {
    if (!seleccionTexto || !item.data) return;
    crearFragmento.mutate(
      {
        clip: {
          id: uuidv4(),
          item_id: id,
          book_title: item.data.title,
          kind: 'text',
          text: copiable ? seleccionTexto.text.slice(0, 5000) : null,
          locator: lugarDeSeleccion(seleccionTexto.locator, posicion?.fraction),
          ar: null,
        },
      },
      fragmentoGuardado,
    );
    soltarSeleccion();
  };

  /** El rectángulo que llegó del motor (RF-BH20): se guarda y la herramienta se quita. */
  const guardarFragmentoDeImagen = (m: Extract<MensajeDelMotor, { type: 'clip'; dataUrl: string }>) => {
    setRecortando(false);
    if (!item.data) return;
    crearFragmento.mutate(
      {
        clip: {
          id: uuidv4(),
          item_id: id,
          book_title: item.data.title,
          kind: 'image',
          text: null,
          locator: lugarDeImagen(m, posicion),
          ar: Math.round((m.height / m.width) * 10000) / 10000,
        },
        dataUrl: m.dataUrl,
      },
      fragmentoGuardado,
    );
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

  /**
   * Poner un separador en la página que se lee (RF-BH15, T290): en el borde derecho, sin encimarse con otros de
   * esa página; queda elegido y abre su hoja para escoger borde, altura, color y palabra.
   */
  const ponerSeparador = () => {
    const pagina = posicion?.page;
    const locator: LibraryLocator | null = esEpub
      ? posicion?.cfi
        ? { cfi: posicion.cfi, x: 0, w: 0, fraction: posicion.fraction ?? 0 }
        : null
      : pagina
        ? { page: pagina, x: 0, y: 0, w: 0 }
        : null;
    if (!locator) return;
    const t = ahora();
    const id_ = uuidv4();
    const { edge, pos } = separadorNuevo(lista ?? [], (a) => (esEpub ? a.locator.cfi === locator.cfi : a.locator.page === locator.page));
    editor.crear({
      id: id_,
      item_id: id,
      owner_id: '',
      kind: 'bookmark',
      locator,
      content: { edge, pos, color: ultimoColorDeSeparador.current, label: '' },
      z: zNueva(lista ?? []),
      removed: false,
      locked: false,
      created_at: t,
      updated_at: t,
    });
    elegir(id_);
  };

  const guardarSeparador = (cambio: CambioDeSeparador) => {
    const a = separador;
    elegir(null);
    if (!a) return;
    ultimoColorDeSeparador.current = cambio.color;
    const antes = separadorDe(a);
    if (cambio.edge !== antes.edge || cambio.pos !== antes.pos || cambio.label !== antes.label || cambio.color !== colorDe(a)) {
      cambiar(a, { content: { ...a.content, ...cambio } });
    }
  };

  const quitarSeparador = () => {
    if (!separador) return;
    editor.borrar(separador);
    elegir(null);
  };

  const irASeparador = (idSeparador: string) => {
    const a = lista?.find((x) => x.id === idSeparador);
    const destino = a && destinoDe(a.locator);
    if (destino) motor.current?.send({ type: 'goTo', ...destino });
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
  // Las pestañas del canto: todos los separadores, a la altura de su lugar en el libro.
  const pestanasDelCanto = (lista ?? [])
    .filter((a) => a.kind === 'bookmark' && !a.removed)
    .flatMap((a) => {
      const lugar = lugarEnElLibro(a, porPagina ? total : null);
      if (lugar === null) return [];
      const donde = typeof a.locator.page === 'number' ? l.progressPage(a.locator.page, total) : l.progressPercent(Math.round(lugar * 100));
      return [{ id: a.id, lugar, color: colorDe(a) ?? COLOR_DE_POSTIT, palabra: separadorDe(a).label, donde }];
    });

  // En PDF la barra va de la primera a la última página: su punto y su etiqueta salen de la misma
  // cuenta, para que "p. 4" en el texto sea la página 4 de verdad. En EPUB, la fracción del motor.
  const paginaEn = (f: number) => Math.min(total, Math.max(1, Math.round(f * (total - 1)) + 1));
  const fraccion = porPagina ? ((posicion?.page ?? 1) - 1) / (total - 1) : (posicion?.fraction ?? item.data?.progress ?? 0);
  // Con dos páginas a la vista (libro real), "pp. 2–3 de 340" mientras no se arrastre la barra.
  const etiqueta = (f: number) =>
    porPagina && forma === 'book' && f === fraccion && posicion?.pageEnd
      ? l.progressPages(posicion.page ?? 1, posicion.pageEnd, total)
      : porPagina
        ? l.progressPage(paginaEn(f), total) + (f === fraccion && posicion?.screens ? ` · ${l.progressScreen(posicion.screen ?? 1, posicion.screens)}` : '')
        : l.progressPercent(Math.round(f * 100));
  const saltar = (f: number) => motor.current?.send(porPagina ? { type: 'goTo', page: paginaEn(f) } : { type: 'goTo', fraction: f });

  const cerrarBusqueda = () => {
    setBuscando(false);
    setConsulta('');
    setResultado(null);
    motor.current?.send({ type: 'searchClear' });
  };

  const siguiente = item.data && ofrecerSiguiente === 'visible' ? siguienteDeSaga(item.data, todas.data ?? []) : null;

  // Las fichas del libro (RF-BF4): las de la portada y la primera página asoman al empezar; las de la última
  // página y la contraportada, al terminar. Sin ninguna, al terminar se ofrece llenarla (RF-BF6).
  const fichasDelLibro = (fichas.data ?? []).filter((f) => f.item_id === id);
  const vigentesDeFicha = plantillasVigentes(plantillasDeFicha.data ?? []);
  const alEmpezar = !!posicion && (posicion.page ? posicion.page <= 1 : posicion.fraction <= 0.01);
  const alTerminarlo = !!posicion && cambioDePosicion(posicion).progress >= 1;
  const asoman = abierto
    ? fichasDelLibro.flatMap((f) => {
        const p = plantillasDeFicha.data?.find((x) => x.id === f.template_id);
        return p && ((alEmpezar && alInicio(f.placement)) || (alTerminarlo && alFinal(f.placement))) ? [{ f, p }] : [];
      })
    : [];
  const ofrecerLlenar = abierto && ofrecerFicha === 'visible' && !fichasDelLibro.length && vigentesDeFicha.length > 0 && fichas.isSuccess;
  const abrirFicha = (plantilla: string) => router.push({ pathname: '/(app)/card/[itemId]', params: { itemId: id, plantilla } });
  const llenarFicha = () => {
    setOfrecerFicha('cerrado');
    if (vigentesDeFicha.length === 1) abrirFicha(vigentesDeFicha[0].id);
    else setEligiendoFicha(true);
  };
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
              onFragmento={guardarFragmentoDeTexto}
              onCerrar={soltarSeleccion}
            />
          ) : !mensajeError && lapizPuesto ? (
            <PenToolbar
              lapiz={lapiz}
              tinta={tinta}
              onHerramienta={(tool) => setLapiz({ ...lapiz, tool })}
              onAjustes={() => setAjustandoLapiz(true)}
              // Siempre se puede: el motor quita primero el trazo que aún no se guarda.
              puedeDeshacer
              puedeRehacer={editor.puedeRehacer}
              onDeshacer={() => motor.current?.send({ type: 'penUndo' })}
              onRehacer={editor.rehacer}
              onListo={() => setDibujando(false)}
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
                if (h) setRecortando(false);
                setHerramienta(h);
              }}
              onLapiz={() => {
                if (seleccionada) elegir(null);
                setHerramienta(null);
                setRecortando(false);
                setDibujando(true);
              }}
              recortando={recortando}
              onRecortar={() => {
                if (seleccionada) elegir(null);
                setHerramienta(null);
                setRecortando((r) => !r);
              }}
              onDeshacer={editor.deshacer}
              onRehacer={editor.rehacer}
              onEscribir={() => seleccionada && motor.current?.send({ type: 'write', id: seleccionada.id })}
              onEstilo={() => setEstiloDeId(seleccionada?.id ?? null)}
              onGirar={() => seleccionada && cambiar(seleccionada, { content: { ...seleccionada.content, rot: (giroDe(seleccionada) + 90) % 360 } })}
              onDoblar={() => seleccionada && cambiar(seleccionada, { content: { ...seleccionada.content, folded: seleccionada.content.folded !== true } })}
              onImagen={() => (PUEDE_TOMAR_FOTO ? setEligiendoImagen(true) : void elegirImagen('galeria'))}
              onSticker={() => setEligiendoSticker(true)}
              onSeparador={ponerSeparador}
              onFrente={alFrente}
              onAtras={alFondo}
              onBloquear={() => seleccionada && cambiar(seleccionada, { locked: !seleccionada.locked })}
              onQuitar={() => quitar()}
              onListo={() => elegir(null)}
            />
          ) : null}
          <ReaderProgress
            fraction={fraccion}
            etiqueta={etiqueta}
            onJump={saltar}
            a11yLabel={r.progressA11y(
              porPagina && posicion?.screens ? `${l.progressPage(paginaEn(fraccion), total)}, ${l.progressScreenA11y(posicion.screen ?? 1, posicion.screens)}` : etiqueta(fraccion),
            )}
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
        {asoman.length || ofrecerLlenar || (siguiente && nombreSaga) ? (
          <View style={[styles.pila, { bottom: (superpuestos && barraAbajo ? altoAbajo : 0) + Spacing.sm }]} pointerEvents="box-none">
            {asoman.length ? (
              <View style={styles.asoman} pointerEvents="box-none">
                {asoman.map(({ f, p }) => (
                  <CardPeek key={f.id} ficha={f} plantilla={p} onPress={() => abrirFicha(p.id)} />
                ))}
              </View>
            ) : null}
            {ofrecerLlenar ? (
              <View style={[styles.siguiente, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityRole="alert">
                <AppText variant="bodyStrong" numberOfLines={2}>
                  {l.cards.offer.title(item.data?.title ?? '')}
                </AppText>
                <AppText variant="body" color="textSecondary">
                  {l.cards.offer.body}
                </AppText>
                <View style={styles.siguienteBotones}>
                  <Button title={l.cards.offer.later} variant="ghost" onPress={() => setOfrecerFicha('cerrado')} />
                  <Button title={l.cards.offer.fill} onPress={llenarFicha} />
                </View>
              </View>
            ) : null}
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
          </View>
        ) : null}
        {pastillaZoom}
        {abierto && !mensajeError ? <BookmarkRail pestanas={pestanasDelCanto} arriba={reservaArriba} abajo={reservaAbajo} onIr={irASeparador} /> : null}
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
      <StickerSheet
        visible={eligiendoSticker}
        quitados={quitados(lista ?? [])}
        propios={{ stickers: misStickers.data ?? [], imagenes: imagenesPropias }}
        onCrear={() => {
          setEligiendoSticker(false);
          setCreandoSticker(true);
        }}
        onBorrarPropio={(s) => void borrarStickerPropio(s)}
        onClose={() => setEligiendoSticker(false)}
        onElegir={(s) => pegarSticker(s)}
        onDevolver={(a, s) => pegarSticker(s, a)}
        onTirar={(a) => editor.borrar(a)}
      />
      <CreateStickerSheet
        visible={creandoSticker}
        onClose={() => setCreandoSticker(false)}
        procesar={procesarSticker}
        onGuardar={guardarStickerPropio}
        guardando={crearSticker.isPending}
      />
      <PegadoStyleSheet anotacion={deEstilo} colorPortada={item.data ? colorDeParte(item.data, 'front') : null} onClose={() => setEstiloDeId(null)} onGuardar={guardarEstilo} />
      <Sheet visible={eligiendoImagen} onClose={() => setEligiendoImagen(false)} title={tx.library.annotations.imageFrom}>
        <View style={styles.formas}>
          <Button title={tx.library.annotations.imageGallery} variant="secondary" onPress={() => void elegirImagen('galeria')} />
          <Button title={tx.library.annotations.imageCamera} variant="secondary" onPress={() => void elegirImagen('camara')} />
        </View>
      </Sheet>
      <BookmarkSheet anotacion={separador} onClose={() => elegir(null)} onGuardar={guardarSeparador} onQuitar={quitarSeparador} />
      <HighlightSheet anotacion={subrayado} onClose={() => elegir(null)} onGuardar={guardarSubrayado} onQuitar={quitarSubrayado} />
      <DefineSheet palabra={definiendo} idioma={idiomaLibro} onClose={() => setDefiniendo(null)} />
      <CardChooserSheet
        visible={eligiendoFicha}
        plantillas={vigentesDeFicha}
        onClose={() => setEligiendoFicha(false)}
        onElegir={(p) => {
          setEligiendoFicha(false);
          abrirFicha(p.id);
        }}
      />
      <PenSheet visible={ajustandoLapiz && lapizPuesto} lapiz={lapiz} tinta={tinta} onClose={() => setAjustandoLapiz(false)} onCambiar={setLapiz} />
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
  // Lo que aparece abajo del libro: las fichas que asoman, la invitación a llenar una y el siguiente de la saga.
  pila: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, gap: Spacing.sm },
  asoman: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, paddingRight: Spacing.lg },
  siguiente: {
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
