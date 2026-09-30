import { X } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Avatar, EmptyState, LoadingState, Sheet } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useContacts } from '@/hooks/use-connections';
import { useListMutations, useListShares } from '@/hooks/use-lists';
import { useTheme } from '@/hooks/use-theme';
import type { ListPermission } from '@/services/lists';

const OPCIONES: { value: ListPermission; label: string }[] = [
  { value: 'view', label: 'Ver' },
  { value: 'edit', label: 'Editar' },
];

export type ListShareSheetProps = {
  visible: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
  accent: string;
};

/**
 * Con quién se comparte una lista y con qué permiso (RF-L14).
 *
 * Junto a cada persona van **Ver** y **Editar** como dos botones en su propia fila, no
 * detrás de un menú: es la pregunta que de verdad se hace al compartir, y con dos opciones
 * se contesta sin abrir nada. Sin ninguno elegido, esa persona simplemente no tiene acceso.
 *
 * Solo aparecen los contactos aceptados, igual que al compartir calendario (spec 06): se
 * comparte con gente con la que ya hay una relación, no con un buscador abierto.
 */
export function ListShareSheet({ visible, onClose, listId, listName, accent }: ListShareSheetProps) {
  const theme = useTheme();
  const contactos = useContacts();
  const compartida = useListShares(visible ? listId : undefined);
  const { share, unshare } = useListMutations();

  const permisoDe = new Map((compartida.data ?? []).map((sh) => [sh.shared_with_id, sh.permission]));
  const aceptados = (contactos.data ?? []).filter((c) => c.kind === 'accepted');

  return (
    <Sheet visible={visible} onClose={onClose} title={`Compartir ${listName}`}>
      {contactos.isPending || compartida.isPending ? <LoadingState /> : null}

      {contactos.isSuccess && aceptados.length === 0 ? (
        <EmptyState
          title="Todavía no tienes contactos"
          description="Agrega a alguien desde Compartido y podrás compartir tus listas."
        />
      ) : null}

      <ScrollView contentContainerStyle={styles.cuerpo} showsVerticalScrollIndicator={false}>
        {aceptados.map((c) => {
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
                        activo ? { backgroundColor: theme.surface, borderColor: accent } : null,
                        pressed ? styles.pressed : null,
                      ]}>
                      <AppText variant="caption" color={activo ? 'text' : 'textSecondary'}>
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
        })}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.sm, paddingBottom: Spacing.md },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 52 },
  nombre: { flex: 1, gap: 1 },
  opciones: { flexDirection: 'row', padding: 2, gap: 2, borderRadius: Radius.md, borderCurve: 'continuous' },
  opcion: {
    minHeight: 32,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quitar: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
});
