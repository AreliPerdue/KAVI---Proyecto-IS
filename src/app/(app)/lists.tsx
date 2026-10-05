import { useRouter } from 'expo-router';
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, CircleCheck, Copy, Ellipsis, Inbox, Pin, PinOff, Search, Sun, Trash2, X } from 'lucide-react-native';
import { useCallback, useContext, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, type TextStyle, View } from 'react-native';


import { tint } from '@/components/calendar/activity-style';
import { DraggableGrid } from '@/components/lists/draggable-grid';
import { arrastreReciente } from '@/components/lists/drag-guard';
import { PEOPLE_COLORS } from '@/constants/people-colors';
import { ModalHeader } from '@/components/modal-header';
import { ModuleInBarContext } from '@/components/navigation/stacked-module';
import { ActionRow, AppText, EmptyState, ErrorState, Fab, LoadingState, Screen, Sheet, ThemeIcon } from '@/components/ui';
import { Fonts, IconSize, IconStroke, Radius, Spacing, Typography } from '@/constants/theme';
import {
  useArchivedLists,
  useListMutations,
  useListItemsByDate,
  useLists,
  useListSearch,
  useOverdueListItems,
  useListsSharedWithMe,
  useListTags,
} from '@/hooks/use-lists';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useShrinkOnScroll } from '@/hooks/use-shrink-on-scroll';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate, fromDayKey, toDayKey } from '@/lib/dates';
import { useConfirm, useSnackbar } from '@/providers';
import type { ListSearchResults } from '@/services/lists';
import type { KaviList, ListItem } from '@/types/domain';
import { t, type Dictionary, type Language, useLanguage, useT } from '@/i18n';

/** Dos columnas: es la rejilla de tarjetas de RF-L1, al estilo de Google Keep. */
const COLUMNAS = 2;

/** Con qué nace una lista antes de que nadie la toque, en el idioma activo (spec 12). */
export function nombrePorOmision(): string {
  return t().lists.untitled;
}

/** Si una lista sigue con el nombre con que nació, en cualquiera de los dos idiomas. */
export function esNombrePorOmision(nombre: string): boolean {
  return nombre === t('es').lists.untitled || nombre === t('en').lists.untitled;
}
const COLOR_POR_OMISION = PEOPLE_COLORS[0]?.hex ?? '#86CBF3';

const SIN_ANILLO: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle) : {};

function subtitulo(lista: KaviList, tx: Dictionary, lang: Language): string {
  // La fecha de la lista (RF-L23) se añade al final: una lista con fecha tiene que
  // reconocerse desde la rejilla, o la fecha solo sirve a quien ya la abrió.
  const fecha = lista.due_date ? ` · ${formatShortDate(fromDayKey(lista.due_date), lang)}` : '';
  if (lista.total_count === 0) return `${tx.lists.subtitle.empty}${fecha}`;
  if (lista.pending_count === 0) return `${tx.lists.subtitle.allDone(lista.total_count)}${fecha}`;
  return `${tx.lists.subtitle.pending(lista.pending_count, lista.total_count)}${fecha}`;
}

/** Parte en filas de `COLUMNAS` para poder poner encabezados de ancho completo. */
function enFilas(listas: readonly KaviList[]): KaviList[][] {
  const filas: KaviList[][] = [];
  for (let i = 0; i < listas.length; i += COLUMNAS) filas.push(listas.slice(i, i + COLUMNAS));
  return filas;
}

/**
 * Resultados de la búsqueda (RF-L4).
 *
 * Listas y elementos se muestran por separado y no mezclados: buscar "leche" puede dar una
 * lista que se llama así y un elemento dentro de otra, y son dos respuestas distintas a la
 * misma palabra. Lo ya palomeado aparece tachado en vez de esconderse: media búsqueda
 * dentro de una lista es para recordar si algo ya se compró.
 */
