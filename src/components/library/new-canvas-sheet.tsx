import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CanvasPreview, type FuentesDeMiniatura } from '@/components/library/canvas-preview';
import { ColorPickerSheet } from '@/components/library/color-picker-sheet';
import { type ColoresElegidos, PageColorRows, type RolDeColor } from '@/components/library/page-colors';
import { AppText, Button, IconButton, Segmented, Sheet } from '@/components/ui';
import { plantillasDeJournal, plantillasDeKavi } from '@/constants/canvas-templates';
import { DEL_JOURNAL_A_LECTOR, plantillasDeLector } from '@/constants/canvas-templates-reader';
import { IconSize, IconStroke, PAPER, Radius, Spacing } from '@/constants/theme';
import { useLibraryImageUrls } from '@/hooks/use-annotations';
import { useDatosDeBiblioteca } from '@/hooks/use-canvas-sources';
import { useCanvasTemplates, useRemoveCanvasTemplate } from '@/hooks/use-canvas-templates';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { coloresDe, conColores, type DocumentoDeLienzo, type OrientacionDeLienzo, RAIZ_DE_DOS } from '@/lib/library/canvas';
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
  const anio = new Date().getFullYear();
  // "Yo como lector" (T374) va en su propia fila, en recortes y en el Journal; en el Journal sale de la de KAVI.
  const deKavi = journal
    ? plantillasDeJournal(t, anio).filter((p) => p.orientacion === orientacion && !(DEL_JOURNAL_A_LECTOR as readonly string[]).includes(p.id))
    : plantillasDeKavi(t);
  const deLector = plantillasDeLector(t, anio).filter((p) => !journal || p.orientacion === orientacion);
  // Los datos de la biblioteca de las plantillas (Mi año lector, T349), con los de verdad.
  const datos = useDatosDeBiblioteca([...deKavi, ...deLector].flatMap((p) => p.doc.elements));
  const fuentes: FuentesDeMiniatura = {
    datos,
    imagenes: SIN_IMAGENES,
    stickers: new Map(),
    libros: new Map(item && !journal ? [[ESTE_LIBRO, { title: item.title, color: colorDePortada(item), ...(ruta && urls.get(ruta) ? { src: urls.get(ruta) } : {}) }]] : []),
  };

  // Personalizar una plantilla antes de usarla (T368): su papel, su tinta y su acento.
  const [personalizando, setPersonalizando] = useState<PlantillaDeLienzo | null>(null);
  const [colores, setColores] = useState<ColoresElegidos>({});
  const [colorDe, setColorDe] = useState<RolDeColor | null>(null);
  const pintada = (p: PlantillaDeLienzo) => conColores(p.doc, { papel: colores.papel, tinta: colores.tinta ?? undefined, acento: colores.acento ?? undefined });
  const usar = (p: PlantillaDeLienzo) => {
    setPersonalizando(p);
    setColores({});
  };
  const crearCon = (p: PlantillaDeLienzo) => {
    setPersonalizando(null);
    if (item) onCrear(item, { orientacion: p.orientacion, doc: pintada(p), titulo: p.nombre });
  };
  const cerrar = () => {
    setPersonalizando(null);
    onClose();
  };
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
  // Una propia también se borra con su botón, a la vista (T365): mantener presionado no se descubre en la computadora.
  const propiaConBorrar = (p: PlantillaDeLienzo) => (
    <View key={p.id} style={styles.conBorrar}>
      {tarjeta(p, true)}
      <IconButton label={t.remove(p.nombre)} onPress={() => void quitar(p.id)}>
        <Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />
      </IconButton>
    </View>
  );

  const propias: PlantillaDeLienzo[] = (mias.data ?? [])
    .filter((p) => !journal || p.orientation === orientacion)
    .map((p) => ({ id: p.id, nombre: p.name, orientacion: p.orientation, doc: p.doc }));

  const actuales = personalizando ? coloresDe(personalizando.doc) : null;
  return (
    <>
      <ColorPickerSheet
        visible={colorDe !== null}
        titulo={colorDe === 'papel' ? c.pageColors.paper : colorDe === 'tinta' ? c.pageColors.ink : c.pageColors.accent}
        valor={colorDe ? (colores[colorDe] ?? actuales?.[colorDe] ?? null) : null}
        ninguno={colorDe === 'papel' ? c.paper : c.pageColors.asIs}
        onClose={() => setColorDe(null)}
        onElegir={(hex) => {
          const rol = colorDe;
          setColorDe(null);
          if (!rol) return;
          // Sin color: el papel vuelve a blanco; la tinta y el acento, a como vienen.
          setColores((x) => ({ ...x, [rol]: hex ?? (rol === 'papel' ? null : undefined) }));
        }}
      />
      <Sheet visible={item !== null && colorDe === null} onClose={cerrar} title={personalizando ? personalizando.nombre : journal ? j.newPage : c.newCanvas}>
        {personalizando ? (
          <View style={styles.cuerpo}>
            <View style={styles.muestraGrande}>
              <CanvasPreview doc={pintada(personalizando)} orientacion={personalizando.orientacion} ancho={personalizando.orientacion === 'portrait' ? 180 : 250} fuentes={fuentes} />
            </View>
            <AppText variant="label" color="textSecondary">
              {c.pageColors.title}
            </AppText>
            <PageColorRows valores={colores} onElegir={setColorDe} />
            <Button title={c.pageColors.use} onPress={() => crearCon(personalizando)} />
            <Button title={c.pageColors.other} variant="secondary" onPress={() => setPersonalizando(null)} />
          </View>
        ) : (
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
                <View style={styles.fila}>
                  {deKavi.map((p) => tarjeta(p, false))}
                </View>
              </>
            ) : null}

            {deLector.length ? (
              <>
                <AppText variant="label" color="textSecondary">
                  {t.reader}
                </AppText>
                <View style={styles.fila}>
                  {deLector.map((p) => tarjeta(p, false))}
                </View>
              </>
            ) : null}

            <AppText variant="label" color="textSecondary">
              {t.mine}
            </AppText>
            {propias.length ? (
              <View style={styles.fila}>
                {propias.map(propiaConBorrar)}
              </View>
            ) : (
              <AppText variant="caption" color="textSecondary">
                {journal ? j.mineEmpty : t.mineEmpty}
              </AppText>
            )}
          </View>
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md, paddingBottom: Spacing.md },
  muestra: { alignItems: 'center', justifyContent: 'center', height: 136 },
  pagina: { borderWidth: 1, borderRadius: Radius.sm / 2, borderCurve: 'continuous', boxShadow: '0 4px 16px rgba(22,23,26,0.08)' },
  // En cuadrícula (pedido de Areli, 26 oct): en una fila deslizable solo se veían las primeras cuatro y las demás
  // parecían haber desaparecido.
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, paddingVertical: Spacing.xs },
  tarjeta: { width: ANCHO_MINIATURA, gap: Spacing.xs },
  conBorrar: { alignItems: 'center' },
  muestraGrande: { alignItems: 'center' },
  presionada: { opacity: 0.85 },
  nombre: { textAlign: 'center' },
});
