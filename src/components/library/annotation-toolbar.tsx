import { Bookmark, BringToFront, Check, Crop, FoldVertical, ImagePlus, PenLine, UserRound, Users, Lock, LockOpen, Palette, Pencil, Redo2, RotateCw, SendToBack, Sticker, StickyNote, Trash2, Type, Undo2 } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { Herramienta } from '@/lib/library/reader-protocol';
import type { LibraryAnnotation } from '@/types/domain';

type Props = {
  seleccionada: LibraryAnnotation | null;
  herramienta: Herramienta;
  /** En el libro real lo pegado solo se ve (T286). */
  enLibro: boolean;
  puedeDeshacer: boolean;
  puedeRehacer: boolean;
  onHerramienta: (h: Herramienta) => void;
  /** Elegir una imagen para pegarla (T289): luego se toca dónde va. */
  onImagen: () => void;
  /** Abrir la hoja de stickers (T290): la colección y los quitados de este libro. */
  onSticker: () => void;
  /** Poner un separador en la página que se lee (RF-BH15, T290); también en el libro real. */
  onSeparador: () => void;
  /** La herramienta de fragmento de imagen (RF-BH20, T317), puesta o no; también en el libro real. */
  recortando: boolean;
  onRecortar: () => void;
  /** Dibujar con el lápiz o el dedo (RF-BH11, T291); no en el libro real. */
  onLapiz: () => void;
  onDeshacer: () => void;
  onRehacer: () => void;
  onEscribir: () => void;
  /** Color (y en un cuadro de texto, el tamaño de la letra). */
  onEstilo: () => void;
  onGirar: () => void;
  /** Doblar o desdoblar un post-it (RF-BH14, T290). */
  onDoblar: () => void;
  onFrente: () => void;
  onAtras: () => void;
  onBloquear: () => void;
  onQuitar: () => void;
  onListo: () => void;
  /**
   * En una copia de club (13f, RF-BC6 – RF-BC7; T307): quién la hizo y la cambió (`texto`), si la ve el club y,
   * si es mía, pasarla a "Solo para mí" o compartirla.
   */
  club?: { texto: string | null; compartida: boolean; puedeCambiar: boolean; onCambiar: () => void };
};

/**
 * Las herramientas sobre la página (spec 13c; T286, T289, T290), abajo del lector. Sin nada elegido: pegar un
 * post-it, un cuadro de texto, una imagen o un sticker, dibujar (T291), poner un separador, recortar un
 * fragmento de imagen (T317), deshacer y rehacer (RF-BH18). Si no caben, las herramientas se deslizan de lado y
 * deshacer y rehacer se quedan a la vista. Con algo pegado elegido:
 * escribir (ahí mismo) y su color, o girar si es imagen o sticker; traer al frente, mandar atrás, bloquear
 * (RF-BH16) y quitar (un sticker se va a la charola "Quitados").
 */
