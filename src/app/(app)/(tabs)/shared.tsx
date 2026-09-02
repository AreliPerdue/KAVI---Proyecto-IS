import { useRouter } from 'expo-router';
import { CalendarSearch, Check, Search, UserPlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Banner, Button, EmptyState, ErrorState, IconButton, LoadingState, Screen, Sheet, TextField } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useConnectionMutations, useContacts, useUserSearch } from '@/hooks/use-connections';
import { useShareMutations, useInvitations } from '@/hooks/use-shares';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate, formatTimeRange, fromIso } from '@/lib/dates';
import { useConfirm, useSnackbar } from '@/providers';
import type { CalendarVisibility, Contact } from '@/services/connections';

const MAX_WIDTH = 720;

const VISIBILITY_OPTIONS: { value: CalendarVisibility | null; label: string; hint: string }[] = [
  { value: null, label: 'No compartir', hint: 'No ve nada de tu calendario.' },
  { value: 'busy', label: 'Solo disponibilidad', hint: 'Ve bloques ocupados, sin títulos.' },
  { value: 'details', label: 'Con detalles', hint: 'Ve título, tema y horario.' },
];

function visibilityLabel(v: CalendarVisibility | null): string {
  return VISIBILITY_OPTIONS.find((o) => o.value === v)?.label ?? 'No compartir';
}

