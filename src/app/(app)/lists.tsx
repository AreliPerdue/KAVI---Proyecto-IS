import { useRouter } from 'expo-router';
import { Archive, ArchiveRestore, CircleCheck, Copy, Ellipsis, Pin, PinOff, Trash2 } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { tint } from '@/components/calendar/activity-style';
import { PEOPLE_COLORS } from '@/constants/people-colors';
import { ModalHeader } from '@/components/modal-header';
import { ActionRow, AppText, EmptyState, ErrorState, Fab, LoadingState, Screen, Sheet, ThemeIcon } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useArchivedLists, useListMutations, useLists } from '@/hooks/use-lists';
import { useShrinkOnScroll } from '@/hooks/use-shrink-on-scroll';
import { useTheme } from '@/hooks/use-theme';
import { useConfirm, useSnackbar } from '@/providers';
import type { KaviList } from '@/types/domain';

/** Dos columnas: es la rejilla de tarjetas de RF-L1, al estilo de Google Keep. */
const COLUMNAS = 2;

/** Con qué nace una lista antes de que nadie la toque. */
export const NOMBRE_POR_OMISION = 'Sin título';
const COLOR_POR_OMISION = PEOPLE_COLORS[0]?.hex ?? '#176BFF';

function subtitulo(lista: KaviList): string {
  if (lista.total_count === 0) return 'Sin elementos';
  if (lista.pending_count === 0) return `Todo listo · ${lista.total_count}`;
  return `${lista.pending_count} ${lista.pending_count === 1 ? 'pendiente' : 'pendientes'} de ${lista.total_count}`;
}

