import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BringToFront,
  ChevronLeft,
  Copy,
  Group,
  ImagePlus,
  Lock,
  LockOpen,
  PaintBucket,
  Palette,
  Pencil,
  Plus,
  Redo2,
  SendToBack,
  Shapes,
  Share,
  SquareDashedMousePointer,
  Sticker,
  Trash2,
  Type,
  Undo2,
  Ungroup,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CanvasStyleSheet } from '@/components/library/canvas-style-sheet';
import { ColorPickerSheet } from '@/components/library/color-picker-sheet';
import { ReaderEngine, type ReaderEngineHandle } from '@/components/library/reader-engine';
import { type StickerElegible, StickerSheet } from '@/components/library/sticker-sheet';
import { ActionRow, AppText, Button, ErrorState, IconButton, LoadingState, Sheet, TextField } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useLibraryImageUrls, useUploadAnnotationImage } from '@/hooks/use-annotations';
import { useCanvas, useCanvasEditor, useLimpiarImagenesDeLienzo } from '@/hooks/use-canvases';
import { useStickerPacks, useStickerSources } from '@/hooks/use-sticker-packs';
import { useTheme } from '@/hooks/use-theme';
import { useUserStickerImages, useUserStickers, useUserStickerSources } from '@/hooks/use-user-stickers';
import { useT } from '@/i18n';
import { uuidv4 } from '@/lib/gym/ids';
import {
  agregar,
  agrupar,
  aMotor,
  bloquear,
  cambiar,
  capa,
  conEstilo,
  conFondo,
  conSuGrupo,
  desagrupar,
  duplicar,
  type ElementoDeLienzo,
  mover,
  quitar,
} from '@/lib/library/canvas';
import { archivoDeExportacion, nombreDeExportacion } from '@/lib/library/canvas-export';
import { PAPEL_DE_LIENZO } from '@/lib/library/canvas-shapes';
import { prepararImagenPegada } from '@/lib/library/cover/prepare';
import { desdeCamara, desdeGaleria, PUEDE_TOMAR_FOTO } from '@/lib/library/cover/sources';
import { FORMAS_DE_LIENZO, type FormaDeLienzo, type Herramienta, type MensajeDelMotor } from '@/lib/library/reader-protocol';
import { fuenteDeSticker } from '@/lib/library/sticker-packs';
import { shareImage } from '@/lib/share';
import { useAuth, useSnackbar } from '@/providers';
import type { LibraryLocator } from '@/types/domain';

type PorPegar = { forma?: FormaDeLienzo; imagen?: { jpeg: Uint8Array; ar: number; vistaPrevia: string }; sticker?: StickerElegible };

