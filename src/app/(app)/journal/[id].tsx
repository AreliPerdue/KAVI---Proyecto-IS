import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen, Brush, ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { memo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CanvasPreview, type FuentesDeMiniatura } from '@/components/library/canvas-preview';
import { type CaraDeJournal, InteriorDeTapa, JournalCover } from '@/components/library/journal-cover';
import { NewCanvasSheet } from '@/components/library/new-canvas-sheet';
import { ActionRow, AppText, Button, ErrorState, IconButton, LoadingState, Segmented, Sheet } from '@/components/ui';
import { IconSize, IconStroke, MaxContentWidth, Spacing } from '@/constants/theme';
import { useFuentesDeLienzos } from '@/hooks/use-canvas-sources';
import { useCanvases, useCreateCanvas, useRemoveCanvas } from '@/hooks/use-canvases';
import { useDecoracionDeJournal, useTapaParaDecorar } from '@/hooks/use-journal-covers';
import { useLibraryItem } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { uuidv4 } from '@/lib/gym/ids';
import { usarPlantilla } from '@/lib/library/canvas-templates';
import { cabeOtraPagina, paginasEnOrden, paginasValidas, portadaValida, proporcionDeCara } from '@/lib/library/journal';
import { useConfirm, useSnackbar } from '@/providers';
import type { LibraryCanvas } from '@/types/domain';

type Pagina = { lienzo: LibraryCanvas; numero: number };

/**
 * Un Journal (spec 13i; T345): el cuaderno como objeto, que se gira para ver su portada, su lomo y su contraportada,
 * con lo que es (encuadernación, material, páginas) y "Editar Journal", que vuelve a los pasos sin perder nada.
 *
 * Sus páginas (13h, RF-CC2; T347): cada una es un lienzo con la forma del Journal, en el orden en que se hicieron. Se
 * ven en miniatura; tocar una la abre en el lienzo creativo, su ⋯ la borra, "Nueva página" empieza una en blanco o con
 * una plantilla (Conoce a quien lee, Mis plantillas) mientras quepa, y "Leer" lo abre en el lector, como un libro
 * (T364): esta pantalla es para editarlo.
 *
 * Sus tapas (13i, RF-JC10; T346): cada cara se ve con lo decorado y "Decorar …" abre su lienzo (la primera vez, en
 * blanco). Decorar es opcional (RF-JC2).
 */
