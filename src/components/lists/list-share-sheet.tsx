import { Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, type TextStyle, View } from 'react-native';

import { AppText, Avatar, EmptyState, LoadingState, Sheet } from '@/components/ui';
import { Fonts, IconSize, IconStroke, Radius, Spacing, Typography } from '@/constants/theme';
import { useContacts } from '@/hooks/use-connections';
import { useListMutations, useListShares } from '@/hooks/use-lists';
import { useTheme } from '@/hooks/use-theme';
import type { ListPermission } from '@/services/lists';
import type { Contact } from '@/types/domain';

const OPCIONES: { value: ListPermission; label: string }[] = [
  { value: 'view', label: 'Ver' },
  { value: 'edit', label: 'Editar' },
];

/** A partir de aquí la lista deja de recorrerse de un vistazo y aparece el buscador. */
const CONTACTOS_PARA_BUSCAR = 6;

const SIN_ANILLO: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle) : {};

export type ListShareSheetProps = {
  visible: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
};

/**
 * Con quién se comparte una lista y con qué permiso (RF-L14).
 *
 * Quien ya tiene acceso **sube al principio**, bajo "Compartiendo con", y el resto queda
 * abajo para agregar. Mezclarlos obliga a recorrer toda la agenda para responder la pregunta
 * que uno trae al abrir esto: *¿quién está viendo mi lista?*
 *
 * El permiso elegido se rellena en `ink` y no en el color de la lista: es el bloque de
 * máximo contraste del sistema (kavi-design §2) y no compite con el color que ya identifica
 * a la lista en toda la pantalla.
 */
export function ListShareSheet({ visible, onClose, listId, listName }: ListShareSheetProps) {
  const theme = useTheme();
  const [busqueda, setBusqueda] = useState('');
  const contactos = useContacts();
  const compartida = useListShares(visible ? listId : undefined);
  const { share, unshare } = useListMutations();

  const permisoDe = useMemo(
    () => new Map((compartida.data ?? []).map((sh) => [sh.shared_with_id, sh.permission])),
    [compartida.data],
  );

  const { conAcceso, resto } = useMemo(() => {
    const aceptados = (contactos.data ?? []).filter((c) => c.kind === 'accepted');
    const q = busqueda.trim().toLowerCase();
    const coincide = (c: Contact) =>
      !q ||
      (c.profile.display_name ?? '').toLowerCase().includes(q) ||
      c.profile.username.toLowerCase().includes(q);
    return {
      conAcceso: aceptados.filter((c) => permisoDe.has(c.profile.id)),
      // El buscador solo filtra a quien falta por agregar: lo ya compartido se queda
      // siempre a la vista, que es de lo que informa esta pantalla.
      resto: aceptados.filter((c) => !permisoDe.has(c.profile.id) && coincide(c)),
    };
  }, [contactos.data, permisoDe, busqueda]);

  const aceptadosTotal = (contactos.data ?? []).filter((c) => c.kind === 'accepted').length;

  const fila = (c: Contact) => {
    const permiso = permisoDe.get(c.profile.id) ?? null;
    return (
      <View key={c.profile.id} style={styles.fila}>
        <Avatar profile={c.profile} size={32} />
        <View style={styles.nombre}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {c.profile.display_name ?? c.profile.username}
          </AppText>
          <AppText variant="caption" color="textTertiary" numberOfLines={1}>
            @{c.profile.username}
          </AppText>
        </View>

        <View style={[styles.opciones, { backgroundColor: theme.surfaceAlt }]}>
          {OPCIONES.map((o) => {
            const activo = permiso === o.value;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                accessibilityLabel={`${o.label}: ${c.profile.display_name ?? c.profile.username}`}
                onPress={() => share.mutate({ listId, userId: c.profile.id, permission: o.value })}
                style={({ pressed }) => [
                  styles.opcion,
                  activo ? { backgroundColor: theme.ink } : null,
                  pressed ? styles.pressed : null,
                ]}>
                <AppText variant="caption" color={activo ? 'onInk' : 'textSecondary'}>
                  {o.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* Quitar el acceso no borra nada del contenido de la lista (RF-L17). */}
        {permiso ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar acceso a ${c.profile.display_name ?? c.profile.username}`}
            hitSlop={8}
            onPress={() => unshare.mutate({ listId, userId: c.profile.id })}
            style={({ pressed }) => [styles.quitar, pressed ? styles.pressed : null]}>
            <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
          </Pressable>
        ) : (
          <View style={styles.quitar} />
        )}
      </View>
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={`Compartir ${listName}`}>
      {contactos.isPending || compartida.isPending ? <LoadingState /> : null}

      {contactos.isSuccess && aceptadosTotal === 0 ? (
        <EmptyState
          title="Todavía no tienes contactos"
          description="Agrega a alguien desde Compartido y podrás compartir tus listas."
        />
      ) : null}

      <ScrollView contentContainerStyle={styles.cuerpo} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {conAcceso.length > 0 ? (
          <View style={styles.grupo}>
            <AppText variant="caption" color="textTertiary">
              Compartiendo con
            </AppText>
            {conAcceso.map(fila)}
          </View>
        ) : null}

        {aceptadosTotal >= CONTACTOS_PARA_BUSCAR ? (
          <View style={[styles.buscador, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Search size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
            <TextInput
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar un contacto"
              placeholderTextColor={theme.textTertiary}
              accessibilityLabel="Buscar un contacto"
              style={[styles.buscadorInput, SIN_ANILLO, { color: theme.text }]}
            />
            {busqueda ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
                hitSlop={8}
                onPress={() => setBusqueda('')}>
                <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {resto.length > 0 ? (
          <View style={styles.grupo}>
            <AppText variant="caption" color="textTertiary">
              {conAcceso.length > 0 ? 'Agregar a alguien más' : 'Tus contactos'}
            </AppText>
            {resto.map(fila)}
          </View>
        ) : null}

        {aceptadosTotal > 0 && resto.length === 0 && busqueda ? (
          <AppText variant="caption" color="textTertiary">
            Ningún contacto coincide.
          </AppText>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.lg, paddingBottom: Spacing.md },
  grupo: { gap: Spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 52 },
  nombre: { flex: 1, gap: 1 },
  opciones: { flexDirection: 'row', padding: 2, gap: 2, borderRadius: Radius.md, borderCurve: 'continuous' },
  opcion: {
    minHeight: 32,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quitar: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
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
  pressed: { opacity: 0.75 },
});
