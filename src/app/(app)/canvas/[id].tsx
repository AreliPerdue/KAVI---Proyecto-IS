import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BookOpen,
  BringToFront,
  Camera,
  ArrowDownUp,
  ChartNoAxesColumn,
  Check,
  ChevronLeft,
  Copy,
  Frame,
  Group,
  Layers,
  LayoutTemplate,
  LibraryBig,
  ImagePlus,
  Lock,
  LockOpen,
  PaintBucket,
  Palette,
  Pencil,
  Plus,
  Redo2,
  RotateCw,
  Scissors,
  SendToBack,
  Shapes,
  Share,
  SquareDashedMousePointer,
  Star,
  Stamp,
  Sticker,
  SwatchBook,
  Trash2,
  Type,
  Undo2,
  Quote as IconoCita,
  Ungroup,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssetSheet } from '@/components/library/asset-sheet';
import { BookList } from '@/components/library/book-list';
import { type Cita, PolaroidSheet, QuoteSheet, RatingSheet } from '@/components/library/canvas-module-sheets';
import { CanvasStyleSheet } from '@/components/library/canvas-style-sheet';
import { ColorPickerSheet } from '@/components/library/color-picker-sheet';
import { FragmentSheet } from '@/components/library/fragment-sheet';
import { ReaderEngine, type ReaderEngineHandle } from '@/components/library/reader-engine';
import { type StickerElegible, StickerSheet } from '@/components/library/sticker-sheet';
import { ActionRow, AppText, Button, ErrorState, IconButton, LoadingState, Segmented, Sheet, TextField } from '@/components/ui';
import type { AssetDeLienzo } from '@/constants/canvas-assets';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useLibraryImageUrls, useUploadAnnotationImage } from '@/hooks/use-annotations';
import { useDatosDeBiblioteca } from '@/hooks/use-canvas-sources';
import { useSaveCanvasTemplate } from '@/hooks/use-canvas-templates';
import { useCanvas, useCanvasEditor, useLimpiarImagenesDeLienzo } from '@/hooks/use-canvases';
import { useLibraryItem, useLibraryItems } from '@/hooks/use-library';
import { useStickerPacks, useStickerSources } from '@/hooks/use-sticker-packs';
import { useTheme } from '@/hooks/use-theme';
import { useUserStickerImages, useUserStickers, useUserStickerSources } from '@/hooks/use-user-stickers';
import { useT } from '@/i18n';
import { uuidv4 } from '@/lib/gym/ids';
import {
  agregar,
  agrupar,
  aMotor,
  archivosDeImagenes,
  bloquear,
  CON_TRATAMIENTO,
  cambiar,
  capa,
  conEstilo,
  conFondo,
  conSentido,
  conSuGrupo,
  desagrupar,
  duplicar,
  type ElementoDeLienzo,
  FOTOS_DE_POLAROID,
  type LibroEnLienzo,
  mover,
  MUESTRA_SIN_COLOR,
  PROPORCION_DE_DATO,
  PROPORCION_DE_MUESTRA,
  PROPORCION_DE_POLAROID,
  PROPORCION_DE_RATING,
  proporcionDePagina,
  quitar,
  SENTIDOS,
  rutasDeImagenes,
  TRATAMIENTOS,
  type VarianteDePolaroid,
} from '@/lib/library/canvas';
import { archivoDeExportacion, nombreDeExportacion } from '@/lib/library/canvas-export';
import { comoPlantilla } from '@/lib/library/canvas-templates';
import { fondoDeCara, portadaValida, proporcionDeCara } from '@/lib/library/journal';
import { DATOS_DE_BIBLIOTECA, type DatoDeBiblioteca } from '@/lib/library/journal-stats';
import { PAPEL_DE_LIENZO, TINTA_DE_TEXTO } from '@/lib/library/canvas-shapes';
import { luminance } from '@/lib/color';
import { prepararImagenPegada } from '@/lib/library/cover/prepare';
import { desdeCamara, desdeGaleria, PUEDE_TOMAR_FOTO } from '@/lib/library/cover/sources';
import { FORMAS_DE_LIENZO, type FormaDeLienzo, type Herramienta, type MensajeDelMotor } from '@/lib/library/reader-protocol';
import { colorDePortada, rutaDePortada } from '@/lib/library/shelf';
import { fuenteDeSticker } from '@/lib/library/sticker-packs';
import { shareImage } from '@/lib/share';
import { useAuth, useSnackbar } from '@/providers';
import type { LibraryClip, LibraryLocator } from '@/types/domain';

type PorPegar = {
  forma?: FormaDeLienzo;
  imagen?: { jpeg: Uint8Array; ar: number; vistaPrevia: string };
  sticker?: StickerElegible;
  /** Módulos (T343) y assets (T343b). */
  asset?: AssetDeLienzo;
  variante?: VarianteDePolaroid;
  cita?: Cita;
  libro?: string;
  /** Un dato de la biblioteca (T349). */
  dato?: { stat: DatoDeBiblioteca; year: number | null };
};
/** Una imagen elegida va a pegarse sola o a un hueco de una polaroid. */
type DestinoDeImagen = { polaroid: string; hueco: number } | null;

/**
 * El lienzo creativo (spec 13h; T351): un recorte de un libro. Es una página en blanco 1 : √2 que arma el motor del
 * lector (RF-CC4), así que se acerca, se desplaza y se ve igual que un PDF; sus elementos son lo pegado encima:
 * texto, imagen, forma y sticker (RF-CC14). Todo se mueve, se estira, se gira, cambia de capa, se bloquea, se
 * duplica, se agrupa y se quita (RF-CC8, RF-CC9), con deshacer y rehacer, y se guarda solo, también sin red
 * (RF-CC10). En C2 (T342): "+ Agregar" (RF-CC19), el color del fondo y de cada pieza con su opacidad, borde y
 * sombra (RF-CC12), cambiar el nombre y exportar la página como imagen (RF-CC25).
 *
 * También decora las tapas de un Journal (13i, RF-JC10; T346): la página tiene la forma de esa cara (el lomo es alto y
 * angosto) y su fondo es el material del Journal. Ahí no se cambia el fondo (es el material, que se elige en "Editar
 * Journal"), ni se guarda como plantilla o se exporta; su nombre es el de la cara.
 */
