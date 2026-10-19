import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen, ChevronLeft, Pencil, UserMinus, UserPlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BookCover } from '@/components/library/book-cover';
import { ClubContactPicker } from '@/components/library/club-contact-picker';
import { TOPE_DEL_CLUB } from '@/components/library/create-club-sheet';
import { AppText, Avatar, Banner, Button, EmptyState, IconButton, LoadingState, Screen, Sheet, TextField, Toggle } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useClubMutations, useClubs } from '@/hooks/use-clubs';
import { useContacts } from '@/hooks/use-connections';
import { useLibraryItems } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { useAuth, useConfirm, useSnackbar } from '@/providers';
import type { LibraryClubMember } from '@/types/domain';

/**
 * Un club de lectura (spec 13f, RF-BC1 – RF-BC5, RF-BC9; T306): su libro (mi copia), quién está y quién está
 * invitado. Quien lo dirige invita a más, quita a alguien, retira invitaciones, cambia el nombre y lo cierra;
 * los demás salen. Nadie pierde su copia. Cada quien decide si los demás ven su avance.
 */
export default function ClubScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tx = useT();
  const c = tx.library.clubs;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const datos = useClubs();
  const piezas = useLibraryItems();
  const contactos = useContacts();
  const m = useClubMutations();
  const confirmar = useConfirm();
  const avisar = useSnackbar();
  const [invitando, setInvitando] = useState(false);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [renombrando, setRenombrando] = useState(false);
  const [nombre, setNombre] = useState('');

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/(app)/library'));
  const club = datos.clubs.find((x) => x.id === id) ?? null;
  const miembros = datos.members.filter((x) => x.club_id === id);
  const yo = miembros.find((x) => x.person_id === userId) ?? null;
  const dirijo = club?.host_id === userId;
  const miCopia = yo?.item_id ? (piezas.data ?? []).find((p) => p.id === yo.item_id) : undefined;
  const nombreDe = (x: LibraryClubMember) => {
    const n = x.profile?.display_name ?? x.profile?.username ?? c.someone;
    return x.person_id === userId ? c.you(n) : n;
  };
  const enElClub = new Set(miembros.map((x) => x.person_id));
  const invitables = (contactos.data ?? []).filter((k) => k.kind === 'accepted' && !enElClub.has(k.profile.id));
  const lugares = TOPE_DEL_CLUB - miembros.length;
  const error = m.invite.error ?? m.removeMember.error ?? m.removeInvite.error ?? m.leave.error ?? m.close.error ?? m.rename.error ?? m.progress.error;

  if (datos.isPending) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (!club || !yo) {
    return (
      <Screen>
        <EmptyState title={c.notFound} action={<Button title={tx.common.back} variant="secondary" onPress={volver} />} />
      </Screen>
    );
  }

  const quitar = async (x: LibraryClubMember) => {
    const n = nombreDe(x);
    if (x.status === 'pending') {
      m.removeInvite.mutate({ clubId: club.id, personId: x.person_id }, { onSuccess: () => avisar({ message: c.done }) });
      return;
    }
    const ok = await confirmar({ title: c.removeTitle(n), message: c.removeMessage, confirmLabel: c.remove(n), destructive: true });
    if (ok) m.removeMember.mutate({ clubId: club.id, personId: x.person_id }, { onSuccess: () => avisar({ message: c.done }) });
  };
  const salir = async () => {
    const ok = await confirmar(
      dirijo
        ? { title: c.closeTitle, message: c.closeMessage, confirmLabel: c.close, destructive: true }
        : { title: c.leaveTitle, message: c.leaveMessage, confirmLabel: c.leave, destructive: true },
    );
    if (!ok) return;
    const hecho = { onSuccess: () => (avisar({ message: dirijo ? c.closed : c.left }), volver()) };
    if (dirijo) m.close.mutate(club.id, hecho);
    else m.leave.mutate(club.id, hecho);
  };

  return (
    <Screen scroll>
      <View style={styles.titulo}>
        <IconButton label={tx.common.back} onPress={volver}>
          <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        <View style={styles.flex}>
          <AppText variant="caption" color="textSecondary">
            {c.club}
          </AppText>
          <AppText variant="title" accessibilityRole="header" numberOfLines={2}>
            {club.name}
          </AppText>
        </View>
        {dirijo ? (
          <IconButton
            label={c.rename}
            onPress={() => {
              setNombre(club.name);
              setRenombrando(true);
            }}>
            <Pencil size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
        ) : null}
      </View>

      {error ? <Banner tone="error" message={error.message} /> : null}

      {miCopia ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${tx.library.item.open}: ${miCopia.title}`}
          onPress={() => router.push({ pathname: '/(app)/book/[id]', params: { id: miCopia.id } })}
          style={({ pressed }) => [styles.libro, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : theme.surface }]}>
          <BookCover item={miCopia} width={56} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong" numberOfLines={2}>
              {miCopia.title}
            </AppText>
            {miCopia.authors.length ? (
              <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                {miCopia.authors.join(', ')}
              </AppText>
            ) : null}
          </View>
          <BookOpen size={IconSize.action} strokeWidth={IconStroke} color={theme.textSecondary} />
        </Pressable>
      ) : null}

      <AppText variant="heading">{c.members}</AppText>
      <View style={styles.miembros}>
        {miembros.map((x) => (
          <View key={x.person_id} style={[styles.miembro, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Avatar profile={{ display_name: x.profile?.display_name ?? null, username: x.profile?.username ?? '', avatar_url: x.profile?.avatar_url }} size={36} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {nombreDe(x)}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {x.person_id === club.host_id ? c.host : x.status === 'pending' ? c.pending : c.member}
              </AppText>
            </View>
            {dirijo && x.person_id !== userId ? (
              <IconButton label={x.status === 'pending' ? c.cancelInvite(nombreDe(x)) : c.remove(nombreDe(x))} onPress={() => void quitar(x)}>
                {x.status === 'pending' ? (
                  <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
                ) : (
                  <UserMinus size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />
                )}
              </IconButton>
            ) : null}
          </View>
        ))}
      </View>
      {dirijo && lugares > 0 ? (
        <Button
          title={c.inviteMore}
          variant="secondary"
          icon={<UserPlus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
          onPress={() => {
            setElegidos([]);
            setInvitando(true);
          }}
        />
      ) : null}

      {yo.status === 'accepted' ? (
        <View style={styles.fila}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{c.showProgress}</AppText>
            <AppText variant="caption" color="textSecondary">
              {c.showProgressHint}
            </AppText>
          </View>
          <Toggle label={c.showProgress} value={yo.shows_progress} onValueChange={(visible) => m.progress.mutate({ clubId: club.id, visible })} />
        </View>
      ) : null}

      <Button title={dirijo ? c.close : c.leave} variant="danger" onPress={() => void salir()} loading={m.close.isPending || m.leave.isPending} />

      <Sheet visible={invitando} onClose={() => setInvitando(false)} title={c.inviteMore}>
        <View style={styles.hoja}>
          <ClubContactPicker contactos={invitables} elegidos={elegidos} max={lugares} onCambiar={setElegidos} />
          <Button
            title={c.invite}
            disabled={!elegidos.length}
            loading={m.invite.isPending}
            onPress={() =>
              m.invite.mutate(
                { clubId: club.id, personIds: elegidos },
                {
                  onSuccess: () => {
                    setInvitando(false);
                    avisar({ message: c.done });
                  },
                },
              )
            }
          />
        </View>
      </Sheet>

      <Sheet visible={renombrando} onClose={() => setRenombrando(false)} title={c.rename}>
        <View style={styles.hoja}>
          <TextField label={c.name} value={nombre} maxLength={120} onChangeText={setNombre} />
          <Button
            title={c.save}
            disabled={!nombre.trim()}
            onPress={() => m.rename.mutate({ clubId: club.id, name: nombre }, { onSuccess: () => setRenombrando(false) })}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: -Spacing.sm },
  libro: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', padding: Spacing.sm },
  miembros: { gap: Spacing.xs },
  miembro: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', padding: Spacing.sm, minHeight: 56 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  hoja: { gap: Spacing.md },
});
