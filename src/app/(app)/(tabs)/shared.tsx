import { useRouter } from 'expo-router';
import { CalendarSearch, Check, Search, UserPlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Banner, Button, ColorDot, ColorSwatch, EmptyState, ErrorState, IconButton, LoadingState, Screen, Sheet, TextField } from '@/components/ui';
import { currentColor, PEOPLE_COLORS, PEOPLE_COLORS_DISPLAY } from '@/constants/people-colors';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useConnectionMutations, useContacts, usePeopleColors, useSelfColor, useUserSearch, SEARCH_MIN_LENGTH } from '@/hooks/use-connections';
import { useShareMutations, useInvitations } from '@/hooks/use-shares';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate, formatTimeRange, fromIso } from '@/lib/dates';
import { useConfirm, useSnackbar } from '@/providers';
import type { CalendarVisibility, Contact } from '@/services/connections';
import { usePreferencesStore } from '@/store/preferences-store';
import { useMyProfile } from '@/hooks/use-profile';
import { StackedModuleBack } from '@/components/navigation/stacked-module';
import { type Dictionary, useT } from '@/i18n';

const MAX_WIDTH = 720;

const VISIBILIDADES: readonly (CalendarVisibility | null)[] = [null, 'busy', 'details'];

/** Nombre y explicación de cada nivel con que compartes tu calendario, en el idioma activo. */
function visibilityText(v: CalendarVisibility | null, tx: Dictionary): { label: string; hint: string } {
  return tx.shared.visibility[v ?? 'none'];
}

/** Tab Compartido: invitaciones, solicitudes, contactos y acceso a disponibilidad (spec 06 UI). */
/** Nombre del color en la paleta; si no está, se dice «personalizado» y no un hex. */
function nombreDeColor(hex: string, tx: Dictionary): string {
  const color = PEOPLE_COLORS.find((c) => c.hex === currentColor(hex));
  return color ? (tx.colors[color.id] ?? color.label) : tx.shared.customColor;
}