export default function CanvasScreen() {
  const { id, item } = useLocalSearchParams<{ id: string; item: string }>();
  const theme = useTheme();
  const tx = useT();
  const c = tx.library.canvas;
  const a = tx.library.annotations;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const avisar = useSnackbar();
  const lienzo = useCanvas(id, item);
  const editor = useCanvasEditor(lienzo.data);
  const { doc, aplicar } = editor;
  const motor = useRef<ReaderEngineHandle>(null);
  // Cuántas veces abrió el motor la página: cada vez que la abre empieza vacía y hay que mandarle lo pegado otra vez
  // (si se abre de nuevo, p. ej. cuando llega el Journal de una tapa, lo de antes ya no está).
  const [aperturas, setAperturas] = useState(0);
  const abierto = aperturas > 0;

  const [herramienta, setHerramienta] = useState<Herramienta>(null);
  const porPegar = useRef<PorPegar>({});
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [varios, setVarios] = useState(false);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [eligiendoForma, setEligiendoForma] = useState(false);
  const [eligiendoImagen, setEligiendoImagen] = useState(false);
  const [eligiendoSticker, setEligiendoSticker] = useState(false);
  const [vistasPrevias, setVistasPrevias] = useState<ReadonlyMap<string, string>>(new Map());
  const subirImagen = useUploadAnnotationImage();
  const limpiarImagenes = useLimpiarImagenesDeLienzo();
  const [agregando, setAgregando] = useState(false);
  const [conEstiloAbierto, setConEstiloAbierto] = useState(false);
  /** De qué se está eligiendo el color: el fondo, lo elegido o su borde. */
  const [colorDe, setColorDe] = useState<'fondo' | 'elemento' | 'borde' | null>(null);
  const [exportando, setExportando] = useState(false);
  const [renombrando, setRenombrando] = useState<string | null>(null);
  // Módulos (T343): qué hoja está abierta y para qué.
  const [polaroidPara, setPolaroidPara] = useState<'nueva' | 'cambiar' | null>(null);
  const [citaPara, setCitaPara] = useState<'nueva' | 'editar' | null>(null);
  const [calificando, setCalificando] = useState(false);
  const [libroPara, setLibroPara] = useState<'nuevo' | 'cambiar' | null>(null);
  const [huecoPara, setHuecoPara] = useState<string | null>(null);
  const [pieDe, setPieDe] = useState<{ id: string; texto: string } | null>(null);
  const [eligiendoAsset, setEligiendoAsset] = useState(false);
  // Guardar como plantilla (T344): el nombre que se está escribiendo, o `null` con la hoja cerrada.
  const [nombrePlantilla, setNombrePlantilla] = useState<string | null>(null);
  // El acabado de lo elegido en una tapa (T348).
  const [eligiendoAcabado, setEligiendoAcabado] = useState(false);
  // Un dato de la biblioteca, nuevo o para cambiar el elegido; el nombre de una muestra; pegar un fragmento (T349).
  const [datoPara, setDatoPara] = useState<'nuevo' | 'cambiar' | null>(null);
  const [anioDelDato, setAnioDelDato] = useState<'year' | 'all'>('year');
  const [nombreDeMuestra, setNombreDeMuestra] = useState<{ id: string; texto: string } | null>(null);
  const [eligiendoFragmento, setEligiendoFragmento] = useState(false);
  // El sentido del texto elegido en una tapa (T363).
  const [eligiendoSentido, setEligiendoSentido] = useState(false);
  const guardarPlantilla = useSaveCanvasTemplate();
  const destinoDeImagen = useRef<DestinoDeImagen>(null);
  const piezas = useLibraryItems();
  // Una tapa del Journal (T346): su cara y el Journal, que da su forma y su material.
  const cara = lienzo.data?.context === 'cover' ? (lienzo.data.face ?? null) : null;
  const journal = useLibraryItem(cara ? item : '');
  const portada = cara && journal.data ? portadaValida(journal.data.journal) : null;
  const tj = tx.library.journal;

  // Las direcciones de lo que se ve: imágenes subidas (o su vista previa mientras suben) y stickers.
  // Los libros que hay en el recorte (RF-CC22): su título, color y portada.
  const claveIdsDeLibros = [...new Set(doc.elements.flatMap((e) => (e.type === 'book' && e.content.itemId ? [e.content.itemId] : [])))].sort().join('|');
  const librosDelRecorte = useMemo(() => {
    const ids = new Set(claveIdsDeLibros ? claveIdsDeLibros.split('|') : []);
    return (piezas.data ?? []).filter((p) => ids.has(p.id));
  }, [piezas.data, claveIdsDeLibros]);
  const rutas = [...rutasDeImagenes(doc.elements), ...librosDelRecorte.flatMap((p) => (rutaDePortada(p) ? [rutaDePortada(p) as string] : []))];
  const urls = useLibraryImageUrls(rutas);
  const stickers = doc.elements.flatMap((e) => (e.type === 'sticker' && e.content.sticker ? [e.content.sticker] : []));
  const claveStickers = stickers.join('|');
  const packs = useStickerPacks();
  const losPacks = packs.data?.packs;
  const misStickers = useUserStickers();
  const imagenesPropias = useUserStickerImages(misStickers.data);
  const fuentesPropias = useUserStickerSources(stickers, imagenesPropias);
  const fuentesTienda = useStickerSources(
    stickers.filter((s) => !s.startsWith('nobi-pink/')),
    packs.data?.packs,
  );
  // Los datos de la biblioteca puestos, contados en vivo (RF-CC22; T349).
  const datos = useDatosDeBiblioteca(doc.elements);
  const fuentes = useMemo(() => {
    const imagenes = new Map(urls);
    for (const [ruta, vista] of vistasPrevias) if (!imagenes.has(ruta)) imagenes.set(ruta, vista);
    const deStickers = new Map<string, string>();
    for (const s of new Set(claveStickers ? claveStickers.split('|') : [])) {
      const src = fuenteDeSticker(s, fuentesTienda, losPacks, fuentesPropias);
      if (src) deStickers.set(s, src);
    }
    const libros = new Map<string, LibroEnLienzo>();
    for (const p of librosDelRecorte) {
      const ruta = rutaDePortada(p);
      libros.set(p.id, { title: p.title, color: colorDePortada(p), ...(ruta && urls.get(ruta) ? { src: urls.get(ruta) } : {}) });
    }
    return { imagenes, stickers: deStickers, libros, datos };
  }, [urls, vistasPrevias, claveStickers, librosDelRecorte, fuentesTienda, fuentesPropias, losPacks, datos]);

  // Abrir la página en blanco con su forma (RF-CC4), una vez por lienzo. El lomo de un Journal, con la suya (T346).
  // Una tapa sigue la forma del Journal aunque se haya cambiado después de decorarla.
  const orientacion = cara ? portada?.orientation : lienzo.data?.orientation;
  const paginas = lienzo.data?.doc.pages ?? 1;
  const esperaJournal = !!cara && !portada;
  const aspecto = cara === 'spine' && portada && journal.data ? proporcionDeCara(portada.orientation, 'spine', journal.data.page_count) : null;
  useEffect(() => {
    if (!orientacion || esperaJournal) return;
    // La página entera a la vista, para componer (RF-CC4): como "páginas de lado" del lector.
    motor.current?.send({ type: 'openCanvas', orientation: orientacion, pages: paginas, mode: 'paged', ...(aspecto ? { aspect: aspecto } : {}) });
    // Solo al llegar el lienzo: agregar páginas es de una fase posterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, orientacion, esperaJournal, aspecto]);

  // Lo que se pinta encima: cada vez que cambia el documento o llega una dirección.
  // En una tapa, lo recortado deja ver las hojas del Journal, de su color (T348).
  const papel = cara && journal.data ? portadaValida(journal.data.journal).edges : undefined;
  const enMotor = useMemo(() => aMotor(doc, fuentes, papel), [doc, fuentes, papel]);
  useEffect(() => {
    if (aperturas) motor.current?.send({ type: 'annotations', items: enMotor });
  }, [aperturas, enMotor]);

  // El color de la página (RF-CC12); en una tapa, el material del Journal con su color (T346).
  const fondo = doc.background ?? null;
  const material = cara && portada ? fondoDeCara(portada, cara) : null;
  const colorDeMaterial = material?.color;
  const nombreDeMaterial = material?.material;
  useEffect(() => {
    if (!aperturas) return;
    motor.current?.send({ type: 'canvasBackground', color: colorDeMaterial && nombreDeMaterial ? { color: colorDeMaterial, material: nombreDeMaterial } : fondo });
  }, [aperturas, fondo, colorDeMaterial, nombreDeMaterial]);

  /** Quitar del documento y dejar que el archivo de sus imágenes se borre en una hora, si no se deshace (T342). */
  const quitarElementos = (ids: string[]) => {
    const fuera = conSuGrupo(doc, ids);
    aplicar((d) => quitar(d, fuera));
    limpiarImagenes(item, id, archivosDeImagenes(doc.elements.filter((e) => fuera.includes(e.id))));
  };

  const elegido = doc.elements.find((e) => e.id === seleccion) ?? null;
  const juntos = elegido ? conSuGrupo(doc, [elegido.id, ...(varios ? elegidos : [])]) : [];
  const enGrupo = !!elegido?.group;

  const elegir = (id: string | null, tambien: string[] = []) => {
    setSeleccion(id);
    setElegidos(id ? tambien : []);
    motor.current?.send({ type: 'select', id, also: tambien });
  };
  const soltar = () => {
    setVarios(false);
    elegir(null);
  };

  const ponerHerramienta = (h: Herramienta, ar?: number) => {
    setHerramienta(h);
    if (h) soltar();
    motor.current?.send({ type: 'tool', tool: h, ...(ar ? { ar } : {}) });
  };

  /** Pegar donde se tocó lo que la herramienta trae, hasta arriba (RF-CC14). */
  const pegar = (locator: LibraryLocator) => {
    const tipo = herramienta;
    const pendiente = porPegar.current;
    porPegar.current = {};
    ponerHerramienta(null);
    if (!tipo) return;
    const nuevoId = uuidv4();
    const base: Omit<ElementoDeLienzo, 'z' | 'type'> = {
      id: nuevoId,
      page: locator.page ?? 1,
      x: locator.x ?? 0.1,
      y: locator.y ?? 0.1,
      w: locator.w ?? 0.3,
      ar: locator.ar ?? 1,
      rot: 0,
      locked: false,
      group: null,
      style: {},
      content: {},
    };
    if (tipo === 'textbox') {
      // En una tapa (T346), claro u oscuro según el material para que se lea, y un poco más grande.
      const tinta = colorDeMaterial && luminance(colorDeMaterial) < 0.3 ? PAPEL_DE_LIENZO : TINTA_DE_TEXTO;
      // En el lomo (T363), como en los libros en español: vertical de abajo arriba, a lo ancho del lomo y de buen largo.
      const enLomo = cara === 'spine' && aspecto ? { x: 0.1, w: 0.8, ar: (0.6 * aspecto) / 0.8, y: Math.min(0.38, Math.max(0.02, base.y - 0.3)) } : null;
      aplicar((d) =>
        agregar(d, {
          ...base,
          ...enLomo,
          type: 'textbox',
          style: { color: tinta, ...(cara ? { size: 1.6 } : {}), ...(enLomo ? { direction: 'up' as const } : {}) },
          content: { text: '' },
        }),
      );
      elegir(nuevoId);
      motor.current?.send({ type: 'write', id: nuevoId });
      return;
    }
    if (tipo === 'shape') {
      aplicar((d) => agregar(d, { ...base, type: 'shape', content: { shape: pendiente.forma ?? 'rect' } }));
      elegir(nuevoId);
      return;
    }
    if (tipo === 'sticker' && pendiente.sticker) {
      const s = pendiente.sticker;
      const nombres = tx.library.stickers.names as Record<string, string>;
      aplicar((d) => agregar(d, { ...base, type: 'sticker', content: { sticker: s.id, label: nombres[s.nombre] ?? s.nombre } }));
      elegir(nuevoId);
      return;
    }
    if (tipo === 'asset' && pendiente.asset) {
      const asset = pendiente.asset;
      aplicar((d) => agregar(d, { ...base, type: 'asset', ar: asset.ar, content: { asset: asset.id, label: tx.library.canvas.assets.names[asset.nombre], mode: asset.modo } }));
      elegir(nuevoId);
      return;
    }
    if (tipo === 'polaroid') {
      const variant = pendiente.variante ?? 'classic';
      aplicar((d) => agregar(d, { ...base, type: 'polaroid', ar: PROPORCION_DE_POLAROID[variant], content: { variant, paths: [], text: '' } }));
      elegir(nuevoId);
      return;
    }
    if (tipo === 'quote' && pendiente.cita) {
      const cita = pendiente.cita;
      aplicar((d) => agregar(d, { ...base, type: 'quote', w: Math.max(base.w, 0.5), ar: 0.6, content: cita }));
      elegir(nuevoId);
      return;
    }
    if (tipo === 'rating') {
      aplicar((d) => agregar(d, { ...base, type: 'rating', w: Math.max(base.w, 0.4), ar: PROPORCION_DE_RATING.stars, content: { scale: 'stars', value: 0 } }));
      elegir(nuevoId);
      setCalificando(true);
      return;
    }
    if (tipo === 'stat' && pendiente.dato) {
      const dato = pendiente.dato;
      aplicar((d) => agregar(d, { ...base, type: 'stat', w: Math.max(base.w, 0.32), ar: PROPORCION_DE_DATO, content: dato }));
      elegir(nuevoId);
      return;
    }
    if (tipo === 'swatch') {
      // Una muestra nace en un neutro y pide su color de una vez.
      aplicar((d) => agregar(d, { ...base, type: 'swatch', ar: PROPORCION_DE_MUESTRA, style: { color: MUESTRA_SIN_COLOR }, content: { text: '' } }));
      elegir(nuevoId);
      setColorDe('elemento');
      return;
    }
    if (tipo === 'book' && pendiente.libro) {
      const libro = pendiente.libro;
      aplicar((d) => agregar(d, { ...base, type: 'book', ar: 1.5, content: { itemId: libro } }));
      elegir(nuevoId);
      return;
    }
    if (tipo === 'image' && pendiente.imagen && userId) {
      const imagen = pendiente.imagen;
      // En la carpeta del libro, como las imágenes pegadas al leer (T289).
      const ruta = `${userId}/${item}/anotaciones/${nuevoId}.jpg`;
      setVistasPrevias((v) => new Map(v).set(ruta, imagen.vistaPrevia));
      aplicar((d) => agregar(d, { ...base, type: 'image', content: { path: ruta } }));
      elegir(nuevoId);
      subirImagen(item, nuevoId, imagen.jpeg).catch(() => {
        aplicar((d) => quitar(d, [nuevoId]));
        avisar({ message: a.imageFailed });
      });
    }
  };

  const alMensaje = (m: MensajeDelMotor) => {
    switch (m.type) {
      case 'opened':
        setAperturas((n) => n + 1);
        return;
      case 'place':
        pegar(m.locator);
        return;
      case 'move':
        aplicar((d) => mover(d, m.id, m.locator, m.rot));
        return;
      case 'moves':
        aplicar((d) => m.items.reduce((acc, x) => mover(acc, x.id, x.locator), d));
        return;
      case 'rotate':
        aplicar((d) => cambiar(d, m.id, { rot: m.rot }));
        return;
      case 'text': {
        // Un texto que se queda vacío se quita, como en el libro (T289).
        const e = doc.elements.find((x) => x.id === m.id);
        if (!e) return;
        if (!m.text.trim()) aplicar((d) => quitar(d, [m.id]));
        else if (m.text !== e.content.text) aplicar((d) => cambiar(d, m.id, { content: { text: m.text } }));
        return;
      }
      case 'select':
        if (varios && seleccion && m.id && m.id !== seleccion) {
          const otros = elegidos.includes(m.id) ? elegidos.filter((x) => x !== m.id) : [...elegidos, m.id];
          elegir(seleccion, otros);
        } else {
          setSeleccion(m.id);
          setElegidos([]);
          if (!m.id) setVarios(false);
        }
        return;
      case 'edit': {
        // Doble toque: un texto se escribe ahí mismo; un módulo abre su hoja (T343).
        const e = doc.elements.find((x) => x.id === m.id);
        elegir(m.id);
        if (e?.type === 'polaroid') pedirFoto(e);
        else if (e?.type === 'quote') setCitaPara('editar');
        else if (e?.type === 'rating') setCalificando(true);
        else if (e?.type === 'book') setLibroPara('cambiar');
        else if (e?.type === 'stat') setDatoPara('cambiar');
        else if (e?.type === 'swatch') setNombreDeMuestra({ id: e.id, texto: e.content.text ?? '' });
        else motor.current?.send({ type: 'write', id: m.id });
        return;
      }
      case 'remove':
        quitarElementos([m.id]);
        soltar();
        return;
      case 'exported':
        void compartir(m);
        return;
      default:
        return;
    }
  };

  /**
   * Pegar un fragmento (RF-CC24; T349): uno de texto, como cita con su página (y su libro, si es de otro); uno de
   * imagen, como imagen. La imagen se copia al recorte: si después se borra el fragmento, el recorte no la pierde.
   */
  const pegarFragmento = async (f: LibraryClip, url: string | null) => {
    setEligiendoFragmento(false);
    if (f.kind === 'text') {
      const deOtro = lienzo.data?.context !== 'book' || f.item_id !== item;
      porPegar.current = {
        cita: { text: f.text ?? '', who: deOtro ? f.book_title : '', chapter: f.locator.page ? c.fragmentPage(f.locator.page) : '', note: f.note ?? '' },
      };
      ponerHerramienta('quote', 0.6);
      return;
    }
    if (!url) return;
    try {
      const respuesta = await fetch(url);
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      const jpeg = new Uint8Array(await respuesta.arrayBuffer());
      porPegar.current = { imagen: { jpeg, ar: f.ar ?? 1, vistaPrevia: url } };
      ponerHerramienta('image', f.ar ?? 1);
    } catch {
      avisar({ message: c.fragmentFailed });
    }
  };

  const elegirImagen = async (origen: 'galeria' | 'camara') => {
    setEligiendoImagen(false);
    try {
      const uri = origen === 'camara' ? await desdeCamara() : await desdeGaleria();
      if (!uri) return;
      const lista = await prepararImagenPegada(uri);
      const destino = destinoDeImagen.current;
      destinoDeImagen.current = null;
      if (destino) {
        ponerFoto(destino.polaroid, destino.hueco, lista);
        return;
      }
      porPegar.current = { imagen: { jpeg: lista.jpeg, ar: lista.alto / lista.ancho, vistaPrevia: lista.vistaPrevia } };
      ponerHerramienta('image', lista.alto / lista.ancho);
    } catch (e) {
      avisar({ message: e instanceof Error ? e.message : a.imageFailed });
    }
  };

  /** Elegir de dónde sale una imagen: en la web, un archivo; en el teléfono, galería o cámara. */
  const buscarImagen = (destino: DestinoDeImagen) => {
    destinoDeImagen.current = destino;
    if (Platform.OS === 'web') void elegirImagen('galeria');
    else setEligiendoImagen(true);
  };

  /** Una polaroid de una foto la recibe directo; de varias, primero se elige el hueco. */
  const pedirFoto = (e: ElementoDeLienzo) => {
    if (FOTOS_DE_POLAROID[e.content.variant ?? 'classic'] > 1) setHuecoPara(e.id);
    else buscarImagen({ polaroid: e.id, hueco: 0 });
  };

  /** La foto de un hueco de una polaroid (T343): se sube como las imágenes y la de antes se deja para borrarse. */
  const ponerFoto = (elId: string, hueco: number, imagen: { jpeg: Uint8Array; vistaPrevia: string }) => {
    const e = doc.elements.find((x) => x.id === elId);
    if (!e || !userId) return;
    const fotoId = uuidv4();
    const ruta = `${userId}/${item}/anotaciones/${fotoId}.jpg`;
    const antes = e.content.paths ?? [];
    const paths = Array.from({ length: FOTOS_DE_POLAROID[e.content.variant ?? 'classic'] }, (_, i) => (i === hueco ? ruta : (antes[i] ?? '')));
    setVistasPrevias((v) => new Map(v).set(ruta, imagen.vistaPrevia));
    aplicar((d) => cambiar(d, elId, { content: { paths } }));
    if (antes[hueco]) limpiarImagenes(item, id, archivosDeImagenes([{ ...e, content: { ...e.content, paths: [antes[hueco]] } }]));
    subirImagen(item, fotoId, imagen.jpeg).catch(() => {
      aplicar((d) => cambiar(d, elId, { content: { paths: paths.map((r) => (r === ruta ? '' : r)) } }));
      avisar({ message: a.imageFailed });
    });
  };

  const cambiarPolaroid = (variant: VarianteDePolaroid) => {
    setPolaroidPara(null);
    if (!elegido || elegido.type !== 'polaroid') return;
    const sobran = (elegido.content.paths ?? []).slice(FOTOS_DE_POLAROID[variant]).filter(Boolean);
    aplicar((d) => cambiar(d, elegido.id, { ar: PROPORCION_DE_POLAROID[variant], content: { variant } }));
    limpiarImagenes(item, id, archivosDeImagenes([{ ...elegido, content: { ...elegido.content, paths: sobran } }]));
  };

  // ─── Lo que se le hace a lo elegido (RF-CC9): a todo lo que va junto ──────────
  const acciones = {
    alFrente: () => aplicar((d) => capa(d, juntos, 'front')),
    atras: () => aplicar((d) => capa(d, juntos, 'back')),
    bloquear: () => aplicar((d) => bloquear(d, juntos, !elegido?.locked)),
    duplicar: () => {
      let nuevos: string[] = [];
      aplicar((d) => {
        const r = duplicar(d, juntos, uuidv4);
        nuevos = r.ids;
        return r.doc;
      });
      setVarios(false);
      if (nuevos[0]) elegir(nuevos[0]);
    },
    agrupar: () => {
      aplicar((d) => agrupar(d, juntos, uuidv4()));
      setVarios(false);
      if (elegido) elegir(elegido.id);
    },
    desagrupar: () => {
      aplicar((d) => desagrupar(d, juntos));
      if (elegido) elegir(elegido.id);
    },
    quitar: () => {
      quitarElementos(juntos);
      soltar();
    },
  };

  /** La imagen del recorte (RF-CC25): el motor la dibuja y aquí se comparte (o se descarga en la web). */
  const exportar = () => {
    soltar();
    setExportando(true);
    motor.current?.send({ type: 'export', width: 1600 });
  };
  const compartir = async (m: Extract<MensajeDelMotor, { type: 'exported' }>) => {
    setExportando(false);
    if ('error' in m) {
      avisar({ message: c.exportFailed });
      return;
    }
    try {
      const nombre = nombreDeExportacion(editor.titulo, c.title);
      const r = await shareImage(archivoDeExportacion(m.dataUrl, nombre), nombre);
      if (r === 'downloaded') avisar({ message: c.exported });
    } catch {
      avisar({ message: c.exportFailed });
    }
  };

  const elegirColor = (hex: string | null) => {
    const de = colorDe;
    setColorDe(null);
    if (de === 'fondo') aplicar((d) => conFondo(d, hex));
    else if (de === 'elemento') aplicar((d) => conEstilo(d, juntos, { color: hex ?? undefined }));
    else if (de === 'borde') aplicar((d) => conEstilo(d, juntos, { border: hex ? { width: elegido?.style.border?.width ?? 0.004, color: hex } : undefined }));
  };
  // El fondo sin color es el papel blanco: el selector empieza ahí.
  const colorActual = colorDe === 'fondo' ? (fondo ?? PAPEL_DE_LIENZO) : colorDe === 'elemento' ? (elegido?.style.color ?? null) : colorDe === 'borde' ? (elegido?.style.border?.color ?? null) : null;

  const icono = (Icono: typeof Type, color: string = theme.text) => <Icono size={IconSize.action} strokeWidth={IconStroke} color={color} />;
  const volver = () => {
    editor.guardarYa();
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/library');
  };

  if (lienzo.isError && !lienzo.data) {
    return (
      <View style={[styles.pantalla, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.barra}>
          <IconButton label={tx.common.back} onPress={volver}>
            {icono(ChevronLeft)}
          </IconButton>
        </View>
        <ErrorState message={c.notFound} onRetry={() => void lienzo.refetch()} />
      </View>
    );
  }

  const tituloVisible = cara ? `${tj.faces[cara]} · ${journal.data?.title ?? ''}` : editor.titulo || c.untitled;
  const aviso = exportando ? c.exporting : herramienta === 'textbox' ? a.textboxOn : herramienta === 'image' ? a.imageOn : herramienta === 'sticker' ? a.stickerOn : herramienta === 'shape' ? c.shapeOn : herramienta ? c.placeOn : null;

  return (
    <View style={[styles.pantalla, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={[styles.barra, { borderBottomColor: theme.border }]}>
        <IconButton label={tx.common.back} onPress={volver}>
          {icono(ChevronLeft)}
        </IconButton>
        {cara ? (
          <View style={styles.titulo}>
            <AppText variant="bodyStrong" numberOfLines={1} style={styles.centro} accessibilityRole="header">
              {tituloVisible}
            </AppText>
          </View>
        ) : (
          <Pressable
            style={styles.titulo}
            onPress={() => setRenombrando(editor.titulo)}
            accessibilityRole="button"
            accessibilityLabel={`${tituloVisible}. ${c.rename}`}>
            <AppText variant="bodyStrong" numberOfLines={1} style={styles.centro} accessibilityRole="header">
              {tituloVisible}
            </AppText>
          </Pressable>
        )}
        <IconButton label={a.undo} onPress={editor.deshacer} disabled={!editor.puedeDeshacer}>
          {icono(Undo2, editor.puedeDeshacer ? theme.text : theme.textTertiary)}
        </IconButton>
        <IconButton label={a.redo} onPress={editor.rehacer} disabled={!editor.puedeRehacer}>
          {icono(Redo2, editor.puedeRehacer ? theme.text : theme.textTertiary)}
        </IconButton>
      </View>

      <View style={styles.lienzo}>
        <ReaderEngine ref={motor} onMessage={alMensaje} />
        {!abierto ? (
          <View style={[styles.cubre, { backgroundColor: theme.background }]}>
            <LoadingState label={c.loading} />
          </View>
        ) : null}
      </View>

      <View style={[styles.abajo, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: insets.bottom + Spacing.sm }]}>
        {aviso ? (
          <View style={styles.aviso}>
            <AppText variant="label" color="textSecondary" style={styles.flex}>
              {aviso}
            </AppText>
            <IconButton label={a.cancelTool} onPress={() => ponerHerramienta(null)}>
              {icono(X)}
            </IconButton>
          </View>
        ) : elegido ? (
          <>
            <AppText variant="caption" color="textSecondary" style={styles.estado}>
              {varios ? `${c.chosen(juntos.length)} · ${c.selectManyOn}` : enGrupo ? c.grouped : elegido.locked ? a.lockedHint : ' '}
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
              {!varios && !elegido.locked && elegido.type === 'polaroid' ? (
                <>
                  <IconButton label={c.photo} onPress={() => pedirFoto(elegido)}>
                    {icono(Camera)}
                  </IconButton>
                  <IconButton label={c.captionAction} onPress={() => setPieDe({ id: elegido.id, texto: elegido.content.text ?? '' })}>
                    {icono(Type)}
                  </IconButton>
                  <IconButton label={c.changePolaroid} onPress={() => setPolaroidPara('cambiar')}>
                    {icono(Frame)}
                  </IconButton>
                </>
              ) : null}
              {!varios && !elegido.locked && elegido.type === 'quote' ? (
                <IconButton label={c.quoteEdit} onPress={() => setCitaPara('editar')}>
                  {icono(Pencil)}
                </IconButton>
              ) : null}
              {!varios && !elegido.locked && elegido.type === 'rating' ? (
                <IconButton label={c.ratingEdit} onPress={() => setCalificando(true)}>
                  {icono(Star)}
                </IconButton>
              ) : null}
              {!varios && elegido.type === 'book' && elegido.content.itemId ? (
                <>
                  <IconButton label={c.openBook} onPress={() => router.push({ pathname: '/(app)/book/[id]', params: { id: elegido.content.itemId as string } })}>
                    {icono(BookOpen)}
                  </IconButton>
                  {!elegido.locked ? (
                    <IconButton label={c.changeBook} onPress={() => setLibroPara('cambiar')}>
                      {icono(LibraryBig)}
                    </IconButton>
                  ) : null}
                </>
              ) : null}
              {!varios && !elegido.locked && elegido.type === 'stat' ? (
                <IconButton label={c.stats.change} onPress={() => setDatoPara('cambiar')}>
                  {icono(ChartNoAxesColumn)}
                </IconButton>
              ) : null}
              {!varios && !elegido.locked && elegido.type === 'swatch' ? (
                <IconButton label={c.swatchRename} onPress={() => setNombreDeMuestra({ id: elegido.id, texto: elegido.content.text ?? '' })}>
                  {icono(Type)}
                </IconButton>
              ) : null}
              {elegido.type === 'textbox' && !varios && !elegido.locked ? (
                <>
                  <IconButton label={c.rotate90} onPress={() => aplicar((d) => cambiar(d, elegido.id, { rot: (elegido.rot + 90) % 360 }))}>
                    {icono(RotateCw)}
                  </IconButton>
                  {cara ? (
                    <IconButton label={c.direction.title} onPress={() => setEligiendoSentido(true)}>
                      {icono(ArrowDownUp)}
                    </IconButton>
                  ) : null}
                </>
              ) : null}
              {elegido.type === 'textbox' && !varios && !elegido.locked ? (
                <IconButton label={a.write} onPress={() => motor.current?.send({ type: 'write', id: elegido.id })}>
                  {icono(Pencil)}
                </IconButton>
              ) : null}
              {cara && !elegido.locked && juntos.every((x) => CON_TRATAMIENTO.includes(doc.elements.find((e) => e.id === x)?.type ?? 'image')) ? (
                <IconButton label={c.finish.title} onPress={() => setEligiendoAcabado(true)}>
                  {icono(Stamp)}
                </IconButton>
              ) : null}
              <IconButton label={c.style.open} onPress={() => setConEstiloAbierto(true)}>
                {icono(Palette)}
              </IconButton>
              <IconButton label={a.toFront} onPress={acciones.alFrente}>
                {icono(BringToFront)}
              </IconButton>
              <IconButton label={a.toBack} onPress={acciones.atras}>
                {icono(SendToBack)}
              </IconButton>
              <IconButton label={elegido.locked ? a.unlock : a.lock} onPress={acciones.bloquear}>
                {icono(elegido.locked ? LockOpen : Lock)}
              </IconButton>
              <IconButton label={c.duplicate} onPress={acciones.duplicar}>
                {icono(Copy)}
              </IconButton>
              <IconButton label={c.selectMany} selected={varios} onPress={() => setVarios((v) => !v)}>
                {icono(SquareDashedMousePointer, varios ? theme.ink : theme.text)}
              </IconButton>
              {juntos.length > 1 && !enGrupo ? (
                <IconButton label={c.group} onPress={acciones.agrupar}>
                  {icono(Group)}
                </IconButton>
              ) : null}
              {enGrupo ? (
                <IconButton label={c.ungroup} onPress={acciones.desagrupar}>
                  {icono(Ungroup)}
                </IconButton>
              ) : null}
              <IconButton label={a.remove} onPress={acciones.quitar}>
                {icono(Trash2, theme.danger)}
              </IconButton>
              <Button title={a.done} variant="secondary" onPress={soltar} />
            </ScrollView>
          </>
        ) : (
          <View style={styles.fila} accessibilityLabel={c.tools}>
            <Button title={c.add} icon={icono(Plus, theme.onInk)} onPress={() => setAgregando(true)} />
            {cara ? null : (
              <>
                <IconButton label={c.background} onPress={() => setColorDe('fondo')}>
                  {icono(PaintBucket)}
                </IconButton>
                <IconButton label={c.templates.save} onPress={() => setNombrePlantilla(editor.titulo)} disabled={!doc.elements.length}>
                  {icono(LayoutTemplate, doc.elements.length ? theme.text : theme.textTertiary)}
                </IconButton>
                <IconButton label={c.export} onPress={exportar} disabled={exportando || !abierto}>
                  {icono(Share, exportando ? theme.textTertiary : theme.text)}
                </IconButton>
              </>
            )}
          </View>
        )}
      </View>

      <Sheet visible={agregando} onClose={() => setAgregando(false)} title={c.addTitle}>
        <ActionRow
          icon={icono(Type)}
          label={c.text}
          onPress={() => {
            setAgregando(false);
            ponerHerramienta('textbox');
          }}
        />
        <ActionRow
          icon={icono(ImagePlus)}
          label={c.image}
          onPress={() => {
            setAgregando(false);
            if (Platform.OS === 'web') void elegirImagen('galeria');
            else setEligiendoImagen(true);
          }}
        />
        <ActionRow
          icon={icono(Shapes)}
          label={c.shape}
          onPress={() => {
            setAgregando(false);
            setEligiendoForma(true);
          }}
        />
        <ActionRow
          icon={icono(Sticker)}
          label={c.sticker}
          onPress={() => {
            setAgregando(false);
            setEligiendoSticker(true);
          }}
        />
        <ActionRow
          icon={icono(Layers)}
          label={c.assets.title}
          onPress={() => {
            setAgregando(false);
            setEligiendoAsset(true);
          }}
        />
        <ActionRow
          icon={icono(Frame)}
          label={c.polaroid}
          onPress={() => {
            setAgregando(false);
            setPolaroidPara('nueva');
          }}
        />
        <ActionRow
          icon={icono(IconoCita)}
          label={c.quote}
          onPress={() => {
            setAgregando(false);
            setCitaPara('nueva');
          }}
        />
        <ActionRow
          icon={icono(Star)}
          label={c.rating}
          onPress={() => {
            setAgregando(false);
            ponerHerramienta('rating', PROPORCION_DE_RATING.stars);
          }}
        />
        <ActionRow
          icon={icono(BookOpen)}
          label={c.book}
          onPress={() => {
            setAgregando(false);
            setLibroPara('nuevo');
          }}
        />
        <ActionRow
          icon={icono(Scissors)}
          label={c.fragment}
          onPress={() => {
            setAgregando(false);
            setEligiendoFragmento(true);
          }}
        />
        <ActionRow
          icon={icono(ChartNoAxesColumn)}
          label={c.stat}
          onPress={() => {
            setAgregando(false);
            setAnioDelDato('year');
            setDatoPara('nuevo');
          }}
        />
        <ActionRow
          icon={icono(SwatchBook)}
          label={c.swatch}
          onPress={() => {
            setAgregando(false);
            ponerHerramienta('swatch', PROPORCION_DE_MUESTRA);
          }}
        />
      </Sheet>
      <Sheet visible={datoPara !== null} onClose={() => setDatoPara(null)} title={c.stats.title}>
        <View style={styles.renombrar}>
          <AppText variant="body" color="textSecondary">
            {c.stats.hint}
          </AppText>
          <Segmented
            options={[
              { value: 'year', label: c.stats.thisYear(new Date().getFullYear()) },
              { value: 'all', label: c.stats.always },
            ]}
            value={datoPara === 'cambiar' && elegido?.type === 'stat' ? (elegido.content.year === null || elegido.content.year === undefined ? 'all' : 'year') : anioDelDato}
            onChange={(v) => {
              setAnioDelDato(v);
              if (datoPara === 'cambiar' && elegido?.type === 'stat') {
                const year = v === 'all' ? null : (elegido.content.year ?? new Date().getFullYear());
                aplicar((d) => cambiar(d, elegido.id, { content: { year } }));
              }
            }}
            fullWidth
          />
          <View>
            {DATOS_DE_BIBLIOTECA.map((dato) => (
              <ActionRow
                key={dato}
                icon={icono(ChartNoAxesColumn)}
                label={c.stats.names[dato]}
                onPress={() => {
                  const para = datoPara;
                  setDatoPara(null);
                  if (para === 'cambiar' && elegido?.type === 'stat') {
                    aplicar((d) => cambiar(d, elegido.id, { content: { stat: dato } }));
                    return;
                  }
                  // "Este año" queda fijo: el Journal de 2026 sigue contando 2026 en 2027.
                  porPegar.current = { dato: { stat: dato, year: anioDelDato === 'all' ? null : new Date().getFullYear() } };
                  ponerHerramienta('stat', PROPORCION_DE_DATO);
                }}
              />
            ))}
          </View>
        </View>
      </Sheet>
      <Sheet visible={nombreDeMuestra !== null} onClose={() => setNombreDeMuestra(null)} title={c.swatchRename}>
        <View style={styles.renombrar}>
          <TextField
            label={c.swatchName}
            value={nombreDeMuestra?.texto ?? ''}
            onChangeText={(texto) => setNombreDeMuestra((m) => (m ? { ...m, texto } : m))}
            placeholder={c.swatchNamePlaceholder}
            maxLength={40}
            autoFocus
            returnKeyType="done"
          />
          <Button
            title={c.save}
            onPress={() => {
              const m = nombreDeMuestra;
              setNombreDeMuestra(null);
              if (m) aplicar((d) => cambiar(d, m.id, { content: { text: m.texto.trim() } }));
            }}
          />
        </View>
      </Sheet>
      <FragmentSheet
        visible={eligiendoFragmento}
        itemId={lienzo.data?.context === 'book' ? item : null}
        onClose={() => setEligiendoFragmento(false)}
        onElegir={(f, url) => void pegarFragmento(f, url)}
      />
      <CanvasStyleSheet
        elemento={conEstiloAbierto && colorDe === null ? elegido : null}
        onClose={() => setConEstiloAbierto(false)}
        onCambiar={(estilo) => aplicar((d) => conEstilo(d, juntos, estilo))}
        onColor={() => setColorDe('elemento')}
        onColorDeBorde={() => setColorDe('borde')}
      />
      <ColorPickerSheet
        visible={colorDe !== null}
        titulo={colorDe === 'fondo' ? c.backgroundTitle : colorDe === 'borde' ? c.style.borderColor : c.style.color}
        valor={colorActual}
        ninguno={
          colorDe === 'fondo'
            ? c.paper
            : colorDe === 'borde'
              ? c.style.borderNone
              : // Hundido o en relieve (T366): sin color toma el tono del material.
                colorDe === 'elemento' && (elegido?.style.treatment === 'debossed' || elegido?.style.treatment === 'embossed')
                ? c.finish.original
                : undefined
        }
        onClose={() => setColorDe(null)}
        onElegir={elegirColor}
      />
      <Sheet visible={renombrando !== null} onClose={() => setRenombrando(null)} title={c.rename}>
        <View style={styles.renombrar}>
          <TextField label={c.renameLabel} value={renombrando ?? ''} onChangeText={setRenombrando} placeholder={c.renamePlaceholder} maxLength={120} autoFocus returnKeyType="done" />
          <Button
            title={c.save}
            onPress={() => {
              editor.renombrar(renombrando ?? '');
              setRenombrando(null);
            }}
          />
        </View>
      </Sheet>
      <Sheet visible={eligiendoSentido} onClose={() => setEligiendoSentido(false)} title={c.direction.title}>
        {SENTIDOS.map((sentido) => {
          const actual = (elegido?.style.direction ?? 'horizontal') === sentido;
          return (
            <ActionRow
              key={sentido}
              icon={icono(actual ? Check : ArrowDownUp, actual ? theme.text : theme.textTertiary)}
              label={actual ? `${c.direction[sentido]} · ${c.direction.current}` : c.direction[sentido]}
              onPress={() => {
                setEligiendoSentido(false);
                if (!elegido) return;
                const alto = aspecto ?? proporcionDePagina(orientacion ?? 'portrait');
                aplicar((d) => conSentido(d, elegido.id, sentido, alto));
              }}
            />
          );
        })}
      </Sheet>
      <Sheet visible={eligiendoAcabado} onClose={() => setEligiendoAcabado(false)} title={c.finish.title}>
        <AppText variant="body" color="textSecondary" style={styles.pista}>
          {c.finish.hint}
        </AppText>
        {TRATAMIENTOS.map((t) => {
          const actual = (elegido?.style.treatment ?? 'printed') === t;
          return (
            <ActionRow
              key={t}
              icon={icono(actual ? Check : Stamp, actual ? theme.text : theme.textTertiary)}
              label={actual ? `${c.finish[t]} · ${c.finish.current}` : c.finish[t]}
              onPress={() => {
                setEligiendoAcabado(false);
                // El color elegido se queda (T366): hundido y relieve lo toman; "Original" en Color vuelve al material.
                aplicar((d) => conEstilo(d, juntos, { treatment: t === 'printed' ? undefined : t }));
              }}
            />
          );
        })}
      </Sheet>
      <Sheet visible={eligiendoForma} onClose={() => setEligiendoForma(false)} title={c.shapeTitle}>
        {FORMAS_DE_LIENZO.map((f) => (
          <ActionRow
            key={f}
            icon={icono(Shapes)}
            label={c.shapes[f]}
            onPress={() => {
              setEligiendoForma(false);
              porPegar.current = { forma: f };
              ponerHerramienta('shape', f === 'rect' ? 0.7 : 1);
            }}
          />
        ))}
      </Sheet>
      <Sheet visible={eligiendoImagen} onClose={() => setEligiendoImagen(false)} title={c.image}>
        <ActionRow icon={icono(ImagePlus)} label={a.imageGallery} onPress={() => void elegirImagen('galeria')} />
        {PUEDE_TOMAR_FOTO ? <ActionRow icon={icono(ImagePlus)} label={a.imageCamera} onPress={() => void elegirImagen('camara')} /> : null}
      </Sheet>
      <Sheet visible={nombrePlantilla !== null} onClose={() => setNombrePlantilla(null)} title={c.templates.save}>
        <View style={styles.renombrar}>
          <TextField
            label={c.templates.nameLabel}
            value={nombrePlantilla ?? ''}
            onChangeText={setNombrePlantilla}
            placeholder={c.templates.namePlaceholder}
            maxLength={80}
            autoFocus
            returnKeyType="done"
          />
          <Button
            title={c.save}
            disabled={!nombrePlantilla?.trim() || guardarPlantilla.isPending}
            onPress={() => {
              const nombre = (nombrePlantilla ?? '').trim();
              if (!nombre || !lienzo.data) return;
              // Sin fotos ni imágenes propias; el libro del recorte queda como "este libro" (RF-CC20).
              guardarPlantilla.mutate(
                { name: nombre, orientation: lienzo.data.orientation, doc: comoPlantilla(doc, item) },
                {
                  onSuccess: () => {
                    setNombrePlantilla(null);
                    avisar({ message: c.templates.saved });
                  },
                  onError: (e) => avisar({ message: e.message }),
                },
              );
            }}
          />
        </View>
      </Sheet>
      <AssetSheet
        visible={eligiendoAsset}
        onClose={() => setEligiendoAsset(false)}
        onElegir={(asset) => {
          setEligiendoAsset(false);
          porPegar.current = { asset };
          ponerHerramienta('asset', asset.ar);
        }}
      />
      <PolaroidSheet
        visible={polaroidPara !== null}
        valor={polaroidPara === 'cambiar' && elegido?.type === 'polaroid' ? elegido.content.variant : undefined}
        onClose={() => setPolaroidPara(null)}
        onElegir={(v) => {
          if (polaroidPara === 'cambiar') {
            cambiarPolaroid(v);
            return;
          }
          setPolaroidPara(null);
          porPegar.current = { variante: v };
          ponerHerramienta('polaroid', PROPORCION_DE_POLAROID[v]);
        }}
      />
      <QuoteSheet
        visible={citaPara !== null}
        valor={
          citaPara === 'editar' && elegido?.type === 'quote'
            ? { text: elegido.content.text ?? '', who: elegido.content.who ?? '', chapter: elegido.content.chapter ?? '', note: elegido.content.note ?? '' }
            : null
        }
        onClose={() => setCitaPara(null)}
        onGuardar={(cita) => {
          const para = citaPara;
          setCitaPara(null);
          if (para === 'editar' && elegido?.type === 'quote') {
            aplicar((d) => cambiar(d, elegido.id, { content: cita }));
            return;
          }
          porPegar.current = { cita };
          ponerHerramienta('quote', 0.6);
        }}
      />
      <RatingSheet
        visible={calificando && elegido?.type === 'rating'}
        valor={elegido?.type === 'rating' ? { scale: elegido.content.scale ?? 'stars', value: elegido.content.value ?? 0 } : null}
        onClose={() => setCalificando(false)}
        onCambiar={(v) => {
          if (elegido?.type !== 'rating') return;
          const ar = v.scale !== elegido.content.scale ? { ar: PROPORCION_DE_RATING[v.scale] } : {};
          aplicar((d) => cambiar(d, elegido.id, { ...ar, content: v }));
        }}
      />
      <Sheet visible={libroPara !== null} onClose={() => setLibroPara(null)} title={c.bookTitle} scrollable={false} maxHeightRatio={0.8}>
        <BookList
          piezas={piezas.data}
          cargando={piezas.isPending}
          error={piezas.isError}
          onReintentar={() => void piezas.refetch()}
          valor={libroPara === 'cambiar' && elegido?.type === 'book' ? (elegido.content.itemId ?? null) : null}
          onElegir={(libro) => {
            const para = libroPara;
            setLibroPara(null);
            if (!libro) return;
            if (para === 'cambiar' && elegido?.type === 'book') {
              aplicar((d) => cambiar(d, elegido.id, { content: { itemId: libro } }));
              return;
            }
            porPegar.current = { libro };
            ponerHerramienta('book', 1.5);
          }}
        />
      </Sheet>
      <Sheet visible={huecoPara !== null} onClose={() => setHuecoPara(null)} title={c.photoTitle}>
        {Array.from({ length: FOTOS_DE_POLAROID[(doc.elements.find((e) => e.id === huecoPara)?.content.variant ?? 'classic') as VarianteDePolaroid] }, (_, i) => (
          <ActionRow
            key={i}
            icon={icono(Camera)}
            label={c.photoN(i + 1)}
            onPress={() => {
              const para = huecoPara;
              setHuecoPara(null);
              if (para) buscarImagen({ polaroid: para, hueco: i });
            }}
          />
        ))}
      </Sheet>
      <Sheet visible={pieDe !== null} onClose={() => setPieDe(null)} title={c.captionAction}>
        <View style={styles.renombrar}>
          <TextField
            label={c.captionLabel}
            value={pieDe?.texto ?? ''}
            onChangeText={(texto) => setPieDe((p) => (p ? { ...p, texto } : p))}
            placeholder={c.captionPlaceholder}
            maxLength={80}
            autoFocus
            returnKeyType="done"
          />
          <Button
            title={c.save}
            onPress={() => {
              const p = pieDe;
              setPieDe(null);
              if (p) aplicar((d) => cambiar(d, p.id, { content: { text: p.texto.trim() } }));
            }}
          />
        </View>
      </Sheet>
      <StickerSheet
        visible={eligiendoSticker}
        propios={{ stickers: misStickers.data ?? [], imagenes: imagenesPropias }}
        onClose={() => setEligiendoSticker(false)}
        onElegir={(s) => {
          setEligiendoSticker(false);
          porPegar.current = { sticker: s };
          ponerHerramienta('sticker', s.ar);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  barra: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  titulo: { flex: 1, minHeight: 44, justifyContent: 'center' },
  centro: { textAlign: 'center' },
  renombrar: { gap: Spacing.lg, paddingBottom: Spacing.md },
  pista: { paddingBottom: Spacing.sm },
  lienzo: { flex: 1 },
  cubre: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center' },
  abajo: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.xs, paddingHorizontal: Spacing.sm },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48, paddingLeft: Spacing.sm },
  estado: { paddingHorizontal: Spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, minHeight: 48, flexGrow: 1 },
  flex: { flex: 1 },
});
