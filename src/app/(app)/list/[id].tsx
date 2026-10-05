import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDown, ArrowUp, Bell, CalendarDays, Check, Clock, FolderPlus, Palette, Repeat, Tag, Trash2, UserPlus, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, type TextStyle, View } from 'react-native';


import { arrastreReciente } from '@/components/lists/drag-guard';
import { DraggableRows } from '@/components/lists/draggable-rows';
import { ItemComposer } from '@/components/lists/item-composer';
import { ListAppearanceSheet } from '@/components/lists/list-appearance-sheet';
import { ListHistorySheet } from '@/components/lists/list-history-sheet';
import { ListRepeatSheet } from '@/components/lists/list-repeat-sheet';
import { ListShareSheet } from '@/components/lists/list-share-sheet';
import { ListTagsSheet } from '@/components/lists/list-tags-sheet';
import { NOMBRE_POR_OMISION } from '@/app/(app)/lists';
import { tint } from '@/components/calendar/activity-style';
import { ModalHeader } from '@/components/modal-header';
import {
  ActionRow,
  AppText,
  Button,
  DatePickerSheet,
  EmptyState,
  ErrorState,
  FieldButton,
  LoadingState,
  Screen,
  Sheet,
  TextField,
  ThemeIcon,
  TimePickerSheet,
} from '@/components/ui';
import { LIST_REMINDER_DEFAULT_HOUR, LIST_REMINDER_PRESETS } from '@/constants/reminders';
import { Fonts, IconSize, IconStroke, Radius, Spacing, Typography } from '@/constants/theme';
import { useList, useListMutations, useListRuns } from '@/hooks/use-lists';
import { useTheme } from '@/hooks/use-theme';
import { formatClock, formatDayTitle, formatHour, formatShortDate, fromDayKey, toDayKey } from '@/lib/dates';
import { describeRecurrence, parseRRule } from '@/lib/recurrence';
import { useConfirm, useSnackbar } from '@/providers';
import type { ListItem, ListSection } from '@/types/domain';

/* El anillo de foco del navegador se encimaba sobre el propio del campo; el cambio de
 * color al enfocar sigue haciendo de indicador visible. */
