import { Image, type ImageSource } from 'expo-image';
import { Check, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, IconButton, Segmented, Sheet } from '@/components/ui';
import { PEOPLE_COLORS_DISPLAY } from '@/constants/people-colors';
import { type NombreDeSticker, STICKERS, stickerPorId } from '@/constants/stickers';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useMyStickerPacks, useStickerPackActions, useStickerPacks } from '@/hooks/use-sticker-packs';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';
import { giroDe, stickerDe } from '@/lib/library/annotations';
import { uriLocal } from '@/lib/library/offline/sticker-packs';
import { idDeSticker, partesDeSticker, pesoDe, soloStickers, urlDeMuestra, urlDeSticker } from '@/lib/library/sticker-packs';
import { PREFIJO_PROPIO, idPropio } from '@/hooks/use-user-stickers';
import type { LibraryAnnotation, StickerPack, UserSticker } from '@/types/domain';

/** Los stickers propios y cómo se ven (T335). */
export type Propios = { stickers: readonly UserSticker[]; imagenes: ReadonlyMap<string, string> };

type Vista = 'mios' | 'tienda' | 'quitados';

/** Un sticker que se puede pegar: de los incluidos o de un pack de la tienda (T338). */
export type StickerElegible = {
  /** `<pack>/<nombre>`: lo que se guarda en la anotación. */
  id: string;
  /** La cara (`popcorn`), para su nombre en voz alta. */
  nombre: string;
  ar: number;
  imagen: ImageSource | number;
};

/** De un id pegado o de la tienda a lo que se puede elegir: los incluidos de la app, los propios y los de su pack. */
export function elegibleDe(id: string | null, packs: readonly StickerPack[] | undefined, propios?: Propios): StickerElegible | null {
  if (!id) return null;
  if (id.startsWith(PREFIJO_PROPIO)) {
    const s = propios?.stickers.find((x) => idPropio(x.id) === id);
    const uri = s && propios?.imagenes.get(s.id);
    return s && uri ? { id, nombre: 'mine', ar: Number(s.ar), imagen: { uri } } : null;
  }
  const incluido = stickerPorId(id);
  if (incluido) return { id, nombre: incluido.nombre, ar: incluido.ar, imagen: incluido.imagen as number };
  const partes = partesDeSticker(id);
  const pack = partes && packs?.find((p) => p.id === partes.pack);
  const s = pack?.stickers.find((x) => x.name === partes?.nombre);
  if (!pack || !s) return null;
  return { id, nombre: s.name, ar: s.ar, imagen: { uri: uriLocal(pack, s.name) ?? urlDeSticker(pack, s.name) } };
}

/** El nombre de una cara en el idioma de la app (las de la tienda son las mismas que las incluidas). */
export function useNombreDeCara() {
  const t = useT().library.stickers;
  const nombres = t.names as Record<string, string>;
  return (cara: string) => (cara === 'mine' ? t.mineName : (nombres[cara as NombreDeSticker] ?? cara.replace(/-/g, ' ')));
}

const COLOR_HEX = new Map(PEOPLE_COLORS_DISPLAY.map((c) => [c.id, c.hex]));

/**
 * Elegir un sticker (spec 13c, RF-BH13, RF-BH13b; T290, T338): **Mis stickers** (los incluidos y los packs
 * descargados), la **Tienda** (los packs de la nube, con su muestra) y **Quitados** (la charola de este libro).
 * Elegir uno cierra la hoja y el siguiente toque en la página lo pega; uno de la charola vuelve con su tamaño
 * y su giro. Fuera del lector (decorar una ficha, 13d) no hay charola ni se crean o borran stickers propios:
 * sin `quitados`, `onCrear` ni `onBorrarPropio`, eso no se muestra.
 */