export default function JournalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const tx = useT();
  const j = tx.library.journal;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pieza = useLibraryItem(id);
  const lienzos = useCanvases(id);
  const crear = useCreateCanvas();
  const borrar = useRemoveCanvas();
  const confirmar = useConfirm();
  const avisar = useSnackbar();
  // Las tres caras y, en "Interior", la tapa por dentro con su guarda (T372).
  const [cara, setCara] = useState<CaraDeJournal | 'inside'>('front');
  const [creando, setCreando] = useState(false);
  const [menuDe, setMenuDe] = useState<Pagina | null>(null);
  const decoracion = useDecoracionDeJournal(id);
  const tapaParaDecorar = useTapaParaDecorar();
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/(app)/library'));

  const paginas: Pagina[] = paginasEnOrden(lienzos.data ?? []).map((lienzo, i) => ({ lienzo, numero: i + 1 }));
  const fuentes = useFuentesDeLienzos(paginas.flatMap((p) => p.lienzo.doc.elements)).miniatura;

  const barra = (
    <View style={styles.barra}>
      <IconButton label={tx.common.back} onPress={volver}>
        <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
      </IconButton>
    </View>
  );

  if (!pieza.data) {
    return (
      <View style={[styles.pantalla, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        {barra}
        {pieza.isError ? <ErrorState message={j.notFound} onRetry={() => void pieza.refetch()} /> : <LoadingState />}
      </View>
    );
  }

  const journal = pieza.data;
  const portada = portadaValida(journal.journal);
  const total = paginasValidas(journal.page_count);
  const cabe = cabeOtraPagina(paginas.length, total);
  const contenido = Math.min(width, MaxContentWidth) - Spacing.lg * 2;
  // Al primer render la ventana puede medir 0: nunca menos de 120.
  const anchoVista = Math.max(120, Math.min(300, contenido * 0.7));
  const ancho = portada.orientation === 'portrait' ? anchoVista : anchoVista * 1.3;
  const alto = ancho * (portada.orientation === 'portrait' ? Math.SQRT2 : 1 / Math.SQRT2);
  const descripcion = `${j.bindings[portada.binding]} · ${j.materials[portada.material]} · ${j.pagesValue(total)}`;
  const columnas = contenido >= 860 ? 4 : contenido >= 560 ? 3 : 2;
  const anchoMiniatura = Math.max(60, Math.floor((contenido - Spacing.md * (columnas - 1)) / columnas));

  const abrir = (p: Pagina) => router.push({ pathname: '/(app)/canvas/[id]', params: { id: p.lienzo.id, item: id } });
  const quitar = async (p: Pagina) => {
    setMenuDe(null);
    const ok = await confirmar({ title: j.removePageTitle, message: j.removePageMessage, confirmLabel: j.removePageConfirm, destructive: true });
    if (!ok) return;
    borrar(p.lienzo);
    avisar({ message: j.pageRemoved });
  };
  const icono = (Icono: typeof Plus, color: string = theme.text) => <Icono size={IconSize.inline} strokeWidth={IconStroke} color={color} />;

  const encabezado = (
    <View style={styles.encabezado}>
      <View>
        <AppText variant="title" accessibilityRole="header">
          {journal.title}
        </AppText>
        <AppText variant="label" color="textSecondary">
          {descripcion}
        </AppText>
      </View>
      <View style={[styles.vista, { height: alto + Spacing.xl }]}>
        {cara === 'inside' ? (
          <View accessible accessibilityRole="image" accessibilityLabel={j.insideA11y}>
            <InteriorDeTapa portada={portada} ancho={ancho} />
          </View>
        ) : cara === 'spine' ? (
          // Con la proporción del lomo en el librero, para que lo decorado se vea igual en los dos (RF-JC5).
          <JournalCover
            portada={portada}
            cara="spine"
            ancho={alto / proporcionDeCara(portada.orientation, 'spine', total)}
            alto={alto}
            etiqueta={j.faces.spine}
            decoracion={decoracion.spine}
          />
        ) : (
          <JournalCover
            portada={portada}
            cara={cara}
            ancho={ancho}
            etiqueta={j.a11y(journal.title, j.bindings[portada.binding], j.materials[portada.material])}
            decoracion={decoracion[cara]}
          />
        )}
      </View>
      <Segmented
        label={j.view}
        options={[...(['front', 'spine', 'back'] as const).map((v) => ({ value: v, label: j.faces[v] })), { value: 'inside' as const, label: j.inside }]}
        value={cara}
        onChange={setCara}
        fullWidth
      />
      <View style={styles.acciones}>
        {/* El espiral no tiene lomo que decorar: su borde es el espiral (RF-JC4). El interior se cambia en sus guardas. */}
        {cara === 'inside' ? (
          <View style={styles.flex}>
            <Button
              title={j.changeEndpapers}
              icon={icono(Brush, theme.onInk)}
              onPress={() => router.push({ pathname: '/(app)/journal/edit', params: { id, seccion: 'guardas' } })}
            />
          </View>
        ) : cara === 'spine' && portada.binding === 'spiral' ? null : (
          <View style={styles.flex}>
            <Button
              title={j.decorate[cara]}
              icon={icono(Brush, theme.onInk)}
              onPress={() => router.push({ pathname: '/(app)/canvas/[id]', params: { id: tapaParaDecorar(journal, lienzos.data ?? [], cara), item: id } })}
            />
          </View>
        )}
        <View style={styles.flex}>
          <Button title={j.edit} variant="secondary" icon={icono(Pencil)} onPress={() => router.push({ pathname: '/(app)/journal/edit', params: { id } })} />
        </View>
      </View>

      <View style={styles.seccion}>
        <View style={styles.flex}>
          <AppText variant="heading">{j.pages}</AppText>
          <AppText variant="label" color="textSecondary">
            {j.used(paginas.length, total)}
          </AppText>
        </View>
        {paginas.length ? (
          <IconButton label={j.read} onPress={() => router.push({ pathname: '/(app)/book/[id]', params: { id } })}>
            <BookOpen size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
        ) : null}
        <Button title={j.newPage} icon={icono(Plus, cabe ? theme.onInk : theme.textTertiary)} disabled={!cabe} onPress={() => setCreando(true)} />
      </View>
      {!cabe ? (
        <AppText variant="label" color="textSecondary">
          {j.full}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.pantalla, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {barra}
      <FlatList
        key={columnas}
        data={paginas}
        numColumns={columnas}
        keyExtractor={(p) => p.lienzo.id}
        contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + Spacing.xl }]}
        columnWrapperStyle={columnas > 1 ? styles.fila : undefined}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={
          lienzos.isPending ? (
            <LoadingState />
          ) : lienzos.isError ? (
            <ErrorState message={j.pagesError} onRetry={() => void lienzos.refetch()} />
          ) : (
            <AppText variant="body" color="textSecondary" style={styles.vacio}>
              {j.pagesEmpty}
            </AppText>
          )
        }
        renderItem={({ item }) => <Tarjeta pagina={item} ancho={anchoMiniatura} fuentes={fuentes} onAbrir={abrir} onMenu={setMenuDe} />}
      />
      <NewCanvasSheet
        item={creando ? journal : null}
        journal={{ orientacion: portada.orientation }}
        onClose={() => setCreando(false)}
        onCrear={(p, como) => {
          setCreando(false);
          // Una plantilla se copia con ids nuevos; su "este libro" queda por elegir (un Journal no es un libro).
          const doc = como.doc ? usarPlantilla(como.doc, '', uuidv4) : undefined;
          const nuevo = crear(p.id, portada.orientation, como.titulo ?? j.pageN(paginas.length + 1), doc, 'journal');
          router.push({ pathname: '/(app)/canvas/[id]', params: { id: nuevo, item: p.id } });
        }}
      />
      <Sheet visible={menuDe !== null} onClose={() => setMenuDe(null)} title={menuDe ? j.pageN(menuDe.numero) : ''}>
        {menuDe ? (
          <>
            <ActionRow
              icon={icono(ChevronRight)}
              label={j.openPage}
              onPress={() => {
                setMenuDe(null);
                abrir(menuDe);
              }}
            />
            <ActionRow icon={icono(Trash2, theme.danger)} label={j.removePage} color="danger" onPress={() => void quitar(menuDe)} />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

const Tarjeta = memo(function Tarjeta({
  pagina,
  ancho,
  fuentes,
  onAbrir,
  onMenu,
}: {
  pagina: Pagina;
  ancho: number;
  fuentes: FuentesDeMiniatura;
  onAbrir: (p: Pagina) => void;
  onMenu: (p: Pagina) => void;
}) {
  const theme = useTheme();
  const tx = useT();
  const j = tx.library.journal;
  const numero = j.pageN(pagina.numero);
  // El nombre de la página, si no es solo su número.
  const nombre = pagina.lienzo.title && pagina.lienzo.title !== numero ? pagina.lienzo.title : null;
  return (
    <View style={[styles.tarjeta, { width: ancho }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nombre ? `${numero}: ${nombre}` : numero}
        accessibilityHint={j.openPageHint}
        onPress={() => onAbrir(pagina)}
        style={({ pressed }) => [pressed ? styles.presionada : null]}>
        <CanvasPreview doc={pagina.lienzo.doc} orientacion={pagina.lienzo.orientation} ancho={ancho} fuentes={fuentes} />
      </Pressable>
      <View style={styles.pieTarjeta}>
        <View style={styles.flex}>
          <AppText variant="label" numberOfLines={1}>
            {numero}
          </AppText>
          {nombre ? (
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {nombre}
            </AppText>
          ) : null}
        </View>
        <IconButton label={j.pageActions(numero)} onPress={() => onMenu(pagina)}>
          <MoreHorizontal size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        </IconButton>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  barra: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  contenido: { paddingHorizontal: Spacing.lg, gap: Spacing.md, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  encabezado: { gap: Spacing.lg, paddingBottom: Spacing.sm },
  vista: { alignItems: 'center', justifyContent: 'center' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  seccion: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.md },
  fila: { gap: Spacing.md },
  flex: { flex: 1 },
  vacio: { paddingVertical: Spacing.lg },
  tarjeta: { gap: Spacing.xs },
  presionada: { opacity: 0.85 },
  pieTarjeta: { flexDirection: 'row', alignItems: 'center' },
});