/** Tab Compartido: invitaciones, solicitudes, contactos y acceso a disponibilidad (spec 06 UI). */
export default function SharedScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const contacts = useContacts();
  const invitations = useInvitations();
  const connections = useConnectionMutations();
  const shares = useShareMutations();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [visibilityFor, setVisibilityFor] = useState<Contact | null>(null);
  const search = useUserSearch(query);

  const list = contacts.data ?? [];
  const incoming = list.filter((c) => c.kind === 'incoming');
  const outgoing = list.filter((c) => c.kind === 'outgoing');
  const accepted = list.filter((c) => c.kind === 'accepted');
  const knownIds = new Set(list.map((c) => c.profile.id));
  const error = connections.request.error ?? connections.accept.error ?? connections.remove.error ?? shares.respond.error;

  const removeContact = async (contact: Contact) => {
    const name = contact.profile.display_name ?? contact.profile.username;
    const ok = await confirm({
      title: contact.kind === 'accepted' ? 'Eliminar contacto' : 'Eliminar solicitud',
      message: contact.kind === 'accepted' ? `Dejarás de compartir con ${name} y se revocará todo lo compartido entre ustedes.` : undefined,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (ok) connections.remove.mutate(contact.connection.id, { onSuccess: () => showSnackbar({ message: 'Listo.' }) });
  };

  return (
    <Screen scroll maxWidth={MAX_WIDTH}>
      <View style={styles.titleRow}>
        <AppText variant="title" accessibilityRole="header" style={styles.title}>
          Compartido
        </AppText>
        <IconButton label="Buscar personas" onPress={() => setSearchOpen(true)}>
          <Search size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
      </View>

      <Button
        title="Disponibilidad y horarios en común"
        variant="secondary"
        icon={<CalendarSearch size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
        onPress={() => router.push('/(app)/shared/availability')}
      />

      {error ? <Banner tone="error" message={error.message} /> : null}
      {contacts.isPending || invitations.isPending ? <LoadingState /> : null}
      {contacts.isError ? <ErrorState message={contacts.error.message} onRetry={() => contacts.refetch()} /> : null}

      {(invitations.data?.length ?? 0) > 0 ? (
        <View style={styles.section}>
          <AppText variant="heading">Invitaciones a actividades</AppText>
          {invitations.data?.map(({ share, activity, owner }) => (
            <View key={share.id} style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={styles.cardRow}>
                <Avatar profile={owner} />
                <View style={styles.cardText}>
                  <AppText variant="bodyStrong">{activity.title}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {formatShortDate(fromIso(activity.start_at))} · {formatTimeRange(activity.start_at, activity.end_at, activity.all_day)}
                  </AppText>
                  <AppText variant="caption" color="textTertiary">
                    Compartida por {owner.display_name ?? owner.username}
                  </AppText>
                </View>
              </View>
              <View style={styles.cardActions}>
                <Button title="Rechazar" variant="secondary" onPress={() => shares.respond.mutate({ shareId: share.id, accept: false })} />
                <Button
                  title="Aceptar"
                  onPress={() => shares.respond.mutate({ shareId: share.id, accept: true }, { onSuccess: () => showSnackbar({ message: 'Actividad añadida a tu calendario.' }) })}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {incoming.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="heading">Solicitudes recibidas</AppText>
          {incoming.map((c) => (
            <View key={c.connection.id} style={[styles.row, { borderColor: theme.border }]}>
              <Avatar profile={c.profile} />
              <View style={styles.cardText}>
                <AppText variant="bodyStrong">{c.profile.display_name ?? c.profile.username}</AppText>
                <AppText variant="caption" color="textSecondary">
                  @{c.profile.username}
                </AppText>
              </View>
              <IconButton label="Rechazar solicitud" onPress={() => removeContact(c)}>
                <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
              </IconButton>
              <IconButton label="Aceptar solicitud" onPress={() => connections.accept.mutate(c.connection.id)}>
                <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.success} />
              </IconButton>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="heading">Contactos</AppText>
        {contacts.isSuccess && accepted.length === 0 ? (
          <EmptyState
            title="Aún no tienes contactos"
            description="Busca a alguien por su username y envíale una solicitud."
            action={<Button title="Buscar personas" variant="secondary" onPress={() => setSearchOpen(true)} />}
          />
        ) : null}
        {accepted.map((c) => (
          <Pressable
            key={c.connection.id}
            accessibilityRole="button"
            accessibilityLabel={`${c.profile.display_name ?? c.profile.username}. Tu calendario: ${visibilityLabel(c.myCalendarVisibility)}`}
            onPress={() => setVisibilityFor(c)}
            style={({ pressed }) => [styles.row, { borderColor: theme.border }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
            <Avatar profile={c.profile} />
            <View style={styles.cardText}>
              <AppText variant="bodyStrong">{c.profile.display_name ?? c.profile.username}</AppText>
              <AppText variant="caption" color="textSecondary">
                @{c.profile.username} · Tu calendario: {visibilityLabel(c.myCalendarVisibility)}
              </AppText>
              {c.theirCalendarVisibility ? (
                <AppText variant="caption" color="textTertiary">
                  Te comparte: {visibilityLabel(c.theirCalendarVisibility).toLowerCase()}
                </AppText>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>

      {outgoing.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="heading">Solicitudes enviadas</AppText>
          {outgoing.map((c) => (
            <View key={c.connection.id} style={[styles.row, { borderColor: theme.border }]}>
              <Avatar profile={c.profile} />
              <View style={styles.cardText}>
                <AppText variant="bodyStrong">{c.profile.display_name ?? c.profile.username}</AppText>
                <AppText variant="caption" color="textSecondary">
                  Pendiente
                </AppText>
              </View>
              <IconButton label="Cancelar solicitud" onPress={() => removeContact(c)}>
                <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
              </IconButton>
            </View>
          ))}
        </View>
      ) : null}

      <Sheet visible={searchOpen} onClose={() => setSearchOpen(false)} title="Buscar personas">
        <TextField
          label="Username"
          value={query}
          onChangeText={setQuery}
          placeholder="Mínimo 3 caracteres"
          autoCapitalize="none"
          autoCorrect={false}
          hint="Búsqueda exacta o por prefijo."
        />
        {search.isFetching ? <LoadingState label="Buscando…" /> : null}
        {search.isSuccess && search.data.length === 0 ? <AppText color="textSecondary">Nadie con ese username.</AppText> : null}
        {search.data?.map((p) => (
          <View key={p.id} style={[styles.row, { borderColor: theme.border }]}>
            <Avatar profile={p} />
            <View style={styles.cardText}>
              <AppText variant="bodyStrong">{p.display_name ?? p.username}</AppText>
              <AppText variant="caption" color="textSecondary">
                @{p.username}
              </AppText>
            </View>
            {knownIds.has(p.id) ? (
              <AppText variant="caption" color="textTertiary">
                Ya en tu lista
              </AppText>
            ) : (
              <IconButton
                label={`Enviar solicitud a ${p.username}`}
                onPress={() => connections.request.mutate(p.id, { onSuccess: () => showSnackbar({ message: `Solicitud enviada a @${p.username}.` }) })}>
                <UserPlus size={IconSize.inline} strokeWidth={IconStroke} color={theme.ink} />
              </IconButton>
            )}
          </View>
        ))}
      </Sheet>

      <Sheet visible={visibilityFor !== null} onClose={() => setVisibilityFor(null)} title={visibilityFor?.profile.display_name ?? visibilityFor?.profile.username}>
        <AppText variant="label" color="textSecondary">
          Compartir mi calendario
        </AppText>
        {VISIBILITY_OPTIONS.map((option) => {
          const selected = (visibilityFor?.myCalendarVisibility ?? null) === option.value;
          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                if (!visibilityFor) return;
                connections.setVisibility.mutate(
                  { contactUserId: visibilityFor.profile.id, visibility: option.value },
                  { onSuccess: () => { showSnackbar({ message: `Calendario: ${option.label.toLowerCase()}.` }); setVisibilityFor(null); } },
                );
              }}
              style={({ pressed }) => [styles.option, { borderColor: selected ? theme.ink : theme.border }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
              <View style={styles.cardText}>
                <AppText variant="bodyStrong">{option.label}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {option.hint}
                </AppText>
              </View>
              {selected ? <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.ink} /> : null}
            </Pressable>
          );
        })}
        <Button title="Eliminar contacto" variant="danger" onPress={() => visibilityFor && (setVisibilityFor(null), removeContact(visibilityFor))} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1 },
  section: { gap: Spacing.sm },
  card: { padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', gap: Spacing.md },
  cardRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  cardText: { flex: 1, gap: 2 },
  cardActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 60, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
});