export function StickerSheet({
  visible,
  quitados,
  propios,
  onClose,
  onElegir,
  onDevolver,
  onTirar,
  onCrear,
  onBorrarPropio,
}: {
  visible: boolean;
  /** Los stickers quitados de este libro, el último primero. */
  quitados?: readonly LibraryAnnotation[];
  propios: Propios;
  onClose: () => void;
  onElegir: (s: StickerElegible) => void;
  onDevolver?: (a: LibraryAnnotation, s: StickerElegible) => void;
  onTirar?: (a: LibraryAnnotation) => void;
  /** Abrir la hoja para hacer un sticker con una imagen propia (T335). */
  onCrear?: () => void;
  onBorrarPropio?: (s: UserSticker) => void;
}) {
  const t = useT().library.stickers;
  const [vista, setVista] = useState<Vista>('mios');
  const packs = useStickerPacks();
  const nombre = useNombreDeCara();
  const charola = (quitados ?? []).flatMap((a) => {
    const s = elegibleDe(stickerDe(a), packs.data?.packs, propios);
    return s ? [{ a, s }] : [];
  });

  return (
    <Sheet visible={visible} onClose={onClose} title={t.title}>
      <View style={styles.cuerpo}>
        <Segmented<Vista>
          fullWidth
          label={t.title}
          options={[
            { value: 'mios', label: t.mine },
            { value: 'tienda', label: t.store },
            ...(quitados ? [{ value: 'quitados' as const, label: t.removed(charola.length) }] : []),
          ]}
          value={vista}
          onChange={setVista}
        />
        {vista === 'mios' ? (
          <MisStickers onElegir={onElegir} propios={propios} onCrear={onCrear} onBorrarPropio={onBorrarPropio} />
        ) : vista === 'tienda' ? (
          <Tienda />
        ) : charola.length ? (
          <>
            <AppText variant="label" color="textSecondary">
              {t.removedHint}
            </AppText>
            <View style={styles.rejilla}>
              {charola.map(({ a, s }) => (
                <Celda
                  key={a.id}
                  imagen={s.imagen}
                  giro={giroDe(a)}
                  etiqueta={t.putBack(nombre(s.nombre))}
                  onPress={() => onDevolver?.(a, s)}
                  tirar={{ etiqueta: t.discard(nombre(s.nombre)), onPress: () => onTirar?.(a) }}
                />
              ))}
            </View>
          </>
        ) : (
          <AppText variant="body" color="textSecondary">
            {t.removedEmpty}
          </AppText>
        )}
      </View>
    </Sheet>
  );
}

/** El nombre de un pack: "Primer Rebote · Azul". */
function useNombreDePack() {
  const tx = useT();
  const idioma = useLanguage();
  return (p: StickerPack) => {
    const nombre = idioma === 'en' ? p.name_en : p.name_es;
    const color = p.color ? (tx.colors[p.color] ?? PEOPLE_COLORS_DISPLAY.find((c) => c.id === p.color)?.label) : null;
    return color ? tx.library.stickers.packName(nombre, color) : nombre;
  };
}

function MisStickers({
  onElegir,
  propios,
  onCrear,
  onBorrarPropio,
}: {
  onElegir: (s: StickerElegible) => void;
  propios: Propios;
  onCrear?: () => void;
  onBorrarPropio?: (s: UserSticker) => void;
}) {
  const theme = useTheme();
  const t = useT().library.stickers;
  const packs = useStickerPacks();
  const mios = useMyStickerPacks();
  const nombre = useNombreDeCara();
  const nombreDePack = useNombreDePack();
  const descargados = soloStickers(packs.data?.packs ?? []).filter((p) => mios.data?.includes(p.id));
  return (
    <>
      {onCrear || propios.stickers.length ? (
        <>
          <AppText variant="label" color="textSecondary">
            {t.mineMade}
          </AppText>
          <View style={styles.rejilla}>
            {onCrear ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.createSticker}
                onPress={onCrear}
                style={({ pressed }) => [styles.botonCelda, styles.crear, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : 'transparent' }]}>
                <Plus size={IconSize.action} strokeWidth={IconStroke} color={theme.textSecondary} />
              </Pressable>
            ) : null}
            {propios.stickers.map((s) => {
              const uri = propios.imagenes.get(s.id);
              if (!uri) return null;
              return (
                <Celda
                  key={s.id}
                  imagen={{ uri }}
                  etiqueta={t.pick(t.mineName)}
                  onPress={() => onElegir({ id: idPropio(s.id), nombre: 'mine', ar: Number(s.ar), imagen: { uri } })}
                  tirar={onBorrarPropio ? { etiqueta: t.removeMine, onPress: () => onBorrarPropio(s) } : undefined}
                />
              );
            })}
          </View>
        </>
      ) : null}
      <AppText variant="label" color="textSecondary">
        {t.pack['nobi-pink']}
      </AppText>
      <View style={styles.rejilla}>
        {STICKERS.map((s) => (
          <Celda
            key={s.id}
            imagen={s.imagen as number}
            etiqueta={t.pick(t.names[s.nombre])}
            onPress={() => onElegir({ id: s.id, nombre: s.nombre, ar: s.ar, imagen: s.imagen as number })}
          />
        ))}
      </View>
      {descargados.map((p) => (
        <View key={p.id} style={styles.cuerpo}>
          <AppText variant="label" color="textSecondary">
            {nombreDePack(p)}
          </AppText>
          <View style={styles.rejilla}>
            {p.stickers.map((s) => {
              const id = idDeSticker(p.id, s.name);
              const imagen = { uri: uriLocal(p, s.name) ?? urlDeSticker(p, s.name) };
              return <Celda key={id} imagen={imagen} etiqueta={t.pick(nombre(s.name))} onPress={() => onElegir({ id, nombre: s.name, ar: s.ar, imagen })} />;
            })}
          </View>
        </View>
      ))}
      {!descargados.length ? (
        <AppText variant="body" color="textSecondary">
          {t.moreInStore}
        </AppText>
      ) : null}
    </>
  );
}