/**
 * El lienzo creativo (spec 13h; T351): un recorte de un libro. Es una página en blanco 1 : √2 que arma el motor del
 * lector (RF-CC4), así que se acerca, se desplaza y se ve igual que un PDF; sus elementos son lo pegado encima:
 * texto, imagen, forma y sticker (RF-CC14). Todo se mueve, se estira, se gira, cambia de capa, se bloquea, se
 * duplica, se agrupa y se quita (RF-CC8, RF-CC9), con deshacer y rehacer, y se guarda solo, también sin red
 * (RF-CC10). En C2 (T342): "+ Agregar" (RF-CC19), el color del fondo y de cada pieza con su opacidad, borde y
 * sombra (RF-CC12), cambiar el nombre y exportar la página como imagen (RF-CC25).
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
  const [abierto, setAbierto] = useState(false);

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

  // Las direcciones de lo que se ve: imágenes subidas (o su vista previa mientras suben) y stickers.
  const rutas = doc.elements.flatMap((e) => (e.type === 'image' && e.content.path ? [e.content.path] : []));
  const urls = useLibraryImageUrls(rutas);
  const stickers = doc.elements.flatMap((e) => (e.type === 'sticker' && e.content.sticker ? [e.content.sticker] : []));
  const claveStickers = stickers.join('|');
  const packs = useStickerPacks();
  const misStickers = useUserStickers();
  const imagenesPropias = useUserStickerImages(misStickers.data);
  const fuentesPropias = useUserStickerSources(stickers, imagenesPropias);
  const fuentesTienda = useStickerSources(
    stickers.filter((s) => !s.startsWith('nobi-pink/')),
    packs.data?.packs,
  );
  const fuentes = useMemo(() => {
    const imagenes = new Map(urls);
    for (const [ruta, vista] of vistasPrevias) if (!imagenes.has(ruta)) imagenes.set(ruta, vista);
    const deStickers = new Map<string, string>();
    for (const s of new Set(stickers)) {
      const src = fuenteDeSticker(s, fuentesTienda, packs.data?.packs, fuentesPropias);
      if (src) deStickers.set(s, src);
    }
    return { imagenes, stickers: deStickers };
    // `claveStickers` resume la lista `stickers`, que es nueva en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls, vistasPrevias, claveStickers, fuentesTienda, fuentesPropias, packs.data?.packs]);

  // Abrir la página en blanco con su forma (RF-CC4), una vez por lienzo.
  const orientacion = lienzo.data?.orientation;
  const paginas = lienzo.data?.doc.pages ?? 1;
  useEffect(() => {
    if (!orientacion) return;
    // La página entera a la vista, para componer (RF-CC4): como "páginas de lado" del lector.
    motor.current?.send({ type: 'openCanvas', orientation: orientacion, pages: paginas, mode: 'paged' });
    // Solo al llegar el lienzo: agregar páginas es de una fase posterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, orientacion]);

  // Lo que se pinta encima: cada vez que cambia el documento o llega una dirección.
  const enMotor = useMemo(() => aMotor(doc, fuentes), [doc, fuentes]);
  useEffect(() => {
    if (abierto) motor.current?.send({ type: 'annotations', items: enMotor });
  }, [abierto, enMotor]);

  // El color de la página (RF-CC12).
  const fondo = doc.background ?? null;
  useEffect(() => {
    if (abierto) motor.current?.send({ type: 'canvasBackground', color: fondo });
  }, [abierto, fondo]);

  /** Quitar del documento y dejar que el archivo de sus imágenes se borre en una hora, si no se deshace (T342). */
  const quitarElementos = (ids: string[]) => {
    const fuera = conSuGrupo(doc, ids);
    aplicar((d) => quitar(d, fuera));
    limpiarImagenes(item, id, doc.elements.filter((e) => e.type === 'image' && fuera.includes(e.id)).map((e) => e.id));
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
      aplicar((d) => agregar(d, { ...base, type: 'textbox', style: { color: '#1A1A1A' }, content: { text: '' } }));
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
        setAbierto(true);
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
      case 'edit':
        elegir(m.id);
        motor.current?.send({ type: 'write', id: m.id });
        return;
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

  const elegirImagen = async (origen: 'galeria' | 'camara') => {
    setEligiendoImagen(false);
    try {
      const uri = origen === 'camara' ? await desdeCamara() : await desdeGaleria();
      if (!uri) return;
      const lista = await prepararImagenPegada(uri);
      porPegar.current = { imagen: { jpeg: lista.jpeg, ar: lista.alto / lista.ancho, vistaPrevia: lista.vistaPrevia } };
      ponerHerramienta('image', lista.alto / lista.ancho);
    } catch (e) {
      avisar({ message: e instanceof Error ? e.message : a.imageFailed });
    }
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
    else if (de === 'elemento' && hex) aplicar((d) => conEstilo(d, juntos, { color: hex }));
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

  const aviso = exportando ? c.exporting : herramienta === 'textbox' ? a.textboxOn : herramienta === 'image' ? a.imageOn : herramienta === 'sticker' ? a.stickerOn : herramienta === 'shape' ? c.shapeOn : null;

  return (
    <View style={[styles.pantalla, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={[styles.barra, { borderBottomColor: theme.border }]}>
        <IconButton label={tx.common.back} onPress={volver}>
          {icono(ChevronLeft)}
        </IconButton>
        <Pressable
          style={styles.titulo}
          onPress={() => setRenombrando(editor.titulo)}
          accessibilityRole="button"
          accessibilityLabel={`${editor.titulo || c.untitled}. ${c.rename}`}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.centro} accessibilityRole="header">
            {editor.titulo || c.untitled}
          </AppText>
        </Pressable>
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
              {elegido.type === 'textbox' && !varios && !elegido.locked ? (
                <IconButton label={a.write} onPress={() => motor.current?.send({ type: 'write', id: elegido.id })}>
                  {icono(Pencil)}
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
            <IconButton label={c.background} onPress={() => setColorDe('fondo')}>
              {icono(PaintBucket)}
            </IconButton>
            <IconButton label={c.export} onPress={exportar} disabled={exportando || !abierto}>
              {icono(Share, exportando ? theme.textTertiary : theme.text)}
            </IconButton>
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
      </Sheet>
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
        ninguno={colorDe === 'fondo' ? c.paper : colorDe === 'borde' ? c.style.borderNone : undefined}
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
  lienzo: { flex: 1 },
  cubre: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center' },
  abajo: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.xs, paddingHorizontal: Spacing.sm },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48, paddingLeft: Spacing.sm },
  estado: { paddingHorizontal: Spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, minHeight: 48, flexGrow: 1 },
  flex: { flex: 1 },
});
