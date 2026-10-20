import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { libraryKeys } from '@/hooks/use-library';
import { useAuth } from '@/providers';
import {
  acceptClubInvite,
  closeClub,
  createClub,
  getClubBook,
  inviteToClub,
  leaveClub,
  listClubMembers,
  listClubs,
  removeClubInvite,
  removeClubMember,
  renameClub,
  setClubProgressVisible,
  listClubProgress,
} from '@/services/library';
import type { LibraryClub, LibraryClubBook, LibraryClubMember, LibraryClubProgress } from '@/types/domain';

export const clubKeys = {
  all: ['library', 'clubs'] as const,
  clubs: (userId: string | null) => ['library', 'clubs', userId] as const,
  members: (userId: string | null, ids: string) => ['library', 'clubs', userId, 'members', ids] as const,
  book: (clubId: string) => ['library', 'clubs', 'book', clubId] as const,
  progress: (clubId: string) => ['library', 'clubs', 'progress', clubId] as const,
};

/**
 * Por dónde va cada miembro (RF-BC9; T308). Se vuelve a pedir cada minuto mientras se ve: el avance de los demás
 * no llega por Realtime (cada copia es de su dueño); en una sesión en vivo va por su canal (T309).
 */
export function useClubProgress(clubId: string | null) {
  return useQuery<LibraryClubProgress[]>({
    queryKey: clubKeys.progress(clubId ?? ''),
    queryFn: () => listClubProgress(clubId as string),
    enabled: !!clubId,
    refetchInterval: 60_000,
  });
}

/**
 * Los clubes de lectura de la persona (spec 13f; T306) con sus miembros e invitados: los que dirige, en los que
 * está y a los que la invitaron. Las invitaciones llegan solas por Realtime (como Compartido).
 */
export function useClubs() {
  const { userId } = useAuth();
  const clubes = useQuery<LibraryClub[]>({ queryKey: clubKeys.clubs(userId), queryFn: () => listClubs(userId as string), enabled: !!userId });
  const ids = (clubes.data ?? []).map((c) => c.id).sort();
  const miembros = useQuery<LibraryClubMember[]>({
    queryKey: clubKeys.members(userId, ids.join(',')),
    queryFn: () => listClubMembers(ids),
    enabled: !!userId && clubes.isSuccess,
  });
  return {
    clubs: clubes.data ?? [],
    members: miembros.data ?? [],
    isPending: clubes.isPending || (clubes.isSuccess && miembros.isPending),
    isError: clubes.isError || miembros.isError,
    error: clubes.error ?? miembros.error,
    refetch: () => {
      void clubes.refetch();
      void miembros.refetch();
    },
  };
}

/** El libro que trae una invitación (título, tamaño, quién invita), para decidir si aceptar (RF-BC3). */
export function useClubBook(clubId: string | null) {
  return useQuery<LibraryClubBook | null>({ queryKey: clubKeys.book(clubId ?? ''), queryFn: () => getClubBook(clubId as string), enabled: !!clubId });
}

/** Todo lo que cambia un club. Cada cambio recarga los clubes y, si toca copias, la librería y el espacio. */
export function useClubMutations() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const recargar = (libreria = false) => {
    void queryClient.invalidateQueries({ queryKey: clubKeys.all });
    if (libreria) {
      void queryClient.invalidateQueries({ queryKey: libraryKeys.items(userId) });
      void queryClient.invalidateQueries({ queryKey: libraryKeys.usage(userId) });
      void queryClient.invalidateQueries({ queryKey: ['library', 'annotations'] });
    }
  };
  const uid = () => userId as string;
  return {
    create: useMutation({
      mutationFn: (input: { sourceItemId: string; name: string; invitar: readonly string[] }) =>
        createClub(uid(), input).then(async (club) => {
          if (input.invitar.length) await inviteToClub(club.id, input.invitar);
          return club;
        }),
      onSettled: () => recargar(true),
    }),
    invite: useMutation({ mutationFn: ({ clubId, personIds }: { clubId: string; personIds: readonly string[] }) => inviteToClub(clubId, personIds), onSettled: () => recargar() }),
    removeInvite: useMutation({ mutationFn: ({ clubId, personId }: { clubId: string; personId: string }) => removeClubInvite(clubId, personId), onSettled: () => recargar() }),
    accept: useMutation({ mutationFn: (clubId: string) => acceptClubInvite(uid(), clubId), onSettled: () => recargar(true) }),
    leave: useMutation({ mutationFn: (clubId: string) => leaveClub(clubId), onSettled: () => recargar(true) }),
    removeMember: useMutation({ mutationFn: ({ clubId, personId }: { clubId: string; personId: string }) => removeClubMember(clubId, personId), onSettled: () => recargar() }),
    close: useMutation({ mutationFn: (clubId: string) => closeClub(clubId), onSettled: () => recargar(true) }),
    rename: useMutation({ mutationFn: ({ clubId, name }: { clubId: string; name: string }) => renameClub(clubId, name), onSettled: () => recargar() }),
    progress: useMutation({ mutationFn: ({ clubId, visible }: { clubId: string; visible: boolean }) => setClubProgressVisible(uid(), clubId, visible), onSettled: () => recargar() }),
  };
}