/** La tienda: una tarjeta por pack con su muestra; al tocarla se ven todas sus caras. */
function Tienda() {
  const t = useT().library.stickers;
  const packs = useStickerPacks();
  const mios = useMyStickerPacks();
  const [viendo, setViendo] = useState<StickerPack | null>(null);

  if (packs.isLoading) return <ActivityIndicator style={styles.cargando} />;
  if (packs.isError) {
    return (
      <View style={styles.cuerpo}>
        <AppText variant="body" color="textSecondary">
          {t.storeError}
        </AppText>
        <Button title={t.retry} variant="secondary" onPress={() => void packs.refetch()} />
      </View>
    );
  }
  if (packs.data?.sinRed) {
    return (
      <AppText variant="body" color="textSecondary">
        {t.storeOffline}
      </AppText>
    );
  }
  // Los de papeles y más (T343c) se ven en "Papeles y más", no aquí.
  const lista = soloStickers(packs.data?.packs ?? []);
  if (viendo) return <DetalleDePack pack={viendo} descargado={!!mios.data?.includes(viendo.id)} onVolver={() => setViendo(null)} />;
  return (
    <View style={styles.cuerpo}>
      {lista.map((p) => (
        <TarjetaDePack key={p.id} pack={p} descargado={!!mios.data?.includes(p.id)} onAbrir={() => setViendo(p)} />
      ))}
    </View>
  );
}