export function AnnotationToolbar(p: Props) {
  const theme = useTheme();
  const a = useT().library.annotations;
  const icono = (activo = true) => ({ size: IconSize.action, strokeWidth: IconStroke, color: activo ? theme.text : theme.textTertiary });

  if (p.seleccionada) {
    const bloqueada = p.seleccionada.locked;
    const esImagen = p.seleccionada.kind === 'image' || p.seleccionada.kind === 'sticker';
    const doblado = p.seleccionada.kind === 'postit' && p.seleccionada.content.folded === true;
    return (
      <View style={styles.contenedor}>
        {bloqueada ? <Aviso texto={a.lockedHint} /> : p.club?.texto ? <Aviso texto={p.club.texto} /> : null}
        <View style={styles.fila} accessibilityRole="toolbar">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.desliza} contentContainerStyle={styles.herramientas}>
            {p.club?.puedeCambiar ? (
              <IconButton label={p.club.compartida ? a.club.onlyMe : a.club.shareWithClub} onPress={p.club.onCambiar}>
                {p.club.compartida ? <Users {...icono()} /> : <UserRound {...icono()} />}
              </IconButton>
            ) : null}
            {esImagen ? (
              <IconButton label={a.rotate} onPress={p.onGirar} disabled={bloqueada}>
                <RotateCw {...icono(!bloqueada)} />
              </IconButton>
            ) : (
              <>
                <IconButton label={a.write} onPress={p.onEscribir} disabled={bloqueada || doblado}>
                  <Pencil {...icono(!bloqueada && !doblado)} />
                </IconButton>
                <IconButton label={a.styleColor} onPress={p.onEstilo}>
                  <Palette {...icono()} />
                </IconButton>
                {p.seleccionada.kind === 'postit' ? (
                  <IconButton label={p.seleccionada.content.folded === true ? a.unfold : a.fold} onPress={p.onDoblar} disabled={bloqueada}>
                    <FoldVertical {...icono(!bloqueada)} />
                  </IconButton>
                ) : null}
              </>
            )}
            <IconButton label={a.toFront} onPress={p.onFrente}>
              <BringToFront {...icono()} />
            </IconButton>
            <IconButton label={a.toBack} onPress={p.onAtras}>
              <SendToBack {...icono()} />
            </IconButton>
            <IconButton label={bloqueada ? a.unlock : a.lock} onPress={p.onBloquear}>
              {bloqueada ? <Lock {...icono()} /> : <LockOpen {...icono()} />}
            </IconButton>
            <IconButton label={a.remove} onPress={p.onQuitar}>
              <Trash2 size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />
            </IconButton>
          </ScrollView>
          <IconButton label={a.done} onPress={p.onListo}>
            <Check {...icono()} />
          </IconButton>
        </View>
      </View>
    );
  }

  const avisos = { postit: a.postitOn, textbox: a.textboxOn, image: a.imageOn, sticker: a.stickerOn };
  const aviso = p.recortando ? a.clipOn : p.enLibro ? a.postitBook : p.herramienta ? avisos[p.herramienta] : null;
  const herr = (h: Exclude<Herramienta, null>, Icono: ComponentType<{ size: number; strokeWidth: number; color: string }>, etiqueta: string, onPress: () => void) => {
    const activa = p.herramienta === h;
    return (
      <IconButton label={activa ? a.cancelTool : etiqueta} onPress={activa ? () => p.onHerramienta(null) : onPress} disabled={p.enLibro} style={activa ? { backgroundColor: theme.ink } : null}>
        <Icono size={IconSize.action} strokeWidth={IconStroke} color={activa ? theme.onInk : p.enLibro ? theme.textTertiary : theme.text} />
      </IconButton>
    );
  };
  return (
    <View style={styles.contenedor}>
      {aviso ? <Aviso texto={aviso} /> : null}
      <View style={styles.fila} accessibilityRole="toolbar">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.desliza} contentContainerStyle={styles.herramientas}>
          <IconButton label={a.pen} onPress={p.onLapiz} disabled={p.enLibro}>
            <PenLine {...icono(!p.enLibro)} />
          </IconButton>
          {herr('postit', StickyNote, a.postit, () => p.onHerramienta('postit'))}
          {herr('textbox', Type, a.textbox, () => p.onHerramienta('textbox'))}
          {herr('image', ImagePlus, a.image, p.onImagen)}
          {herr('sticker', Sticker, a.sticker, p.onSticker)}
          <IconButton label={a.bookmark} onPress={p.onSeparador}>
            <Bookmark {...icono()} />
          </IconButton>
          <IconButton label={p.recortando ? a.clipCancel : a.clipImage} onPress={p.onRecortar} style={p.recortando ? { backgroundColor: theme.ink } : null}>
            <Crop size={IconSize.action} strokeWidth={IconStroke} color={p.recortando ? theme.onInk : theme.text} />
          </IconButton>
        </ScrollView>
        <View style={[styles.separador, { backgroundColor: theme.border }]} />
        <IconButton label={a.undo} onPress={p.onDeshacer} disabled={!p.puedeDeshacer}>
          <Undo2 {...icono(p.puedeDeshacer)} />
        </IconButton>
        <IconButton label={a.redo} onPress={p.onRehacer} disabled={!p.puedeRehacer}>
          <Redo2 {...icono(p.puedeRehacer)} />
        </IconButton>
      </View>
    </View>
  );
}

/**
 * Un aviso que flota encima de la barra: no ocupa lugar, así aparecer o irse no cambia el tamaño de la
 * página (un EPUB se volvería a acomodar).
 */
function Aviso({ texto }: { texto: string }) {
  const theme = useTheme();
  return (
    <View style={styles.avisoCaja} pointerEvents="none" accessibilityLiveRegion="polite">
      <AppText variant="caption" color="textSecondary" style={[styles.aviso, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {texto}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', paddingHorizontal: Spacing.sm },
  // Sin espacio entre botones; lo que no quepa de las herramientas se desliza de lado.
  fila: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', maxWidth: '100%', borderRadius: Radius.full, borderCurve: 'continuous' },
  desliza: { flexGrow: 0, flexShrink: 1 },
  herramientas: { flexDirection: 'row', alignItems: 'center' },
  separador: { width: 1, height: 24, marginHorizontal: 2 },
  avisoCaja: { position: 'absolute', bottom: '100%', left: Spacing.lg, right: Spacing.lg, alignItems: 'center', paddingBottom: Spacing.xs },
  aviso: {
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
});
