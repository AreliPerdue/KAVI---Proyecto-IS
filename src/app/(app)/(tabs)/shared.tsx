import { useRouter } from 'expo-router';
import { CalendarSearch, Check, Search, UserPlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Banner, Button, EmptyState, ErrorState, IconButton, LoadingState, Screen, Sheet, TextField } from '@/components/ui';
import { PEOPLE_COLORS, SELF_COLOR } from '@/constants/people-colors';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useConnectionMutations, useContacts, usePeopleColors, useUserSearch, SEARCH_MIN_LENGTH } from '@/hooks/use-connections';
import { useShareMutations, useInvitations } from '@/hooks/use-shares';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate, formatTimeRange, fromIso } from '@/lib/dates';
import { useConfirm, useSnackbar } from '@/providers';
import type { CalendarVisibility, Contact } from '@/services/connections';

const MAX_WIDTH = 720;
const CONTACT_COLORS = PEOPLE_COLORS.filter((c) => c.hex !== SELF_COLOR);

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
  const [contactSheetFor, setContactSheetFor] = useState<string | null>(null);
  const search = useUserSearch(query);
  // Con menos letras que el mínimo no hay búsqueda válida, así que tampoco debe
  // quedarse en pantalla el resultado de lo que se escribió antes.
  const canSearch = query.trim().replace(/^@+/, '').length >= SEARCH_MIN_LENGTH;
  const peopleColors = usePeopleColors();

  const list = contacts.data ?? [];
  const incoming = list.filter((c) => c.kind === 'incoming');
  const outgoing = list.filter((c) => c.kind === 'outgoing');
  const accepted = list.filter((c) => c.kind === 'accepted');
  const knownIds = new Set(list.map((c) => c.profile.id));
  const sheetContact = list.find((c) => c.profile.id === contactSheetFor) ?? null;
  const error = connections.request.error ?? connections.accept.error ?? connections.remove.error ?? shares.respond.error;

  const removeContact = async (contact: Contact) => {
    const name = contact.profile.display_name ?? 'este contacto';
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
                    Compartida por {owner.display_name ?? 'un contacto'}
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
                <AppText variant="bodyStrong">{c.profile.display_name ?? 'Sin nombre'}</AppText>
              </View>
              <IconButton label="Rechazar solicitud" onPress={() => removeContact(c)}>
                <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
              </IconButton>
              <IconButton
                label="Aceptar solicitud"
                onPress={() => connections.accept.mutate(c.connection.id, { onSuccess: () => setContactSheetFor(c.profile.id) })}>
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
            accessibilityLabel={`${c.profile.display_name ?? 'Contacto'}. Tu calendario: ${visibilityLabel(c.myCalendarVisibility)}`}
            onPress={() => setContactSheetFor(c.profile.id)}
            style={({ pressed }) => [styles.row, { borderColor: theme.border }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
            <View style={[styles.personDot, { backgroundColor: peopleColors.get(c.profile.id) ?? theme.border }]} />
            <Avatar profile={c.profile} />
            <View style={styles.cardText}>
              <AppText variant="bodyStrong">{c.profile.display_name ?? 'Sin nombre'}</AppText>
              <AppText variant="caption" color="textSecondary">
                Tu calendario: {visibilityLabel(c.myCalendarVisibility)}
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
                <AppText variant="bodyStrong">{c.profile.display_name ?? 'Sin nombre'}</AppText>
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
          label="Correo o usuario"
          value={query}
          onChangeText={setQuery}
          placeholder="@usuario  ·  nombre@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          hint="Escribe las primeras letras del usuario, o el correo completo."
        />
        {!canSearch && query.trim().length > 0 ? (
          <AppText variant="caption" color="textTertiary">
            Escribe al menos {SEARCH_MIN_LENGTH} letras.
          </AppText>
        ) : null}
        {canSearch && search.isFetching ? <LoadingState label="Buscando…" /> : null}
        {/* Sin esto una búsqueda que falla se ve igual que una sin resultados: en blanco. */}
        {canSearch && search.isError ? (
          <ErrorState message={search.error.message} onRetry={() => search.refetch()} />
        ) : null}
        {canSearch && search.isSuccess && search.data.length === 0 ? (
          <AppText color="textSecondary">Nadie con ese usuario o correo.</AppText>
        ) : null}
        {(canSearch ? search.data : [])?.map((p) => (
          <View key={p.id} style={[styles.row, { borderColor: theme.border }]}>
            <Avatar profile={p} />
            <View style={styles.cardText}>
              <AppText variant="bodyStrong">{p.display_name ?? 'Sin nombre'}</AppText>
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
                label={`Enviar solicitud a ${p.display_name ?? 'esta persona'}`}
                onPress={() => connections.request.mutate(p.id, { onSuccess: () => showSnackbar({ message: 'Solicitud enviada.' }) })}>
                <UserPlus size={IconSize.inline} strokeWidth={IconStroke} color={theme.ink} />
              </IconButton>
            )}
          </View>
        ))}
      </Sheet>

      <Sheet visible={sheetContact !== null} onClose={() => setContactSheetFor(null)} title={sheetContact?.profile.display_name ?? 'Contacto'}>
        <AppText variant="label" color="textSecondary">
          Color en el calendario
        </AppText>
        <AppText variant="caption" color="textTertiary">
          Con el que verás sus actividades al superponer su calendario con el tuyo.
        </AppText>
        <View style={styles.chips}>
          {/* El primer color es el de "Tú": ofrecerlo permitiría no distinguirte de un contacto. */}
          {CONTACT_COLORS.map((c) => {
            const selected = (peopleColors.get(sheetContact?.profile.id ?? '') ?? null) === c.hex;
            const manual = sheetContact?.color === c.hex;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={c.label}
                accessibilityState={{ selected }}
                onPress={() => {
                  if (!sheetContact) return;
                  // Volver a tocar el color asignado lo devuelve a automático.
                  connections.setColor.mutate({ contactUserId: sheetContact.profile.id, color: manual ? null : c.hex });
                }}
                style={({ pressed }) => [
                  styles.colorDot,
                  { backgroundColor: c.hex, borderColor: selected ? theme.text : 'transparent' },
                  pressed ? { opacity: 0.75 } : null,
                ]}>
                {selected ? <Check size={IconSize.inline} strokeWidth={3} color="#FFFFFF" /> : null}
              </Pressable>
            );
          })}
        </View>
        {sheetContact?.color ? null : (
          <AppText variant="caption" color="textTertiary">
            Asignado automáticamente. Toca un color para fijarlo.
          </AppText>
        )}

        <AppText variant="label" color="textSecondary" style={styles.sheetSection}>
          Compartir mi calendario
        </AppText>
        {VISIBILITY_OPTIONS.map((option) => {
          const selected = (sheetContact?.myCalendarVisibility ?? null) === option.value;
          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                if (!sheetContact) return;
                connections.setVisibility.mutate(
                  { contactUserId: sheetContact.profile.id, visibility: option.value },
                  { onSuccess: () => showSnackbar({ message: `Calendario: ${option.label.toLowerCase()}.` }) },
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
        <Button
          title="Eliminar contacto"
          variant="danger"
          onPress={() => {
            if (!sheetContact) return;
            const contact = sheetContact;
            setContactSheetFor(null);
            void removeContact(contact);
          }}
        />
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  colorDot: { width: 40, height: 40, borderRadius: Radius.full, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  personDot: { width: 10, height: 10, borderRadius: 5 },
  sheetSection: { marginTop: Spacing.sm },
});