/** Una tarjeta de pack de la tienda con su muestra y su botón; también la usan los packs de papeles y más (T343c). */
export function TarjetaDePack({ pack, descargado, onAbrir, meta }: { pack: StickerPack; descargado: boolean; onAbrir: () => void; meta?: string }) {
  const theme = useTheme();
  const t = useT().library.stickers;
  const nombreDePack = useNombreDePack();
  const nombre = nombreDePack(pack);
  return (
    <View style={[styles.tarjeta, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t.openPack(nombre)} onPress={onAbrir} style={({ pressed }) => (pressed ? styles.presionado : null)}>
        <Image source={{ uri: urlDeMuestra(pack) }} contentFit="cover" style={styles.muestra} accessible={false} />
      </Pressable>
      <View style={styles.info}>
        <InfoDePack pack={pack} nombre={nombre} meta={meta} />
        <BotonDePack pack={pack} descargado={descargado} nombre={nombre} />
      </View>
    </View>
  );
}

function InfoDePack({ pack, nombre, meta }: { pack: StickerPack; nombre: string; meta?: string }) {
  const t = useT().library.stickers;
  const hex = pack.color ? COLOR_HEX.get(pack.color) : undefined;
  return (
    <View style={styles.infoTexto}>
      <View style={styles.nombreFila}>
        {hex ? <View style={[styles.punto, { backgroundColor: hex }]} accessible={false} /> : null}
        <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
          {nombre}
        </AppText>
      </View>
      <AppText variant="caption" color="textSecondary" tabular>
        {meta ?? t.packMeta(pack.stickers.length, pesoDe(pack.bytes))}
      </AppText>
    </View>
  );
}

function BotonDePack({ pack, descargado, nombre }: { pack: StickerPack; descargado: boolean; nombre: string }) {
  const theme = useTheme();
  const t = useT().library.stickers;
  const { descargar, quitar } = useStickerPackActions();
  if (!descargado) {
    return (
      <View style={styles.boton}>
        <Button title={t.download} accessibilityLabel={t.downloadA11y(nombre)} loading={descargar.isPending && descargar.variables?.id === pack.id} onPress={() => descargar.mutate(pack)} />
        {descargar.isError && descargar.variables?.id === pack.id ? (
          <AppText variant="caption" color="danger">
            {t.downloadFailed}
          </AppText>
        ) : null}
      </View>
    );
  }
  return (
    <View style={styles.descargado}>
      <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.success} />
      <AppText variant="label" color="textSecondary">
        {t.downloaded}
      </AppText>
      <Button title={t.removePack} variant="ghost" accessibilityLabel={t.removePackA11y(nombre)} loading={quitar.isPending && quitar.variables?.id === pack.id} onPress={() => quitar.mutate(pack)} />
    </View>
  );
}

/**
 * Las piezas de un pack antes de obtenerlo. Los de papeles y más (T343c) pasan sus nombres (`nombreDe`), su
 * línea de datos (`meta`) y un fondo de mesa (`fondo`) para que se vean los doodles y los papeles.
 */
export function DetalleDePack({
  pack,
  descargado,
  onVolver,
  nombreDe,
  meta,
  fondo,
}: {
  pack: StickerPack;
  descargado: boolean;
  onVolver: () => void;
  nombreDe?: (nombre: string) => string;
  meta?: string;
  fondo?: string;
}) {
  const theme = useTheme();
  const t = useT().library.stickers;
  const nombreDeCara = useNombreDeCara();
  const nombre = nombreDe ?? nombreDeCara;
  const nombreDePack = useNombreDePack();
  const [viendo, setViendo] = useState<number | null>(null);
  return (
    <View style={styles.cuerpo}>
      <View style={styles.nombreFila}>
        <IconButton label={t.backToStore} onPress={onVolver}>
          <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        <InfoDePack pack={pack} nombre={nombreDePack(pack)} meta={meta} />
      </View>
      {viendo !== null ? <VistaPrevia pack={pack} indice={viendo} onCambiar={setViendo} onCerrar={() => setViendo(null)} nombre={nombre} fondo={fondo} /> : null}
      <View style={styles.rejilla}>
        {pack.stickers.map((s, i) => (
          <Celda
            key={s.name}
            imagen={{ uri: urlDeSticker(pack, s.name) }}
            etiqueta={t.previewA11y(nombre(s.name))}
            elegida={viendo === i}
            fondo={fondo}
            onPress={() => setViendo(viendo === i ? null : i)}
          />
        ))}
      </View>
      <BotonDePack pack={pack} descargado={descargado} nombre={nombreDePack(pack)} />
    </View>
  );
}

/**
 * Un sticker de la tienda en grande, para verlo de cerca antes de descargar el pack (pedido de Areli, 19 oct):
 * su nombre, el anterior y el siguiente, y cerrar.
 */
