import { Users } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Banner, Button } from '@/components/ui';
import { LIBRARY_LIMITS } from '@/constants/library';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useClubBook, useClubMutations, useClubs } from '@/hooks/use-clubs';
import { useLibraryUsage } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';
import { formatBytes } from '@/lib/library/files';
import { useAuth, useSnackbar } from '@/providers';
import type { LibraryClub } from '@/types/domain';

/**
 * Las invitaciones a clubes de lectura (spec 13f, RF-BC3; T306), en Compartido: el libro, quién invita y cuánto
 * ocupa. Aceptar da una copia propia que cuenta en el espacio; si no alcanza, se dice cuánto falta antes.
 */
export function ClubInvitations() {
  const { userId } = useAuth();
  const c = useT().library.clubs;
  const { clubs, members } = useClubs();
  const m = useClubMutations();
  const pendientes = clubs.filter((k) => members.some((x) => x.club_id === k.id && x.person_id === userId && x.status === 'pending'));
  if (!pendientes.length) return null;
  const error = m.accept.error ?? m.removeInvite.error;
  return (
    <View style={styles.seccion}>
      <AppText variant="heading">{c.invitationsTitle}</AppText>
      {error ? <Banner tone="error" message={error.message} /> : null}
      {pendientes.map((k) => (
        <Invitacion key={k.id} club={k} />
      ))}
    </View>
  );
}

function Invitacion({ club }: { club: LibraryClub }) {
  const theme = useTheme();
  const lang = useLanguage();
  const c = useT().library.clubs;
  const { userId } = useAuth();
  const libro = useClubBook(club.id);
  const espacio = useLibraryUsage();
  const m = useClubMutations();
  const avisar = useSnackbar();
  const usado = espacio.data?.usedBytes ?? 0;
  const tope = espacio.data?.limitBytes ?? LIBRARY_LIMITS.userBytes;
  const falta = usado + club.file_size - tope;
  const sinLibro = libro.isSuccess && !libro.data;
  const ocupado = m.accept.isPending && m.accept.variables === club.id;
  return (
    <View style={[styles.tarjeta, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={styles.fila}>
        <View style={[styles.icono, { backgroundColor: theme.surfaceAlt }]}>
          <Users size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {club.name}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {libro.data ? c.invitedBy(libro.data.host_name ?? c.someone, libro.data.title) : ' '}
          </AppText>
          <AppText variant="caption" color={falta > 0 ? 'today' : 'textTertiary'}>
            {falta > 0 ? c.missing(formatBytes(falta, lang)) : c.size(formatBytes(club.file_size, lang))}
          </AppText>
        </View>
      </View>
      {sinLibro ? (
        <AppText variant="caption" color="textSecondary">
          {c.bookGone}
        </AppText>
      ) : null}
      <View style={styles.botones}>
        <Button
          title={c.decline}
          variant="secondary"
          onPress={() => m.removeInvite.mutate({ clubId: club.id, personId: userId as string }, { onSuccess: () => avisar({ message: c.declined }) })}
        />
        <Button
          title={c.accept}
          loading={ocupado}
          disabled={falta > 0 || sinLibro || !espacio.isSuccess}
          onPress={() => m.accept.mutate(club.id, { onSuccess: () => avisar({ message: c.accepted }) })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: Spacing.sm },
  tarjeta: { borderWidth: 1, borderRadius: Radius.lg, borderCurve: 'continuous', padding: Spacing.md, gap: Spacing.sm },
  fila: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  icono: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  botones: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
});