const SIN_ANILLO: TextStyle = Platform.OS === 'web'
  ? // `outlineWidth: 0` no basta: el anillo de Chrome es `outline: auto` y no respeta el
    // ancho. El tipo de RN no admite `none` porque en nativo no existe, de ahí el rodeo.
    ({ outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle)
  : {};

/**
 * Nombre de la lista, editable en el sitio (RF-L2).
 *
 * Antes vivía en un campo etiquetado dentro de un formulario aparte, y para llegar a
 * escribir el primer elemento había que pasar por él. Aquí el título **es** el título: se
 * toca y se escribe, como en Google Keep. Guarda al salir del campo, no con un botón.
 */
function TituloEditable({
  value,
  autoFocus,
  onSave,
}: {
  value: string;
  autoFocus: boolean;
  onSave: (nombre: string) => void;
}) {
  const theme = useTheme();
  const [texto, setTexto] = useState(value);
  // Si el nombre cambia por fuera (otra pantalla, otro dispositivo) se refleja aquí, pero
  // no mientras se escribe: eso pisaría lo que la persona está tecleando.
  const editando = useRef(false);
  useEffect(() => {
    if (!editando.current) setTexto(value);
  }, [value]);

  const guardar = () => {
    editando.current = false;
    const limpio = texto.trim();
    if (!limpio) {
      setTexto(value);
      return;
    }
    if (limpio !== value) onSave(limpio);
  };

  return (
    <TextInput
      value={texto}
      onChangeText={setTexto}
      onFocus={() => {
        editando.current = true;
      }}
      onBlur={guardar}
      onSubmitEditing={guardar}
      // Una lista recién creada se llama "Sin título": preseleccionar deja que la primera
      // tecla lo reemplace en vez de obligar a borrarlo.
      autoFocus={autoFocus}
      selectTextOnFocus={autoFocus}
      returnKeyType="done"
      maxLength={40}
      accessibilityLabel="Nombre de la lista"
      style={[styles.titulo, SIN_ANILLO, { color: theme.text }]}
    />
  );
}

/** Un renglón palomeable. La casilla y el texto son el mismo objetivo táctil. */
function Renglon({
  item,
  color,
  hecho,
  onToggle,
  onOpen,
}: {
  item: ListItem;
  color: string;
  /**
   * Llega desde fuera y no se deduce de `completed_at`: en una lista que se repite, lo
   * palomeado es estado de **la vuelta**, no del elemento (RF-L20).
   */
  hecho: boolean;
  onToggle: (done: boolean) => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  // Vencido solo mientras siga pendiente: una vez hecho, su fecha ya no reclama nada.
  const vencido = !hecho && item.due_date !== null && item.due_date < toDayKey(new Date());
  /*
   * Palomear es cosa **del círculo**, no de la fila. Antes tocar en cualquier parte
   * marcaba como hecho, y con renglones de 44 px pegados uno a otro eso es un dedazo
   * esperando a pasar: se palomea algo que no era y hay que buscarlo en completados. El
   * texto abre la edición, que es lo que uno espera al tocar un renglón.
   */
  return (
    <View style={styles.renglonContenedor}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: hecho }}
        accessibilityLabel={hecho ? `Marcar ${item.title} como pendiente` : `Marcar ${item.title} como hecho`}
        hitSlop={10}
        onPress={() => {
          if (!arrastreReciente()) onToggle(!hecho);
        }}
        style={({ pressed }) => [styles.casillaToque, pressed ? styles.pressed : null]}>
        <View
          style={[
            styles.casilla,
            { borderColor: hecho ? color : theme.border, backgroundColor: hecho ? color : 'transparent' },
          ]}>
          {hecho ? <Check size={13} strokeWidth={3} color={theme.onInk} /> : null}
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar ${item.title}`}
        // Ignora el toque que llega pegado a un arrastre: soltar una fila no debe abrirla.
        onPress={() => {
          if (!arrastreReciente()) onOpen();
        }}
        style={({ pressed }) => [styles.renglon, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
        <View style={styles.texto}>
          <AppText
            variant="body"
            color={hecho ? 'textTertiary' : 'text'}
            numberOfLines={2}
            style={hecho ? styles.tachado : null}>
            {item.title}
          </AppText>
          {item.due_date || item.note ? (
            <View style={styles.meta}>
              {item.due_date ? (
                <AppText variant="micro" color={vencido ? 'today' : 'textTertiary'} tabular>
                  {formatShortDate(fromDayKey(item.due_date))}
                  {item.due_time ? ` · ${formatClock(item.due_time)}` : ''}
                </AppText>
              ) : null}
              {item.note ? (
                <AppText variant="caption" color="textTertiary" numberOfLines={1} style={styles.nota}>
                  {item.due_date ? '· ' : ''}
                  {item.note}
                </AppText>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

/** Detalle de una lista: secciones, captura, palomeo y completados (RF-L5 – RF-L10). */
export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const detalle = useList(id);
  const router = useRouter();
  const {
    toggleItem,
    addItem,
    updateItem,
    removeItem,
    addSection,
    update: updateList,
    remove: removeList,
    swapItems,
    placeItem,
    toggleRunItem,
  } = useListMutations();

  const [verCompletados, setVerCompletados] = useState(false);
  const [editando, setEditando] = useState<ListItem | null>(null);
  const [borrador, setBorrador] = useState({ title: '', note: '' });
  const [seccionNueva, setSeccionNueva] = useState(false);
  const [nombreSeccion, setNombreSeccion] = useState('');
  const [aparienciaAbierta, setAparienciaAbierta] = useState(false);
  /**
   * Si esta pantalla llegó a tocarse. No se deduce de los datos a propósito.
   *
   * La limpieza de listas intactas leía la copia en caché, y entre escribir el nombre y
   * tocar atrás no da tiempo a que vuelva del servidor: la lista seguía llamándose "Sin
   * título" para la caché, así que se borraba **con el nombre recién escrito dentro**. Una
   * bandera local no puede llegar tarde.
   */
  const tocada = useRef(false);
  const [compartirAbierto, setCompartirAbierto] = useState(false);
  const [etiquetasAbierto, setEtiquetasAbierto] = useState(false);
  const [repetirAbierto, setRepetirAbierto] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [fechaListaAbierta, setFechaListaAbierta] = useState(false);

  /*
   * Una lista que se repite cambia de naturaleza: lo palomeado ya no es un estado del
   * elemento sino de **esta vuelta**, y mañana vuelve a empezar. Por eso el estado marcado
   * sale de la vuelta y no de `completed_at`.
   */
  const hoyClave = toDayKey(new Date());
  const esRutina = !!detalle.data?.list.recurrence_rule;
  const vueltas = useListRuns(id, hoyClave, esRutina);
  const vueltaHoy = (vueltas.data ?? []).find((r) => r.run_date === hoyClave) ?? null;
  // Durante la gracia conviven dos: la de ayer sigue editable hasta las 15:00 de hoy.
  const vueltaPendiente = (vueltas.data ?? []).find((r) => r.run_date !== hoyClave) ?? null;
  const [enVueltaDeAyer, setEnVueltaDeAyer] = useState(false);
  const vueltaActiva = enVueltaDeAyer ? vueltaPendiente : vueltaHoy;
  const [fechaAbierta, setFechaAbierta] = useState(false);
  const [horaAbierta, setHoraAbierta] = useState(false);
  // `nueva=1` lo pone el botón + del inicio: solo entonces se enfoca el título.
  const { nueva } = useLocalSearchParams<{ nueva?: string }>();

  const datos = detalle.data;

  /**
   * Los pendientes se agrupan por sección; los completados bajan todos juntos al final
   * sin agrupar (RF-L6). Los que no tienen sección van primero, antes de la primera
   * cabecera: son los que se escribieron de corrido sin pensar dónde iban.
   */
  const { sueltos, porSeccion, completados } = useMemo(() => {
    const items = datos?.items ?? [];
    /*
     * En una rutina los elementos **no** bajan a completados al palomearse: se quedan en su
     * sitio, marcados. Una rutina se recorre entera cada vez, y ver desaparecer lo hecho
     * deja la pantalla vacía justo cuando uno quiere comprobar que no se saltó nada.
     */
    const pendientes = esRutina ? items : items.filter((i) => i.completed_at === null);
    const grupos = new Map<string, ListItem[]>();
    for (const s of datos?.sections ?? []) grupos.set(s.id, []);
    const libres: ListItem[] = [];
    for (const it of pendientes) {
      if (it.section_id && grupos.has(it.section_id)) grupos.get(it.section_id)!.push(it);
      else libres.push(it);
    }
    return {
      sueltos: libres,
      porSeccion: grupos,
      completados: esRutina ? [] : items.filter((i) => i.completed_at !== null),
    };
  }, [datos, esRutina]);

  /**
   * Todo el cuerpo es **una sola** superficie arrastrable (RF-L7).
   *
   * Antes cada sección tenía la suya, y por eso un elemento no podía salir de su sección:
   * soltarlo fuera no llegaba a ninguna parte. Aplanando encabezados, elementos y campos de
   * captura en una sola lista, arrastrar entre secciones es solo soltar más abajo, y la
   * sección de destino se deduce del encabezado que quede por encima.
   */
  const entradas = useMemo(() => {
    type Entrada =
      | { kind: 'item'; id: string; item: ListItem }
      | { kind: 'header'; id: string; name: string }
      | { kind: 'composer'; id: string; label: string; placeholder: string; sectionId: string | null };
    const salida: Entrada[] = [];
    for (const it of sueltos) salida.push({ kind: 'item', id: it.id, item: it });
    salida.push({
      kind: 'composer',
      id: 'composer-null',
      label: 'Agregar elemento',
      placeholder: `Elemento ${sueltos.length + 1}`,
      sectionId: null,
    });
    for (const sec of datos?.sections ?? []) {
      const suyos = porSeccion.get(sec.id) ?? [];
      salida.push({ kind: 'header', id: `header-${sec.id}`, name: sec.name });
      for (const it of suyos) salida.push({ kind: 'item', id: it.id, item: it });
      salida.push({
        kind: 'composer',
        id: `composer-${sec.id}`,
        label: `Agregar en ${sec.name}`,
        placeholder: `Elemento ${suyos.length + 1}`,
        sectionId: sec.id,
      });
    }
    return salida;
  }, [sueltos, porSeccion, datos?.sections]);

  /**
   * Resuelve dónde cayó un elemento: en qué sección y entre qué vecinos.
   *
   * La sección es la del encabezado que quede **por encima** del destino; si no hay
   * ninguno, cayó en la zona sin agrupar. El orden es el punto medio entre los elementos de
   * esa sección que queden justo antes y justo después.
   */
  const soltarEn = (from: number, to: number) => {
    const origen = entradas[from];
    if (!origen || origen.kind !== 'item') return;
    const sin = entradas.filter((_, i) => i !== from);
    const destino = Math.min(sin.length, Math.max(0, to));

    let sectionId: string | null = null;
    for (let i = destino - 1; i >= 0; i--) {
      const e = sin[i];
      if (e?.kind === 'header') {
        sectionId = e.id.replace('header-', '');
        break;
      }
      // Un campo de captura marca el final de su grupo: por encima de él ya es otra cosa.
      if (e?.kind === 'composer') {
        sectionId = e.sectionId;
        break;
      }
    }

    const mismos = (e: (typeof sin)[number] | undefined) =>
      e?.kind === 'item' && (e.item.section_id ?? null) === sectionId ? e.item : null;
    let antes: ListItem | null = null;
    for (let i = destino - 1; i >= 0 && !antes; i--) antes = mismos(sin[i]);
    let despues: ListItem | null = null;
    for (let i = destino; i < sin.length && !despues; i++) despues = mismos(sin[i]);

    const orden =
      antes && despues
        ? (antes.sort_order + despues.sort_order) / 2
        : antes
          ? antes.sort_order + 1024
          : despues
            ? despues.sort_order / 2
            : 1024;
    placeItem.mutate({ id: origen.item.id, sortOrder: orden, sectionId });
  };

  const color = datos?.list.color ?? theme.ink;
  const estaHecho = (item: ListItem): boolean =>
    esRutina ? (vueltaActiva?.completed_item_ids ?? []).includes(item.id) : item.completed_at !== null;

  const alternar = (item: ListItem) => (done: boolean) => {
    if (!esRutina) return toggleItem.mutate({ id: item.id, done });
    if (!vueltaActiva) return;
    toggleRunItem.mutate({ runId: vueltaActiva.id, itemId: item.id, done });
  };

  const agregar = (sectionId: string | null) => (title: string) => {
    if (!id) return;
    tocada.current = true;
    addItem.mutate({ listId: id, input: { title, section_id: sectionId } });
  };

  const abrirEdicion = (item: ListItem) => {
    setEditando(item);
    setBorrador({ title: item.title, note: item.note ?? '' });
  };

  const guardarEdicion = () => {
    if (!editando) return;
    const title = borrador.title.trim();
    if (!title) return;
    updateItem.mutate(
      { id: editando.id, patch: { title, note: borrador.note.trim() || null } },
      { onSuccess: () => setEditando(null) },
    );
  };

  const eliminarItem = async () => {
    if (!editando) return;
    const item = editando;
    setEditando(null);
    const ok = await confirm({
      title: 'Eliminar elemento',
      // Palomear conserva; eliminar no. Conviene decir cuál es cuál antes de borrar.
      message: 'Si ya lo hiciste, paloméalo: se guarda en completados. Eliminar no se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    removeItem.mutate(item.id, { onSuccess: () => showSnackbar({ message: 'Elemento eliminado.' }) });
  };

  const crearSeccion = () => {
    const nombre = nombreSeccion.trim();
    if (!id || !nombre) {
      setSeccionNueva(false);
      return;
    }
    tocada.current = true;
    addSection.mutate(
      { listId: id, name: nombre },
      {
        onSuccess: () => {
          setNombreSeccion('');
          setSeccionNueva(false);
        },
      },
    );
  };

  /**
   * La fecha se guarda como `YYYY-MM-DD`, no como instante (RF-L11): es un día del
   * calendario de quien la escribe, no un punto en el tiempo.
   */
  const ponerFecha = (item: ListItem, fecha: Date | null) => {
    const due_date = fecha ? toDayKey(fecha) : null;
    // Sin día no puede quedar una hora suelta: sería un recordatorio sin cuándo.
    updateItem.mutate({ id: item.id, patch: { due_date, ...(due_date ? {} : { due_time: null }) } });
    setEditando((e) => (e ? { ...e, due_date, ...(due_date ? {} : { due_time: null }) } : e));
  };

  /**
   * La fecha de la lista completa (RF-L23): para cuándo tiene que estar lista **entera**.
   * No toca las de los elementos — "la maleta es para el sábado" no decide cuándo compras
   * las pilas — así que se guarda sola y no arrastra nada más.
   */
  const ponerFechaLista = (listId: string, fecha: Date | null) => {
    tocada.current = true;
    updateList.mutate({ id: listId, patch: { due_date: fecha ? toDayKey(fecha) : null } });
  };

  const ponerHora = (item: ListItem, minutos: number | null) => {
    const due_time = minutos === null ? null : `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
    updateItem.mutate({ id: item.id, patch: { due_time } });
    setEditando((e) => (e ? { ...e, due_time } : e));
  };

  /** Los vecinos de un elemento son los de **su** grupo: subir no lo saca de su sección. */
  const hermanosDe = (item: ListItem): ListItem[] =>
    item.section_id ? (porSeccion.get(item.section_id) ?? []) : sueltos;

  const desplazar = (item: ListItem, direccion: -1 | 1) => {
    const hermanos = hermanosDe(item);
    const i = hermanos.findIndex((h) => h.id === item.id);
    const vecino = hermanos[i + direccion];
    if (!vecino) return;
    swapItems.mutate({ a: item, b: vecino });
    setEditando(null);
  };

  const ponerRecordatorio = (item: ListItem, minutos: number | null) => {
    updateItem.mutate({ id: item.id, patch: { reminder_offset_minutes: minutos } });
    setEditando((e) => (e ? { ...e, reminder_offset_minutes: minutos } : e));
  };

  const mover = (item: ListItem, sectionId: string | null) => {
    updateItem.mutate({ id: item.id, patch: { section_id: sectionId } }, { onSuccess: () => setEditando(null) });
  };

  /**
   * Al salir, una lista que nadie tocó se borra sola.
   *
   * Crear sin formulario tiene este precio: tocar "+" y arrepentirse dejaría una lista
   * "Sin título" vacía en el inicio cada vez. Se limpia solo si sigue intacta —nombre por
   * omisión, sin elementos y sin secciones—, así que nada que se haya escrito se pierde.
   */
  const salir = () => {
    const intacta =
      !tocada.current &&
      datos !== undefined &&
      datos.list.name === NOMBRE_POR_OMISION &&
      datos.items.length === 0 &&
      datos.sections.length === 0;
    if (intacta && datos) removeList.mutate(datos.list.id);
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/lists');
  };

  const chipSeccion = (activo: boolean, etiqueta: string, alTocar: () => void) => (
    <Pressable
      key={etiqueta}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={etiqueta}
      onPress={alTocar}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: activo ? color : theme.border, backgroundColor: activo ? theme.surfaceAlt : 'transparent' },
        pressed ? styles.pressed : null,
      ]}>
      <AppText variant="label" color="textSecondary">
        {etiqueta}
      </AppText>
    </Pressable>
  );

  return (
    <Screen contentStyle={styles.content}>
      {detalle.isPending ? <LoadingState /> : null}
      {detalle.isError ? <ErrorState message={detalle.error.message} onRetry={() => detalle.refetch()} /> : null}

      {datos ? (
        <>
          <ModalHeader
            back
            title=""
            onClose={salir}
            right={<ThemeIcon name={datos.list.icon} color={color} size={24} />}
          />

          <TituloEditable
            value={datos.list.name}
            autoFocus={nueva === '1'}
            onSave={(name) => {
              tocada.current = true;
              updateList.mutate({ id: datos.list.id, patch: { name } });
            }}
          />

          {/*
            Con la rutina puesta, una línea bajo el título dice cada cuándo se repite y
            lleva al historial. Va aquí y no en la barra de abajo porque forma parte de lo
            que **es** esta lista, no de lo que se puede hacer con ella.
          */}
          {esRutina ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver cómo te ha ido con esta rutina"
              onPress={() => setHistorialAbierto(true)}
              style={({ pressed }) => [styles.filaRutina, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
              <Repeat size={14} strokeWidth={IconStroke} color={color} />
              <AppText variant="caption" color="textSecondary">
                {describeRecurrence(parseRRule(datos.list.recurrence_rule))} · cómo te ha ido
              </AppText>
            </Pressable>
          ) : null}

          {/*
            Y si la lista tiene fecha propia, otra línea igual. Con fecha pasada se pone en
            el acento de aviso, como los pendientes vencidos: el día llegó y la lista no
            está terminada. La X quita la fecha sin abrir nada.
          */}
          {datos.list.due_date ? (
            <View style={styles.filaFechaLista}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cambiar para cuándo es la lista"
                onPress={() => setFechaListaAbierta(true)}
                style={({ pressed }) => [styles.filaRutina, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
                <CalendarDays
                  size={14}
                  strokeWidth={IconStroke}
                  color={datos.list.due_date < hoyClave ? theme.today : theme.textSecondary}
                />
                <AppText variant="caption" color={datos.list.due_date < hoyClave ? 'today' : 'textSecondary'}>
                  Para el {formatShortDate(fromDayKey(datos.list.due_date))}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quitar la fecha de la lista"
                hitSlop={8}
                onPress={() => ponerFechaLista(datos.list.id, null)}
                style={({ pressed }) => [styles.quitarFecha, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
                <X size={14} strokeWidth={IconStroke} color={theme.textTertiary} />
              </Pressable>
            </View>
          ) : null}

          {/*
            La vuelta de ayer sigue editable hasta las 15:00 (RF-L20). Se avisa en vez de
            mezclarla con la de hoy: son dos días distintos y palomear en la de ayer suma a
            ayer, que es justo lo que se pidió al elegir el periodo de gracia.
          */}
          {esRutina && vueltaPendiente ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: enVueltaDeAyer }}
              accessibilityLabel={`Ver la vuelta del ${formatShortDate(fromDayKey(vueltaPendiente.run_date))}`}
              onPress={() => setEnVueltaDeAyer((v) => !v)}
              style={({ pressed }) => [
                styles.avisoVuelta,
                { borderColor: theme.today },
                enVueltaDeAyer ? { backgroundColor: tint(theme.today, 0.16) } : null,
                pressed ? styles.pressed : null,
              ]}>
              <AppText variant="caption" color="today">
                {enVueltaDeAyer ? 'Estás en' : 'Sigue abierta'} la vuelta del{' '}
                {formatShortDate(fromDayKey(vueltaPendiente.run_date))} ·{' '}
                {vueltaPendiente.completed_item_ids.length} de {datos.items.length}
              </AppText>
            </Pressable>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.cuerpo}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {datos.items.length === 0 && datos.sections.length === 0 ? (
              <EmptyState
                icon={<ThemeIcon name={datos.list.icon} color={theme.textTertiary} size={32} />}
                title="Esta lista está vacía"
                description="Agrega lo primero que no quieras olvidar."
              />
            ) : null}

            <DraggableRows
              items={entradas}
              keyOf={(e) => e.id}
              draggable={(e) => e.kind === 'item'}
              onReorder={soltarEn}
              renderItem={(e) =>
                e.kind === 'item' ? (
                  <Renglon
                    item={e.item}
                    color={color}
                    hecho={estaHecho(e.item)}
                    onToggle={alternar(e.item)}
                    onOpen={() => abrirEdicion(e.item)}
                  />
                ) : e.kind === 'header' ? (
                  <AppText variant="caption" color="textTertiary" style={styles.encabezadoSeccion}>
                    {e.name.toUpperCase()}
                  </AppText>
                ) : (
                  <ItemComposer label={e.label} placeholder={e.placeholder} onSubmit={agregar(e.sectionId)} />
                )
              }
            />

            {seccionNueva ? (
              <View style={styles.seccionNueva}>
                <TextField
                  label="Nombre de la sección"
                  value={nombreSeccion}
                  onChangeText={setNombreSeccion}
                  onSubmitEditing={crearSeccion}
                  placeholder="Ej. Frutas y verduras"
                  maxLength={40}
                  autoFocus
                  returnKeyType="done"
                />
                <Button title="Crear sección" onPress={crearSeccion} loading={addSection.isPending} />
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Nueva sección"
                onPress={() => setSeccionNueva(true)}
                style={({ pressed }) => [styles.filaSeccion, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
                <FolderPlus size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
                <AppText variant="label" color="textTertiary">
                  Nueva sección
                </AppText>
              </Pressable>
            )}

            {completados.length > 0 ? (
              <View style={styles.seccion}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: verCompletados }}
                  accessibilityLabel={`Completados, ${completados.length}`}
                  onPress={() => setVerCompletados((v) => !v)}
                  style={({ pressed }) => [
                    styles.completadosBoton,
                    pressed ? { backgroundColor: theme.surfaceAlt } : null,
                  ]}>
                  <AppText variant="caption" color="textSecondary">
                    {verCompletados ? 'Ocultar' : 'Ver'} completados ({completados.length})
                  </AppText>
                </Pressable>
                {verCompletados
                  ? completados.map((it) => (
                      <Renglon
                        key={it.id}
                        item={it}
                        color={color}
                        hecho={estaHecho(it)}
                        onToggle={alternar(it)}
                        onOpen={() => abrirEdicion(it)}
                      />
                    ))
                  : null}
              </View>
            ) : null}
          </ScrollView>
        </>
      ) : null}

      {datos ? (
        <View style={[styles.barra, { borderColor: theme.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Color e icono de la lista"
            onPress={() => setAparienciaAbierta(true)}
            style={({ pressed }) => [styles.barraBoton, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
            <Palette size={IconSize.action} strokeWidth={IconStroke} color={theme.textSecondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compartir la lista"
            onPress={() => setCompartirAbierto(true)}
            style={({ pressed }) => [styles.barraBoton, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
            <UserPlus size={IconSize.action} strokeWidth={IconStroke} color={theme.textSecondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Etiquetas de la lista"
            onPress={() => setEtiquetasAbierto(true)}
            style={({ pressed }) => [styles.barraBoton, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
            <Tag size={IconSize.action} strokeWidth={IconStroke} color={theme.textSecondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Para cuándo es la lista"
            onPress={() => setFechaListaAbierta(true)}
            style={({ pressed }) => [styles.barraBoton, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
            <CalendarDays
              size={IconSize.action}
              strokeWidth={IconStroke}
              color={datos.list.due_date ? color : theme.textSecondary}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cada cuándo se repite"
            onPress={() => setRepetirAbierto(true)}
            style={({ pressed }) => [styles.barraBoton, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
            <Repeat size={IconSize.action} strokeWidth={IconStroke} color={esRutina ? color : theme.textSecondary} />
          </Pressable>
        </View>
      ) : null}

      {datos ? (
        <ListHistorySheet
          visible={historialAbierto}
          onClose={() => setHistorialAbierto(false)}
          listId={datos.list.id}
          accent={color}
        />
      ) : null}

      {datos ? (
        <DatePickerSheet
          visible={fechaListaAbierta}
          value={datos.list.due_date ? fromDayKey(datos.list.due_date) : new Date()}
          title="Para cuándo es la lista"
          onClose={() => setFechaListaAbierta(false)}
          onSelect={(fecha) => {
            ponerFechaLista(datos.list.id, fecha);
            setFechaListaAbierta(false);
          }}
        />
      ) : null}

      {datos ? (
        <ListRepeatSheet
          visible={repetirAbierto}
          onClose={() => setRepetirAbierto(false)}
          rule={datos.list.recurrence_rule}
          start={datos.list.recurrence_start}
          onChange={(regla, inicio) => {
            tocada.current = true;
            updateList.mutate({ id: datos.list.id, patch: { recurrence_rule: regla, recurrence_start: inicio } });
          }}
        />
      ) : null}

      {datos ? (
        <ListTagsSheet
          visible={etiquetasAbierto}
          onClose={() => setEtiquetasAbierto(false)}
          listId={datos.list.id}
        />
      ) : null}

      {datos ? (
        <ListShareSheet
          visible={compartirAbierto}
          onClose={() => setCompartirAbierto(false)}
          listId={datos.list.id}
          listName={datos.list.name}
        />
      ) : null}

      {datos ? (
        <ListAppearanceSheet
          visible={aparienciaAbierta}
          onClose={() => setAparienciaAbierta(false)}
          color={datos.list.color}
          icon={datos.list.icon}
          onChangeColor={(c) => updateList.mutate({ id: datos.list.id, patch: { color: c } })}
          onChangeIcon={(i) => updateList.mutate({ id: datos.list.id, patch: { icon: i } })}
        />
      ) : null}

      {editando ? (
        <>
          <DatePickerSheet
            visible={fechaAbierta}
            value={editando.due_date ? fromDayKey(editando.due_date) : new Date()}
            title="Día del pendiente"
            onClose={() => setFechaAbierta(false)}
            onSelect={(fecha) => {
              ponerFecha(editando, fecha);
              setFechaAbierta(false);
            }}
          />
          <TimePickerSheet
            visible={horaAbierta}
            value={
              editando.due_time
                ? Number(editando.due_time.slice(0, 2)) * 60 + Number(editando.due_time.slice(3, 5))
                : 9 * 60
            }
            title="Hora del pendiente"
            onClose={() => setHoraAbierta(false)}
            onSelect={(minutos) => {
              ponerHora(editando, minutos);
              setHoraAbierta(false);
            }}
          />
        </>
      ) : null}

      {/*
        La hoja del elemento se esconde mientras hay un selector abierto. Dos `Modal` de
        React Native a la vez ya dieron problemas en este repo (T146): el de dentro
        desprende el contenido del de fuera.
      */}
      <Sheet
        visible={editando !== null && !fechaAbierta && !horaAbierta}
        onClose={() => setEditando(null)}
        title="Elemento">
        {editando ? (
          <View style={styles.hoja}>
            <TextField
              label="Título"
              value={borrador.title}
              onChangeText={(t) => setBorrador((b) => ({ ...b, title: t }))}
              maxLength={200}
            />
            <TextField
              label="Nota"
              value={borrador.note}
              onChangeText={(t) => setBorrador((b) => ({ ...b, note: t }))}
              placeholder="Opcional"
              maxLength={500}
              multiline
            />

            <View style={styles.fechas}>
              <FieldButton
                label="Día"
                value={editando.due_date ? formatDayTitle(fromDayKey(editando.due_date)) : null}
                placeholder="Sin fecha"
                leading={<CalendarDays size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
                onPress={() => setFechaAbierta(true)}
              />
              {/*
                La hora solo aparece con un día puesto, y no coloca el elemento en la
                rejilla del calendario: sirve para el recordatorio (RF-L12). Sin día, una
                hora sería un "cuándo" sin cuándo.
              */}
              {editando.due_date ? (
                <>
                  <FieldButton
                    label="Hora"
                    value={editando.due_time ? formatClock(editando.due_time) : null}
                    placeholder="Sin hora"
                    leading={<Clock size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
                    onPress={() => setHoraAbierta(true)}
                  />
                  <AppText variant="caption" color="textTertiary">
                    La hora no lo mueve a la rejilla del calendario: sigue en tu día.
                  </AppText>
                </>
              ) : null}
              {/*
                El recordatorio es una pregunta aparte de la hora: "se entrega el 3" y
                "avísame el 1" se contestan por separado (RF-L11b). Sin hora propia el aviso
                se ancla a las 9 de la mañana, porque "dos días antes" de una fecha sin hora
                no tiene instante — y se dice, en vez de dejarlo a la adivinanza.
              */}
              {editando.due_date ? (
                <View style={styles.seccionAviso}>
                  <View style={styles.etiquetaAviso}>
                    <Bell size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
                    <AppText variant="label" color="textSecondary">
                      Recordatorio
                    </AppText>
                  </View>
                  <View style={styles.chips}>
                    {chipSeccion(editando.reminder_offset_minutes === null, 'Sin aviso', () =>
                      ponerRecordatorio(editando, null),
                    )}
                    {LIST_REMINDER_PRESETS.map((preset) =>
                      chipSeccion(editando.reminder_offset_minutes === preset.offset, preset.label, () =>
                        ponerRecordatorio(editando, preset.offset),
                      ),
                    )}
                  </View>
                  {editando.reminder_offset_minutes !== null && !editando.due_time ? (
                    <AppText variant="caption" color="textTertiary">
                      Se cuenta desde las {formatHour(LIST_REMINDER_DEFAULT_HOUR)} del día, porque este pendiente no tiene hora.
                    </AppText>
                  ) : null}
                </View>
              ) : null}

              {editando.due_date ? (
                <ActionRow
                  icon={<X size={IconSize.action} strokeWidth={IconStroke} color={theme.textSecondary} />}
                  label="Quitar la fecha"
                  color="textSecondary"
                  onPress={() => ponerFecha(editando, null)}
                />
              ) : null}
            </View>

            {datos && datos.sections.length > 0 ? (
              <View style={styles.mover}>
                <AppText variant="label" color="textSecondary">
                  Sección
                </AppText>
                <View style={styles.chips}>
                  {chipSeccion(editando.section_id === null, 'Sin sección', () => mover(editando, null))}
                  {datos.sections.map((s) =>
                    chipSeccion(editando.section_id === s.id, s.name, () => mover(editando, s.id)),
                  )}
                </View>
              </View>
            ) : null}

            <View style={styles.orden}>
              <ActionRow
                icon={<ArrowUp size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label="Subir"
                disabled={hermanosDe(editando).findIndex((h) => h.id === editando.id) <= 0}
                onPress={() => desplazar(editando, -1)}
              />
              <ActionRow
                icon={<ArrowDown size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label="Bajar"
                disabled={(() => {
                  const h = hermanosDe(editando);
                  return h.findIndex((x) => x.id === editando.id) >= h.length - 1;
                })()}
                onPress={() => desplazar(editando, 1)}
              />
            </View>

            <Button title="Guardar" onPress={guardarEdicion} loading={updateItem.isPending} />
            <ActionRow
              icon={<Trash2 size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />}
              label="Eliminar elemento"
              color="danger"
              onPress={eliminarItem}
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.sm },
  titulo: {
    fontFamily: Fonts?.sans,
    fontSize: Typography.title.fontSize,
    fontWeight: Typography.title.fontWeight,
    lineHeight: Typography.title.lineHeight,
    letterSpacing: Typography.title.letterSpacing,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 0,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.xs,
  },
  barraBoton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  cuerpo: { gap: 2, paddingBottom: Spacing['3xl'] },
  seccion: { gap: 2, marginTop: Spacing.md },
  encabezadoSeccion: { marginTop: Spacing.md, marginBottom: 2 },
  seccionNueva: { gap: Spacing.sm, marginTop: Spacing.md },
  renglonContenedor: { flexDirection: 'row', alignItems: 'center' },
  casillaToque: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  renglon: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  casilla: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { flex: 1, gap: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  nota: { flex: 1 },
  tachado: { textDecorationLine: 'line-through' },
  filaSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.md,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  completadosBoton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.sm,
  },
  hoja: { gap: Spacing.md, paddingBottom: Spacing.md },
  fechas: { gap: Spacing.sm },
  seccionAviso: { gap: Spacing.sm, marginTop: Spacing.xs },
  filaFechaLista: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  quitarFecha: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderCurve: 'continuous',
  },
  filaRutina: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 32,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  avisoVuelta: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  etiquetaAviso: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  orden: { gap: 0 },
  mover: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  pressed: { opacity: 0.75 },
});