function VistaPrevia({
  pack,
  indice,
  onCambiar,
  onCerrar,
  nombre,
  fondo,
}: {
  pack: StickerPack;
  indice: number;
  onCambiar: (i: number) => void;
  onCerrar: () => void;
  nombre: (nombre: string) => string;
  fondo?: string;
}) {
  const theme = useTheme();
  const t = useT().library.stickers;
  const s = pack.stickers[indice];
  const total = pack.stickers.length;
  const icono = { size: IconSize.action, strokeWidth: IconStroke, color: theme.text };
  if (!s) return null;
  return (
    <View style={[styles.previa, { backgroundColor: theme.surfaceAlt }]} accessibilityLiveRegion="polite">
      {/* El fondo de mesa va solo detrás de la pieza: el nombre y los botones siguen sobre el color de la app. */}
      <View style={[styles.previaMesa, fondo ? { backgroundColor: fondo } : null]}>
        <Image
          source={{ uri: urlDeSticker(pack, s.name) }}
          contentFit="contain"
          style={[styles.previaImagen, { aspectRatio: 1 / s.ar }]}
          accessibilityLabel={nombre(s.name)}
        />
      </View>
      <View style={styles.previaFila}>
        <IconButton label={t.previous} onPress={() => onCambiar((indice - 1 + total) % total)}>
          <ChevronLeft {...icono} />
        </IconButton>
        <View style={styles.previaTexto}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {nombre(s.name)}
          </AppText>
          <AppText variant="caption" color="textSecondary" tabular>
            {t.previewCount(indice + 1, total)}
          </AppText>
        </View>
        <IconButton label={t.next} onPress={() => onCambiar((indice + 1) % total)}>
          <ChevronRight {...icono} />
        </IconButton>
        <IconButton label={t.closePreview} onPress={onCerrar}>
          <X {...icono} />
        </IconButton>
      </View>
    </View>
  );
}

function Celda({
  imagen,
  giro = 0,
  etiqueta,
  onPress,
  tirar,
  elegida = false,
  fondo,
}: {
  imagen: ImageSource | number;
  giro?: number;
  etiqueta: string;
  onPress: () => void;
  tirar?: { etiqueta: string; onPress: () => void };
  elegida?: boolean;
  fondo?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.celda}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        accessibilityState={elegida ? { selected: true } : undefined}
        onPress={onPress}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.botonCelda,
          { backgroundColor: fondo ?? (pressed || hovered || elegida ? theme.surfaceAlt : 'transparent') },
          fondo && (pressed || hovered) ? styles.presionado : null,
          elegida ? { borderWidth: 2, borderColor: theme.ink } : null,
        ]}>
        <Image source={imagen} contentFit="contain" style={[styles.imagen, giro ? { transform: [{ rotate: `${giro}deg` }] } : null]} accessible={false} />
      </Pressable>
      {tirar ? (
        // Chiquito para no tapar el sticker, pero con 48 px para tocarlo (hitSlop).
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tirar.etiqueta}
          hitSlop={10}
          onPress={tirar.onPress}
          style={({ pressed }) => [styles.tirar, { backgroundColor: pressed ? theme.surfaceAlt : theme.surface, borderColor: theme.border }]}>
          <X size={16} strokeWidth={IconStroke} color={theme.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md },
  flex: { flex: 1 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  celda: { width: 76, height: 68 },
  crear: { borderWidth: 1, borderStyle: 'dashed' },
  previa: { borderRadius: Radius.lg, borderCurve: 'continuous', padding: Spacing.md, gap: Spacing.sm, alignItems: 'center' },
  previaMesa: { alignSelf: 'stretch', alignItems: 'center', padding: Spacing.sm, borderRadius: Radius.md, borderCurve: 'continuous' },
  previaImagen: { width: '100%', maxWidth: 320, maxHeight: 260 },
  previaFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'stretch' },
  previaTexto: { flex: 1, alignItems: 'center' },
  botonCelda: { width: 76, height: 68, padding: Spacing.xs, borderRadius: Radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  imagen: { width: '100%', height: '100%' },
  cargando: { paddingVertical: Spacing.xl },
  tarjeta: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.lg, borderCurve: 'continuous', padding: Spacing.sm, gap: Spacing.sm },
  muestra: { width: '100%', aspectRatio: 390 / 250, borderRadius: Radius.md, borderCurve: 'continuous' },
  presionado: { opacity: 0.85 },
  info: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' },
  infoTexto: { flex: 1, minWidth: 160, gap: 2 },
  nombreFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  punto: { width: 12, height: 12, borderRadius: Radius.full, borderCurve: 'continuous' },
  boton: { gap: Spacing.xs, alignItems: 'flex-end' },
  descargado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  tirar: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    borderCurve: 'continuous',
  },
});