/** Parte en filas de `COLUMNAS` para poder poner encabezados de ancho completo. */
function enFilas(listas: readonly KaviList[]): KaviList[][] {
  const filas: KaviList[][] = [];
  for (let i = 0; i < listas.length; i += COLUMNAS) filas.push(listas.slice(i, i + COLUMNAS));
  return filas;
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
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [menuDe, setMenuDe] = useState<KaviList | null>(null);

  const lists = useLists();
  const archivadas = useArchivedLists(verArchivadas);
  const { update, remove, duplicate, create } = useListMutations();
  const { shrunk, onScroll } = useShrinkOnScroll();

  const consulta = verArchivadas ? archivadas : lists;

  const abrir = useCallback((id: string) => router.push({ pathname: '/(app)/list/[id]', params: { id } }), [router]);

  const { fijadas, propias } = useMemo(() => {
    const todas = lists.data ?? [];
    return { fijadas: todas.filter((l) => l.is_pinned), propias: todas.filter((l) => !l.is_pinned) };
  }, [lists.data]);

  const cerrarMenu = () => setMenuDe(null);

  /**
   * Crear no pasa por ningún formulario (RF-L2).
   *
   * Se crea con valores por omisión y se entra directo a la lista, con el título enfocado
   * y preseleccionado. Una lista se abre porque hay algo que apuntar **ya**; elegir color e
   * icono entre veintiuno antes de poder escribir es justo el tiempo que tarda uno en
   * olvidar qué iba a anotar. El color y el icono se cambian después, desde la paleta.
   */
  const nuevaLista = () =>
    create.mutate(
      { name: NOMBRE_POR_OMISION, icon: 'tag', color: COLOR_POR_OMISION },
      { onSuccess: (lista) => router.push({ pathname: '/(app)/list/[id]', params: { id: lista.id, nueva: '1' } }) },
    );

  const alternarFijada = (lista: KaviList) => {
    cerrarMenu();
    update.mutate({ id: lista.id, patch: { is_pinned: !lista.is_pinned } });
  };

  const archivar = (lista: KaviList, archivar: boolean) => {
    cerrarMenu();
    update.mutate(
      { id: lista.id, patch: { is_archived: archivar } },
      { onSuccess: () => showSnackbar({ message: archivar ? 'Lista archivada.' : 'Lista restaurada.' }) },
    );
  };

  const duplicar = (lista: KaviList) => {
    cerrarMenu();
    duplicate.mutate(lista.id, { onSuccess: () => showSnackbar({ message: 'Lista duplicada.' }) });
  };

  const eliminar = async (lista: KaviList) => {
    cerrarMenu();
    const ok = await confirm({
      title: 'Eliminar lista',
      // Se nombra lo que se pierde y se ofrece la salida intermedia: archivar conserva todo.
      message:
        lista.total_count > 0
          ? `Se eliminarán también sus ${lista.total_count} elementos. Si solo quieres quitarla de aquí, archívala.`
          : 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(lista.id, { onSuccess: () => showSnackbar({ message: 'Lista eliminada.' }) });
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
        accessibilityLabel={`${item.name}, ${subtitulo(item)}`}
        accessibilityHint="Mantén presionado para más acciones"
        onPress={() => (verArchivadas ? setMenuDe(item) : abrir(item.id))}
        onLongPress={() => setMenuDe(item)}
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
          {subtitulo(item)}
        </AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Acciones de ${item.name}`}
        hitSlop={10}
        onPress={() => setMenuDe(item)}
        style={({ pressed }) => [styles.masBoton, pressed ? styles.pressed : null]}>
        <Ellipsis size={16} strokeWidth={IconStroke} color={theme.textSecondary} />
      </Pressable>
    </View>
  );

  const grupo = (titulo: string, listas: KaviList[]) =>
    listas.length === 0 ? null : (
      <View style={styles.grupo}>
        {/* Sin listas fijadas no hace falta encabezar "Mis listas": no hay de qué distinguirlas. */}
        {titulo ? (
          <AppText variant="caption" color="textTertiary">
            {titulo}
          </AppText>
        ) : null}
        {enFilas(listas).map((fila) => (
          <View key={fila[0]!.id} style={styles.fila}>
            {fila.map(tarjeta)}
            {/* Rellena el hueco de la última fila impar para que la tarjeta no se estire. */}
            {fila.length < COLUMNAS ? <View style={styles.hueco} /> : null}
          </View>
        ))}
      </View>
    );

  return (
    <Screen contentStyle={styles.content}>
      <ModalHeader
        back
        title={verArchivadas ? 'Archivadas' : 'Listas'}
        // Dentro de Archivadas, "atrás" vuelve a las listas activas antes de salir del
        // módulo: es el paso que la persona deshace, no la pantalla entera.
        onClose={verArchivadas ? () => setVerArchivadas(false) : undefined}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={verArchivadas ? 'Volver a mis listas' : 'Ver listas archivadas'}
            onPress={() => setVerArchivadas((v) => !v)}
            style={({ pressed }) => [styles.enlace, pressed ? styles.pressed : null]}>
            <AppText variant="label" color="textSecondary">
              {verArchivadas ? 'Mis listas' : 'Archivadas'}
            </AppText>
          </Pressable>
        }
      />

      {consulta.isPending ? <LoadingState /> : null}
      {consulta.isError ? <ErrorState message={consulta.error.message} onRetry={() => consulta.refetch()} /> : null}

      {consulta.isSuccess ? (
        consulta.data.length === 0 ? (
          <EmptyState
            icon={<CircleCheck size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
            title={verArchivadas ? 'No tienes listas archivadas' : 'Todavía no tienes listas'}
            description={
              verArchivadas
                ? 'Lo que archives se guarda aquí con todo su contenido.'
                : 'El súper, las películas pendientes, lo de la casa. Toca + para crear la primera.'
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
                {grupo('Fijadas', fijadas)}
                {grupo(fijadas.length > 0 ? 'Mis listas' : '', propias)}
              </>
            )}
          </ScrollView>
        )
      ) : null}

      {!verArchivadas ? <Fab label="Nueva lista" shrunk={shrunk} onPress={nuevaLista} /> : null}

      <Sheet visible={menuDe !== null} onClose={cerrarMenu} title={menuDe?.name ?? ''}>
        {menuDe ? (
          <>
            {menuDe.is_archived ? (
              <ActionRow
                icon={<ArchiveRestore size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label="Restaurar"
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
                  label={menuDe.is_pinned ? 'Quitar de fijadas' : 'Fijar arriba'}
                  onPress={() => alternarFijada(menuDe)}
                />
                <ActionRow
                  icon={<Copy size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                  label="Duplicar"
                  onPress={() => duplicar(menuDe)}
                />
                <ActionRow
                  icon={<Archive size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                  label="Archivar"
                  onPress={() => archivar(menuDe, true)}
                />
              </>
            )}
            <ActionRow
              icon={<Trash2 size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />}
              label="Eliminar"
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
