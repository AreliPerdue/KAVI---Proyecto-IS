import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CanvasPreview, type FuentesDeMiniatura } from '@/components/library/canvas-preview';
import { AppText, Button, Segmented, Sheet } from '@/components/ui';
import { plantillasDeJournal, plantillasDeKavi } from '@/constants/canvas-templates';
import { PAPER, Radius, Spacing } from '@/constants/theme';
import { useLibraryImageUrls } from '@/hooks/use-annotations';
import { useCanvasTemplates, useRemoveCanvasTemplate } from '@/hooks/use-canvas-templates';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { type DocumentoDeLienzo, type OrientacionDeLienzo, RAIZ_DE_DOS } from '@/lib/library/canvas';
import { ESTE_LIBRO, type PlantillaDeLienzo } from '@/lib/library/canvas-templates';
import { colorDePortada, rutaDePortada } from '@/lib/library/shelf';
import { useConfirm, useSnackbar } from '@/providers';
import type { LibraryItem } from '@/types/domain';

export type ComoEmpezar = { orientacion: OrientacionDeLienzo; doc?: DocumentoDeLienzo; titulo?: string };

const ANCHO_MINIATURA = 104;
const SIN_IMAGENES = new Map<string, string>();

/**
 * Empezar un recorte de un libro (spec 13h, RF-CC18 – RF-CC21; T351, T344): en blanco, vertical u horizontal (la forma
 * no cambia después), o con una plantilla —de KAVI o de "Mis plantillas"— que se ve en miniatura con este libro puesto.
 * Mantener presionada una plantilla propia la borra.
 *
 * En un Journal (`journal`, T347) es una página nueva: tiene la forma del Journal (no se elige), las plantillas de KAVI
 * son las del Journal y de "Mis plantillas" salen las de esa forma; "este libro" queda como un libro por elegir.
 */
export function NewCanvasSheet({
  item,
  journal,
  onClose,
  onCrear,
}: {
  item: LibraryItem | null;
  /** Una página de un Journal con esta forma, en vez de un recorte. */
  journal?: { orientacion: OrientacionDeLienzo };
  onClose: () => void;
  onCrear: (item: LibraryItem, como: ComoEmpezar) => void;
}) {
  const theme = useTheme();
  const tx = useT();
  const c = tx.library.canvas;
  const t = c.templates;
  const j = tx.library.journal;
  const [elegida, setOrientacion] = useState<OrientacionDeLienzo>('portrait');
  const orientacion = journal?.orientacion ?? elegida;
  const mias = useCanvasTemplates();
  const borrar = useRemoveCanvasTemplate();
  const confirmar = useConfirm();
  const avisar = useSnackbar();
  const vertical = orientacion === 'portrait';
  const lado = 120;

  // En las miniaturas, "este libro" se ve como el libro del recorte.
  const ruta = item && !journal ? rutaDePortada(item) : null;
  const urls = useLibraryImageUrls(ruta ? [ruta] : []);
  const fuentes: FuentesDeMiniatura = {
    imagenes: SIN_IMAGENES,
    stickers: new Map(),
    libros: new Map(item && !journal ? [[ESTE_LIBRO, { title: item.title, color: colorDePortada(item), ...(ruta && urls.get(ruta) ? { src: urls.get(ruta) } : {}) }]] : []),
  };

  const usar = (p: PlantillaDeLienzo) => item && onCrear(item, { orientacion: p.orientacion, doc: p.doc, titulo: p.nombre });
  const quitar = async (id: string) => {
    const ok = await confirmar({ title: t.removeTitle, message: t.removeMessage, confirmLabel: t.removeConfirm, destructive: true });
    if (!ok) return;
    borrar.mutate(id, { onSuccess: () => avisar({ message: t.removed }) });
  };

  const tarjeta = (p: PlantillaDeLienzo, propia: boolean) => (
    <Pressable
      key={p.id}
      accessibilityRole="button"
      accessibilityLabel={t.use(p.nombre)}
      accessibilityActions={propia ? [{ name: 'activate' }, { name: 'longpress', label: t.remove(p.nombre) }] : undefined}
      onAccessibilityAction={propia ? (e) => (e.nativeEvent.actionName === 'longpress' ? void quitar(p.id) : usar(p)) : undefined}
      onPress={() => usar(p)}
      onLongPress={propia ? () => void quitar(p.id) : undefined}
      style={({ pressed }) => [styles.tarjeta, pressed ? styles.presionada : null]}>
      <CanvasPreview doc={p.doc} orientacion={p.orientacion} ancho={ANCHO_MINIATURA} fuentes={fuentes} />
      <AppText variant="caption" numberOfLines={2} style={styles.nombre}>
        {p.nombre}
      </AppText>
    </Pressable>
  );

  const deKavi = journal ? plantillasDeJournal(t).filter((p) => p.orientacion === orientacion) : plantillasDeKavi(t);
  const propias: PlantillaDeLienzo[] = (mias.data ?? [])
    .filter((p) => !journal || p.orientation === orientacion)
    .map((p) => ({ id: p.id, nombre: p.name, orientacion: p.orientation, doc: p.doc }));

  return (
    <Sheet visible={item !== null} onClose={onClose} title={journal ? j.newPage : c.newCanvas}>
      <View style={styles.cuerpo}>
        <AppText variant="label" color="textSecondary">
          {t.blank}
        </AppText>
        <AppText variant="body" color="textSecondary">
          {journal ? j.newPageHint : c.newHint}
        </AppText>
        {journal ? null : (
          <Segmented
            options={[
              { value: 'portrait', label: c.portrait },
              { value: 'landscape', label: c.landscape },
            ]}
            value={orientacion}
            onChange={setOrientacion}
            fullWidth
          />
        )}
        <View style={styles.muestra} accessible={false}>
          <View
            style={[
              styles.pagina,
              // La página del recorte es papel en los dos temas, como la de un libro.
              { borderColor: theme.border, backgroundColor: PAPER },
              vertical ? { width: lado / RAIZ_DE_DOS, height: lado } : { width: lado, height: lado / RAIZ_DE_DOS },
            ]}
          />
        </View>
        <Button
          title={journal ? j.createPage : c.create}
          onPress={() => {
            if (!item) return;
            onCrear(item, { orientacion });
          }}
        />

        {deKavi.length ? (
          <>
            <AppText variant="label" color="textSecondary">
              {t.kavi}
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
              {deKavi.map((p) => tarjeta(p, false))}
            </ScrollView>
          </>
        ) : null}

        <AppText variant="label" color="textSecondary">
          {t.mine}
        </AppText>
        {propias.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
            {propias.map((p) => tarjeta(p, true))}
          </ScrollView>
        ) : (
          <AppText variant="caption" color="textSecondary">
            {journal ? j.mineEmpty : t.mineEmpty}
          </AppText>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md, paddingBottom: Spacing.md },
  muestra: { alignItems: 'center', justifyContent: 'center', height: 136 },
  pagina: { borderWidth: 1, borderRadius: Radius.sm / 2, borderCurve: 'continuous', boxShadow: '0 4px 16px rgba(22,23,26,0.08)' },
  fila: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.xs },
  tarjeta: { width: ANCHO_MINIATURA, gap: Spacing.xs },
  presionada: { opacity: 0.85 },
  nombre: { textAlign: 'center' },
});
