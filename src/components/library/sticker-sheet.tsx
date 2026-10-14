import { Image, type ImageSource } from 'expo-image';
import { Check, ChevronLeft, X } from 'lucide-react-native';
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
import { idDeSticker, partesDeSticker, pesoDe, urlDeMuestra, urlDeSticker } from '@/lib/library/sticker-packs';
import type { LibraryAnnotation, StickerPack } from '@/types/domain';

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

/** De un id pegado o de la tienda a lo que se puede elegir: los incluidos de la app, los demás de su pack. */
export function elegibleDe(id: string | null, packs: readonly StickerPack[] | undefined): StickerElegible | null {
  if (!id) return null;
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
  const nombres = useT().library.stickers.names as Record<string, string>;
  return (cara: string) => nombres[cara as NombreDeSticker] ?? cara.replace(/-/g, ' ');
}

const COLOR_HEX = new Map(PEOPLE_COLORS_DISPLAY.map((c) => [c.id, c.hex]));

/**
 * Elegir un sticker (spec 13c, RF-BH13, RF-BH13b; T290, T338): **Mis stickers** (los incluidos y los packs
 * descargados), la **Tienda** (los packs de la nube, con su muestra) y **Quitados** (la charola de este libro).
 * Elegir uno cierra la hoja y el siguiente toque en la página lo pega; uno de la charola vuelve con su tamaño
 * y su giro.
 */
export function StickerSheet({
  visible,
  quitados,
  onClose,
  onElegir,
  onDevolver,
  onTirar,
}: {
  visible: boolean;
  /** Los stickers quitados de este libro, el último primero. */
  quitados: readonly LibraryAnnotation[];
  onClose: () => void;
  onElegir: (s: StickerElegible) => void;
  onDevolver: (a: LibraryAnnotation, s: StickerElegible) => void;
  onTirar: (a: LibraryAnnotation) => void;
}) {
  const t = useT().library.stickers;
  const [vista, setVista] = useState<Vista>('mios');
  const packs = useStickerPacks();
  const nombre = useNombreDeCara();
  const charola = quitados.flatMap((a) => {
    const s = elegibleDe(stickerDe(a), packs.data?.packs);
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
            { value: 'quitados', label: t.removed(charola.length) },
          ]}
          value={vista}
          onChange={setVista}
        />
        {vista === 'mios' ? (
          <MisStickers onElegir={onElegir} />
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
                  onPress={() => onDevolver(a, s)}
                  tirar={{ etiqueta: t.discard(nombre(s.nombre)), onPress: () => onTirar(a) }}
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

function MisStickers({ onElegir }: { onElegir: (s: StickerElegible) => void }) {
  const t = useT().library.stickers;
  const packs = useStickerPacks();
  const mios = useMyStickerPacks();
  const nombre = useNombreDeCara();
  const nombreDePack = useNombreDePack();
  const descargados = (packs.data?.packs ?? []).filter((p) => mios.data?.includes(p.id));
  return (
    <>
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
  const lista = packs.data?.packs ?? [];
  if (viendo) return <DetalleDePack pack={viendo} descargado={!!mios.data?.includes(viendo.id)} onVolver={() => setViendo(null)} />;
  return (
    <View style={styles.cuerpo}>
      {lista.map((p) => (
        <TarjetaDePack key={p.id} pack={p} descargado={!!mios.data?.includes(p.id)} onAbrir={() => setViendo(p)} />
      ))}
    </View>
  );
}

function TarjetaDePack({ pack, descargado, onAbrir }: { pack: StickerPack; descargado: boolean; onAbrir: () => void }) {
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
        <InfoDePack pack={pack} nombre={nombre} />
        <BotonDePack pack={pack} descargado={descargado} nombre={nombre} />
      </View>
    </View>
  );
}

function InfoDePack({ pack, nombre }: { pack: StickerPack; nombre: string }) {
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
        {t.packMeta(pack.stickers.length, pesoDe(pack.bytes))}
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

function DetalleDePack({ pack, descargado, onVolver }: { pack: StickerPack; descargado: boolean; onVolver: () => void }) {
  const theme = useTheme();
  const t = useT().library.stickers;
  const nombre = useNombreDeCara();
  const nombreDePack = useNombreDePack();
  return (
    <View style={styles.cuerpo}>
      <View style={styles.nombreFila}>
        <IconButton label={t.backToStore} onPress={onVolver}>
          <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        <InfoDePack pack={pack} nombre={nombreDePack(pack)} />
      </View>
      <View style={styles.rejilla}>
        {pack.stickers.map((s) => (
          <View key={s.name} style={[styles.celda, styles.celdaSola]} accessible accessibilityLabel={nombre(s.name)}>
            <Image source={{ uri: urlDeSticker(pack, s.name) }} contentFit="contain" style={styles.imagenSola} accessible={false} />
          </View>
        ))}
      </View>
      <BotonDePack pack={pack} descargado={descargado} nombre={nombreDePack(pack)} />
    </View>
  );
}

function Celda({
  imagen,
  giro = 0,
  etiqueta,
  onPress,
  tirar,
}: {
  imagen: ImageSource | number;
  giro?: number;
  etiqueta: string;
  onPress: () => void;
  tirar?: { etiqueta: string; onPress: () => void };
}) {
  const theme = useTheme();
  return (
    <View style={styles.celda}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        onPress={onPress}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.botonCelda,
          { backgroundColor: pressed || hovered ? theme.surfaceAlt : 'transparent' },
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
  celdaSola: { padding: Spacing.xs },
  botonCelda: { width: 76, height: 68, padding: Spacing.xs, borderRadius: Radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  imagen: { width: '100%', height: '100%' },
  imagenSola: { width: '100%', height: '100%' },
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