export default function SharedScreen() {
  const theme = useTheme();
  const tx = useT();
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
  const miColor = useSelfColor();
  const setSelfColor = usePreferencesStore((st) => st.setSelfColor);
  const [eligiendoMiColor, setEligiendoMiColor] = useState(false);
  // El mío fuera: ofrecerlo dejaría a un contacto indistinguible de mí.
  const coloresParaContactos = PEOPLE_COLORS_DISPLAY.filter((c) => c.hex !== miColor);
  const profile = useMyProfile();

  const list = contacts.data ?? [];
  const incoming = list.filter((c) => c.kind === 'incoming');
  const outgoing = list.filter((c) => c.kind === 'outgoing');
  const accepted = list.filter((c) => c.kind === 'accepted');
  const knownIds = new Set(list.map((c) => c.profile.id));
  const sheetContact = list.find((c) => c.profile.id === contactSheetFor) ?? null;
  const error = connections.request.error ?? connections.accept.error ?? connections.remove.error ?? shares.respond.error;

  const removeContact = async (contact: Contact) => {
    const name = contact.profile.display_name ?? tx.shared.thisContact;
    const ok = await confirm({
      title: contact.kind === 'accepted' ? tx.shared.deleteContact : tx.shared.deleteRequest,
      message: contact.kind === 'accepted' ? tx.shared.deleteContactMessage(name) : undefined,
      confirmLabel: tx.shared.delete,
      destructive: true,
    });
    if (ok) connections.remove.mutate(contact.connection.id, { onSuccess: () => showSnackbar({ message: tx.shared.done }) });
  };

  return (
    <Screen scroll maxWidth={MAX_WIDTH}>
      <StackedModuleBack />
      <View style={styles.titleRow}>
        <AppText variant="title" accessibilityRole="header" style={styles.title}>
          {tx.shared.title}
        </AppText>
        <IconButton label={tx.shared.searchPeople} onPress={() => setSearchOpen(true)}>
          <Search size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
      </View>

      <Button
        title={tx.shared.availabilityLink}
        variant="secondary"
        icon={<CalendarSearch size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
        onPress={() => router.push('/(app)/shared/availability')}
      />

      {error ? <Banner tone="error" message={error.message} /> : null}
      {contacts.isPending || invitations.isPending ? <LoadingState /> : null}
      {contacts.isError ? <ErrorState message={contacts.error.message} onRetry={() => contacts.refetch()} /> : null}

      {(invitations.data?.length ?? 0) > 0 ? (
        <View style={styles.section}>
          <AppText variant="heading">{tx.shared.invitations}</AppText>
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
                    {tx.shared.sharedBy(owner.display_name ?? null)}
                  </AppText>
                </View>
              </View>
              {/* Tres respuestas y no dos (RF-S19): «tal vez» es el caso más común y
                  sin él hay que mentir o dejar la invitación sin responder, que para
                  quien organiza es indistinguible de no haberla visto. */}
              <View style={styles.cardActions}>
                <Button
                  title={tx.shared.notGoing}
                  variant="secondary"
                  onPress={() => shares.respond.mutate({ shareId: share.id, respuesta: 'declined' })}
                />
                <Button
                  title={tx.shared.maybe}
                  variant="secondary"
                  onPress={() =>
                    shares.respond.mutate(
                      { shareId: share.id, respuesta: 'maybe' },
                      { onSuccess: () => showSnackbar({ message: tx.shared.markedMaybe }) },
                    )
                  }
                />
                <Button
                  title={tx.shared.going}
                  onPress={() =>
                    shares.respond.mutate(
                      { shareId: share.id, respuesta: 'accepted' },
                      { onSuccess: () => showSnackbar({ message: tx.shared.addedToCalendar }) },
                    )
                  }
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {incoming.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="heading">{tx.shared.receivedRequests}</AppText>
          {incoming.map((c) => (
            <View key={c.connection.id} style={[styles.row, { borderColor: theme.border }]}>
              <Avatar profile={c.profile} />
              <View style={styles.cardText}>
                <AppText variant="bodyStrong">{c.profile.display_name ?? tx.shared.noName}</AppText>
              </View>
              <IconButton label={tx.shared.rejectRequest} onPress={() => removeContact(c)}>
                <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
              </IconButton>
              <IconButton
                label={tx.shared.acceptRequest}
                onPress={() =>
                  connections.accept.mutate(c.connection.id, {
                    onSuccess: () => {
                      showSnackbar({ message: tx.shared.nowContact(c.profile.display_name?.split(' ')[0] ?? tx.shared.contactFallback) });
                      setContactSheetFor(c.profile.id);
                    },
                  })
                }>
                <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.success} />
              </IconButton>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="heading">{tx.shared.contacts}</AppText>
        {/*
          * Mi propia fila va con las demás y no en Perfil: el color solo significa algo
          * al lado del de los otros, que es donde se ve si choca con alguno.
          */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tx.shared.meColorA11y(nombreDeColor(miColor, tx))}
          onPress={() => setEligiendoMiColor(true)}
          style={({ pressed }) => [styles.row, { borderColor: theme.border }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
          <ColorDot hex={miColor} />
          {profile.data ? <Avatar profile={profile.data} /> : null}
          <View style={styles.cardText}>
            <AppText variant="bodyStrong">{tx.shared.me}</AppText>
            <AppText variant="caption" color="textSecondary">
              {tx.shared.myColorHint(nombreDeColor(miColor, tx).toLowerCase())}
            </AppText>
          </View>
        </Pressable>
        {contacts.isSuccess && accepted.length === 0 ? (
          <EmptyState
            title={tx.shared.noContactsTitle}
            description={tx.shared.noContactsDescription}
            action={<Button title={tx.shared.searchPeople} variant="secondary" onPress={() => setSearchOpen(true)} />}
          />
        ) : null}
        {accepted.map((c) => (
          <Pressable
            key={c.connection.id}
            accessibilityRole="button"
            accessibilityLabel={tx.shared.contactA11y(c.profile.display_name ?? tx.shared.contactFallback, visibilityText(c.myCalendarVisibility, tx).label)}
            onPress={() => setContactSheetFor(c.profile.id)}
            style={({ pressed }) => [styles.row, { borderColor: theme.border }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
            <ColorDot hex={peopleColors.get(c.profile.id) ?? theme.border} />
            <Avatar profile={c.profile} />
            <View style={styles.cardText}>
              <AppText variant="bodyStrong">{c.profile.display_name ?? tx.shared.noName}</AppText>
              <AppText variant="caption" color="textSecondary">
                {tx.shared.yourCalendar(visibilityText(c.myCalendarVisibility, tx).label)}
              </AppText>
              {c.theirCalendarVisibility ? (
                <AppText variant="caption" color="textTertiary">
                  {tx.shared.theyShare(visibilityText(c.theirCalendarVisibility, tx).label.toLowerCase())}
                </AppText>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>

      {outgoing.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="heading">{tx.shared.sentRequests}</AppText>
          {outgoing.map((c) => (
            <View key={c.connection.id} style={[styles.row, { borderColor: theme.border }]}>
              <Avatar profile={c.profile} />
              <View style={styles.cardText}>
                <AppText variant="bodyStrong">{c.profile.display_name ?? tx.shared.noName}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {tx.shared.pending}
                </AppText>
              </View>
              <IconButton label={tx.shared.cancelRequest} onPress={() => removeContact(c)}>
                <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
              </IconButton>
            </View>
          ))}
        </View>
      ) : null}

      <Sheet visible={searchOpen} onClose={() => setSearchOpen(false)} title={tx.shared.searchPeople}>
        <TextField
          label={tx.shared.emailOrUser}
          value={query}
          onChangeText={setQuery}
          placeholder={tx.shared.searchPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          hint={tx.shared.searchHint}
        />
        {!canSearch && query.trim().length > 0 ? (
          <AppText variant="caption" color="textTertiary">
            Escribe al menos {SEARCH_MIN_LENGTH} letras.
          </AppText>
        ) : null}
        {canSearch && search.isFetching ? <LoadingState label={tx.shared.searching} /> : null}
        {/* Sin esto una búsqueda que falla se ve igual que una sin resultados: en blanco. */}
        {canSearch && search.isError ? (
          <ErrorState message={search.error.message} onRetry={() => search.refetch()} />
        ) : null}
        {canSearch && search.isSuccess && search.data.length === 0 ? (
          <AppText color="textSecondary">{tx.shared.nobodyFound}</AppText>
        ) : null}
        {(canSearch ? search.data : [])?.map((p) => (
          <View key={p.id} style={[styles.row, { borderColor: theme.border }]}>
            <Avatar profile={p} />
            <View style={styles.cardText}>
              <AppText variant="bodyStrong">{p.display_name ?? tx.shared.noName}</AppText>
              <AppText variant="caption" color="textSecondary">
                @{p.username}
              </AppText>
            </View>
            {knownIds.has(p.id) ? (
              <AppText variant="caption" color="textTertiary">
                {tx.shared.alreadyListed}
              </AppText>
            ) : (
              <IconButton
                label={tx.shared.sendRequestTo(p.display_name ?? null)}
                onPress={() => connections.request.mutate(p.id, { onSuccess: () => showSnackbar({ message: tx.shared.requestSent }) })}>
                <UserPlus size={IconSize.inline} strokeWidth={IconStroke} color={theme.ink} />
              </IconButton>
            )}
          </View>
        ))}
      </Sheet>

      <Sheet visible={eligiendoMiColor} onClose={() => setEligiendoMiColor(false)} title={tx.shared.yourColor}>
        <AppText variant="caption" color="textTertiary">
          {tx.shared.yourColorHint}
        </AppText>
        <View style={styles.chips}>
          {PEOPLE_COLORS_DISPLAY.map((c) => {
            const selected = miColor === c.hex;
            return (
              <ColorSwatch
                key={c.id}
                hex={c.hex}
                label={tx.colors[c.id] ?? c.label}
                selected={selected}
                onPress={() => {
                  // Volver a tocar el elegido lo devuelve al color del Nobi.
                  setSelfColor(selected ? null : c.hex);
                  showSnackbar({ message: selected ? tx.shared.colorBackToNobi : tx.shared.yourColorIs((tx.colors[c.id] ?? c.label).toLowerCase()) });
                }}
              />
            );
          })}
        </View>
      </Sheet>

      <Sheet visible={sheetContact !== null} onClose={() => setContactSheetFor(null)} title={sheetContact?.profile.display_name ?? tx.shared.contactFallback}>
        <AppText variant="label" color="textSecondary">
          {tx.shared.calendarColor}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {tx.shared.calendarColorHint}
        </AppText>
        <View style={styles.chips}>
          {/* El mío se excluye: ofrecerlo permitiría no distinguirme de un contacto. */}
          {coloresParaContactos.map((c) => {
            const selected = (peopleColors.get(sheetContact?.profile.id ?? '') ?? null) === c.hex;
            const manual = currentColor(sheetContact?.color) === c.hex;
            return (
              <ColorSwatch
                key={c.id}
                hex={c.hex}
                label={tx.colors[c.id] ?? c.label}
                selected={selected}
                onPress={() => {
                  if (!sheetContact) return;
                  // Volver a tocar el color asignado lo devuelve a automático.
                  connections.setColor.mutate(
                    { contactUserId: sheetContact.profile.id, color: manual ? null : c.hex },
                    { onSuccess: () => showSnackbar({ message: manual ? tx.shared.automaticColor : tx.shared.colorIs((tx.colors[c.id] ?? c.label).toLowerCase()) }) },
                  );
                }}
              />
            );
          })}
        </View>
        {sheetContact?.color ? null : (
          <AppText variant="caption" color="textTertiary">
            Asignado automáticamente. Toca un color para fijarlo.
          </AppText>
        )}

        <AppText variant="label" color="textSecondary" style={styles.sheetSection}>
          {tx.shared.shareMyCalendar}
        </AppText>
        {VISIBILIDADES.map((value) => ({ value, ...visibilityText(value, tx) })).map((option) => {
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
                  { onSuccess: () => showSnackbar({ message: tx.shared.calendarIs(option.label.toLowerCase()) }) },
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
        <AppText variant="caption" color="textTertiary" style={styles.sheetHint}>
          {tx.shared.savedAutomatically}
        </AppText>
        <Button
          title={tx.shared.deleteContact}
          variant="danger"
          onPress={() => {
            if (!sheetContact) return;
            const contact = sheetContact;
            setContactSheetFor(null);
            void removeContact(contact);
          }}
        />
        <Button title={tx.shared.done2} onPress={() => setContactSheetFor(null)} />
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
  sheetSection: { marginTop: Spacing.sm },
  sheetHint: { marginTop: Spacing.sm, textAlign: 'center' },
});