function Resultados({ datos, abrir }: { datos: ListSearchResults | undefined; abrir: (id: string) => void }) {
  const theme = useTheme();
  const tx = useT();
  const listas = datos?.lists ?? [];
  const elementos = datos?.items ?? [];

  if (listas.length === 0 && elementos.length === 0) {
    return (
      <EmptyState
        icon={<Search size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
        title={tx.lists.noMatchesTitle}
        description={tx.lists.noMatchesDescription}
      />
    );
  }

  const fila = (key: string, texto: string, hecho: boolean, onPress: () => void, sub?: string) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityLabel={texto}
      onPress={onPress}
      style={({ pressed }) => [styles.resultado, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
      <View style={styles.resultadoTexto}>
        <AppText variant="body" color={hecho ? 'textTertiary' : 'text'} numberOfLines={1} style={hecho ? styles.tachado : null}>
          {texto}
        </AppText>
        {sub ? (
          <AppText variant="caption" color="textTertiary" numberOfLines={1}>
            {sub}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={styles.resultados} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {listas.length > 0 ? (
        <>
          <AppText variant="caption" color="textTertiary">
            {tx.lists.searchLists}
          </AppText>
          {listas.map((l) => fila(l.id, l.name, false, () => abrir(l.id)))}
        </>
      ) : null}

      {elementos.length > 0 ? (
        <>
          <AppText variant="caption" color="textTertiary" style={listas.length > 0 ? styles.grupoTitulo : undefined}>
            {tx.lists.searchItems}
          </AppText>
          {elementos.map((i: ListItem) =>
            fila(i.id, i.title, i.completed_at !== null, () => abrir(i.list_id), i.note ?? undefined),
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

/**
 * Inicio de KAVI Lists (RF-L1 – RF-L3).
 *
 * Los grupos se pintan como bloques separados y no como encabezados dentro de una sola
 * rejilla: en una lista de dos columnas, un encabezado ocupa una celda y queda al lado
 * de una tarjeta en vez de encima del grupo. `SectionList` tampoco resuelve esto porque
 * no admite varias columnas.
 */
export default function ListsScreen() {
  const enBarra = useContext(ModuleInBarContext);
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const router = useRouter();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  // Sin esto habría una consulta por tecla; con 250 ms se dispara al dejar de escribir.
  const termino = useDebouncedValue(busqueda, 250);
  const resultados = useListSearch(termino);
  const buscando = busqueda.trim().length >= 2;
  const [menuDe, setMenuDe] = useState<KaviList | null>(null);

  const lists = useLists();
  const archivadas = useArchivedLists(verArchivadas);
  /*
   * El número de Hoy sale de las mismas dos consultas que alimentan la franja del
   * calendario, así que normalmente ya está en caché y el acceso no cuesta una consulta
   * nueva. Algún día no lleva número a propósito: su consulta es la más ancha del módulo
   * —todo lo que no tiene día— y no vale la pena correrla solo para pintar un dígito.
   */
  const hoyClave = toDayKey(new Date());
  const deHoy = useListItemsByDate(hoyClave, hoyClave, !verArchivadas);
  const atrasados = useOverdueListItems(hoyClave, !verArchivadas);
  const compartidas = useListsSharedWithMe();
  const etiquetas = useListTags();
  const [etiquetaActiva, setEtiquetaActiva] = useState<string | null>(null);
  const { update, remove, duplicate, create, swapLists, moveList } = useListMutations();
  const { shrunk, onScroll } = useShrinkOnScroll();

  const consulta = verArchivadas ? archivadas : lists;

  /* Lo palomeado de hoy no cuenta: el número dice cuánto falta, no cuánto hubo. */
  const atrasadosHoy = (atrasados.data ?? []).length;
  const pendientesHoy =
    atrasadosHoy +
    (deHoy.data ?? []).filter((i) => i.completed_at === null).length +
    (lists.data ?? []).filter((l) => l.due_date !== null && l.due_date <= hoyClave).length;

  const abrir = useCallback((id: string) => router.push({ pathname: '/(app)/list/[id]', params: { id } }), [router]);

  const { fijadas, propias } = useMemo(() => {
    // Con una etiqueta activa se filtra antes de agrupar, para que "Fijadas" siga
    // significando "fijadas de esto" y no quede un encabezado sobre nada.
    const todas = (lists.data ?? []).filter((l) => !etiquetaActiva || l.tag_ids.includes(etiquetaActiva));
    return { fijadas: todas.filter((l) => l.is_pinned), propias: todas.filter((l) => !l.is_pinned) };
  }, [lists.data, etiquetaActiva]);

  const cerrarMenu = () => setMenuDe(null);

  /** Se ordena dentro del propio grupo: subir no despega una lista de "Fijadas". */
  const grupoDe = (lista: KaviList) => (lista.is_pinned ? fijadas : propias);

  const desplazar = (lista: KaviList, direccion: -1 | 1) => {
    const grupo = grupoDe(lista);
    const vecino = grupo[grupo.findIndex((l) => l.id === lista.id) + direccion];
    cerrarMenu();
    if (vecino) swapLists.mutate({ a: lista, b: vecino });
  };

  /**
   * Crear no pasa por ningún formulario (RF-L2).
   *
   * Se crea con valores por omisión y se entra directo a la lista, con el título enfocado
   * y preseleccionado. Una lista se abre porque hay algo que apuntar **ya**; elegir color e
   * icono entre veinticinco antes de poder escribir es justo el tiempo que tarda uno en
   * olvidar qué iba a anotar. El color y el icono se cambian después, desde la paleta.
   */
  const nuevaLista = () =>
    create.mutate(
      { name: nombrePorOmision(), icon: 'tag', color: COLOR_POR_OMISION },
      {
        onSuccess: (lista) => router.push({ pathname: '/(app)/list/[id]', params: { id: lista.id, nueva: '1' } }),
        // Sin esto, un fallo al crear no se distinguía de un botón que no hace nada: la
        // pantalla se quedaba igual y sin decir por qué.
        onError: (e) => showSnackbar({ message: e instanceof Error ? e.message : tx.lists.createFailed }),
      },
    );

  const alternarFijada = (lista: KaviList) => {
    cerrarMenu();
    update.mutate({ id: lista.id, patch: { is_pinned: !lista.is_pinned } });
  };

  const archivar = (lista: KaviList, archivar: boolean) => {
    cerrarMenu();
    update.mutate(
      { id: lista.id, patch: { is_archived: archivar } },
      { onSuccess: () => showSnackbar({ message: archivar ? tx.lists.archived : tx.lists.restored }) },
    );
  };

  const duplicar = (lista: KaviList) => {
    cerrarMenu();
    duplicate.mutate(lista.id, { onSuccess: () => showSnackbar({ message: tx.lists.duplicated }) });
  };

  const eliminar = async (lista: KaviList) => {
    cerrarMenu();
    const ok = await confirm({
      title: tx.lists.deleteTitle,
      // Se nombra lo que se pierde y se ofrece la salida intermedia: archivar conserva todo.
      message:
        lista.total_count > 0
          ? tx.lists.deleteWithItems(lista.total_count)
          : tx.lists.cantUndo,
      confirmLabel: tx.lists.delete,
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(lista.id, { onSuccess: () => showSnackbar({ message: tx.lists.deleted }) });
  };

  /*
   * El botón de acciones va **fuera** de la tarjeta y encima de ella, no anidado.
   *
   * Son dos cosas a la vez: con mouse no existe la pulsación larga, así que sin botón
   * visible el menú quedaría inalcanzable en web —y con él editar, fijar, archivar y
   * eliminar—; pero meter un Pressable dentro de otro genera un `<button>` dentro de un
   * `<button>`, que es HTML inválido, rompe la hidratación y deja el botón interno fuera
   * del recorrido con teclado. Como hermanos posicionados, se ve igual y ambos funcionan.
   */
  const tarjeta = (item: KaviList) => (
    <View key={item.id} style={styles.celda}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${subtitulo(item, tx, lang)}`}
        accessibilityHint={tx.calendar.reorderHint}
        // Soltar una tarjeta no debe abrirla: el toque llega igual porque el arrastre no
        // lo cancela, así que se ignora el que venga pegado a un arrastre.
        onPress={() => {
          if (arrastreReciente()) return;
          if (verArchivadas) setMenuDe(item);
          else abrir(item.id);
        }}
        style={({ pressed }) => [
          styles.tarjeta,
          { backgroundColor: tint(item.color, 0.16), borderColor: item.color },
          pressed ? styles.pressed : null,
        ]}>
        <View style={styles.tarjetaCabeza}>
          <ThemeIcon name={item.icon} color={item.color} size={20} />
          {item.is_pinned ? <Pin size={14} strokeWidth={IconStroke} color={item.color} /> : null}
        </View>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {item.name}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {subtitulo(item, tx, lang)}
        </AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tx.lists.actionsFor(item.name)}
        hitSlop={10}
        onPress={() => setMenuDe(item)}
        style={({ pressed }) => [styles.masBoton, pressed ? styles.pressed : null]}>
        <Ellipsis size={16} strokeWidth={IconStroke} color={theme.textSecondary} />
      </Pressable>
    </View>
  );

  /**
   * `ordenable` distingue mis grupos de "Compartidas conmigo": el orden vive en la lista y
   * es de su dueño, así que arrastrar algo que no es tuyo cambiaría el inicio de otra
   * persona. Esas se muestran, no se reordenan.
   */
  const grupo = (titulo: string, listas: KaviList[], ordenable = true) =>
    listas.length === 0 ? null : (
      <View style={styles.grupo}>
        {/* Sin listas fijadas no hace falta encabezar "Mis listas": no hay de qué distinguirlas. */}
        {titulo ? (
          <AppText variant="caption" color="textTertiary">
            {titulo}
          </AppText>
        ) : null}
        {ordenable ? (
          <DraggableGrid
            items={listas}
            columns={COLUMNAS}
            keyOf={(l) => l.id}
            onReorder={(from, to) => moveList.mutate({ grupo: listas, from, to })}
            renderItem={tarjeta}
          />
        ) : (
          enFilas(listas).map((fila) => (
            <View key={fila[0]!.id} style={styles.fila}>
              {fila.map(tarjeta)}
              {fila.length < COLUMNAS ? <View style={styles.hueco} /> : null}
            </View>
          ))
        )}
      </View>
    );

  return (
    <Screen contentStyle={styles.content}>
      <ModalHeader
        back
        // En la barra del teléfono (RF-N6) no hay a dónde volver, salvo desde Archivadas.
        leading={!enBarra || verArchivadas}
        title={verArchivadas ? tx.lists.archivedTitle : tx.lists.title}
        // Dentro de Archivadas, "atrás" vuelve a las listas activas antes de salir del
        // módulo: es el paso que la persona deshace, no la pantalla entera.
        onClose={verArchivadas ? () => setVerArchivadas(false) : undefined}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={verArchivadas ? tx.lists.backToMine : tx.lists.seeArchived}
            onPress={() => setVerArchivadas((v) => !v)}
            style={({ pressed }) => [styles.enlace, pressed ? styles.pressed : null]}>
            <AppText variant="label" color="textSecondary">
              {verArchivadas ? tx.lists.myLists : tx.lists.archivedTitle}
            </AppText>
          </Pressable>
        }
      />

      <View style={[styles.buscador, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Search size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder={tx.lists.searchPlaceholder}
          placeholderTextColor={theme.textTertiary}
          returnKeyType="search"
          accessibilityLabel={tx.lists.searchPlaceholder}
          style={[styles.buscadorInput, SIN_ANILLO, { color: theme.text }]}
        />
        {busqueda ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx.lists.clearSearch}
            hitSlop={8}
            onPress={() => setBusqueda('')}
            style={({ pressed }) => [pressed ? styles.pressed : null]}>
            <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {/*
        Hoy y Algún día (RF-L24, RF-L25): las dos preguntas que cruzan todas las listas.
        Van arriba del todo porque son por donde se entra cuando uno no viene a una lista
        en concreto, sino a ver qué hacer. Desaparecen al buscar y en Archivadas, donde
        preguntar "¿qué me toca?" no tiene sentido.
      */}
      {!buscando && !verArchivadas ? (
        <View style={styles.accesos}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              pendientesHoy > 0 ? tx.lists.todayPending(pendientesHoy) : tx.lists.today
            }
            onPress={() => router.push({ pathname: '/(app)/today', params: { vista: 'hoy' } })}
            style={({ pressed }) => [
              styles.acceso,
              { borderColor: theme.border, backgroundColor: theme.surface },
              pressed ? { backgroundColor: theme.surfaceAlt } : null,
            ]}>
            <Sun size={IconSize.action} strokeWidth={IconStroke} color={atrasadosHoy > 0 ? theme.today : theme.text} />
            <AppText variant="bodyStrong" style={styles.accesoNombre}>
              {tx.lists.today}
            </AppText>
            {pendientesHoy > 0 ? (
              <AppText variant="label" color={atrasadosHoy > 0 ? 'today' : 'textSecondary'} tabular>
                {pendientesHoy}
              </AppText>
            ) : null}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx.lists.somedayA11y}
            onPress={() => router.push({ pathname: '/(app)/today', params: { vista: 'algun-dia' } })}
            style={({ pressed }) => [
              styles.acceso,
              { borderColor: theme.border, backgroundColor: theme.surface },
              pressed ? { backgroundColor: theme.surfaceAlt } : null,
            ]}>
            <Inbox size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
            <AppText variant="bodyStrong" style={styles.accesoNombre}>
              {tx.lists.someday}
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {/*
        Fila de etiquetas: es la forma de ver juntas las listas de un mismo tema (RF-L22).
        No aparece si no hay ninguna, para no ocupar alto prometiendo algo vacío.
      */}
      {!buscando && !verArchivadas && (etiquetas.data ?? []).length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          /*
           * `flexGrow: 0` y alineación al centro: dentro de una columna flexible, un
           * carrusel horizontal se estira a todo el alto disponible y sus pastillas salen
           * del tamaño de la pantalla. Aquí debe ocupar solo lo que miden.
           */
          style={styles.etiquetasScroll}
          contentContainerStyle={styles.etiquetas}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: etiquetaActiva === null }}
            accessibilityLabel={tx.lists.allLists}
            onPress={() => setEtiquetaActiva(null)}
            style={({ pressed }) => [
              styles.etiqueta,
              etiquetaActiva === null
                ? { backgroundColor: theme.ink, borderColor: theme.ink }
                : { borderColor: theme.border },
              pressed ? styles.pressed : null,
            ]}>
            <AppText variant="label" color={etiquetaActiva === null ? 'onInk' : 'textSecondary'}>
              Todas
            </AppText>
          </Pressable>
          {(etiquetas.data ?? []).map((t) => {
            const activa = etiquetaActiva === t.id;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityState={{ selected: activa }}
                accessibilityLabel={tx.lists.tagCount(t.name, t.list_count)}
                onPress={() => setEtiquetaActiva(activa ? null : t.id)}
                style={({ pressed }) => [
                  styles.etiqueta,
                  activa ? { backgroundColor: theme.ink, borderColor: theme.ink } : { borderColor: theme.border },
                  pressed ? styles.pressed : null,
                ]}>
                <AppText variant="label" color={activa ? 'onInk' : 'textSecondary'}>
                  {t.name}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {buscando ? <Resultados datos={resultados.data} abrir={abrir} /> : null}

      {!buscando && consulta.isPending ? <LoadingState /> : null}
      {!buscando && consulta.isError ? <ErrorState message={consulta.error.message} onRetry={() => consulta.refetch()} /> : null}

      {!buscando && consulta.isSuccess ? (
        consulta.data.length === 0 ? (
          <EmptyState
            icon={<CircleCheck size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
            title={verArchivadas ? tx.lists.noArchivedTitle : tx.lists.noListsTitle}
            description={
              verArchivadas
                ? tx.lists.noArchivedDescription
                : tx.lists.noListsDescription
            }
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.cuerpo}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={32}>
            {verArchivadas ? (
              grupo('', archivadas.data ?? [])
            ) : (
              <>
                {grupo(tx.lists.pinned, fijadas)}
                {grupo(fijadas.length > 0 ? tx.lists.myLists : '', propias)}
                {/* Lo compartido contigo va aparte: no es tuyo y conviene que se note. */}
                {grupo(tx.lists.sharedWithMe, compartidas.data ?? [], false)}
              </>
            )}
          </ScrollView>
        )
      ) : null}

      {!verArchivadas ? <Fab label={tx.lists.newList} shrunk={shrunk} onPress={nuevaLista} /> : null}

      <Sheet visible={menuDe !== null} onClose={cerrarMenu} title={menuDe?.name ?? ''}>
        {menuDe ? (
          <>
            {menuDe.is_archived ? (
              <ActionRow
                icon={<ArchiveRestore size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label={tx.lists.restore}
                onPress={() => archivar(menuDe, false)}
              />
            ) : (
              <>
                <ActionRow
                  icon={
                    menuDe.is_pinned ? (
                      <PinOff size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
                    ) : (
                      <Pin size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
                    )
                  }
                  label={menuDe.is_pinned ? tx.lists.unpin : tx.lists.pin}
                  onPress={() => alternarFijada(menuDe)}
                />
                <ActionRow
                  icon={<ArrowUp size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                  label={tx.lists.moveUp}
                  disabled={grupoDe(menuDe).findIndex((l) => l.id === menuDe.id) <= 0}
                  onPress={() => desplazar(menuDe, -1)}
                />
                <ActionRow
                  icon={<ArrowDown size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                  label={tx.lists.moveDown}
                  disabled={(() => {
                    const g = grupoDe(menuDe);
                    return g.findIndex((l) => l.id === menuDe.id) >= g.length - 1;
                  })()}
                  onPress={() => desplazar(menuDe, 1)}
                />
                <ActionRow
                  icon={<Copy size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                  label={tx.lists.duplicate}
                  onPress={() => duplicar(menuDe)}
                />
                <ActionRow
                  icon={<Archive size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                  label={tx.lists.archive}
                  onPress={() => archivar(menuDe, true)}
                />
              </>
            )}
            <ActionRow
              icon={<Trash2 size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />}
              label={tx.lists.delete}
              color="danger"
              onPress={() => eliminar(menuDe)}
            />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.md },
  enlace: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.xs },
  cuerpo: { gap: Spacing.lg, paddingBottom: Spacing['3xl'] },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  buscadorInput: {
    flex: 1,
    fontFamily: Fonts?.sans,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    padding: 0,
  },
  accesos: { flexDirection: 'row', gap: Spacing.sm },
  acceso: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  accesoNombre: { flex: 1 },
  etiquetasScroll: { flexGrow: 0 },
  etiquetas: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingRight: Spacing.lg },
  etiqueta: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  resultados: { gap: Spacing.sm, paddingBottom: Spacing['3xl'] },
  grupoTitulo: { marginTop: Spacing.sm },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  resultadoTexto: { flex: 1 },
  tachado: { textDecorationLine: 'line-through' },
  grupo: { gap: Spacing.sm },
  fila: { flexDirection: 'row', gap: Spacing.sm },
  hueco: { flex: 1 },
  tarjeta: {
    flex: 1,
    gap: Spacing.xs,
    minHeight: 104,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  celda: { flex: 1 },
  tarjetaCabeza: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingRight: Spacing.lg },
  masBoton: { position: 'absolute', top: Spacing.sm, right: Spacing.sm, padding: 2, borderRadius: Radius.full },
  pressed: { opacity: 0.8 },
});
